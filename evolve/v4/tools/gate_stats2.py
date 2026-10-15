"""Compare acceptance rules on one shared latent-quality model.

Per (question, sample): champion quality c ~ N(0, sg), challenger quality x ~ N(delta, sg).
Rubric score = quality + N(0, sj)  with sg = sj = 3.11/sqrt(2), so a single rubric score has sd 3.11
(the per-sample sd measured on rounds 3-11). Blind vote = sign((x - c) + N(0, sb)); |.| < tau -> tie.
sb = 2.2, tau tuned to ~15% ties. 100k runs per cell.

Rules
  THEIRS  (v4.1 package): 5 q x 1 sample. PROMOTE if question-wins >= 4 and mean_delta >= 1.0 and min q-delta >= -5.
          REJECT if losses >= 3 and mean_delta <= -1. Else RETEST: up to 2 extra matched pairs on the two most
          ambiguous questions (tie / disagreement / largest |delta|), fresh samples both sides, question-weighted
          recompute, re-apply; otherwise KEEP.
  MINE    (evo-v4.1): 5 q x 2 samples = 10 pairs. PROMOTE >= 8 wins (ties 0.5) and mean_delta >= -0.5;
          REJECT <= 3; else +1 sample per question (15 pairs): PROMOTE >= 11, REJECT <= 5, else KEEP.
  MERGED  MINE but PROMOTE also requires mean_delta >= +0.5 (a rubric direction check, their idea, softened).
"""
import math, random
random.seed(11)
SG = SJ = 3.11 / math.sqrt(2); SB = 2.2; TAU = 0.85
RUNS = 100_000

def pair(delta):
    c = random.gauss(0, SG); x = random.gauss(delta, SG)
    rc = c + random.gauss(0, SJ); rx = x + random.gauss(0, SJ)
    v = (x - c) + random.gauss(0, SB)
    vote = 0 if abs(v) < TAU else (1 if v > 0 else -1)
    return rx - rc, vote

def theirs(delta):
    qs = [[pair(delta)] for _ in range(5)]
    def metrics():
        qd = [sum(d for d, _ in q) / len(q) for q in qs]
        qv = [int(math.copysign(1, sum(v for _, v in q))) if sum(v for _, v in q) != 0 else 0 for q in qs]
        return sum(qd) / 5, qd, qv.count(1), qv.count(-1), qv
    calls = 5 * 3  # 5 gen + 5 rubric + 5 blind
    md, qd, wins, losses, qv = metrics()
    if wins >= 4 and md >= 1.0 and min(qd) >= -5: return "PROMOTE", calls
    if losses >= 3 and md <= -1.0: return "REJECT", calls
    # retest: 2 most ambiguous questions
    amb = sorted(range(5), key=lambda i: (0 if qv[i] == 0 else 1 if (qd[i] > 0) != (qv[i] > 0) else 2, -abs(qd[i])))[:2]
    for i in amb: qs[i].append(pair(delta)); calls += 2 + 2 + 1
    md, qd, wins, losses, qv = metrics()
    if wins >= 4 and md >= 1.0 and min(qd) >= -5: return "PROMOTE", calls
    if losses >= 3 and md <= -1.0: return "REJECT", calls
    return "KEEP", calls

def mine(delta, merged=False):
    ps = [pair(delta) for _ in range(10)]
    calls = 10 * 3
    def tally(ps):
        w = sum(1 if v > 0 else 0.5 if v == 0 else 0 for _, v in ps); md = sum(d for d, _ in ps) / len(ps); return w, md
    w, md = tally(ps)
    ok = md >= (0.5 if merged else -0.5)
    if w >= 8 and ok: return "PROMOTE", calls
    if w <= 3: return "REJECT", calls
    ps += [pair(delta) for _ in range(5)]; calls += 5 * 2 + 5 + 5   # fresh samples both sides + rubric + blind
    w, md = tally(ps); ok = md >= (0.5 if merged else -0.5)
    if w >= 11 and ok: return "PROMOTE", calls
    if w <= 5: return "REJECT", calls
    return "KEEP", calls

def run(fn, delta, **kw):
    out = {"PROMOTE": 0, "REJECT": 0, "KEEP": 0}; calls = 0
    for _ in range(RUNS):
        d, c = fn(delta, **kw) if kw else fn(delta); out[d] += 1; calls += c
    return {k: v / RUNS for k, v in out.items()}, calls / RUNS

# tie rate check
ties = sum(1 for _ in range(20000) if pair(0)[1] == 0) / 20000
print(f"tie rate at delta=0: {ties:.2f}\n")
print(f"{'rule':<8} {'delta':>5} {'promote':>8} {'reject':>7} {'keep':>6} {'calls':>6}")
for name, fn, kw in [("THEIRS", theirs, {}), ("MINE", mine, {}), ("MERGED", mine, {"merged": True})]:
    for d in (0, 1, 2, 3, 4):
        r, c = run(fn, d, **kw)
        print(f"{name:<8} {d:>5} {r['PROMOTE']:8.3f} {r['REJECT']:7.3f} {r['KEEP']:6.3f} {c:6.1f}")
    print()
