import type { Segment } from '../../store/types';
import { figure } from '../figures';

/** plain paraphrase — rendered as the figure's AI interpretation */
export const t = (text: string): Segment => ({ kind: 'text', text });

/** a verbatim line: always one of the figure's verified quotes, never free text */
export const q = (figureId: string, index = 0): Segment => {
  const quote = figure(figureId).quotes[index];
  if (!quote) throw new Error(`figure ${figureId} has no quote #${index}`);
  return { kind: 'quote', text: quote.text, source: quote.source };
};
