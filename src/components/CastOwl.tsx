import { useState } from 'react';
import { useStore } from '../store/useStore';

/* ============================================================
   The cast, tappable. Every owl in the app answers a tap with a
   line in its own voice (docs/story-bible.md) and a little pop.
   The svg keeps the mockup's `.owl.hero/.owl.mini` classes so all
   positioning/animation CSS applies; the pop animates an INNER
   group so it composes with the hero's swoop/perch transforms.
   ============================================================ */
export type CastOwlName = 'scout' | 'peek' | 'scribe' | 'mirror' | 'keeper';

const VOICE: Record<CastOwlName, string[]> = {
  scout: [
    'okay okay okay — this one first.',
    'i found four more. sorting!',
    'tell me what’s going on.',
  ],
  peek: [
    'just the first chapter.',
    'life’s short. chapters are shorter.',
    'i’ll tell you how it starts.',
  ],
  scribe: [
    'page 118. not 117.',
    'kept. every line, verbatim.',
    'say it again — slower.',
  ],
  mirror: ['…', 'you already know.', 'mm.'],
  keeper: [
    'i counted twice.',
    'we take arrivals, not returns.',
    'day by day. don’t make me restart.',
  ],
};

const JOB: Record<CastOwlName, string> = {
  scout: 'the postmaster',
  peek: 'first chapters',
  scribe: 'the archive',
  mirror: 'the radar',
  keeper: 'the shelves',
};

/* each owl cycles through its lines across taps, anywhere in the app */
const counters: Record<CastOwlName, number> = { scout: 0, peek: 0, scribe: 0, mirror: 0, keeper: 0 };

export function owlLine(owl: CastOwlName): string {
  const lines = VOICE[owl];
  return lines[counters[owl]++ % lines.length];
}

export function CastOwl({ owl, cls }: { owl: CastOwlName; cls: 'hero' | 'mini' }) {
  const showToast = useStore((s) => s.showToast);
  const [nonce, setNonce] = useState(0);
  const speak = () => {
    showToast('ti-feather', owlLine(owl));
    setNonce((n) => n + 1);
  };
  return (
    <svg
      className={`owl ${cls} tap`}
      viewBox="0 0 120 130"
      role="button"
      tabIndex={0}
      aria-label={`${owl}, ${JOB[owl]} — tap for a word`}
      onClick={(e) => {
        speak();
        // pointer taps shouldn't leave a focus ring on a tabindex'd svg
        // (keyboard activation keeps it — keydown doesn't blur)
        (e.currentTarget as unknown as { blur?: () => void }).blur?.();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          speak();
        }
      }}
    >
      <g key={nonce} className={nonce ? 'owlpop' : undefined}>
        <use href={`#owl-${owl}`} />
      </g>
    </svg>
  );
}
