import { useEffect, useId, useState, type CSSProperties } from 'react';
import { IconHeart, IconHeartFilled, IconMessageCircle, IconSend, IconBookmark, IconBookmarkFilled, IconPlus } from '@tabler/icons-react';
import { useStore } from '../store/useStore';
import type { Post } from '../store/types';
import { refreshFeed } from '../lib/sync';
import { maybeBook } from '../content/books';
import { timeAgo } from '../app/ids';
import { AppBar, Sheet } from '../components/chrome';
import { PersonAvatar } from '../components/Avatar';
import { useBump } from '../hooks/useBump';
import { usePresence } from '../hooks/usePresence';
import { useT } from '../i18n/react';
import './SocialScreen.css';

/* ============================================================
   The Social tab (v14). Two feeds under the wordmark — For You and
   Following — and a gold plus that opens the compose sheet. Each post
   is a reader, a passage on its book's colour, the four actions and the
   reader's own words under it. Likes, saves, follows and new posts go
   through the store (and on to the cloud feed when signed in).
   ============================================================ */

/** relative luminance of a #rrggbb colour; anything else counts as dark */
function isPale(hex: string): boolean {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255) > 0.4;
}

/**
 * The passage card's colour. The mockup's cards are always a deep flat
 * tone with light words: a dark jacket is used as it is (with its own
 * foreground); a pale jacket (Naval's, Atomic Habits') or a post without a
 * book becomes a deep tone of it on the stage's navy, so the card never
 * dissolves into the matinée page.
 */
function cardStyle(p: Post): CSSProperties {
  const b = maybeBook(p.bookId);
  if (b && !isPale(b.palette.bg)) return { '--qc': b.palette.bg, '--qc-fg': b.palette.fg } as CSSProperties;
  const tint = b ? b.palette.bg : p.author.color;
  return { '--qc': `color-mix(in srgb, ${tint} ${b ? 26 : 34}%, var(--stage))`, '--qc-fg': 'var(--cream)' } as CSSProperties;
}

export function SocialScreen() {
  const posts = useStore((s) => s.posts);
  const following = useStore((s) => s.following);
  const t = useT();
  const [tab, setTab] = useState<'foryou' | 'following'>('foryou');
  const [compose, setCompose] = useState(false);
  // each opening mounts the sheet afresh, so it starts with the first highlight picked and empty fields
  const [composeKey, setComposeKey] = useState(0);
  const ids = useId();

  // signed in: the cloud feed is refreshed each time the tab opens (a no-op otherwise)
  useEffect(() => {
    void refreshFeed();
  }, []);

  const shown = tab === 'foryou' ? posts : posts.filter((p) => p.mine || following.includes(p.author.handle));

  const openCompose = () => {
    setComposeKey((k) => k + 1);
    setCompose(true);
  };

  const tabs = [
    { id: 'foryou' as const, label: t.social.forYou },
    { id: 'following' as const, label: t.social.following },
  ];

  return (
    <div className="screen social">
      <AppBar />
      <div className="content">
        <div className="social-head">
          <div className="social-tabs" role="tablist">
            {tabs.map((x) => (
              <button
                key={x.id}
                id={`${ids}-${x.id}`}
                type="button"
                role="tab"
                aria-selected={tab === x.id}
                aria-controls={`${ids}-feed`}
                className={tab === x.id ? 'on' : ''}
                onClick={() => setTab(x.id)}
              >
                {x.label}
              </button>
            ))}
          </div>
          <button type="button" className="social-plus" aria-label={t.social.plus} onClick={openCompose}>
            <IconPlus stroke={2.4} />
          </button>
        </div>
        <div className="feed cascade" id={`${ids}-feed`} role="tabpanel" aria-labelledby={`${ids}-${tab}`}>
          {shown.length === 0 && <p className="muted feed-empty">{t.social.followEmpty}</p>}
          {shown.map((p, i) => (
            <PostCard key={p.id} p={p} i={i} />
          ))}
        </div>
      </div>
      <ComposeSheet key={composeKey} open={compose} onClose={() => setCompose(false)} />
    </div>
  );
}

/* ---------- one post ----------
   Its own component so each toggled icon pops through the shared useBump
   and each card subscribes only to its own like, save and follow. */
function PostCard({ p, i }: { p: Post; i: number }) {
  const t = useT();
  const isLiked = useStore((s) => s.liked.includes(p.id));
  const isSaved = useStore((s) => s.savedPosts.includes(p.id));
  const isFollowing = useStore((s) => s.following.includes(p.author.handle));
  const toggleLike = useStore((s) => s.toggleLike);
  const toggleSavePost = useStore((s) => s.toggleSavePost);
  const toggleFollow = useStore((s) => s.toggleFollow);
  const showToast = useStore((s) => s.showToast);
  const [likeBumped, bumpLike] = useBump();
  const [saveBumped, bumpSave] = useBump();

  const share = async () => {
    const text = `“${p.quote}” — ${p.attribution}\n\n${p.caption}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        showToast(t.common.copied);
      }
    } catch (e) {
      // the share sheet dismissed is not a failure; anything else (no clipboard, permission) says so
      if ((e as { name?: string } | null)?.name !== 'AbortError') showToast(t.social.cantShare);
    }
  };

  return (
    <article className="post" style={{ '--i': i } as CSSProperties}>
      <div className="post-head">
        {/* the reader's own posts wear the profile's gold medallion */}
        <PersonAvatar initial={p.author.initial} color={p.mine ? 'var(--gold)' : p.author.color} size={36} className={p.mine ? 'mine' : ''} />
        <div className="grow">
          <div className="post-handle">{p.author.handle}</div>
          <div className="post-time">{timeAgo(p.ts)}</div>
        </div>
        {!p.mine && (
          <button type="button" className={`btn ghost sm post-follow ${isFollowing ? 'following' : ''}`} onClick={() => toggleFollow(p.author.handle)}>
            {isFollowing ? t.social.followingBtn : t.social.follow}
          </button>
        )}
      </div>
      <div className="quote-card" style={cardStyle(p)}>
        <p className="quote-card-text">“{p.quote}”</p>
        <p className="quote-card-attr">{p.attribution}</p>
      </div>
      <div className="post-actions">
        <button
          type="button"
          className={`post-action ${isLiked ? 'on' : ''} ${likeBumped ? 'bump' : ''}`}
          aria-label={t.social.like}
          aria-pressed={isLiked}
          onClick={() => {
            toggleLike(p.id);
            bumpLike();
          }}
        >
          {isLiked ? <IconHeartFilled stroke={1.8} /> : <IconHeart stroke={1.8} />} {p.likes}
        </button>
        <button type="button" className="post-action" aria-label={t.social.comments}>
          <IconMessageCircle stroke={1.8} /> {p.comments}
        </button>
        <button type="button" className="post-action" aria-label={t.common.share} onClick={() => void share()}>
          <IconSend stroke={1.8} />
        </button>
        <button
          type="button"
          className={`post-action right ${isSaved ? 'on' : ''} ${saveBumped ? 'bump' : ''}`}
          aria-label={t.social.save}
          aria-pressed={isSaved}
          onClick={() => {
            toggleSavePost(p.id);
            bumpSave();
          }}
        >
          {isSaved ? <IconBookmarkFilled stroke={1.8} /> : <IconBookmark stroke={1.8} />}
        </button>
      </div>
      <div className="post-caption">
        <p>
          <b>{p.author.handle}</b> {p.caption}
        </p>
      </div>
    </article>
  );
}

/* ---------- the compose sheet ----------
   "Share a passage": one of the reader's highlights (the first is picked
   when the sheet opens; tap it again to paste a line instead), then
   "What did this change for you?" and Post. The sheet is remounted on
   each opening (its key), so nothing is reset here: resetting while it
   slides away would flash the paste field into the closing sheet. */
function ComposeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const highlights = useStore((s) => s.highlights);
  const addPost = useStore((s) => s.addPost);
  const showToast = useStore((s) => s.showToast);
  const t = useT();
  const ids = useId();
  const picks = highlights.slice(0, 5);
  const [pick, setPick] = useState<string | null>(picks[0]?.id ?? null);
  const [custom, setCustom] = useState('');
  const [caption, setCaption] = useState('');
  const chosen = picks.find((h) => h.id === pick);
  const quote = chosen?.text ?? custom.trim();
  const b = chosen ? maybeBook(chosen.bookId) : undefined;
  // the paste field arrives when no highlight is picked and fades when one is
  const paste = usePresence(!chosen, 120);

  const post = () => {
    if (!open || !quote || !caption.trim()) return;
    addPost({
      quote,
      bookId: b?.id,
      attribution: b ? `${b.title} · ${b.authorName}` : t.social.keptPassage,
      caption: caption.trim(),
      prompt: t.social.captionLabel,
    });
    onClose();
    showToast(t.social.shared);
  };

  return (
    <Sheet open={open} onClose={onClose} label={t.social.composeLabel} tall>
      <div className="act">{t.social.composeTitle}</div>
      <div className="sub">{t.social.composeSub}</div>
      <div className="compose">
        {picks.map((h) => {
          const hb = maybeBook(h.bookId);
          const on = pick === h.id;
          return (
            <button key={h.id} type="button" className={`compose-pick ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => setPick(on ? null : h.id)}>
              <span className="compose-pick-text">“{h.text}”</span>
              <span className="bookrow-sub">{hb ? `${hb.title} · ${hb.authorName}` : t.social.keptPassage}</span>
            </button>
          );
        })}
        {paste.mounted && (
          <div className={`field compose-paste ${paste.closing ? 'closing' : ''}`} aria-hidden={paste.closing || undefined}>
            <label htmlFor={`${ids}-passage`}>{t.social.passage}</label>
            <textarea
              id={`${ids}-passage`}
              className="input"
              rows={3}
              placeholder={t.social.composePh}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              tabIndex={paste.closing ? -1 : undefined}
            />
          </div>
        )}
        <div className="field">
          <label htmlFor={`${ids}-caption`}>{t.social.captionLabel}</label>
          <textarea id={`${ids}-caption`} className="input" rows={2} placeholder={t.social.captionPh} value={caption} onChange={(e) => setCaption(e.target.value)} />
        </div>
        <button type="button" className="btn gold" disabled={!quote || !caption.trim()} onClick={post}>
          {t.social.post}
        </button>
      </div>
    </Sheet>
  );
}
