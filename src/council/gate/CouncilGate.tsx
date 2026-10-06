import { useState, type CSSProperties, type FormEvent } from 'react';
import { Wordmark } from '../components/Wordmark';
import { getActiveLang } from '../i18n';
import { grantCouncilAccess } from './access';
import './CouncilGate.css';

/* The door in front of the Council (see access.ts). Its copy lives here
   rather than in i18n/ui.ts so the whole gate leaves in one folder. It
   renders standalone (main.tsx shows it before the app boots), so it
   draws its own desk, phone and screen with the shared primitives. */
const COPY = {
  en: {
    title: 'The Council is by invitation.',
    sub: 'Enter the access code you were given.',
    label: 'Access code',
    enter: 'Enter',
    busy: 'Checking…',
    wrong: 'That code does not open the door. Check it and try again.',
  },
  zh: {
    title: '议事厅目前仅限受邀进入。',
    sub: '请输入你收到的访问码。',
    label: '访问码',
    enter: '进入',
    busy: '正在核对…',
    wrong: '这个访问码打不开门。请检查后再试。',
  },
};

export function CouncilGate({ onOpen }: { onOpen: () => void }) {
  const t = COPY[getActiveLang()];
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const ok = await grantCouncilAccess(code);
    setBusy(false);
    if (ok) onOpen();
    else setWrong(true);
  };

  return (
    <div className="desk">
      <div className="phone">
        <div className="screen-clip no-nav">
          <div className="screen gate">
            <form className="content gate-form cascade" onSubmit={(e) => void submit(e)}>
              <span className="gate-wordmark" style={{ '--i': 0 } as CSSProperties}>
                <Wordmark />
              </span>
              <h1 className="display" style={{ '--i': 1 } as CSSProperties}>
                {t.title}
              </h1>
              <p className="sub gate-sub" style={{ '--i': 2 } as CSSProperties}>
                {t.sub}
              </p>
              <div className="field" style={{ '--i': 3 } as CSSProperties}>
                <label htmlFor="gate-code">{t.label}</label>
                <input
                  id="gate-code"
                  className="input"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setWrong(false);
                  }}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  autoFocus
                  required
                />
              </div>
              {wrong && (
                <p className="form-error" role="alert">
                  {t.wrong}
                </p>
              )}
              <button type="submit" className="btn gold" disabled={busy || !code.trim()} style={{ '--i': 4 } as CSSProperties}>
                {busy ? t.busy : t.enter}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
