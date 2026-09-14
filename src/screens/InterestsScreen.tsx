import { useState } from 'react';
import { IconHeartbeat, IconBriefcase, IconChartBar, IconHeart, IconBook, IconMessageCircle, IconArrowRight, IconCheck } from '@tabler/icons-react';
import { navigate } from '../app/router';
import { useStore } from '../store/useStore';
import type { Area } from '../content/types';
import { AREAS } from '../content/councils';
import { TopBar } from '../components/chrome';
import { Owl } from '../components/Owl';
import './InterestsScreen.css';

/* ============================================================
   2. Select interest — "Choose what moves you."
   Six tiles, multi-select, a handwritten nudge, a teal owl peeking in.
   ============================================================ */
const ICONS: Record<Area, { icon: React.ReactNode; tint: string }> = {
  health: { icon: <IconHeartbeat stroke={2} />, tint: 'var(--tint-health)' },
  career: { icon: <IconBriefcase stroke={2} />, tint: 'var(--tint-career)' },
  investing: { icon: <IconChartBar stroke={2} />, tint: 'var(--tint-investing)' },
  relationships: { icon: <IconHeart stroke={2} />, tint: 'var(--tint-relationships)' },
  literature: { icon: <IconBook stroke={2} />, tint: 'var(--tint-literature)' },
  other: { icon: <IconMessageCircle stroke={2} />, tint: 'var(--tint-other)' },
};

export function InterestsScreen() {
  const interests = useStore((s) => s.interests);
  const setInterests = useStore((s) => s.setInterests);
  const setOnboarded = useStore((s) => s.setOnboarded);
  const [picked, setPicked] = useState<Area[]>(interests);
  const [lastPicked, setLastPicked] = useState<Area | null>(null);

  const toggle = (a: Area) => {
    setPicked((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));
    setLastPicked(picked.includes(a) ? null : a);
  };
  const go = (areas: Area[]) => {
    setInterests(areas);
    setOnboarded(true);
    navigate({ name: 'council' }, { replace: true });
  };

  return (
    <div className="screen interests">
      <TopBar backFallback={{ name: 'welcome' }} className="top-inset" />
      <div className="screen-scroll pad interests-body">
        <div className="interests-titlerow">
          <h1 className="display interests-title">
            What are you
            <br />
            curious about today?
          </h1>
          <span className="hand interests-hand">
            Pick a path.
            <br />
            Or a few!
          </span>
        </div>
        <ul className="tiles" role="list">
          {AREAS.map((a) => {
            const on = picked.includes(a.id);
            return (
              <li key={a.id}>
                <button type="button" className={`tile ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle(a.id)}>
                  <span className="tile-icon" style={{ color: ICONS[a.id].tint }}>
                    {ICONS[a.id].icon}
                  </span>
                  <span className="tile-text">
                    <span className="tile-title">{a.title}</span>
                    <span className="tile-sub">{a.tagline}</span>
                  </span>
                  <span className="tile-check" aria-hidden="true">
                    <IconCheck stroke={3} />
                  </span>
                </button>
                {lastPicked === a.id && <span className="hand pop interests-good">Good choice.</span>}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="interests-actions pad">
        <button type="button" className="btn btn-dark" disabled={picked.length === 0} onClick={() => go(picked)}>
          Continue <IconArrowRight />
        </button>
        <button type="button" className="linkbtn" onClick={() => go(picked)}>
          Skip and ask a question
        </button>
      </div>
      <Owl color="teal" size={92} pose="peek" className="interests-owl" title="A teal owl peeking in" />
    </div>
  );
}
