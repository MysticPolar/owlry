import { useEffect, useRef } from 'react';
import { useStore, getRecLetterData } from '../../store/useStore';
import { BOOKS } from '../../content/books';
import { GUIDES } from '../../content/guides';
import { isGuide } from '../../lib/format';
import { Icon } from '../Icon';
import { Cover } from '../Cover';
import { CastOwl } from '../CastOwl';

export function Letter() {
  const letterId = useStore((s) => s.letterId);
  const recLetter = useStore((s) => s.recLetter);
  const closeLetter = useStore((s) => s.closeLetter);
  const toggleSave = useStore((s) => s.toggleSave);
  const openReader = useStore((s) => s.openReader);
  const openSheet = useStore((s) => s.openSheet);
  const openLetter = useStore((s) => s.openLetter);
  const openRecLetter = useStore((s) => s.openRecLetter);
  const saved = useStore((s) => (s.letterId ? s.savedIds.includes(s.letterId) : false));

  const id = letterId;
  const g = id ? GUIDES[id] : null;
  const b = id ? BOOKS[id] : null;
  const rec = !id ? recLetter : null;
  const recData = rec && rec.status === 'ready' ? getRecLetterData(rec.title) : undefined;
  const open = Boolean(id || rec);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [open, id, rec?.title, rec?.status]);

  return (
    <div className={`letter ${open ? 'on' : ''}`} id="letter" role="dialog" aria-modal="true" aria-label="Reading letter">
      <div className="l-top">
        <button className="iconbtn lite" aria-label="Close letter" onClick={closeLetter}>
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

      <div className="l-body" id="ltBody" ref={bodyRef}>
        {g && b && id && (
          <div className="l-swap" key={id}>
            <div className="l-kick">OWL POST · READING LETTER</div>
            <div className="l-ttl d">
              <span
                className="l-ttl-link"
                role="button"
                tabIndex={0}
                onClick={() => openSheet(id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openSheet(id);
                  }
                }}
              >
                {b.t}
              </span>
            </div>
            <div className="l-auth">
              {b.a} · {b.n} pages
            </div>
            <div className="l-res it">{g.res}</div>

            <div className="l-sec">RECOMMENDED CHAPTER</div>
            <div className="l-chap d">&ldquo;{g.chap}&rdquo;</div>

            <div className="l-sec">1 · THE CORE IDEA</div>
            <p className="l-p">{g.core}</p>

            <div className="l-sec">2 · INSIGHTS FROM THE CHAPTER</div>
            {g.ins.map((n, i) => (
              <div className="l-ins" key={i}>
                <div className="l-ins-t d">
                  {i + 1}. {n.t}
                </div>
                <p className="l-p">{n.r}</p>
                <p className="l-p">
                  <span className="l-tag">from the book</span>
                  {n.ex}
                </p>
                {n.q && (
                  <div className="l-q it">
                    &ldquo;{n.q.t}&rdquo;<small>{n.q.by}</small>
                  </div>
                )}
              </div>
            ))}

            <div className="l-sec">3 · CLOSING REFLECTION</div>
            <p className="l-p">{g.close}</p>
            {g.take.map((t, i) => (
              <p className="l-p" key={i}>
                <span className="l-tag">take with you</span>
                {t}
              </p>
            ))}
            {g.ask.map((t, i) => (
              <p className="l-p it" key={i}>
                <span className="l-tag">to sit with</span>
                {t}
              </p>
            ))}

            <div className="l-sec">FURTHER READING</div>
            {g.fr.map((f, i) => {
              const fb = BOOKS[f.id];
              const frGuide = isGuide(f.id);
              return (
                <button
                  className="fr-row"
                  key={i}
                  onClick={() => (isGuide(f.id) ? openLetter(f.id) : openSheet(f.id))}
                >
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
              <button className="btn" onClick={() => openReader(id)}>
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
          </div>
        )}

        {/* open-world letter: content arrives only after the card is tapped */}
        {rec && (
          <div className="l-swap" key={rec.title + rec.status}>
            <div className="l-kick">OWL POST · READING LETTER</div>
            <div className="l-ttl d">{rec.title}</div>
            <div className="l-auth">{rec.author}</div>
            {rec.note && <div className="l-res it">{rec.note}</div>}

            {rec.status === 'loading' && (
              <div className="l-wait">
                <span className="tdots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <div className="it">sorting your letter…</div>
              </div>
            )}

            {rec.status === 'error' && (
              <div className="l-wait">
                <div className="it">the ink ran mid-sentence. one more try?</div>
                <button className="btn xs" onClick={() => openRecLetter(rec.title, rec.author, rec.note)}>
                  TRY AGAIN <Icon name="ti-refresh" />
                </button>
              </div>
            )}

            {rec.status === 'ready' && recData && (
              <>
                {recData.res && <div className="l-res it">{recData.res}</div>}
                {recData.chap && (
                  <>
                    <div className="l-sec">RECOMMENDED CHAPTER</div>
                    <div className="l-chap d">&ldquo;{recData.chap}&rdquo;</div>
                  </>
                )}
                <div className="l-sec">1 · THE CORE IDEA</div>
                <p className="l-p">{recData.core}</p>

                <div className="l-sec">2 · INSIGHTS FROM THE BOOK</div>
                {recData.ins.map((n, i) => (
                  <div className="l-ins" key={i}>
                    <div className="l-ins-t d">
                      {i + 1}. {n.t}
                    </div>
                    <p className="l-p">{n.r}</p>
                    <p className="l-p">
                      <span className="l-tag">from the book</span>
                      {n.ex}
                    </p>
                    {n.q && (
                      <div className="l-q it">
                        &ldquo;{n.q.t}&rdquo;<small>{n.q.by}</small>
                      </div>
                    )}
                  </div>
                ))}

                <div className="l-sec">3 · CLOSING REFLECTION</div>
                <p className="l-p">{recData.close}</p>
                {recData.take.map((t, i) => (
                  <p className="l-p" key={i}>
                    <span className="l-tag">take with you</span>
                    {t}
                  </p>
                ))}
                {recData.ask.map((t, i) => (
                  <p className="l-p it" key={i}>
                    <span className="l-tag">to sit with</span>
                    {t}
                  </p>
                ))}
                <div className="l-sign it">— sorted with care, the owl post office</div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
