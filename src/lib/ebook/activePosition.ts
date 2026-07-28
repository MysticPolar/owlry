import type { ReadingPosition } from './types';
import type { EbookOwner } from './storage';

interface ActiveReadingPosition {
  owner: EbookOwner;
  peek: () => ReadingPosition | null;
  flush: () => Promise<void>;
}

let active: ActiveReadingPosition | null = null;

/**
 * Exposes only the currently open reader's pending anchor. This lets an auth
 * boundary snapshot the final CFI/page synchronously before React unmounts the
 * reader, without persisting guest positions or coupling the store to a view.
 */
export function registerActiveReadingPosition(
  owner: EbookOwner,
  peek: () => ReadingPosition | null,
  flush: () => Promise<void>,
): () => void {
  const registration = { owner, peek, flush };
  active = registration;
  return () => {
    if (active === registration) active = null;
  };
}

export function peekActiveReadingPosition(
  owner: EbookOwner,
): ReadingPosition | null {
  return active?.owner === owner ? active.peek() : null;
}

export async function flushActiveReadingPosition(
  owner: EbookOwner,
): Promise<void> {
  if (active?.owner === owner) await active.flush();
}
