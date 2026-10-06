import { useEffect, useState, type CSSProperties } from 'react';
import { IconHeart, IconHeartFilled, IconMessageCircle, IconSend, IconBookmark, IconBookmarkFilled, IconPlus, IconDots } from '@tabler/icons-react';
import { useStore } from '../store/useStore';
import { refreshFeed } from '../lib/sync';
import { maybeBook } from '../content/books';
import { timeAgo } from '../app/ids';
import { PersonAvatar } from '../components/Avatar';
import { Sheet } from '../components/chrome';
import { useT } from '../i18n/react';
import './SocialScreen.css';

/* ============================================================
   Screen 4 — Social. "Share. Discover. Be inspired."
   A restrained feed: a passage, a book, and what it changed for you.
   ============================================================ */
export function SocialScreen() {
  const posts = useStore((s) => s.posts);
  const liked = useStore((s) => s.liked);
  const savedPosts = useStore((s) => s.savedPosts);
  const following = useStore((s) => s.following);
  const toggleLike = useStore((s) => s.toggleLike);
  const toggleSavePost = useStore((s) => s.toggleSavePost);
  const toggleFollow = useStore((s) => s.toggleFollow);
  const showToast = useStore((s) => s.showToast);
  const [tab, setTab] = useState<'foryou' | 'following'>('foryou');
  const [compose, setCompose] = useState(false);
  // the icon that was just tapped pops once
  const [bumped, setBumped] = useState<string | null>(null);
  useEffect(() => {
    if (!bumped) return;
    const id = setTimeout(() => setBumped(null), 420);
    return () => clearTimeout(id);
  }, [bumped]);
  const t = useT();

  // signed in: the cloud feed is refreshed each time the tab opens (a no-op otherwise)
  useEffect(() => {
    void refreshFeed();
  }, []);

  const shown = tab === 'foryou' ? posts : posts.filter((p) => p.mine || following.includes(p.author.handle));

  const share = async (text: string) => {
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        showToast(t.common.copied);
      }
    } catch {
      /* dismissed */
    }
  };

  return (
    <div className="screen social">
      <div className="social-head top-inset pad">
        <div className="social-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'foryou'} className={tab === 'foryou' ? 'on' : ''} onClick={() => setTab('foryou')}>
            {t.social.forYou}
          </button>
          <button type="button" role="tab" aria-selected={tab === 'following'} className={tab === 'following' ? 'on' : ''} onClick={() => setTab('following')}>
            {t.social.following}
          </button>
        </div>
        <button type="button" className="social-plus" aria-label={t.social.plus} onClick={() => setCompose(true)}>
          <IconPlus stroke={2.4} />
        </button>
      </div>
      <div className="screen-scroll nav-space feed cascade">
        {shown.length === 0 && (
          <p className="pad small muted" style={{ paddingTop: 20 }}>{t.social.followEmpty}</p>
        )}
        {shown.map((p, i) => {
          const isLiked = liked.includes(p.id);
          const isSaved = savedPosts.includes(p.id);
          const b = maybeBook(p.bookId);
          const isFollowing = following.includes(p.author.handle);
          return (
            <article key={p.id} className="post" style={{ '--i': i } as CSSProperties}>
              <header className="post-head pad">
                <PersonAvatar initial={p.author.initial} color={p.author.color} size={34} />
                <div className="grow">
                  <div className="post-handle">{p.author.handle}</div>
                  <div className="post-time">{timeAgo(p.ts)}</div>
                </div>
                {!p.mine && (
                  <button type="button" className={`btn btn-xs ${isFollowing ? 'btn-outline' : 'btn-dark'}`} onClick={() => toggleFollow(p.author.handle)}>
                    {isFollowing ? t.social.followingBtn : t.social.follow}
                  </button>
                )}
                <button type="button" className="iconbtn" aria-label={t.social.more}>
                  <IconDots />
                </button>
              </header>
              <div className="quote-card" style={b ? ({ '--qc': b.palette.bg } as React.CSSProperties) : undefined}>
                <p className="quote-card-text">“{p.quote}”</p>
                <p className="quote-card-attr">{p.attribution}</p>
              </div>
              <div className="post-actions pad">
                <button type="button" className={`post-action ${isLiked ? 'on' : ''} ${bumped === `like:${p.id}` ? 'bump' : ''}`} onClick={() => { toggleLike(p.id); setBumped(`like:${p.id}`); }} aria-pressed={isLiked} aria-label={t.social.like}>
                  {isLiked ? <IconHeartFilled /> : <IconHeart />} <span>{p.likes}</span>
                </button>
                <button type="button" className="post-action" aria-label={t.social.comments}>
                  <IconMessageCircle /> <span>{p.comments}</span>
                </button>
                <button type="button" className="post-action" aria-label={t.common.share} onClick={() => share(`“${p.quote}” — ${p.attribution}\n\n${p.caption}`)}>
                  <IconSend />
                </button>
                <span className="grow" />
                <button type="button" className={`post-action ${isSaved ? 'on' : ''} ${bumped === `save:${p.id}` ? 'bump' : ''}`} aria-label={t.social.save} aria-pressed={isSaved} onClick={() => { toggleSavePost(p.id); setBumped(`save:${p.id}`); }}>
                  {isSaved ? <IconBookmarkFilled /> : <IconBookmark />}
                </button>
              </div>
              <div className="post-caption pad">
                {p.prompt && <span className="post-prompt">{p.prompt}</span>}
                <p>
                  <b>{p.author.handle}</b> {p.caption}
                </p>
              </div>
            </article>
          );
        })}
      </div>
      <ComposeSheet open={compose} onClose={() => setCompose(false)} />
    </div>
  );
}

function ComposeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const highlights = useStore((s) => s.highlights);
  const addPost = useStore((s) => s.addPost);
  const showToast = useStore((s) => s.showToast);
  const [pick, setPick] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const [caption, setCaption] = useState('');
  const t = useT();
  const chosen = highlights.find((h) => h.id === pick);
  const quote = chosen?.text ?? custom.trim();
  const b = chosen ? maybeBook(chosen.bookId) : undefined;

  const post = () => {
    if (!quote || !caption.trim()) return;
    addPost({
      quote,
      bookId: b?.id,
      attribution: b ? `${b.title} · ${b.authorName}` : t.social.keptPassage,
      caption: caption.trim(),
      prompt: t.social.captionLabel,
    });
    setPick(null);
    setCustom('');
    setCaption('');
    onClose();
    showToast(t.social.shared);
  };

  return (
    <Sheet open={open} onClose={onClose} label={t.social.composeLabel} tall>
      <div className="compose">
        <h2 className="title">{t.social.composeTitle}</h2>
        <p className="small muted">{t.social.composeSub}</p>
        {highlights.length > 0 && (
          <ul className="compose-picks">
            {highlights.slice(0, 5).map((h) => {
              const hb = maybeBook(h.bookId);
              return (
                <li key={h.id}>
                  <button type="button" className={`compose-pick ${pick === h.id ? 'on' : ''}`} onClick={() => setPick(pick === h.id ? null : h.id)}>
                    <span className="compose-pick-text">“{h.text}”</span>
                    <span className="small muted">{hb?.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {!chosen && <textarea className="input compose-quote" rows={3} placeholder={t.social.composePh} value={custom} onChange={(e) => setCustom(e.target.value)} aria-label={t.social.passage} />}
        <label className="compose-label" htmlFor="compose-caption">
          {t.social.captionLabel}
        </label>
        <textarea id="compose-caption" className="input compose-caption" rows={3} placeholder={t.social.captionPh} value={caption} onChange={(e) => setCaption(e.target.value)} />
        <button type="button" className="btn btn-primary" disabled={!quote || !caption.trim()} onClick={post}>
          {t.social.post}
        </button>
      </div>
    </Sheet>
  );
}
