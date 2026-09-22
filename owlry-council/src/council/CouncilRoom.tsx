// Minimal, unstyled Council Room. Class names are hooks for your design system.
//
// Usage:
//   <CouncilRoom supabase={supabase} category="career" />
//   category: health | career | investing | relationships | literature | other  (the menu tile)
//
// Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (you already have both).

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCouncil, type TurnView } from "./councilStore";

interface Props {
  supabase: SupabaseClient;
  category?: string;
}

export default function CouncilRoom({ supabase, category }: Props) {
  const s = useCouncil();
  const [question, setQuestion] = useState("");
  const [situation, setSituation] = useState("");
  const [replyText, setReplyText] = useState("");
  const [showTranscript, setShowTranscript] = useState(true);

  useEffect(() => {
    s.configure({
      functionUrl: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/council`,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      getAccessToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
      // Skip rate by turn index is the health metric for discussion length; RLS allows exactly this column.
      onSkip: (sessionId, atTurn) => {
        void supabase.from("council_sessions").update({ skipped_at_turn: atTurn }).eq("id", sessionId);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => {
    if (s.skipped && s.summary) setShowTranscript(false);
  }, [s.skipped, s.summary]);

  const visible = useMemo(() => s.turns.slice(0, s.revealed), [s.turns, s.revealed]);
  const streamingNext = s.status === "running" && s.revealed < s.turns.length;
  const waitingForFirst = s.status === "running" && s.turns.length === 0;
  const canSkip = s.status === "running" && s.revealed >= 3 && !s.skipped;

  if (s.status === "idle" || s.status === "casting") {
    return (
      <form
        className="council-ask"
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim()) s.start(question.trim(), situation.trim() || undefined, category);
        }}
      >
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask anything…"
          rows={3}
          maxLength={600}
        />
        <input
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
          placeholder="Anything about your situation they should know? (optional)"
          maxLength={400}
        />
        <button type="submit" disabled={s.status === "casting" || !question.trim()}>
          {s.status === "casting" ? "Seating the council…" : "Ask the council"}
        </button>
        {s.error && <p className="council-error">{s.error}</p>}
      </form>
    );
  }

  return (
    <div className="council-room">
      <header className="council-cast">
        {s.tension && <p className="council-axis">{s.tension}</p>}
        <ul>
          {s.seats.map((seat) => (
            <li key={seat.slug} className="council-seat">
              <strong>{seat.name}</strong>
              <span className="council-seat-why">{seat.why}</span>
              <span className="council-seat-intro">{seat.intro}</span>
            </li>
          ))}
        </ul>
        {waitingForFirst && <p className="council-seating">The council is taking their seats…</p>}
      </header>

      {(showTranscript || !s.summary) && (
        <ol className="council-turns">
          {visible.map((t) => <Bubble key={t.turn} t={t} />)}
          {streamingNext && (
            <li className="council-typing" onClick={s.revealNow}>
              {s.turns[s.revealed]?.name ?? "…"} is thinking…
            </li>
          )}
        </ol>
      )}

      {canSkip && (
        <button type="button" className="council-skip" onClick={s.skip}>
          Skip to the summary
        </button>
      )}

      {s.skipped && s.summary && (
        <button type="button" className="council-transcript-toggle" onClick={() => setShowTranscript((v) => !v)}>
          {showTranscript ? "Hide the discussion" : `Read the full discussion (${s.turns.length} turns)`}
        </button>
      )}

      {s.skipped && !s.summary && s.status !== "error" && (
        <p className="council-finishing">The council is finishing…</p>
      )}

      {s.summary && (
        <section className="council-summary">
          <h2>{s.summary.title}</h2>
          <h3>What they agree on</h3>
          <ul>{s.summary.agree.map((a, i) => <li key={i}>{a}</li>)}</ul>
          <h3>Where they differ</h3>
          <ul>{s.summary.differ.map((d, i) => <li key={i}>{d}</li>)}</ul>
          <h3>What fits your situation</h3>
          <p>{s.summary.fits}</p>
          <h3>One next step</h3>
          <p>{s.summary.next_step}</p>
          <h3>The books behind the conversation</h3>
          <ul className="council-books">
            {s.summary.books.map((b, i) => (
              <li key={i}>
                <strong>{b.title}</strong> — {b.author}
                <span> · {b.why}</span>
                {b.url && (
                  <a href={b.url} target="_blank" rel="noreferrer">
                    {b.access === "read_free" ? "Read free" : "Get the book"}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(s.status === "done" || s.status === "replying") && (
        <form
          className="council-reply"
          onSubmit={(e) => {
            e.preventDefault();
            if (replyText.trim() && s.status === "done") {
              s.reply(replyText.trim());
              setReplyText("");
              setShowTranscript(true);
            }
          }}
        >
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Share your thoughts…"
            maxLength={600}
            disabled={s.status === "replying"}
          />
          <button type="submit" disabled={s.status === "replying" || !replyText.trim()}>
            Send
          </button>
        </form>
      )}

      {s.error && <p className="council-error">{s.error}</p>}
    </div>
  );
}

function Bubble({ t }: { t: TurnView }) {
  const isReader = t.speaker === "reader";
  return (
    <li className={`council-bubble ${isReader ? "council-bubble--reader" : "council-bubble--mind"}`}>
      <span className="council-bubble-name">{isReader ? "You" : t.name}</span>
      <p>{t.text}</p>
    </li>
  );
}
