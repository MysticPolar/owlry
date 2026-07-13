import { useEffect, useMemo, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { getBook, getGuide } from '../../lib/bookRegistry';
import { useTypewriter } from '../../hooks/useTypewriter';
import { Icon } from '../Icon';
import { Cover } from '../Cover';
import { CastOwl } from '../CastOwl';

/** letters that have already typed out once this session — re-opening shows them instantly */
const typedOnce = new Set<string>();

export function Letter() {
  const letterId = useStore((s) => s.letterId);
  const letterStatus = useStore((s) => s.letterStatus);
  const closeLetter = useStore((s) => s.closeLetter);
  const toggleSave = useStore((s) => s.toggleSave);
  const openBook = useStore((s) => s.openBook);
  const openSheet = useStore((s) => s.openSheet);
  const openLetter = useStore((s) => s.openLetter);
  const saved = useStore((s) => (s.letterId ? s.savedIds.includes(s.letterId) : false));
  const reduceMotion = useStore((s) => s.prefs.reduceMotion);

  const id = letterId;
  const g = id && letterStatus === 'ready' ? getGuide(id) : null;
  const b = id ? getBook(id) : null;
  const open = Boolean(id);
  const bodyRef = useRef<HTMLDivElement>(null);

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

  if (!open) return null;

  return (
    <div className="letter on" id="letter" role="dialog" aria-modal="true" aria-label="Peek">
      <div className="l-top">
        <button className="iconbtn lite" aria-label="Close peek" onClick={closeLetter}>
          <Icon name="ti-arrow-left" />
        </button>
        <div className="d">
          <CastOwl owl="peek" cls="mini" />
          OWL POST
        </div>
        {id ? (
          <button
            className={`save ${saved ? 'on' : ''}`}
            style={{ position: 'static' }}
            aria-label="Save to library"
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
          <button className="l-skip" onClick={skip}>SHOW FULL LETTER</button>
        )}
        {/* the letter is generated on tap; show it being written first */}
        {writing && b && (
          <>
            <div className="l-kick">OWL POST · READING LETTER</div>
            <div className="l-ttl d">{b.t}</div>
            <div className="l-auth">
              {b.a} · {b.n} pages
            </div>
            <div className="l-writing">
              <span className="tdots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span className="it">peek is writing your letter…</span>
            </div>
          </>
        )}

        {failed && b && (
          <>
            <div className="l-kick">OWL POST · READING LETTER</div>
            <div className="l-ttl d">{b.t}</div>
            <div className="l-auth">
              {b.a} · {b.n} pages
            </div>
            <div className="l-writing">
              <span className="it">the ink ran mid-sentence. one more try?</span>
              <button className="btn xs" onClick={() => id && openLetter(id)}>
                TRY AGAIN <Icon name="ti-refresh" />
              </button>
            </div>
          </>
        )}

        {g && b && id && (
          <div className="l-swap" key={id}>
            <div className="l-kick">OWL POST · PEEK</div>
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
              {b.a} · {b.n} pages
            </div>
            <div className="l-res it">{type(g.res)}</div>

            {shown >= at() && <div className="l-sec">RECOMMENDED CHAPTER</div>}
            <div className="l-chap d">&ldquo;{type(g.chap)}&rdquo;</div>

            {shown >= at() && <div className="l-sec">1 · THE CORE IDEA</div>}
            <p className="l-p">{type(g.core)}</p>

            {shown >= at() && <div className="l-sec">2 · INSIGHTS FROM THE CHAPTER</div>}
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
                      <span className="l-tag">from the book</span>
                      <p>{ex}</p>
                    </div>
                  )}
                  {n.q && q && (
                    <div className="l-q it">
                      &ldquo;{q}&rdquo;<small>{by}</small>
                    </div>
                  )}
                </div>
              );
            })}

            {shown >= at() && <div className="l-sec">3 · CLOSING REFLECTION</div>}
            <p className="l-p">{type(g.close)}</p>
            {g.take.map((t, i) => {
              const v = type(t);
              return v ? (
                <p className="l-p l-note" key={i}>
                  <span className="l-tag">take with you</span>
                  {v}
                </p>
              ) : null;
            })}
            {g.ask.map((t, i) => {
              const v = type(t);
              return v ? (
                <p className="l-p l-note it" key={i}>
                  <span className="l-tag">to sit with</span>
                  {v}
                </p>
              ) : null;
            })}

            {/* the further reading + actions land once the letter is fully written */}
            {done && (
              <>
                <div className="l-sec">FURTHER READING</div>
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
                    OPEN <Icon name="ti-arrow-right" />
                  </button>
                  <button className="btn ghost" aria-pressed={saved} onClick={() => toggleSave(id)}>
                    {saved ? (
                      <>
                        SAVED <Icon name="ti-check" />
                      </>
                    ) : (
                      <>
                        SAVE <Icon name="ti-heart" />
                      </>
                    )}
                  </button>
                </div>
                <div className="l-sign it">— sorted with care, the owl post office</div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
