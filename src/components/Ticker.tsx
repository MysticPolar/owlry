/* ============================================================
   The yellow ticker from the landing page: a strip of short phrases that
   crawls under the council room. Two identical halves scroll by half the
   track's width, so the loop never shows a seam. Decorative — the words
   repeat what the screen already says, so it is hidden from readers using
   a screen reader.
   ============================================================ */
export function Ticker({ items }: { items: readonly string[] }) {
  // enough repeats that one half always spans a phone's width
  const run = [...items, ...items, ...items];
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {[0, 1].map((half) => (
          <span className="ticker-half" key={half}>
            {run.map((phrase, i) => (
              <span className="ticker-item" key={`${half}-${i}`}>
                {phrase}
                <i className="ticker-dot" />
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
