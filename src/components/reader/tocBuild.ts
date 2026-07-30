/* Helpers for synthesizing a table of contents when a copy has no nav/outline. */
import type { TocItem } from './shared';

/** Turn a spine/file href into a short human label, or '' if it is just noise. */
export function labelFromPath(href: string): string {
  const base = decodeURIComponent(href.split('/').pop()?.split('#')[0] ?? '');
  const name = base
    .replace(/\.(x?html?|xml|htm)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!name || /^\d+$/.test(name)) return '';
  // Title-case words without forcing ALLCAPS filenames into shouting
  if (name === name.toUpperCase() && name.length > 3) {
    return name.replace(/\w+/g, (w) => w[0]! + w.slice(1).toLowerCase());
  }
  return name.replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

/** Evenly spaced page entries when a PDF has no outline (always ≥1). */
export function pageChunkToc(
  pageCount: number,
  pageLabel: (n: number) => string,
): TocItem[] {
  const total = Math.max(1, Math.floor(pageCount));
  if (total <= 1) return [{ label: pageLabel(1), href: 'page:1' }];
  // aim for ~12–20 entries; never one-per-page on a 400-page PDF
  const step = Math.max(1, Math.ceil(total / 16));
  const items: TocItem[] = [];
  for (let page = 1; page <= total; page += step) {
    items.push({ label: pageLabel(page), href: `page:${page}` });
  }
  if (items[items.length - 1]?.href !== `page:${total}`) {
    items.push({ label: pageLabel(total), href: `page:${total}` });
  }
  return items;
}

const HEADING_RE =
  /^(?:(?:chapter|chap\.?|part|book|section|act|prologue|epilogue|introduction|preface|afterword|附录|第)\b|[IVXLC]+\.?\s+\S|\d+(?:\.\d+)*\.?\s+\S)/i;

/** Prefer real headings in a TXT; otherwise chunk by paragraph count. */
export function textToc(
  paragraphs: string[],
  sectionLabel: (n: number) => string,
): TocItem[] {
  if (!paragraphs.length) return [{ label: sectionLabel(1), href: 'frac:0' }];

  const headings: TocItem[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const line = paragraphs[i]!.trim();
    if (line.length < 2 || line.length > 80) continue;
    if (!HEADING_RE.test(line) && !(line === line.toUpperCase() && /[A-Z\u4e00-\u9fff]/.test(line) && line.length < 48)) {
      continue;
    }
    const frac = paragraphs.length <= 1 ? 0 : i / (paragraphs.length - 1);
    headings.push({ label: line, href: `frac:${frac.toFixed(4)}` });
    if (headings.length >= 40) break;
  }
  if (headings.length >= 2) return headings;

  const chunks = Math.min(16, Math.max(1, Math.ceil(paragraphs.length / 8)));
  const items: TocItem[] = [];
  for (let c = 0; c < chunks; c++) {
    const frac = chunks <= 1 ? 0 : c / (chunks - 1);
    items.push({ label: sectionLabel(c + 1), href: `frac:${frac.toFixed(4)}` });
  }
  return items;
}
