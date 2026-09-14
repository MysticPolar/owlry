import { useState } from 'react';
import type { Book } from '../content/types';

/* ============================================================
   Book covers. A typographic cover on the book's palette colour is always
   drawn; the real jacket (Open Library's keyless cover API, by ISBN) fades
   in over it once it has loaded — so a slow or missing image never leaves
   a hole on the shelf.
   ============================================================ */
export function coverUrl(book: Book, size: 'S' | 'M' | 'L' = 'M'): string | null {
  return book.isbn ? `https://covers.openlibrary.org/b/isbn/${book.isbn}-${size}.jpg?default=false` : null;
}

export function Cover({
  book,
  width = 64,
  className = '',
  size,
}: {
  book: Book;
  width?: number;
  className?: string;
  size?: 'S' | 'M' | 'L';
}) {
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);
  const url = coverUrl(book, size ?? (width > 120 ? 'L' : 'M'));
  const height = Math.round(width * 1.5);
  return (
    <span
      className={`cover ${className}`}
      style={{ width, height, background: book.palette.bg, color: book.palette.fg }}
      aria-label={`${book.title} by ${book.authorName}`}
      role="img"
    >
      <span className="cover-type" style={{ fontSize: Math.max(6, Math.round(width * 0.1)) }} aria-hidden="true">
        <span className="cover-title">{book.title}</span>
        <span className="cover-author">{book.authorName}</span>
      </span>
      {url && !broken && (
        <img
          className={`cover-img ${loaded ? 'loaded' : ''}`}
          src={url}
          alt=""
          width={width}
          height={height}
          loading="lazy"
          onLoad={(e) => {
            // Open Library answers "no cover" with a 1×1 pixel when default=false is ignored
            const img = e.currentTarget;
            if (img.naturalWidth > 2) setLoaded(true);
            else setBroken(true);
          }}
          onError={() => setBroken(true)}
        />
      )}
    </span>
  );
}
