import { Fragment, useState } from 'react';
import type { BookRef } from '../content/types';
import { getBook } from '../lib/bookRegistry';
import { spineLines } from '../lib/format';
import { useBookMeta } from '../hooks/useBookMeta';

interface CoverProps {
  id: BookRef;
  /** size class: cover-lg | cover-md | cover-sm | cover-xs | cover-g */
  cls: string;
}

/**
 * A book cover. The CSS-drawn spine is always rendered as the base; when a real
 * Google Books cover image is available (pre-baked for catalog books, resolved
 * at runtime for open-world ones) it fades in over the spine. Missing / broken /
 * offline covers fall straight back to the spine — never a blank box.
 */
export function Cover({ id, cls }: CoverProps) {
  const b = getBook(id);
  const meta = useBookMeta(id);
  const [brokenId, setBrokenId] = useState<BookRef | null>(null);
  if (!b) return <div className={`cover ${cls}`} />;
  const img = brokenId === id ? undefined : b.img ?? meta?.img;
  return (
    <div className={`cover ${cls}`} style={{ background: b.c }}>
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
    </div>
  );
}
