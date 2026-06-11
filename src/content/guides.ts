import type { Guide, GuideId } from './types';

export const GUIDES: Record<GuideId, Guide> = {
  wws: {
    say: `ah, the wide-awake hours. i've sorted a letter for you — {{b}}, on the two clocks you're fighting tonight.`,
    res: `It's late, your mind won't dim, and sleep keeps slipping just out of reach.`,
    chap: `Caffeine, Jet Lag, and Melatonin`,
    core: `Walker's argument in this chapter is that falling asleep isn't one switch but two independent systems that must agree: a circadian clock that times your wakefulness, and a chemical pressure — adenosine — that builds for every minute you're awake. Most modern sleeplessness, he says, comes from accidentally setting these two against each other, and caffeine is the most common saboteur, because it doesn't remove sleep pressure; it only hides it from you.`,
    ins: [
      {
        t: `Sleepiness is a chemical debt, not a mood`,
        r: `Adenosine accumulates from the moment you wake; high concentration is felt as sleep pressure. Walker's point is that the debt can be masked but never negotiated — it waits.`,
        ex: `He describes the caffeine crash: when the drug clears the receptors it was blocking, the whole accumulated backlog of adenosine lands at once, leaving you sleepier than before the cup.`,
      },
      {
        t: `Caffeine outstays its welcome by hours`,
        r: `With a half-life of roughly five to seven hours, an afternoon coffee is still half-active deep into the night — quietly raising the drawbridge that sleep needs lowered.`,
        ex: `Walker notes the trap most people miss: even decaf carries a real fraction of caffeine, so the evening "harmless" cup isn't quite harmless.`,
      },
      {
        t: `Melatonin starts the race; it doesn't run it`,
        r: `Melatonin only announces to the brain that darkness has arrived — it times sleep rather than generates it, which is why it can't simply be swallowed as a cure.`,
        ex: `He compares it to the timing official at an Olympic race, and uses jet lag as proof: traveling east is harder because you're asking your clock to shorten a day it wants to stretch.`,
      },
    ],
    close: `So tonight's sleeplessness isn't a character flaw — it's two systems out of sync, and both respond to small, boring adjustments far better than to effort.`,
    take: [
      `Protect the last eight to ten hours before bed from caffeine — it's arithmetic, not willpower.`,
      `Dim the evening: light tells your clock the race hasn't started yet.`,
    ],
    ask: [
      `What time was today's last coffee — and what time did your brain actually clock out?`,
      `If sleep is two systems, which one are you fighting tonight: pressure, or timing?`,
    ],
    fr: [
      { id: `medit`, why: `if the real obstacle is the 3 a.m. thoughts rather than the chemistry` },
      { id: `piranesi`, why: `a quiet, dreamlike novel to drift through instead` },
      { id: `tranq`, why: `slim and time-bending — sized for exactly one night` },
    ],
  },
  medit: {
    say: `a fresh morning deserves an old voice. your letter opens {{b}} — book five, the getting-out-of-bed argument itself.`,
    res: `A new morning, and you want it to count for something.`,
    chap: `Book Five`,
    core: `Book Five opens with Marcus arguing himself out of bed: you were not made for warmth under blankets but for the work of a human being, the way bees were made for the hive. The deeper claim running through the book is that a day is shaped less by its events than by the thoughts you dye it with — so the morning's first task is choosing the dye on purpose.`,
    ins: [
      {
        t: `Get up like it's your nature`,
        r: `He reasons from purpose: everything in nature performs its task without complaint, and refusing the morning is refusing your own design — comfort is not what you are for.`,
        ex: `In 5.1 he points to the bees, the birds and the plants, each already at work, and asks why a person should be the one exception.`,
        q: { t: `I am rising to the work of a human being.`, by: `MARCUS AURELIUS, MEDITATIONS 5.1` },
      },
      {
        t: `The soul takes the color of its thoughts`,
        r: `In 5.16 he argues that habitual thinking hardens into character: attention is the dye, the mind is the cloth, and repetition does the soaking.`,
        ex: `His remedy is to keep ready a few strong thoughts to dip the mind in — such as: wherever it is possible to live, it is possible to live well.`,
      },
      {
        t: `Obstacles are fuel`,
        r: `In 5.20 he claims the mind can convert whatever blocks an action into material for action — the blocked road becomes the road.`,
        ex: `His own example is people: difficult ones exist to be taught or endured, and either way they become part of the morning's work rather than an interruption of it.`,
      },
    ],
    close: `A fresh start, Marcus would say, isn't a feeling you wait for; it's the first deliberate thought of the day, chosen like clothing.`,
    take: [
      `Win the first argument of the day — the one with the blanket.`,
      `Pick the day's dye on purpose: one sentence you'll think on repeat.`,
    ],
    ask: [
      `What would today look like if you treated it as work you were built for?`,
      `Which recurring obstacle could you reclassify, starting this morning, as material?`,
    ],
    fr: [
      { id: `atomic`, why: `if the fresh start should harden into a system` },
      { id: `deep`, why: `if today needs four protected hours, not vibes` },
      { id: `circe`, why: `if you'd rather watch someone rebuild a life from exile` },
    ],
  },
  deep: {
    say: `stuck usually isn't a you problem — it's a room problem. i've written you a letter on {{b}}.`,
    res: `Busy all day, blocked all the same — your attention is everywhere except the thing.`,
    chap: `Rule #1: Work Deeply`,
    core: `Newport's claim is that focus is not a virtue you summon but an environment you construct. Willpower, he argues, is a finite battery that loses every open-ended fight with distraction — so the chapter's case is to stop relying on intention and start relying on architecture: choose a philosophy of depth, build rituals around it, and make your commitments expensive enough that quitting feels absurd.`,
    ins: [
      {
        t: `Choose a philosophy of depth`,
        r: `He lays out four scheduling modes — monastic, bimodal, rhythmic, journalistic — and insists the failure isn't lacking discipline but borrowing a mode that doesn't fit your actual life.`,
        ex: `Carl Jung is his bimodal example: running a busy Zurich practice, then withdrawing to his stone tower at Bollingen for stretches of undisturbed thinking.`,
      },
      {
        t: `Make a grand gesture`,
        r: `A radical or costly change of setting signals importance to your own mind; the expense itself does psychological work.`,
        ex: `He tells of J.K. Rowling checking into a grand Edinburgh hotel suite to finish the final Harry Potter book when home had too many distractions.`,
      },
      {
        t: `End with a shutdown ritual`,
        r: `Unfinished loops keep pulling at attention after hours — Newport leans on the Zeigarnik effect — so a strict closing routine of reviewing and planning lets the brain actually release the day.`,
        ex: `His own ritual ends with a spoken phrase — "shutdown complete" — silly on purpose, and effective for exactly that reason.`,
      },
    ],
    close: `Being stuck rarely means you lack discipline — it usually means your environment is voting against you. Change the architecture and the focus follows.`,
    take: [
      `Schedule depth like a meeting with someone you'd hate to disappoint.`,
      `Close every day with a real shutdown — unfinished loops are tomorrow's fog.`,
    ],
    ask: [
      `Which of the four philosophies fits your actual week — not your fantasy week?`,
      `What's your version of the hotel room: the gesture that makes the work non-optional?`,
    ],
    fr: [
      { id: `atomic`, why: `if the problem is starting at all — shrink it` },
      { id: `bird`, why: `if the block is a first draft refusing to be bad` },
      { id: `medit`, why: `stoic ballast for the distracted hours` },
    ],
  },
  atomic: {
    say: `forget motivation; let's talk identity. your letter opens {{b}} to the chapter on becoming the person first.`,
    res: `You don't want a burst of motivation — you want to become someone who doesn't need one.`,
    chap: `How Your Habits Shape Your Identity (and Vice Versa)`,
    core: `Clear argues that most change fails because it aims at outcomes — lose the weight, write the book — instead of identity: become a healthy person, become a writer. Behavior that contradicts self-image never lasts, so the chapter flips the order. Decide who you want to be, then let small actions pile up as evidence, until the identity is simply true.`,
    ins: [
      {
        t: `Outcomes are lagging; identity leads`,
        r: `He draws three layers — outcomes, processes, identity — and argues change only sticks when it starts at the core, because we defend who we believe we are.`,
        ex: `His example is two smokers offered a cigarette: one says "I'm trying to quit," still a smoker fighting himself; the other says "I'm not a smoker," and there is no fight.`,
      },
      {
        t: `Every action is a ballot`,
        r: `No single rep transforms you — but each one casts a vote for a type of person, and the votes compound into self-belief faster than any pep talk.`,
        ex: `One page doesn't finish a book, he notes, but it elects "writer" a little harder each day; the goal of a habit is the evidence it leaves behind.`,
      },
      {
        t: `Two steps: decide, then prove`,
        r: `The method is almost embarrassingly small: choose the identity, then design wins tiny enough that you cannot lose them, each one confirming the choice.`,
        ex: `Clear's compass question does the steering — when unsure, ask what the person you're becoming would do, and let that decide the next small action.`,
      },
    ],
    close: `You asked how to change; the chapter's answer is to stop chasing the result and start collecting evidence of the person.`,
    take: [
      `Swap the goal for a person: who is someone that does this easily?`,
      `Make the next vote tiny enough that you can't lose it.`,
    ],
    ask: [
      `What identity are your current habits voting for — honestly?`,
      `What's the smallest action this week that proves the person you're choosing?`,
    ],
    fr: [
      { id: `deep`, why: `once the who is set, this builds the hours` },
      { id: `medit`, why: `the ancient version of identity-first` },
      { id: `wws`, why: `if the keystone habit should be sleep` },
    ],
  },
  pema: {
    say: `i'm sorry it aches. come sit by the radiator — your letter is {{b}}, on staying when everything says run.`,
    res: `Something has cracked — and every instinct says run from the feeling.`,
    chap: `Intimacy with Fear`,
    core: `Chödrön opens with the moment her own life collapsed, and makes the radical claim of the whole book: the rawness we flee is the doorway. Fear is not a verdict that something is wrong with us; it is the sensation of getting close to the truth. Healing, she argues, begins not when the pain ends but when we stop abandoning ourselves in the middle of it.`,
    ins: [
      {
        t: `Stay — that's the whole instruction`,
        r: `Suffering doubles when we treat feelings as emergencies to escape; staying present, even badly, turns panic back into information.`,
        ex: `She recounts the day her marriage ended without warning — the familiar world dissolving in seconds — and the strange, wide-awake clarity she found inside the wreckage.`,
      },
      {
        t: `Fear is a compass, not an alarm`,
        r: `Fear shows up reliably at the edge of honesty, which makes it useful: flinching is human, but fleeing is optional, and the direction of the fear marks the direction of the truth.`,
        ex: `She points to meditators and warriors alike who are taught to move toward fear and get to know it, rather than win against it.`,
        q: { t: `Fear is a natural reaction to moving closer to the truth.`, by: `PEMA CHÖDRÖN, WHEN THINGS FALL APART` },
      },
      {
        t: `Make friends with yourself first`,
        r: `She calls it maitri — unconditional friendliness toward your own mess. Compassion that excludes yourself collapses; this friendship is the ground everything else stands on.`,
        ex: `The practice she describes is meditation not as self-improvement but as getting to know the one person you can't leave — gently, the way you'd sit with a frightened friend.`,
      },
    ],
    close: `Nothing here asks you to feel better on schedule. It only asks you not to leave yourself while it hurts — that is where the ground re-forms.`,
    take: [
      `When it surges, name it and stay ninety extra seconds before reaching for the exit.`,
      `Treat yourself as you would the friend who showed up crying.`,
    ],
    ask: [
      `What truth is this fear standing closest to?`,
      `Where do you abandon yourself first — and what would staying look like there?`,
    ],
    fr: [
      { id: `frankl`, why: `when the question underneath is "what for?"` },
      { id: `snow`, why: `a wintry novel about longing made visible` },
      { id: `bird`, why: `gentle, funny company for putting life on paper` },
    ],
  },
  frankl: {
    say: `the big question. for that, only one book will do: {{b}}. the letter's inside.`,
    res: `The question isn't how to feel better — it's what any of this is for.`,
    chap: `Part One: Experiences in a Concentration Camp`,
    core: `Frankl's testimony argues that when everything is stripped away, one freedom remains: choosing your stance toward what happens. In the camps, he observed, survival tracked neither strength nor optimism but a "why" — a person, a task, a future that needed you. Meaning, he insists, is not found by interrogating life for answers; it is answered by what life is asking of you.`,
    ins: [
      {
        t: `A why can carry any how`,
        r: `Prisoners with something unfinished — a child waiting, a work to complete — endured what broke others. Purpose, in his account, is structurally load-bearing.`,
        ex: `Frankl's own why was the manuscript taken from him on arrival; he kept rewriting it in his head and on stolen scraps of paper, and credits it with keeping him alive.`,
        q: { t: `He who has a why to live for can bear almost any how.`, by: `NIETZSCHE, AS FRANKL QUOTES HIM` },
      },
      {
        t: `Hope with a due date is dangerous`,
        r: `Hope pinned to a deadline collapses when the date passes; meaning has to be unconditional, not calendar-shaped.`,
        ex: `He tells of a fellow prisoner who dreamed the war would end for him on March 30th. When the day came and went, the man's strength left him, and he died within days.`,
      },
      {
        t: `The last human freedom`,
        r: `Circumstances decide much, Frankl concedes — but not the final attitude. Even there, some chose generosity, and the choosing itself was meaning.`,
        ex: `He remembers men who walked through the huts comforting others and giving away their last piece of bread — and his own trick of imagining himself in a warm lecture hall, describing the psychology of the camp, turning suffering into study.`,
      },
    ],
    close: `Your question — what is this for — may be pointing the wrong direction. Let something concrete ask it of you instead, and answer with your days.`,
    take: [
      `Stop interrogating life for meaning; let one concrete responsibility answer back.`,
      `Anchor hope to something dateless — a person or a task, not a deadline.`,
    ],
    ask: [
      `Who or what, specifically, needs you to come through this?`,
      `If your situation had an assignment hidden in it, what would it be teaching you to do?`,
    ],
    fr: [
      { id: `pema`, why: `for the staying-power the heart needs meanwhile` },
      { id: `medit`, why: `the emperor's field manual for attitude` },
      { id: `remains`, why: `a novel about a life measured too late — and what to do sooner` },
    ],
  },
  bird: {
    say: `deep breath. your letter is {{b}} — permission, in writing, to do this one bird at a time.`,
    res: `The project is a mountain, the deadline is breathing, and you can't even start.`,
    chap: `Shitty First Drafts`,
    core: `Lamott's argument is that paralysis comes from demanding the final version first. All good writing — all good anything — begins with a draft so bad nobody will ever see it; the first pass exists only to give the second pass something to fix. Perfectionism, she says, is the voice of the oppressor, and the cure is permission, granted daily, to be briefly terrible.`,
    ins: [
      {
        t: `Down drafts before up drafts`,
        r: `Her sequence — the down draft (just get it down), the up draft (fix it up), the dental draft (check every tooth) — turns one impossible task into three small ones.`,
        ex: `She describes writing her food reviews by pouring out pages of unusable rambling first, then finding the real opening sitting quietly in the middle of the mess the next day.`,
      },
      {
        t: `Bird by bird`,
        r: `Scale creates the panic; sequence dissolves it. You never have to do the whole thing — only the next small unit.`,
        ex: `The title comes from her ten-year-old brother, frozen the night before a long-overdue report on birds, and their father sitting down beside him with the advice that named the book.`,
        q: { t: `Bird by bird, buddy. Just take it bird by bird.`, by: `ANNE LAMOTT, BIRD BY BIRD` },
      },
      {
        t: `The one-inch picture frame`,
        r: `When the whole is unbearable, describe only what fits in one inch: one scene, one memory, one paragraph. The frame is a contract with your panic.`,
        ex: `She keeps an actual one-inch picture frame on her desk as the standing reminder that an inch is all that's ever being asked.`,
      },
    ],
    close: `The mountain isn't the assignment. The next bird is. Lower the standard, shrink the frame, and let the bad version buy you the good one.`,
    take: [
      `Lower the bar until you trip over it: today's only job is the down draft.`,
      `Shrink the assignment to one inch and do only that.`,
    ],
    ask: [
      `What's the bird directly in front of you — the single next unit?`,
      `Whose approval is the perfectionism performing for, and are they even real?`,
    ],
    fr: [
      { id: `deep`, why: `for building the hours the drafts live in` },
      { id: `atomic`, why: `if starting is always the hard part` },
      { id: `pema`, why: `when the panic needs tending before the pages` },
    ],
  },
};
