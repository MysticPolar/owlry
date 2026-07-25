/* ============================================================
   The type specimen — dev only, reachable at #type.

   Every role rendered at every scale step, with the app's own strings rather
   than lorem, because the system is only really "holding" when a real book
   title, a real quote and a real stat chip all sit together and still read as
   one voice. Faster to check than any code review.

   Dev-only twice over: gated on import.meta.env.DEV AND loaded through a
   dynamic import, so it is tree-shaken out of production entirely.
   ============================================================ */
const ROLES: { token: string; label: string; family: string; sample: string }[] = [
  { token: '--t-display-xl', label: 'display-xl', family: '--font-display', sample: 'READ BETTER' },
  { token: '--t-display', label: 'display', family: '--font-display', sample: 'SETTINGS.' },
  { token: '--t-title', label: 'title', family: '--font-display', sample: 'PIRANESI' },
  { token: '--t-heading', label: 'heading', family: '--font-chrome', sample: 'Tucked away' },
  { token: '--t-reading', label: 'reading', family: '--font-reading', sample: 'The house is vast. The tide keeps its own hours.' },
  { token: '--t-body', label: 'body', family: '--font-chrome', sample: 'font, size, candle and flow live inside every open book' },
  { token: '--t-callout', label: 'callout', family: '--font-chrome', sample: 'Susanna Clarke · 272 pages' },
  { token: '--t-label', label: 'label', family: '--font-chrome', sample: 'ABOUT · PEEK · OPEN' },
  { token: '--t-micro', label: 'micro (the floor)', family: '--font-chrome', sample: 'OWL POST · READING LETTER' },
];

const SCALES = [1, 1.3, 1.5, 2];

export default function TypeSpecimen() {
  return (
    <div style={{ minHeight: '100vh', background: '#1A110D', color: '#FBF3E2', padding: 24, fontFamily: 'var(--font-chrome)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-display)', fontWeight: 600, margin: '0 0 4px' }}>
        Owlry type
      </h1>
      <p style={{ fontSize: 'var(--t-micro)', letterSpacing: 'var(--track-label)', textTransform: 'uppercase', opacity: .7, margin: '0 0 28px' }}>
        three voices · one mark · {SCALES.length} scale steps
      </p>

      {SCALES.map((s) => (
        <section key={s} style={{ marginBottom: 40, fontSize: `${s * 100}%` }}>
          <div style={{
            fontSize: 'var(--t-micro)', letterSpacing: 'var(--track-label)', textTransform: 'uppercase',
            color: '#D9A94F', borderBottom: '1px solid rgba(217,169,79,.3)', paddingBottom: 6, marginBottom: 14,
          }}>
            text size {Math.round(s * 100)}%
          </div>
          {ROLES.map((r) => (
            <div key={r.token} style={{ display: 'flex', gap: 14, alignItems: 'baseline', marginBottom: 10 }}>
              <code style={{ flex: '0 0 92px', fontSize: 10, opacity: .55, fontFamily: 'ui-monospace, monospace' }}>
                {r.label}
              </code>
              <div style={{
                fontFamily: `var(${r.family})`,
                fontSize: `var(${r.token})`,
                lineHeight: r.token === '--t-reading' ? 'var(--lh-read)' : 'var(--lh-ui)',
                letterSpacing: r.token === '--t-label' || r.token === '--t-micro' ? 'var(--track-label)' : 'normal',
                textTransform: r.token === '--t-label' || r.token === '--t-micro' ? 'uppercase' : 'none',
                fontWeight: r.family === '--font-display' ? 600 : 400,
                minWidth: 0,
              }}>
                {r.sample}
              </div>
            </div>
          ))}
          {/* the accent voice + tabular numerals, the two things a table of roles hides */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', marginTop: 16 }}>
            <code style={{ flex: '0 0 92px', fontSize: 10, opacity: .55, fontFamily: 'ui-monospace, monospace' }}>accent</code>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'var(--t-callout)' }}>
              Four focused hours beat forty scattered ones.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', marginTop: 8 }}>
            <code style={{ flex: '0 0 92px', fontSize: 10, opacity: .55, fontFamily: 'ui-monospace, monospace' }}>numerals</code>
            <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: 'var(--t-callout)', fontWeight: 600 }}>
              1111 · 8888 · 84/120 · lv 7
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
