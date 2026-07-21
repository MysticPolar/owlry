import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { getActiveLang, type Lang } from '../i18n';
import { useT } from '../i18n/react';
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

const VOICE: Record<Lang, Record<CastOwlName | 'scout-pro', string[]>> = {
  en: {
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
  },
  zh: {
    scout: ['好好好 — 先看这本。', '我又找到四本，正在分拣！', '跟我说说，最近怎么了。'],
    'scout-pro': ['办公时间。我们来解决什么？', '先谈目标，再谈书。', '我把有用的都带来了。'],
    peek: ['只看第一章。', '人生苦短，章节更短。', '我来告诉你它是怎么开场的。'],
    scribe: ['第118页。不是117。', '收好了。逐字逐句。', '再说一遍 — 慢一点。'],
    mirror: ['……', '你其实已经知道了。', '嗯。'],
    keeper: ['我数过两遍。', '只收新书，概不退换。', '一天一天来。别害我从头数。'],
  },
};

/* each owl cycles through its lines across taps, anywhere in the app */
const counters: Record<string, number> = { scout: 0, 'scout-pro': 0, peek: 0, scribe: 0, mirror: 0, keeper: 0 };

export function owlLine(owl: CastOwlName | 'scout-pro'): string {
  const lines = VOICE[getActiveLang()][owl];
  return lines[counters[owl]++ % lines.length];
}

export function CastOwl({ owl, cls, variant }: { owl: CastOwlName; cls: 'hero' | 'mini'; variant?: 'pro' }) {
  const t = useT().settings.settings;
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
      aria-label={t.castTapAria(owl, t.castJobs[owl])}
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
