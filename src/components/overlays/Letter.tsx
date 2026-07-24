import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useT } from '../../i18n/react';
import { getBook, getGuide } from '../../lib/bookRegistry';
import { useTypewriter } from '../../hooks/useTypewriter';
import { useModalFocus } from '../../hooks/useModalFocus';
import { useOverlayPresence } from '../../hooks/useOverlayPresence';
import { usePullDismiss } from '../../hooks/usePullDismiss';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { Icon } from '../Icon';
import { Cover } from '../Cover';
import { CastOwl } from '../CastOwl';

/** letters that have already typed out once this session — re-opening shows them instantly */
const typedOnce = new Set<string>();

/** the "save line" chip — keeping a line is scribe's trigger */
function SaveLine() {
  const t = useT();
  const saveQuote = useStore((s) => s.saveQuote);
  const [saved, setSaved] = useState(false);
  return (
    <button
      className={`lq-save${saved ? ' on' : ''}`}
      aria-pressed={saved}
      onClick={() => {
        if (saved) return;
        setSaved(true);
        saveQuote();
      }}
    >
      <Icon name={saved ? 'ti-check' : 'ti-quote'} />
      {saved ? t.reader.savedLine : t.reader.saveLine}
    </button>
  );
}

export function Letter() {
  const t = useT();
  const letterId = useStore((s) => s.letterId);
  const letterStatus = useStore((s) => s.letterStatus);
  const closeLetter = useStore((s) => s.closeLetter);
  const toggleSave = useStore((s) => s.toggleSave);
  const openBook = useStore((s) => s.openBook);
  const openSheet = useStore((s) => s.openSheet);
  const openLetter = useStore((s) => s.openLetter);
  const saved = useStore((s) => (s.letterId ? s.savedIds.includes(s.letterId) : false));
  const reduceMotion = useStore((s) => s.prefs.reduceMotion);

  const open = Boolean(letterId);
  const dialogRef = useRef<HTMLDivElement>(null);
  const grabRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const reduce = useReduceMotion();
  // stays mounted while the exit slide plays; the id is latched so the letter's
  // content doesn't blank the moment the store clears letterId
  const { mounted, shown: present, dismissedRef } = useOverlayPresence(open, { ref: dialogRef });
  const heldId = useRef(letterId);
  if (letterId) heldId.current = letterId;
  const id = letterId ?? (mounted ? heldId.current : null);
  const g = id && letterStatus === 'ready' ? getGuide(id) : null;
  const b = id ? getBook(id) : null;
  useModalFocus(open && mounted, closeLetter, dialogRef);
  usePullDismiss({ enabled: open && mounted, onClose: closeLetter, cardRef: dialogRef, grabRef, scrollRef: bodyRef, reduce, dismissedRef });

  useEffect(() => {
    if (id && bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [id, letterStatus]);

  // the letter is "written" with a typewriter the first time it's shown
  const total = useMemo(() => {
    if (!g) return 0;
    let n = g.res.length + g.chap.length + g.core.length + g.close.length;
    for (const x of g.ins) n += x.t.length + x.r.length + x.ex.length + (x.q ? x.q.t.length + x.q.by.length : 0);
    for (const t of g.take) n += t.length;
    for (const t of g.ask) n += t.length;
    return n;
  }, [g]);
  // type out on first reveal; show instantly if this letter has already been written once
  const firstReveal = !!id && !typedOnce.has(id);
  const { shown, done, skip } = useTypewriter(total, { enabled: !!g && firstReveal, reduceMotion });
  useEffect(() => {
    if (id && g && done) typedOnce.add(id);
  }, [id, g, done]);

  // cursor-based reveal: type() consumes budget; blocks render once the cursor reaches them
  let cur = 0;
  const type = (s: string): string => {
    const start = cur;
    cur += s.length;
    if (shown >= start + s.length) return s;
    if (shown <= start) return '';
    return s.slice(0, shown - start);
  };
  const at = (): number => cur;

  const writing = !!id && letterStatus === 'loading';
  // openLetter drops letterStatus to 'idle' (with the overlay still open) only when
  // generation failed — offer a retry rather than an endless "writing…"
  const failed = !!id && !g && letterStatus === 'idle';

  if (!mounted) return null;

  return (
    <div className={`letter${present ? ' on' : ''}`} id="letter" role="dialog" aria-modal="true" aria-label={t.reader.letterAria} ref={dialogRef} tabIndex={-1}>
      <div className="l-top pb-pull-grab" ref={grabRef}>
        <button className="iconbtn lite" aria-label={t.reader.closePeekAria} onClick={closeLetter}>
          <Icon name="ti-arrow-left" />
        </button>
        <div className="d">
          <CastOwl owl="peek" cls="mini" />
          {t.reader.owlPost}
        </div>
        {id ? (
          <button
            className={`save ${saved ? 'on' : ''}`}
            style={{ position: 'static' }}
            aria-label={t.reader.saveAria}
            aria-pressed={saved}
            onClick={() => toggleSave(id)}
          >
            <Icon name="ti-heart" />
          </button>
        ) : (
          <span style={{ flex: '0 0 32px' }} aria-hidden="true" />
        )}
      </div>

      <div className="l-body" id="ltBody" ref={bodyRef} aria-busy={Boolean(g && !done)}>
        {g && !done && (
          <button className="l-skip" onClick={skip}>{t.reader.showFullLetter}</button>
        )}
        {/* the letter is generated on tap; show it being written first */}
        {writing && b && (
          <>
            <div className="l-kick">{t.reader.kickReadingLetter}</div>
            <div className="l-ttl d">{b.t}</div>
            <div className="l-auth">
              {b.a} · {t.reader.pages(b.n)}
            </div>
            <div className="l-writing">
              <span className="tdots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span className="it">{t.reader.peekWriting}</span>
            </div>
          </>
        )}

        {failed && b && (
          <>
            <div className="l-kick">{t.reader.kickReadingLetter}</div>
            <div className="l-ttl d">{b.t}</div>
            <div className="l-auth">
              {b.a} · {t.reader.pages(b.n)}
            </div>
            <div className="l-writing">
              <span className="it">{t.reader.inkRan}</span>
              <div className="l-btnrow">
                <button className="btn xs" onClick={() => id && openLetter(id)}>
                  {t.reader.tryAgain} <Icon name="ti-refresh" />
                </button>
                <button className="btn xs ghost" onClick={() => id && openBook(id)}>
                  {t.discover.openBook}
                </button>
              </div>
            </div>
          </>
        )}

        {g && b && id && (
          <div className="l-swap" key={id}>
            <div className="l-kick">{t.reader.kickPeek}</div>
            <div className="l-ttl d">
              <button
                className="l-ttl-link"
                type="button"
                onClick={() => openSheet(id)}
              >
                {b.t}
              </button>
            </div>
            <div className="l-auth">
              {b.a} · {t.reader.pages(b.n)}
            </div>
            <div className="l-res it">{type(g.res)}</div>

            {shown >= at() && <div className="l-sec">{t.reader.secChapter}</div>}
            <div className="l-chap d">&ldquo;{type(g.chap)}&rdquo;</div>

            {shown >= at() && <div className="l-sec">{t.reader.secCore}</div>}
            <p className="l-p">{type(g.core)}</p>

            {shown >= at() && <div className="l-sec">{t.reader.secInsights}</div>}
            {g.ins.map((n, i) => {
              const tt = type(n.t);
              const rr = type(n.r);
              const ex = type(n.ex);
              const q = n.q ? type(n.q.t) : '';
              const by = n.q ? type(n.q.by) : '';
              if (!tt) return null;
              return (
                <div className="l-ins" key={i}>
                  <div className="l-ins-t d">
                    {i + 1}. {tt}
                  </div>
                  {rr && <p className="l-p">{rr}</p>}
                  {ex && (
                    <div className="l-book-note">
                      <span className="l-tag">{t.reader.tagFromBook}</span>
                      <p>{ex}</p>
                    </div>
                  )}
                  {n.q && q && (
                    <div className="l-q it">
                      &ldquo;{q}&rdquo;<small>{by}</small>
                      <SaveLine />
                    </div>
                  )}
                </div>
              );
            })}

            {shown >= at() && <div className="l-sec">{t.reader.secClosing}</div>}
            <p className="l-p">{type(g.close)}</p>
            {g.take.map((line, i) => {
              const v = type(line);
              return v ? (
                <p className="l-p l-note" key={i}>
                  <span className="l-tag">{t.reader.tagTake}</span>
                  {v}
                </p>
              ) : null;
            })}
            {g.ask.map((line, i) => {
              const v = type(line);
              return v ? (
                <p className="l-p l-note it" key={i}>
                  <span className="l-tag">{t.reader.tagSit}</span>
                  {v}
                </p>
              ) : null;
            })}

            {/* the further reading + actions land once the letter is fully written */}
            {done && (
              <>
                <div className="l-sec">{t.reader.secFurther}</div>
                {g.fr.map((f, i) => {
                  const fb = getBook(f.id);
                  if (!fb) return null;
                  const frGuide = !!getGuide(f.id);
                  return (
                    <button className="fr-row" key={i} onClick={() => (frGuide ? openLetter(f.id) : openSheet(f.id))}>
                      <Cover id={f.id} cls="cover-xs" />
                      <span className="fr-txt">
                        <span className="rtitle d">{fb.t}</span>
                        <span className="rauth" style={{ display: 'block' }}>
                          {fb.a}
                        </span>
                        <span className="fr-why">{f.why}</span>
                      </span>
                      <Icon name={frGuide ? 'ti-mail' : 'ti-info-circle'} className="fr-mark" />
                    </button>
                  );
                })}

                <div className="l-btnrow">
                  <button className="btn" onClick={() => openBook(id)}>
                    {t.reader.openBtn} <Icon name="ti-arrow-right" />
                  </button>
                  <button className="btn ghost" aria-pressed={saved} onClick={() => toggleSave(id)}>
                    {saved ? (
                      <>
                        {t.reader.savedBtn} <Icon name="ti-check" />
                      </>
                    ) : (
                      <>
                        {t.reader.saveBtn} <Icon name="ti-heart" />
                      </>
                    )}
                  </button>
                </div>
                <div className="l-sign it">{t.reader.signOff}</div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
