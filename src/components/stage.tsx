import type { ReactNode } from 'react';
import { Wordmark } from './Wordmark';

/* ============================================================
   Shared stage frame (Flat Playbill). The curtain valance/hem and
   the per-view StageBar (hem + wordmark) so every screen reads as
   the same theatre. Ornament lives here and nowhere else.
   ============================================================ */

/** Full scalloped valance — the home masthead's curtain. */
export function CurtainValance() {
  return (
    <svg className="pb-valance" viewBox="0 0 370 106" aria-hidden="true">
      <clipPath id="pb-cv">
        <path d="M0,0 H370 V64 Q347,92 324,64 Q301,92 278,64 Q255,92 231,64 Q208,92 185,64 Q162,92 139,64 Q116,92 92,64 Q69,92 46,64 Q23,92 0,64 Z" />
      </clipPath>
      <g clipPath="url(#pb-cv)">
        <rect x="0" width="24" height="96" fill="#8C2431" /><rect x="23" width="24" height="96" fill="#671A24" /><rect x="46" width="24" height="96" fill="#8C2431" /><rect x="69" width="24" height="96" fill="#671A24" /><rect x="92" width="25" height="96" fill="#8C2431" /><rect x="116" width="24" height="96" fill="#671A24" /><rect x="139" width="24" height="96" fill="#8C2431" /><rect x="162" width="24" height="96" fill="#671A24" /><rect x="185" width="24" height="96" fill="#8C2431" /><rect x="208" width="24" height="96" fill="#671A24" /><rect x="231" width="24" height="96" fill="#8C2431" /><rect x="254" width="25" height="96" fill="#671A24" /><rect x="278" width="24" height="96" fill="#8C2431" /><rect x="301" width="24" height="96" fill="#671A24" /><rect x="324" width="24" height="96" fill="#8C2431" /><rect x="347" width="23" height="96" fill="#671A24" />
      </g>
      <path d="M370,64 Q347,92 324,64 Q301,92 278,64 Q255,92 231,64 Q208,92 185,64 Q162,92 139,64 Q116,92 92,64 Q69,92 46,64 Q23,92 0,64" fill="none" stroke="#D9A94F" strokeWidth="3" />
      <rect x="0" width="370" height="4" fill="#B08437" />
      <rect x="68" y="86" width="2" height="9" fill="#D9A94F" /><ellipse cx="69" cy="99" rx="4.5" ry="7" fill="#D9A94F" />
      <rect x="300" y="86" width="2" height="9" fill="#D9A94F" /><ellipse cx="301" cy="99" rx="4.5" ry="7" fill="#D9A94F" />
    </svg>
  );
}

/** Gathered hem — the collapsed/secondary-view curtain edge. */
export function CurtainHem() {
  return (
    <svg className="pb-hem" viewBox="0 0 370 14" aria-hidden="true">
      <rect width="370" height="8" fill="#8C2431" />
      <path d="M370,6 Q358,13 347,6 Q335,13 324,6 Q312,13 301,6 Q289,13 278,6 Q266,13 255,6 Q243,13 231,6 Q220,13 208,6 Q197,13 185,6 Q174,13 162,6 Q151,13 139,6 Q128,13 116,6 Q105,13 92,6 Q81,13 69,6 Q58,13 46,6 Q35,13 23,6 Q12,13 0,6" fill="none" stroke="#D9A94F" strokeWidth="2" />
    </svg>
  );
}

/**
 * The header for non-home views: the wordmark over a gathered hem, so Ask and
 * Profile hang from the same curtain as the home stage. `children` slot into the
 * bar (e.g. a settings gear) at the right.
 */
export function StageBar({ children }: { children?: ReactNode }) {
  return (
    <div className="pb-stagehead">
      <div className="pb-stagebar">
        <span className="pb-stagebar-wm">
          <Wordmark />
        </span>
        {children}
      </div>
      <CurtainHem />
    </div>
  );
}
