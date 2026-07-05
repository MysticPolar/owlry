import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import type { OwlName } from '../store/types';

/* ============================================================
   The cast, tappable and reactive. Every owl answers a tap with a
   line in its own voice (docs/story-bible.md) and a little pop —
   and pops on its own when a moment in its territory happens
   (store.owlReact: keeper on save/finish, peek on letters, …).
   The svg keeps the mockup's `.owl.hero/.owl.mini` classes so all
   positioning/animation CSS applies; the pop animates an INNER
   group so it composes with the hero's swoop/perch transforms.
   ============================================================ */
export type CastOwlName = OwlName;

const VOICE: Record<CastOwlName | 'scout-pro', string[]> = {
  scout: [
    'okay okay okay — this one first.',
    'i found four more. sorting!',
    'tell me what’s going on.',
  ],
  'scout-pro': [
    'office hours. what are we solving?',
    'goal first. book second.',
    'i brought the useful ones.',
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
const counters: Record<string, number> = { scout: 0, 'scout-pro': 0, peek: 0, scribe: 0, mirror: 0, keeper: 0 };

export function owlLine(owl: CastOwlName | 'scout-pro'): string {
  const lines = VOICE[owl];
  return lines[counters[owl]++ % lines.length];
}

export function CastOwl({ owl, cls, variant }: { owl: CastOwlName; cls: 'hero' | 'mini'; variant?: 'pro' }) {
  const showToast = useStore((s) => s.showToast);
  const react = useStore((s) => s.owlReact);
  const [nonce, setNonce] = useState(0);
  const pro = owl === 'scout' && variant === 'pro';
  const speak = () => {
    showToast('ti-feather', owlLine(pro ? 'scout-pro' : owl));
    setNonce((n) => n + 1);
  };
  // pop when a moment in this owl's territory happens anywhere in the app
  useEffect(() => {
    if (react && react.owl === owl) setNonce((n) => n + 1);
  }, [react, owl]);
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
        <use href={`#owl-${owl}${pro ? '-pro' : ''}`} />
      </g>
    </svg>
  );
}
