/* ============================================================
   owlry — "what the owl remembers": view + edit + forget.

   Reads/writes owlry_user_memory directly via supabase-js — RLS
   scopes every read/write to the signed-in reader's own row, so no
   edge function is involved. Caps here mirror the server-side
   budgets in supabase/functions/_shared/memory.ts (kept as literal
   numbers rather than importing that module — it's server code).
   ============================================================ */
import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';
import { useT } from '../../i18n/react';
import { Icon } from '../Icon';
import { CastOwl } from '../CastOwl';

interface LongTerm {
  profile: string;
  focus: string;
  taste: { loves: string[]; avoids: string[]; depth: string; length: string };
  goals: string[];
  books: { t: string; reaction: string; ts: string }[];
}
interface Topic {
  d: string;
  topic: string;
  gist: string;
  book?: string;
}

const EMPTY: LongTerm = { profile: '', focus: '', taste: { loves: [], avoids: [], depth: 'mixed', length: 'any' }, goals: [], books: [] };
const CAPS = { profile: 140, focus: 140, chipItem: 24, goal: 60 };

export function MemoryCard() {
  const t = useT();
  const authUser = useStore((s) => s.authUser);
  const showToast = useStore((s) => s.showToast);

  const [longTerm, setLongTerm] = useState<LongTerm>(EMPTY);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileDraft, setProfileDraft] = useState('');
  const [focusDraft, setFocusDraft] = useState('');
  const [newLove, setNewLove] = useState('');
  const [newAvoid, setNewAvoid] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [confirmingForget, setConfirmingForget] = useState(false);

  useEffect(() => {
    if (!supabase || !authUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void supabase
      .from('owlry_user_memory')
      .select('long_term, topics')
      .eq('user_id', authUser.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const lt = (data?.long_term as LongTerm | undefined) ?? EMPTY;
        setLongTerm(lt);
        setProfileDraft(lt.profile);
        setFocusDraft(lt.focus);
        setTopics((data?.topics as Topic[] | undefined) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const persist = async (nextLongTerm: LongTerm, nextTopics: Topic[]) => {
    if (!supabase || !authUser) return;
    setLongTerm(nextLongTerm);
    setTopics(nextTopics);
    await supabase.from('owlry_user_memory').update({ long_term: nextLongTerm, topics: nextTopics }).eq('user_id', authUser.id);
  };

  const saveProfileFocus = () =>
    void persist({ ...longTerm, profile: profileDraft.trim().slice(0, CAPS.profile), focus: focusDraft.trim().slice(0, CAPS.focus) }, topics);

  const addChip = (field: 'loves' | 'avoids', value: string, clear: () => void) => {
    const v = value.trim().slice(0, CAPS.chipItem);
    if (!v || longTerm.taste[field].includes(v)) return;
    void persist({ ...longTerm, taste: { ...longTerm.taste, [field]: [...longTerm.taste[field], v].slice(0, 6) } }, topics);
    clear();
  };
  const removeChip = (field: 'loves' | 'avoids', idx: number) =>
    void persist({ ...longTerm, taste: { ...longTerm.taste, [field]: longTerm.taste[field].filter((_, i) => i !== idx) } }, topics);

  const addGoal = () => {
    const v = newGoal.trim().slice(0, CAPS.goal);
    if (!v || longTerm.goals.includes(v)) return;
    void persist({ ...longTerm, goals: [...longTerm.goals, v].slice(0, 3) }, topics);
    setNewGoal('');
  };
  const removeGoal = (idx: number) => void persist({ ...longTerm, goals: longTerm.goals.filter((_, i) => i !== idx) }, topics);

  const removeBook = (idx: number) => void persist({ ...longTerm, books: longTerm.books.filter((_, i) => i !== idx) }, topics);
  const removeTopic = (idx: number) => void persist(longTerm, topics.filter((_, i) => i !== idx));

  const forgetEverything = async () => {
    if (!supabase || !authUser) return;
    await supabase.from('owlry_user_memory').delete().eq('user_id', authUser.id);
    setLongTerm(EMPTY);
    setTopics([]);
    setProfileDraft('');
    setFocusDraft('');
    setConfirmingForget(false);
    showToast('ti-feather', t.profile.mem.forgotToast);
  };

  if (!authUser) return null;

  if (loading) {
    return (
      <div className="pcard">
        <p className="mem-empty">{t.profile.mem.fetching}</p>
      </div>
    );
  }

  const nothingYet =
    !longTerm.profile && !longTerm.focus && !longTerm.taste.loves.length && !longTerm.taste.avoids.length &&
    !longTerm.goals.length && !longTerm.books.length && !topics.length;

  return (
    <div className="pcard pb-mem">
      <div className="pb-mem-head">
        <CastOwl owl="mirror" cls="mini" />
        <div className="pb-mem-head-txt">
          <div className="pb-mem-head-t">{t.profile.mem.title}</div>
          <div className="pb-mem-head-sub">{t.profile.mem.subtitle}</div>
        </div>
      </div>
      {nothingYet && <p className="mem-empty">{t.profile.mem.emptyAll}</p>}

      <div className="pb-mem-portrait">
        <label className="gate-label" htmlFor="memProfile">{t.profile.mem.whoYouAre}</label>
        <input
          id="memProfile"
          className="gate-input"
          style={{ marginTop: 4 }}
          maxLength={CAPS.profile}
          value={profileDraft}
          onChange={(e) => setProfileDraft(e.target.value)}
          onBlur={saveProfileFocus}
          placeholder={t.profile.mem.notLearned}
        />

        <label className="gate-label" htmlFor="memFocus" style={{ marginTop: 12, display: 'block' }}>
          {t.profile.mem.workingThrough}
        </label>
        <input
          id="memFocus"
          className="gate-input"
          style={{ marginTop: 4 }}
          maxLength={CAPS.focus}
          value={focusDraft}
          onChange={(e) => setFocusDraft(e.target.value)}
          onBlur={saveProfileFocus}
          placeholder={t.profile.mem.notLearned}
        />
      </div>

      <div className="sh-sec">{t.profile.mem.love}</div>
      <div className="mem-row">
        {longTerm.taste.loves.map((v, i) => (
          <span className="mem-chip" key={v}>
            {v}
            <button aria-label={t.profile.mem.removeAria(v)} onClick={() => removeChip('loves', i)}>
              <Icon name="ti-x" />
            </button>
          </span>
        ))}
        {!longTerm.taste.loves.length && <span className="mem-empty">{t.profile.mem.empty}</span>}
      </div>
      <div className="mem-add">
        <input
          className="gate-input"
          maxLength={CAPS.chipItem}
          value={newLove}
          onChange={(e) => setNewLove(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addChip('loves', newLove, () => setNewLove(''))}
          placeholder={t.profile.mem.addLove}
        />
        <button className="iconbtn" aria-label={t.profile.mem.addAria} onClick={() => addChip('loves', newLove, () => setNewLove(''))}>
          <Icon name="ti-plus" />
        </button>
      </div>

      <div className="sh-sec">{t.profile.mem.avoid}</div>
      <div className="mem-row">
        {longTerm.taste.avoids.map((v, i) => (
          <span className="mem-chip" key={v}>
            {v}
            <button aria-label={t.profile.mem.removeAria(v)} onClick={() => removeChip('avoids', i)}>
              <Icon name="ti-x" />
            </button>
          </span>
        ))}
        {!longTerm.taste.avoids.length && <span className="mem-empty">{t.profile.mem.empty}</span>}
      </div>
      <div className="mem-add">
        <input
          className="gate-input"
          maxLength={CAPS.chipItem}
          value={newAvoid}
          onChange={(e) => setNewAvoid(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addChip('avoids', newAvoid, () => setNewAvoid(''))}
          placeholder={t.profile.mem.addAvoid}
        />
        <button className="iconbtn" aria-label={t.profile.mem.addAria} onClick={() => addChip('avoids', newAvoid, () => setNewAvoid(''))}>
          <Icon name="ti-plus" />
        </button>
      </div>

      <div className="sh-sec">{t.profile.mem.why}</div>
      <div className="mem-row">
        {longTerm.goals.map((v, i) => (
          <span className="mem-chip" key={v}>
            {v}
            <button aria-label={t.profile.mem.removeAria(v)} onClick={() => removeGoal(i)}>
              <Icon name="ti-x" />
            </button>
          </span>
        ))}
        {!longTerm.goals.length && <span className="mem-empty">{t.profile.mem.empty}</span>}
      </div>
      <div className="mem-add">
        <input
          className="gate-input"
          maxLength={CAPS.goal}
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addGoal()}
          placeholder={t.profile.mem.addWhy}
        />
        <button className="iconbtn" aria-label={t.profile.mem.addAria} onClick={addGoal}>
          <Icon name="ti-plus" />
        </button>
      </div>

      <div className="sh-sec">{t.profile.mem.booksReacted}</div>
      {longTerm.books.length ? (
        longTerm.books.map((b, i) => (
          <div className="mem-book" key={`${b.t}-${b.ts}`}>
            <span>
              <strong>{b.t}</strong> — {b.reaction}
            </span>
            <button className="iconbtn lite" aria-label={t.profile.mem.removeAria(b.t)} onClick={() => removeBook(i)}>
              <Icon name="ti-x" />
            </button>
          </div>
        ))
      ) : (
        <p className="mem-empty">{t.profile.mem.empty}</p>
      )}

      <div className="sh-sec">{t.profile.mem.mentioned}</div>
      {topics.length ? (
        topics.map((tp, i) => (
          <div className="mem-topic" key={`${tp.d}-${tp.topic}`}>
            <span className="mem-topic-date">{tp.d}</span>
            <span className="mem-topic-gist">
              <strong>{tp.topic}</strong> — {tp.gist}
            </span>
            <button className="iconbtn lite" aria-label={t.profile.mem.removeAria(tp.topic)} onClick={() => removeTopic(i)}>
              <Icon name="ti-x" />
            </button>
          </div>
        ))
      ) : (
        <p className="mem-empty">{t.profile.mem.empty}</p>
      )}

      <div className="mem-forget">
        {!confirmingForget ? (
          <button className="btn ghost" onClick={() => setConfirmingForget(true)}>
            <Icon name="ti-eraser" /> {t.profile.mem.forget}
          </button>
        ) : (
          <div className="mem-row" style={{ alignItems: 'center' }}>
            <span className="gate-err" style={{ margin: 0 }}>
              {t.profile.mem.forgetConfirm}
            </span>
            <button className="btn" onClick={forgetEverything}>
              {t.profile.mem.forgetYes}
            </button>
            <button className="gate-switch" style={{ margin: 0 }} onClick={() => setConfirmingForget(false)}>
              {t.profile.mem.forgetNo}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
