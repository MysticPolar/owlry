import { useEffect, useState } from 'react';
import { IconHeart, IconHeartFilled, IconMessageCircle, IconSend, IconBookmark, IconBookmarkFilled, IconPlus, IconDots } from '@tabler/icons-react';
import { useStore } from '../store/useStore';
import { refreshFeed } from '../lib/sync';
import { maybeBook } from '../content/books';
import { timeAgo } from '../app/ids';
import { PersonAvatar } from '../components/Avatar';
import { Sheet } from '../components/chrome';
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
        showToast('Copied.');
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
            For You
          </button>
          <button type="button" role="tab" aria-selected={tab === 'following'} className={tab === 'following' ? 'on' : ''} onClick={() => setTab('following')}>
            Following
          </button>
        </div>
        <button type="button" className="social-plus" aria-label="Share a reflection" onClick={() => setCompose(true)}>
          <IconPlus stroke={2.4} />
        </button>
      </div>
      <div className="screen-scroll nav-space feed">
        {shown.length === 0 && (
          <p className="pad small muted" style={{ paddingTop: 20 }}>Follow a few readers and their reflections will show up here.</p>
        )}
        {shown.map((p) => {
          const isLiked = liked.includes(p.id);
          const isSaved = savedPosts.includes(p.id);
          const b = maybeBook(p.bookId);
          const isFollowing = following.includes(p.author.handle);
          return (
            <article key={p.id} className="post">
              <header className="post-head pad">
                <PersonAvatar initial={p.author.initial} color={p.author.color} size={34} />
                <div className="grow">
                  <div className="post-handle">{p.author.handle}</div>
                  <div className="post-time">{timeAgo(p.ts)}</div>
                </div>
                {!p.mine && (
                  <button type="button" className={`btn btn-xs ${isFollowing ? 'btn-outline' : 'btn-dark'}`} onClick={() => toggleFollow(p.author.handle)}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
                <button type="button" className="iconbtn" aria-label="More">
                  <IconDots />
                </button>
              </header>
              <div className="quote-card" style={b ? ({ '--qc': b.palette.bg } as React.CSSProperties) : undefined}>
                <p className="quote-card-text">“{p.quote}”</p>
                <p className="quote-card-attr">{p.attribution}</p>
              </div>
              <div className="post-actions pad">
                <button type="button" className={`post-action ${isLiked ? 'on' : ''}`} onClick={() => toggleLike(p.id)} aria-pressed={isLiked} aria-label="Like">
                  {isLiked ? <IconHeartFilled /> : <IconHeart />} <span>{p.likes}</span>
                </button>
                <button type="button" className="post-action" aria-label="Comments">
                  <IconMessageCircle /> <span>{p.comments}</span>
                </button>
                <button type="button" className="post-action" aria-label="Share" onClick={() => share(`“${p.quote}” — ${p.attribution}\n\n${p.caption}`)}>
                  <IconSend />
                </button>
                <span className="grow" />
                <button type="button" className={`post-action ${isSaved ? 'on' : ''}`} aria-label="Save" aria-pressed={isSaved} onClick={() => toggleSavePost(p.id)}>
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
  const chosen = highlights.find((h) => h.id === pick);
  const quote = chosen?.text ?? custom.trim();
  const b = chosen ? maybeBook(chosen.bookId) : undefined;

  const post = () => {
    if (!quote || !caption.trim()) return;
    addPost({
      quote,
      bookId: b?.id,
      attribution: b ? `${b.title} · ${b.authorName}` : 'A passage I kept',
      caption: caption.trim(),
      prompt: 'What did this change for you?',
    });
    setPick(null);
    setCustom('');
    setCaption('');
    onClose();
    showToast('Shared with your readers.');
  };

  return (
    <Sheet open={open} onClose={onClose} label="Share a reflection" tall>
      <div className="compose">
        <h2 className="title">Share a passage</h2>
        <p className="small muted">Pick one of your highlights, or paste a line you kept.</p>
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
        {!chosen && <textarea className="input compose-quote" rows={3} placeholder="Or paste a passage…" value={custom} onChange={(e) => setCustom(e.target.value)} aria-label="Passage" />}
        <label className="compose-label" htmlFor="compose-caption">
          What did this change for you?
        </label>
        <textarea id="compose-caption" className="input compose-caption" rows={3} placeholder="Your own words — a sentence is plenty." value={caption} onChange={(e) => setCaption(e.target.value)} />
        <button type="button" className="btn btn-primary" disabled={!quote || !caption.trim()} onClick={post}>
          Post
        </button>
      </div>
    </Sheet>
  );
}
