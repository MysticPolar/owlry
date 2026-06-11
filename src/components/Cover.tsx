import { Fragment } from 'react';
import { BOOKS } from '../content/books';
import type { BookId } from '../content/types';
import { spineLines } from '../lib/format';

interface CoverProps {
  id: BookId;
  /** size class: cover-lg | cover-md | cover-sm | cover-xs | cover-g */
  cls: string;
}

/** An illustrated-spine cover — the brand. CSS-drawn, no images. */
export function Cover({ id, cls }: CoverProps) {
  const b = BOOKS[id];
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
    </div>
  );
}
