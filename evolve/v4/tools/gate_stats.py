"""Gate statistics: false-positive and power for candidate acceptance rules.
Model: each paired blind comparison is a Bernoulli win for the challenger with
p = Phi(delta / (sigma*sqrt(2))) where sigma = 3.11 (per-sample sd measured on the
Gemini lane, rounds 3-11) and delta is the true mean improvement in rubric points.
Ties occur with probability t and count 0.5. Monte Carlo, 200k runs per cell."""
import math, random
random.seed(7)
SIGMA = 3.11
def phi(x): return 0.5 * (1 + math.erf(x / math.sqrt(2)))
def pwin(delta): return phi(delta / (SIGMA * math.sqrt(2)))

def draw(n, p, t):
    """returns challenger score over n pairs, tie=0.5"""
    s = 0.0
    for _ in range(n):
        u = random.random()
        if u < t: s += 0.5
        elif u < t + (1 - t) * p: s += 1.0
    return s

def rule_fixed(n, k, p, t, runs=200_000):
    return sum(1 for _ in range(runs) if draw(n, p, t) >= k) / runs

def rule_seq(p, t, s1=10, pro1=8, rej1=3, add=5, pro2=11, rej2=5, runs=200_000):
    promote = reject = inconclusive = 0; cost = 0
    for _ in range(runs):
        w = draw(s1, p, t); cost += s1
        if w >= pro1: promote += 1; continue
        if w <= rej1: reject += 1; continue
        w += draw(add, p, t); cost += add
        if w >= pro2: promote += 1
        elif w <= rej2: reject += 1
        else: inconclusive += 1
    return promote / runs, reject / runs, inconclusive / runs, cost / runs

T = 0.15
print(f"sigma={SIGMA}, tie prob={T}")
print("delta -> p(challenger wins a blind pair):", {d: round(pwin(d), 3) for d in (0, 1, 2, 3, 4)})
print()
print("FIXED RULES  (promote probability)       delta=0 (false pos)   delta=1   delta=2   delta=3")
for n, k, label in [(5, 4, "v4.1 doc: >=4 of 5"), (5, 5, "5 of 5"), (10, 7, ">=7 of 10"), (10, 8, ">=8 of 10"), (15, 11, ">=11 of 15"), (15, 12, ">=12 of 15"), (20, 14, ">=14 of 20")]:
    r = [rule_fixed(n, k, pwin(d), T) for d in (0, 1, 2, 3)]
    print(f"  {label:<22}                 {r[0]:6.3f}              {r[1]:6.3f}    {r[2]:6.3f}    {r[3]:6.3f}")
print()
print("SEQUENTIAL RULE: 10 pairs -> promote>=8 / reject<=3 / else +5 -> promote>=11 / reject<=5 / else keep champion")
print("  delta   promote  reject  keep(inconclusive)  mean pairs used")
for d in (0, 1, 2, 3, 4):
    pr, rj, inc, c = rule_seq(pwin(d), T)
    print(f"  {d:>5}   {pr:6.3f}   {rj:6.3f}   {inc:6.3f}             {c:5.1f}")
print()
print("Rubric paired-mean delta SE = sigma*sqrt(2)/sqrt(pairs):", {n: round(SIGMA * math.sqrt(2) / math.sqrt(n), 2) for n in (5, 10, 15, 20)})

# winner's curse on the promoted candidate's cached mean
print()
print("WINNER'S CURSE: inflation of the promoted challenger's own cached rubric mean (10 samples), if its samples are reused as baseline")
runs = 100_000
for d in (0, 2):
    infl = []; n_pro = 0
    for _ in range(runs):
        # challenger sample scores ~ N(mu+d, sigma); champion cached scores ~ N(mu, sigma) fixed draws
        champ = [random.gauss(0, SIGMA) for _ in range(10)]
        chal = [random.gauss(d, SIGMA) for _ in range(10)]
        wins = sum(1.0 if c > a else 0.0 for c, a in zip(chal, champ))
        if wins >= 8:
            n_pro += 1; infl.append(sum(chal) / 10 - d)
    if infl:
        print(f"  delta={d}: promoted in {n_pro/runs:.3f} of runs; promoted challenger's cached mean overstates its true mean by {sum(infl)/len(infl):+.2f} points on average")
