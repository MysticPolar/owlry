/* ============================================================
   The feed API — owlry_council_posts / _likes / _follows / _profiles.

   Posts are readable by every signed-in reader; likes are counted from
   the likes table (never stored on the post); follows are by handle. All
   calls are no-ops without a backend, and the store keeps the seed feed
   in front of the reader either way.
   ============================================================ */
import { supabase, currentUserId } from '../supabase';
import { uid as newId } from '../../app/ids';
import type { Post } from '../../store/types';

const COLORS = ['#B07A2A', '#8A5CE0', '#2FB8A6', '#E2483C', '#2F4A6B', '#5B4A3A', '#C2185B', '#00796B'];

/** a stable colour for a handle, so the same reader always gets the same avatar */
function colorFor(handle: string): string {
  let h = 0;
  for (const ch of handle) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

interface PostRow {
  id: string;
  user_id: string;
  quote: string;
  book_id: string | null;
  attribution: string;
  caption: string;
  prompt: string | null;
  created_at: string;
  author: { handle: string; name: string; color: string } | null;
  likes: { count: number }[] | null;
}

function toPost(r: PostRow, me: string | null): Post {
  const handle = r.author?.handle ?? 'reader';
  const name = r.author?.name ?? 'Reader';
  return {
    id: r.id,
    author: { handle, name, color: r.author?.color && r.author.color !== '#FFD100' ? r.author.color : colorFor(handle), initial: (name[0] || 'R').toUpperCase() },
    ts: new Date(r.created_at).getTime(),
    quote: r.quote,
    bookId: r.book_id ?? undefined,
    attribution: r.attribution,
    caption: r.caption,
    likes: r.likes?.[0]?.count ?? 0,
    comments: 0,
    mine: me !== null && r.user_id === me,
    remote: true,
    ...(r.prompt ? { prompt: r.prompt } : {}),
  };
}

export interface Feed {
  posts: Post[];
  liked: string[];
  following: string[];
}

/** the latest posts, plus which of them I liked and whom I follow */
export async function fetchFeed(): Promise<Feed | null> {
  if (!supabase) return null;
  const me = await currentUserId();
  if (!me) return null;
  const [{ data: rows, error }, { data: likes }, { data: follows }] = await Promise.all([
    supabase
      .from('owlry_council_posts')
      .select('id, user_id, quote, book_id, attribution, caption, prompt, created_at, author:owlry_council_profiles(handle, name, color), likes:owlry_council_likes(count)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('owlry_council_likes').select('post_id').eq('user_id', me),
    supabase.from('owlry_council_follows').select('handle').eq('user_id', me),
  ]);
  if (error) throw error;
  return {
    posts: ((rows ?? []) as unknown as PostRow[]).map((r) => toPost(r, me)),
    liked: ((likes ?? []) as { post_id: string }[]).map((l) => l.post_id),
    following: ((follows ?? []) as { handle: string }[]).map((f) => f.handle),
  };
}

export async function createPost(p: { quote: string; bookId?: string; attribution: string; caption: string; prompt?: string }): Promise<string | null> {
  if (!supabase) return null;
  const me = await currentUserId();
  if (!me) return null;
  const id = newId('p');
  const { error } = await supabase.from('owlry_council_posts').insert({
    id,
    user_id: me,
    quote: p.quote.slice(0, 600),
    book_id: p.bookId ?? null,
    attribution: p.attribution.slice(0, 160),
    caption: p.caption.slice(0, 600),
    prompt: p.prompt ?? null,
  });
  if (error) throw error;
  return id;
}

export async function deletePost(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('owlry_council_posts').delete().eq('id', id);
  if (error) throw error;
}

export async function setLike(postId: string, on: boolean): Promise<void> {
  if (!supabase) return;
  const me = await currentUserId();
  if (!me) return;
  const { error } = on
    ? await supabase.from('owlry_council_likes').upsert({ post_id: postId, user_id: me }, { onConflict: 'post_id,user_id', ignoreDuplicates: true })
    : await supabase.from('owlry_council_likes').delete().eq('post_id', postId).eq('user_id', me);
  if (error) throw error;
}

export async function setFollow(handle: string, on: boolean): Promise<void> {
  if (!supabase) return;
  const me = await currentUserId();
  if (!me) return;
  const { error } = on
    ? await supabase.from('owlry_council_follows').upsert({ user_id: me, handle }, { onConflict: 'user_id,handle', ignoreDuplicates: true })
    : await supabase.from('owlry_council_follows').delete().eq('user_id', me).eq('handle', handle);
  if (error) throw error;
}
