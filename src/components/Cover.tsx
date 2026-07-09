import { Fragment } from 'react';
import type { BookRef } from '../content/types';
import { getBook } from '../lib/bookRegistry';
import { spineLines } from '../lib/format';

interface CoverProps {
  id: BookRef;
  /** size class: cover-lg | cover-md | cover-sm | cover-xs | cover-g */
  cls: string;
}

/** An illustrated-spine cover — the brand. CSS-drawn, no images. */
export function Cover({ id, cls }: CoverProps) {
  const b = getBook(id);
  if (!b) return <div className={`cover ${cls}`} />;
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
