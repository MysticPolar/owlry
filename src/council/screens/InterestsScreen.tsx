import { useState, type ReactNode } from 'react';
import { IconHeartbeat, IconBriefcase, IconChartBar, IconHeart, IconBook, IconMessageCircle, IconArrowRight, IconCheck } from '@tabler/icons-react';
import { navigate } from '../app/router';
import { useStore } from '../store/useStore';
import type { Area } from '../content/types';
import { areasList } from '../content/councils';
import { AppBar } from '../components/chrome';
import { Owl } from '../components/Owl';
import { useT } from '../i18n/react';
import './InterestsScreen.css';

/* ============================================================
   Interests — "What are you curious about?" Six tiles, multi-select,
   saved interests already ticked; Continue (or Skip) keeps the picks,
   marks the reader onboarded and opens the room. The teal owl peeks
   over the footer.
   ============================================================ */
const ICONS: Record<Area, ReactNode> = {
  health: <IconHeartbeat stroke={1.8} />,
  career: <IconBriefcase stroke={1.8} />,
  investing: <IconChartBar stroke={1.8} />,
  relationships: <IconHeart stroke={1.8} />,
  literature: <IconBook stroke={1.8} />,
  other: <IconMessageCircle stroke={1.8} />,
};

export function InterestsScreen() {
  const interests = useStore((s) => s.interests);
  const setInterests = useStore((s) => s.setInterests);
  const setOnboarded = useStore((s) => s.setOnboarded);
  const onboarded = useStore((s) => s.onboarded);
  // saved interests start ticked; an id no tile shows (older or synced data) is dropped, so Continue never counts an invisible pick
  const [picked, setPicked] = useState<Area[]>(() => interests.filter((a) => a in ICONS));
  const t = useT();
  const areas = areasList();

  const toggle = (a: Area) => setPicked((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));
  // both buttons: keep whatever is ticked (a returning reader's saved interests stay), then the room
  const go = () => {
    setInterests(picked);
    setOnboarded(true);
    navigate({ name: 'council' }, { replace: true });
  };

  return (
    <div className="screen interests">
      <AppBar back={onboarded ? { name: 'council' } : { name: 'welcome' }} />
      <div className="content">
        <h1 className="display interests-title rv">
          {t.interests.title1}
          <br />
          {t.interests.title2}
        </h1>
        <ul className="tiles rv" role="list">
          {areas.map((a) => {
            const on = picked.includes(a.id);
            return (
              <li key={a.id}>
                <button type="button" className={`tile ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle(a.id)}>
                  <span className="tile-icon">{ICONS[a.id]}</span>
                  <span className="tile-text">
                    <span className="tile-title">{a.title}</span>
                    <span className="tile-sub">{a.tagline}</span>
                  </span>
                  <span className="tile-check" aria-hidden="true">
                    <IconCheck stroke={3} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="footer interests">
        <div className="stack">
          <button type="button" className="btn gold" disabled={picked.length === 0} onClick={go}>
            {t.interests.continue} <IconArrowRight stroke={2.4} />
          </button>
          <button type="button" className="btn text" onClick={go}>
            {t.interests.skip}
          </button>
        </div>
        <Owl color="teal" size={92} pose="peek" className="interests-owl" title={t.interests.owl} />
      </div>
    </div>
  );
}
