import { Fragment, useState } from 'react';
import type { BookId, BookRef } from '../content/types';
import { getBook } from '../lib/bookRegistry';
import { COVER_ART } from '../content/covers';
import { spineLines } from '../lib/format';
import { useBookMeta } from '../hooks/useBookMeta';

interface CoverProps {
  id: BookRef;
  /** size class: cover-lg | cover-md | cover-sm | cover-xs | cover-g */
  cls: string;
}

/**
 * A book cover. Catalog books carry a bespoke flat Playbill jacket (see
 * content/covers.ts) that fills the frame edge-to-edge. Books without one fall
 * back to the CSS-drawn spine as the base, with a real Google Books cover image
 * fading in over it when available (resolved at runtime for open-world books).
 * Missing / broken / offline covers fall straight back to the spine — never a
 * blank box.
 */
export function Cover({ id, cls }: CoverProps) {
  const b = getBook(id);
  const meta = useBookMeta(id);
  const [brokenId, setBrokenId] = useState<BookRef | null>(null);
  if (!b) return <div className={`cover ${cls}`} />;
  const art = COVER_ART[id as BookId];
  const img = brokenId === id ? undefined : b.img ?? meta?.img;
  return (
    <div className={`cover ${cls}`} style={{ background: b.c }}>
      {art ? (
        <div className="cover-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: art }} />
      ) : (
        <>
          <div className="it" style={{ color: b.tc ?? '#E8E0BC' }}>
            {spineLines(b.s).map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {line}
              </Fragment>
            ))}
          </div>
          {img && (
            <img
              className="cover-img"
              src={img}
              alt={`${b.t} by ${b.a}`}
              loading="lazy"
              onError={() => setBrokenId(id)}
              onLoad={(e) => e.currentTarget.classList.add('on')}
            />
          )}
        </>
      )}
    </div>
  );
}
