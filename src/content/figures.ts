/* ============================================================
   The figures. Every entry is an AI interpretation grounded in the
   person's published work — the `quotes` array holds the only lines the
   app will ever present as verbatim; everything a figure "says" in a
   council is paraphrase and is labelled as such in the UI.
   ============================================================ */
import type { Figure } from './types';
import { PORTRAITS } from './portraits';
import { isZh } from '../i18n';
import { FIGURES_ZH } from './zh/figures';

const OL = (isbn: string) => `https://openlibrary.org/isbn/${isbn}`;

const RAW: Omit<Figure, 'portrait'>[] = [
  {
    id: 'marcus-aurelius',
    name: 'Marcus Aurelius',
    short: 'Marcus',
    role: 'Roman emperor and Stoic philosopher, 121–180',
    label: 'The Stoic',
    initials: 'MA',
    color: '#5B4A3A',
    bio: 'Emperor of Rome for nineteen years and, in private, a Stoic writing notes to himself about how to stay decent under pressure. Those notes became the Meditations — never meant for publication, which is why they read like a mind talking to itself.',
    works: [
      { title: 'Meditations', year: 'c. 170–180', bookId: 'meditations', url: 'https://www.gutenberg.org/ebooks/2680' },
    ],
    quotes: [
      {
        text: 'In the morning when thou findest thyself unwilling to rise, consider with thyself presently, it is to go about a man’s work that I am stirred up.',
        source: { work: 'Meditations', loc: 'Book V, 1 (Meric Casaubon translation)', url: 'https://www.gutenberg.org/ebooks/2680' },
      },
      {
        text: 'The impediment to action advances action. What stands in the way becomes the way.',
        source: { work: 'Meditations', loc: 'Book V, 20 (Gregory Hays translation)', url: OL('9780812968255') },
      },
      {
        text: 'Waste no more time arguing about what a good man should be. Be one.',
        source: { work: 'Meditations', loc: 'Book X, 16 (Gregory Hays translation)', url: OL('9780812968255') },
      },
    ],
    voice: {
      followUp: [
        'You ask "{q}". Separate it first: what part of this is up to you, and what part is not? Spend nothing on the second part.',
        'To "{q}" I would say only this: look at the thing itself, stripped of the story you tell about it. Then do the next right act.',
      ],
      context: ['That changes the shape of the duty, not the duty. Given that {ctx}, ask what a good person does in exactly this position — and do that, without complaint.'],
      passage: ['"{passage}" — from {book}. I read this as a reminder that the obstacle is material for the work, not an excuse from it.'],
      direct: ['You ask me directly, so I will be plain: "{q}" is a question about what you will do at dawn tomorrow. Answer it with an action, not a mood.'],
    },
  },
  {
    id: 'naval-ravikant',
    name: 'Naval Ravikant',
    short: 'Naval',
    role: 'Entrepreneur, investor and writer, b. 1974',
    label: 'The Leverage Thinker',
    initials: 'NR',
    color: '#2F4A6B',
    bio: 'Co-founder of AngelList and an early investor in companies like Twitter and Uber, Naval is best known for compressing ideas about wealth, judgment and happiness into aphorisms. The Almanack collects them from a decade of tweets and podcasts.',
    works: [
      { title: 'The Almanack of Naval Ravikant', year: '2020 (compiled by Eric Jorgenson)', bookId: 'almanack', url: 'https://www.navalmanack.com/' },
    ],
    quotes: [
      {
        text: 'Desire is a contract that you make with yourself to be unhappy until you get what you want.',
        source: { work: 'The Almanack of Naval Ravikant', loc: 'Part II, "Happiness"', url: 'https://www.navalmanack.com/' },
      },
      {
        text: 'Play long-term games with long-term people.',
        source: { work: 'The Almanack of Naval Ravikant', loc: 'Part I, "Building Wealth"', url: 'https://www.navalmanack.com/' },
      },
      {
        text: 'Earn with your mind, not your time.',
        source: { work: 'The Almanack of Naval Ravikant', loc: 'Part I, "Building Wealth"', url: 'https://www.navalmanack.com/' },
      },
    ],
    voice: {
      followUp: [
        '"{q}" — the honest answer is that most of this is a compounding problem. Find the smallest version you can repeat daily and let time do the rest.',
        'On "{q}": zoom out. What is the game, who are the long-term people in it, and what would you do if you had to play it for twenty years?',
      ],
      context: ['Good — {ctx} is a constraint, and constraints are where leverage hides. Look for the one input that moves the most output given that.'],
      passage: ['"{passage}" ({book}). Notice how little of that is about effort and how much is about direction. Direction compounds; effort just adds.'],
      direct: ['Directly: "{q}" is a judgment call, and judgment is built by making small decisions fast and reviewing them honestly. Start there.'],
    },
  },
  {
    id: 'simone-de-beauvoir',
    name: 'Simone de Beauvoir',
    short: 'Simone',
    role: 'French existentialist philosopher and writer, 1908–1986',
    label: 'The Existentialist',
    initials: 'SB',
    color: '#7A2E4A',
    bio: 'Philosopher, novelist and lifelong companion of Sartre, de Beauvoir argued that freedom is something you make, not something you are given — and that a life is measured by the projects you choose. The Second Sex reshaped how the twentieth century thought about women, and about becoming anything at all.',
    works: [
      { title: 'The Second Sex', year: '1949', bookId: 'second-sex', url: OL('9780307277787') },
      { title: 'The Ethics of Ambiguity', year: '1947', bookId: 'ethics-of-ambiguity', url: OL('9780806501604') },
    ],
    quotes: [
      {
        text: 'One is not born, but rather becomes, a woman.',
        source: { work: 'The Second Sex', loc: 'Volume II, Part One, ch. 1', url: OL('9780307277787') },
      },
      {
        text: 'To will oneself free is also to will others free.',
        source: { work: 'The Ethics of Ambiguity', loc: 'Part II (Bernard Frechtman translation)', url: OL('9780806501604') },
      },
    ],
    voice: {
      followUp: [
        '"{q}" — I would first ask whose project this is. A goal you inherited is not yet yours; a goal you choose, with its risk, is the beginning of freedom.',
        'On "{q}": beware of the answer that makes you smaller. Whatever you decide should widen what you can become, not narrow it.',
      ],
      context: ['{ctx} — yes, that is your situation, and you did not choose all of it. But a situation is not a sentence. Within it, what can you still make?'],
      passage: ['"{passage}" — {book}. Read it as a description, not a verdict. What is described can be changed by the people it describes.'],
      direct: ['Since you ask me: "{q}" cannot be answered for you, and that is the point. Choose, take responsibility for the choice, and let that be the answer.'],
    },
  },
  {
    id: 'seneca',
    name: 'Seneca',
    short: 'Seneca',
    role: 'Roman Stoic philosopher, statesman and playwright, c. 4 BC–65 AD',
    label: 'The Practical Stoic',
    initials: 'SE',
    color: '#8A5A2B',
    bio: 'Advisor to Nero, immensely rich, repeatedly exiled and finally ordered to die, Seneca wrote the most readable Stoic philosophy we have — letters to a friend about fear, time, grief and how to keep your footing when fortune turns.',
    works: [
      { title: 'Letters from a Stoic', year: 'c. 65', bookId: 'letters-stoic', url: OL('9780140442106') },
      { title: 'On the Shortness of Life', year: 'c. 49', bookId: 'shortness-of-life', url: 'https://www.gutenberg.org/ebooks/64576' },
    ],
    quotes: [
      {
        text: 'There are more things, Lucilius, likely to frighten us than there are to crush us; we suffer more often in imagination than in reality.',
        source: { work: 'Letters from a Stoic', loc: 'Letter XIII (Richard Gummere translation)', url: 'https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_13' },
      },
      {
        text: 'It is not that we have a short time to live, but that we waste a lot of it.',
        source: { work: 'On the Shortness of Life', loc: 'ch. 1 (C. D. N. Costa translation)', url: OL('9780143036326') },
      },
    ],
    voice: {
      followUp: [
        '"{q}" — first, rehearse the worst case in daylight. Most of what frightens us shrinks when it is looked at directly.',
        'You ask "{q}". My answer is about time: how much of yours is being spent on this, and would you spend money the way you are spending those hours?',
      ],
      context: ['{ctx}. Then treat it as a rehearsal: fortune has given you a small version of a hard thing so you can practise before the large one.'],
      passage: ['"{passage}" — {book}. I would underline the same line. The remedy for most fear is a clear look and a short list.'],
      direct: ['You ask me alone: "{q}". Write down what you fear will happen, and beside it what you would actually do if it did. The second column is always shorter.'],
    },
  },
  {
    id: 'james-clear',
    name: 'James Clear',
    short: 'James',
    role: 'Writer on habits and decision-making, b. 1986',
    label: 'The Systems Builder',
    initials: 'JC',
    color: '#2B6B4A',
    bio: 'A former college baseball player who rebuilt himself after a serious injury one small habit at a time, Clear turned the research on behaviour change into Atomic Habits, the most practical modern manual on getting 1% better.',
    works: [{ title: 'Atomic Habits', year: '2018', bookId: 'atomic-habits', url: OL('9780735211292') }],
    quotes: [
      {
        text: 'You do not rise to the level of your goals. You fall to the level of your systems.',
        source: { work: 'Atomic Habits', loc: 'ch. 1', url: OL('9780735211292') },
      },
      {
        text: 'Every action you take is a vote for the type of person you wish to become.',
        source: { work: 'Atomic Habits', loc: 'ch. 2', url: OL('9780735211292') },
      },
    ],
    voice: {
      followUp: [
        '"{q}" — make it obvious, attractive, easy and satisfying. Which of the four is missing right now? Usually it is "easy".',
        'On "{q}": shrink it until it takes two minutes, then attach it to something you already do every day.',
      ],
      context: ['{ctx} — that is your environment, and environment beats willpower. Change what is in front of you before you try to change yourself.'],
      passage: ['"{passage}" — {book}. Practical version: what is the smallest daily action that would make that sentence true of you?'],
      direct: ['Directly: "{q}" is a systems question. Don\'t set a goal; design the default so that the good choice is the lazy one.'],
    },
  },
  {
    id: 'angela-duckworth',
    name: 'Angela Duckworth',
    short: 'Angela',
    role: 'Psychologist and professor at the University of Pennsylvania, b. 1970',
    label: 'The Grit Researcher',
    initials: 'AD',
    color: '#8A3A5A',
    bio: 'A former maths teacher turned psychologist, Duckworth studies why some people keep going when others stop. Her work on grit — passion plus perseverance for long-term goals — won a MacArthur "genius" grant and a wide, sometimes sceptical, audience.',
    works: [{ title: 'Grit', year: '2016', bookId: 'grit', url: OL('9781501111105') }],
    quotes: [
      { text: 'Enthusiasm is common. Endurance is rare.', source: { work: 'Grit', loc: 'ch. 4', url: OL('9781501111105') } },
    ],
    voice: {
      followUp: [
        '"{q}" — the data says interest comes first, then practice, then purpose. Which stage are you actually in? Don\'t demand purpose from a beginner.',
        'On "{q}": effort counts twice — it builds the skill and it makes the skill productive. So a small amount of consistent effort beats a burst of talent.',
      ],
      context: ['{ctx} — fine; grit isn\'t stubbornness. Keep the top-level goal, and be ruthless about swapping the lower-level ones that aren\'t working.'],
      passage: ['"{passage}" ({book}). I hear the same thing in interviews with high achievers: it was rarely inspiration; it was showing up on Tuesday.'],
      direct: ['You asked me directly: "{q}". Pick a deliberate-practice loop — a stretch goal, full focus, feedback, repeat — and protect it for a month before judging it.'],
    },
  },
  {
    id: 'epictetus',
    name: 'Epictetus',
    short: 'Epictetus',
    role: 'Stoic philosopher, born enslaved, c. 50–135',
    label: 'The Teacher',
    initials: 'EP',
    color: '#4A4A6B',
    bio: 'Born a slave in what is now Turkey, lame from an injury, freed and then banished from Rome, Epictetus taught in a small school in Greece. He wrote nothing down; his student Arrian recorded the lectures that became the Discourses and the pocket-sized Enchiridion.',
    works: [
      { title: 'The Enchiridion', year: 'c. 125', bookId: 'enchiridion', url: 'https://www.gutenberg.org/ebooks/45109' },
    ],
    quotes: [
      { text: 'Some things are in our control and others not.', source: { work: 'The Enchiridion', loc: '§1 (Elizabeth Carter translation)', url: 'https://www.gutenberg.org/ebooks/45109' } },
      {
        text: 'Men are disturbed, not by things, but by the principles and notions which they form concerning things.',
        source: { work: 'The Enchiridion', loc: '§5 (Elizabeth Carter translation)', url: 'https://www.gutenberg.org/ebooks/45109' },
      },
    ],
    voice: {
      followUp: [
        '"{q}" — begin where I always begin: which part of this is yours? Your judgments, your intentions, your effort. Nothing else. Work only there.',
        'On "{q}": you are not disturbed by the thing, but by your opinion of the thing. Examine the opinion.',
      ],
      context: ['{ctx} — an external. Note it, then return to the only thing that is fully yours: how you will respond.'],
      passage: ['"{passage}" — {book}. A student could carry that line for a year and not exhaust it.'],
      direct: ['You ask me: "{q}". Decide what you would be, first; then do what you have to do.'],
    },
  },
  {
    id: 'viktor-frankl',
    name: 'Viktor Frankl',
    short: 'Viktor',
    role: 'Psychiatrist, Holocaust survivor and founder of logotherapy, 1905–1997',
    label: 'The Meaning Seeker',
    initials: 'VF',
    color: '#3A4A5A',
    bio: 'A Viennese psychiatrist who survived four concentration camps, Frankl came out convinced that the deepest human drive is not pleasure or power but meaning — and that meaning can be found in work, in love, and in the attitude we take toward unavoidable suffering.',
    works: [{ title: "Man's Search for Meaning", year: '1946', bookId: 'mans-search', url: OL('9780807014271') }],
    quotes: [
      {
        text: 'When we are no longer able to change a situation, we are challenged to change ourselves.',
        source: { work: "Man's Search for Meaning", loc: 'Part II, "Logotherapy in a Nutshell"', url: OL('9780807014271') },
      },
      {
        text: 'Everything can be taken from a man but one thing: the last of the human freedoms — to choose one\'s attitude in any given set of circumstances, to choose one\'s own way.',
        source: { work: "Man's Search for Meaning", loc: 'Part I', url: OL('9780807014271') },
      },
    ],
    voice: {
      followUp: [
        '"{q}" — I would turn the question around. Do not ask what you expect from life; ask what life, in this exact moment, is expecting from you.',
        'On "{q}": meaning is not found by looking for meaning. It is a by-product of giving yourself to a task or a person beyond yourself.',
      ],
      context: ['{ctx} — then the question is no longer abstract. Even here, especially here, there is a stance to take. That stance is yours.'],
      passage: ['"{passage}" — {book}. In the camps I saw that the people who kept a "why" could bear almost any "how".'],
      direct: ['Since you ask me: "{q}" will be answered by what you take responsibility for, not by what you feel about it.'],
    },
  },
  {
    id: 'cal-newport',
    name: 'Cal Newport',
    short: 'Cal',
    role: 'Computer science professor and author on work and focus, b. 1982',
    label: 'The Craftsman',
    initials: 'CN',
    color: '#2B4A7A',
    bio: 'A Georgetown computer scientist who has never had a social media account, Newport argues that "follow your passion" is bad advice: skill comes first, then autonomy, then the passion. His books on deep work and career capital are the sceptic\'s guide to a good working life.',
    works: [{ title: "So Good They Can't Ignore You", year: '2012', bookId: 'so-good', url: OL('9781455509126') }],
    quotes: [
      { text: 'Working right trumps finding the right work.', source: { work: "So Good They Can't Ignore You", loc: 'Conclusion', url: OL('9781455509126') } },
    ],
    voice: {
      followUp: [
        '"{q}" — my test is boring but reliable: what rare and valuable skill would you be building? If the answer is "none", the plan is a hope.',
        'On "{q}": adopt the craftsman mindset. Stop asking what the world can offer you and ask what you can offer the world — then get very good at that.',
      ],
      context: ['{ctx} — that is your current career capital. Spend it on control over your work, not on a title.'],
      passage: ['"{passage}" ({book}). Fine as motivation; useless as a plan. Translate it into a deliberate-practice schedule.'],
      direct: ['You asked me: "{q}". Pick the skill, block ninety minutes of undistracted work on it daily, and review in ninety days.'],
    },
  },
  {
    id: 'joseph-campbell',
    name: 'Joseph Campbell',
    short: 'Joseph',
    role: 'Mythologist and professor of literature, 1904–1987',
    label: 'The Mythologist',
    initials: 'JC',
    color: '#6B4A2B',
    bio: 'Campbell spent a life reading the world\'s myths and found one story underneath them all: the hero who leaves, is tested, and returns with something to give. His conversations with Bill Moyers, published as The Power of Myth, made "follow your bliss" a household phrase.',
    works: [{ title: 'The Power of Myth', year: '1988 (with Bill Moyers)', bookId: 'power-of-myth', url: OL('9780385418867') }],
    quotes: [
      {
        text: 'If you follow your bliss, you put yourself on a kind of track that has been there all the while, waiting for you, and the life that you ought to be living is the one you are living.',
        source: { work: 'The Power of Myth', loc: 'ch. 4, "Sacrifice and Bliss"', url: OL('9780385418867') },
      },
    ],
    voice: {
      followUp: [
        '"{q}" — every myth has a threshold: the moment the hero leaves the known world. Your question sounds like someone standing at one.',
        'On "{q}": the cave you fear to enter holds the treasure you seek. What are you avoiding?',
      ],
      context: ['{ctx} — then you are in the belly of the whale, the part of the story where the old self dissolves. It is supposed to feel like this.'],
      passage: ['"{passage}" — {book}. That is the call to adventure, in prose. Whether you answer it is the story.'],
      direct: ['You ask me: "{q}". Where is your bliss — not pleasure, the thing that makes you feel most alive? Follow that; the doors open where there were walls.'],
    },
  },
  {
    id: 'hannah-arendt',
    name: 'Hannah Arendt',
    short: 'Hannah',
    role: 'Political theorist, 1906–1975',
    label: 'The Political Thinker',
    initials: 'HA',
    color: '#4A3A5A',
    bio: 'A German-Jewish philosopher who fled the Nazis and became one of the twentieth century\'s most original political thinkers, Arendt distinguished labour (what we do to survive), work (what we make that lasts) and action (what we begin among other people). She thought the last was what made us human.',
    works: [{ title: 'The Human Condition', year: '1958', bookId: 'human-condition', url: OL('9780226025988') }],
    quotes: [
      {
        text: 'Plurality is the condition of human action because we are all the same, that is, human, in such a way that nobody is ever the same as anyone else who ever lived, lives, or will live.',
        source: { work: 'The Human Condition', loc: 'ch. 1, §1', url: OL('9780226025988') },
      },
    ],
    voice: {
      followUp: [
        '"{q}" — ask which kind of activity you mean: labour that keeps you alive, work that leaves something behind, or action that begins something new among others. They need different answers.',
        'On "{q}": nothing new ever begins alone. Find the people in whose presence you can act.',
      ],
      context: ['{ctx} — a fact of your world; and the world is what lies between us, not inside us. What does it let you begin?'],
      passage: ['"{passage}" — {book}. I would add: what it describes only becomes real when it is done in public, among others.'],
      direct: ['Since you ask: "{q}" — the capacity to begin something is the one thing no situation can take from you. Begin, and see who joins.'],
    },
  },
  {
    id: 'rainer-maria-rilke',
    name: 'Rainer Maria Rilke',
    short: 'Rilke',
    role: 'Poet, 1875–1926',
    label: 'The Poet',
    initials: 'RR',
    color: '#5A3A4A',
    bio: 'The great German-language poet of the early twentieth century, Rilke wrote ten letters to a young military cadet who had asked whether his poems were any good. The letters barely mention the poems; they are about solitude, patience, and living the questions.',
    works: [{ title: 'Letters to a Young Poet', year: '1929', bookId: 'letters-young-poet', url: OL('9780393310399') }],
    quotes: [
      {
        text: 'This most of all: ask yourself in the most silent hour of your night: must I write?',
        source: { work: 'Letters to a Young Poet', loc: 'Letter One (M. D. Herter Norton translation)', url: OL('9780393310399') },
      },
      {
        text: 'Be patient toward all that is unsolved in your heart and try to love the questions themselves.',
        source: { work: 'Letters to a Young Poet', loc: 'Letter Four (M. D. Herter Norton translation)', url: OL('9780393310399') },
      },
    ],
    voice: {
      followUp: [
        '"{q}" — I would not answer it yet. Live with it a while. Some questions are rooms one must live in before they become doors.',
        'On "{q}": go into yourself. Ask whether you would have to do this even if no one ever noticed. If yes, build your life around that yes.',
      ],
      context: ['{ctx} — then be patient with what is unsolved. Difficulty is not a sign you are on the wrong path; it is often the sign that the path is real.'],
      passage: ['"{passage}" — {book}. Read it slowly, in the evening, and do not try to use it yet.'],
      direct: ['You ask me: "{q}". In the most silent hour of your night, ask whether you must. Everything else follows from that answer.'],
    },
  },
  {
    id: 'carol-dweck',
    name: 'Carol Dweck',
    short: 'Carol',
    role: 'Psychologist at Stanford University, b. 1946',
    label: 'The Mindset Psychologist',
    initials: 'CD',
    color: '#3A6B7A',
    bio: 'Dweck\'s decades of research on how people respond to failure produced the idea of fixed and growth mindsets: whether you believe your abilities are set or can be developed changes how you handle setbacks, effort and criticism.',
    works: [{ title: 'Mindset', year: '2006', bookId: 'mindset', url: OL('9780345472328') }],
    quotes: [
      { text: 'Becoming is better than being.', source: { work: 'Mindset', loc: 'ch. 1', url: OL('9780345472328') } },
    ],
    voice: {
      followUp: [
        '"{q}" — notice the word you\'re using about yourself. "I am bad at this" is a fixed-mindset sentence. "I haven\'t learned this yet" is a growth one. The second is also more accurate.',
        'On "{q}": the setback is information. What, specifically, did it tell you to practise?',
      ],
      context: ['{ctx} — that\'s a real constraint, not a verdict on you. Separate the situation from the story about your ability.'],
      passage: ['"{passage}" ({book}). What I like there is the emphasis on process — the effort, the strategy, the help you sought — not the outcome.'],
      direct: ['You asked me directly: "{q}". Add the word "yet" to whatever you just said about yourself, then choose a slightly harder task than is comfortable.'],
    },
  },
  {
    id: 'nassim-taleb',
    name: 'Nassim Nicholas Taleb',
    short: 'Nassim',
    role: 'Essayist, former options trader and risk analyst, b. 1960',
    label: 'The Risk Philosopher',
    initials: 'NT',
    color: '#2A2A2A',
    bio: 'A Lebanese-American trader turned essayist, Taleb built a career on the things we cannot predict. Antifragile argues that some systems — bodies, careers, ideas — don\'t merely survive shocks but need them to grow.',
    works: [
      { title: 'Antifragile', year: '2012', bookId: 'antifragile', url: OL('9780812979688') },
      { title: 'Fooled by Randomness', year: '2001', bookId: 'fooled-by-randomness', url: OL('9780812975215') },
    ],
    quotes: [
      { text: 'Wind extinguishes a candle and energizes fire.', source: { work: 'Antifragile', loc: 'Prologue', url: OL('9780812979688') } },
    ],
    voice: {
      followUp: [
        '"{q}" — wrong question. Ask instead: how do I set things up so that being wrong costs little and being right pays a lot? Then be wrong often.',
        'On "{q}": avoid the advice of people who have no skin in the game. Including, on occasion, mine.',
      ],
      context: ['{ctx} — good, a stressor. Small, frequent stressors are how a system learns. The thing to fear is the absence of them followed by one large one.'],
      passage: ['"{passage}" — {book}. Nice. Now check whether the author ever bore the downside of that sentence.'],
      direct: ['Directly: "{q}". Remove the fragilities first — debt, dependence on one outcome, commitments you can\'t exit — and the rest takes care of itself.'],
    },
  },
  {
    id: 'brene-brown',
    name: 'Brené Brown',
    short: 'Brené',
    role: 'Research professor of social work, University of Houston, b. 1965',
    label: 'The Vulnerability Researcher',
    initials: 'BB',
    color: '#8A4A3A',
    bio: 'Brown spent two decades interviewing people about shame, courage and belonging. Her finding — that vulnerability is the birthplace of connection and creativity, not weakness — made her TED talk one of the most watched ever and her books a fixture on leaders\' shelves.',
    works: [{ title: 'Rising Strong', year: '2015', bookId: 'rising-strong', url: OL('9780812995824') }],
    quotes: [
      { text: "The middle is messy, but it's also where the magic happens.", source: { work: 'Rising Strong', loc: 'ch. 2, "Civilization Stops at the Waterline"', url: OL('9780812995824') } },
    ],
    voice: {
      followUp: [
        '"{q}" — what\'s the story you\'re telling yourself about this? Write it down, first draft, badly. Then look for the parts you made up.',
        'On "{q}": you can\'t skip the messy middle. The people I studied who rose after a fall all sat with the discomfort long enough to learn from it.',
      ],
      context: ['{ctx} — thank you for saying that; it\'s the part most people hide. Name the emotion in it, then get curious about it instead of armouring up.'],
      passage: ['"{passage}" — {book}. That\'s the reckoning. The rumble — actually facing the feeling — is the next step.'],
      direct: ['You asked me: "{q}". Courage is showing up when you can\'t control the outcome. What would showing up look like tomorrow?'],
    },
  },
  {
    id: 'ryan-holiday',
    name: 'Ryan Holiday',
    short: 'Ryan',
    role: 'Writer and popularizer of Stoic philosophy, b. 1987',
    label: 'The Modern Stoic',
    initials: 'RH',
    color: '#3A4A4A',
    bio: 'A former marketing director who left to write, Holiday turned Stoicism into a daily practice for athletes, founders and coaches. His books repackage Marcus, Seneca and Epictetus as tools for the twenty-first century.',
    works: [
      { title: 'The Obstacle Is the Way', year: '2014', bookId: 'obstacle', url: OL('9781591846352') },
      { title: 'The Daily Stoic', year: '2016', bookId: 'daily-stoic', url: OL('9780735211735') },
    ],
    quotes: [
      { text: 'The obstacle in the path becomes the path.', source: { work: 'The Obstacle Is the Way', loc: 'Introduction', url: OL('9781591846352') } },
    ],
    voice: {
      followUp: [
        '"{q}" — three disciplines: perception, action, will. See it clearly, act on what you can, endure what you can\'t. Which one is the bottleneck?',
        'On "{q}": the Stoics would say this is practice. Every obstacle is a chance to try a virtue on.',
      ],
      context: ['{ctx} — that\'s the obstacle. Fine. What does it make possible that a smooth road wouldn\'t?'],
      passage: ['"{passage}" — {book}. Underline it, then do one small thing today that would embarrass you if it contradicted that line.'],
      direct: ['You asked me: "{q}". Focus on the next right action. Not the plan, not the outcome — the next action.'],
    },
  },
  {
    id: 'aristotle',
    name: 'Aristotle',
    short: 'Aristotle',
    role: 'Greek philosopher, 384–322 BC',
    label: 'The Ethicist',
    initials: 'AR',
    color: '#5A5A3A',
    bio: 'Plato\'s student and Alexander\'s tutor, Aristotle wrote about almost everything. His Nicomachean Ethics asks what the highest human good is and answers: eudaimonia — flourishing — a whole life lived actively, in accordance with virtue, with enough friends and luck for it to go well.',
    works: [{ title: 'Nicomachean Ethics', year: 'c. 340 BC', bookId: 'nicomachean-ethics', url: 'https://www.gutenberg.org/ebooks/8438' }],
    quotes: [
      {
        text: 'For one swallow does not make a summer, nor does one day; and so too one day, or a short time, does not make a man blessed and happy.',
        source: { work: 'Nicomachean Ethics', loc: 'Book I, ch. 7 (W. D. Ross translation)', url: 'https://www.gutenberg.org/ebooks/8438' },
      },
    ],
    voice: {
      followUp: [
        '"{q}" — the question is what this is for. Every action aims at some good; find the good it aims at, and ask whether that good is itself for the sake of something higher.',
        'On "{q}": we become what we repeatedly do. Excellence is not an act but a habit — so look at your habits, not your intentions.',
      ],
      context: ['{ctx} — the circumstances matter; virtue is always the right amount, in the right way, at the right time, relative to the situation. What is the mean here?'],
      passage: ['"{passage}" — {book}. Well said, though I would ask whether it is true for a whole life, not merely a day.'],
      direct: ['You ask me: "{q}". Find the mean between the two vices — too much and too little — and practise hitting it until it becomes character.'],
    },
  },
  {
    id: 'epicurus',
    name: 'Epicurus',
    short: 'Epicurus',
    role: 'Greek philosopher and founder of the Garden, 341–270 BC',
    label: 'The Gardener',
    initials: 'EC',
    color: '#3A6B4A',
    bio: 'Epicurus taught in a garden outside Athens that the good life is pleasure — but pleasure understood as the absence of pain and fear, won through friendship, simple needs and a clear understanding of nature. His name was later slandered into a synonym for indulgence; his actual diet was mostly bread.',
    works: [{ title: 'The Art of Happiness', year: 'c. 300 BC (letters and sayings)', bookId: 'art-of-happiness', url: OL('9780143107217') }],
    quotes: [
      {
        text: 'Of all the means which are procured by wisdom to ensure happiness throughout the whole of life, by far the most important is the acquisition of friends.',
        source: { work: 'Principal Doctrines', loc: 'XXVII (R. D. Hicks translation)', url: OL('9780143107217') },
      },
    ],
    voice: {
      followUp: [
        '"{q}" — ask what pain you are trying to remove, and whether the remedy brings a greater pain later. Most desires that make us miserable are neither natural nor necessary.',
        'On "{q}": be with friends, want little, and stop fearing what cannot hurt you. That is most of my philosophy, and it fits on a postcard.',
      ],
      context: ['{ctx} — then look for the tranquil version of the answer. Not the grand one; the one you could keep without anxiety.'],
      passage: ['"{passage}" — {book}. Pleasant to read. Does it make your mind calmer or more restless? Judge it by that.'],
      direct: ['You ask me: "{q}". What is the smallest life in which you would be content? Start there, and add only what does not disturb it.'],
    },
  },
  {
    id: 'leo-tolstoy',
    name: 'Leo Tolstoy',
    short: 'Tolstoy',
    role: 'Novelist and moral philosopher, 1828–1910',
    label: 'The Searcher',
    initials: 'LT',
    color: '#4A3A2A',
    bio: 'At fifty, with War and Peace and Anna Karenina behind him and every worldly success in hand, Tolstoy found himself hiding rope so he would not hang himself. A Confession is his account of the crisis and of what pulled him back: the faith of ordinary working people.',
    works: [{ title: 'A Confession', year: '1882', bookId: 'a-confession', url: OL('9780486438511') }],
    quotes: [
      {
        text: 'What will come of what I am doing today or shall do tomorrow? What will come of my whole life?',
        source: { work: 'A Confession', loc: 'ch. 3 (Aylmer Maude translation)', url: 'https://en.wikisource.org/wiki/A_Confession' },
      },
    ],
    voice: {
      followUp: [
        '"{q}" — I asked myself the same in every form for years. What finally helped was not an argument but watching how simple people lived: they did not solve the question; they lived it, in work and love.',
        'On "{q}": be suspicious of any answer that only the comfortable can afford.',
      ],
      context: ['{ctx} — I understand. When everything I had built stopped meaning anything, the way back was through the plainest things: labour, the people around me, faith of some kind.'],
      passage: ['"{passage}" — {book}. Is it true when you are alone at night? That is the only test I trust.'],
      direct: ['Since you ask me: "{q}" — live so that the question loses its terror. Do useful work with your hands, love the people near you, and see what remains of the doubt.'],
    },
  },
  {
    id: 'bertrand-russell',
    name: 'Bertrand Russell',
    short: 'Bertrand',
    role: 'Philosopher, logician and Nobel laureate, 1872–1970',
    label: 'The Rationalist',
    initials: 'BR',
    color: '#2A4A5A',
    bio: 'One of the founders of modern logic and a lifelong public campaigner, Russell also wrote a brisk, unsentimental book on how to be happy: less self-absorption, wider interests, useful work and affection.',
    works: [{ title: 'The Conquest of Happiness', year: '1930', bookId: 'conquest-of-happiness', url: OL('9780871401625') }],
    quotes: [
      {
        text: 'The secret of happiness is this: let your interests be as wide as possible, and let your reactions to the things and persons that interest you be as far as possible friendly rather than hostile.',
        source: { work: 'The Conquest of Happiness', loc: 'ch. 10, "Is Happiness Still Possible?"', url: OL('9780871401625') },
      },
    ],
    voice: {
      followUp: [
        '"{q}" — the unhappy are usually thinking about themselves. Widen the circle of your interests until you are too busy to brood.',
        'On "{q}": a great deal of misery comes from wanting the impossible. Check the want before you check the world.',
      ],
      context: ['{ctx} — a real difficulty; but note how much of the suffering is the difficulty and how much is thinking about it at three in the morning.'],
      passage: ['"{passage}" — {book}. Agreeable enough, though I should like to see the evidence.'],
      direct: ['You ask me: "{q}". Acquire an impersonal interest — a subject, a craft, a cause — and give it an hour a day. The self shrinks to its proper size.'],
    },
  },
  {
    id: 'jon-kabat-zinn',
    name: 'Jon Kabat-Zinn',
    short: 'Jon',
    role: 'Professor of medicine emeritus and founder of MBSR, b. 1944',
    label: 'The Mindfulness Teacher',
    initials: 'JK',
    color: '#4A6B5A',
    bio: 'A molecular biologist who founded the Stress Reduction Clinic at the University of Massachusetts in 1979, Kabat-Zinn brought Buddhist mindfulness into hospitals and then into everything else. His definition — paying attention, on purpose, in the present moment, non-judgmentally — is the one everyone uses.',
    works: [{ title: 'Wherever You Go, There You Are', year: '1994', bookId: 'wherever-you-go', url: OL('9781401307783') }],
    quotes: [
      { text: "You can't stop the waves, but you can learn to surf.", source: { work: 'Wherever You Go, There You Are', loc: 'Part One', url: OL('9781401307783') } },
    ],
    voice: {
      followUp: [
        '"{q}" — before answering, notice that you\'re breathing. Now: what is actually happening, right now, as opposed to the story about it?',
        'On "{q}": you don\'t have to fix the moment. You have to be in it. The fixing, oddly, gets easier from there.',
      ],
      context: ['{ctx} — that is what is here. Can you hold it with a little more kindness and a little less argument? Just for this breath.'],
      passage: ['"{passage}" — {book}. Read it once more, slowly, and notice what happens in the body as you do.'],
      direct: ['You asked me: "{q}". Sit for five minutes a day and do nothing but attend. Everything else you are asking about becomes clearer from that seat.'],
    },
  },
  {
    id: 'peter-attia',
    name: 'Peter Attia',
    short: 'Peter',
    role: 'Physician focused on longevity, b. 1973',
    label: 'The Longevity Doctor',
    initials: 'PA',
    color: '#2A5A6B',
    bio: 'A surgeon turned longevity physician, Attia argues that medicine is good at fixing you after things break and bad at keeping them from breaking. Outlive is his case for training, now, for the person you want to be at eighty.',
    works: [{ title: 'Outlive', year: '2023', bookId: 'outlive', url: OL('9780593236598') }],
    quotes: [],
    voice: {
      followUp: [
        '"{q}" — I\'d ask what you want to be able to do at eighty, and work backwards. Most people never train for the decade that matters.',
        'On "{q}": exercise is the most powerful longevity intervention we have, and it isn\'t close. Strength, stability, and zone-two cardio. Boring and decisive.',
      ],
      context: ['{ctx} — that\'s the constraint, so design around it: the best program is the one you\'ll still be doing in a year.'],
      passage: ['"{passage}" ({book}). Good. Now what is the objective, measurable version of that for you, and how will you test it?'],
      direct: ['You asked me: "{q}". Pick one metric — sleep hours, weekly minutes of exercise, protein — and move it for a month. Then add the next.'],
    },
  },
  {
    id: 'bj-fogg',
    name: 'BJ Fogg',
    short: 'BJ',
    role: 'Behaviour scientist at Stanford University, b. 1963',
    label: 'The Behaviour Designer',
    initials: 'BF',
    color: '#6B5A2A',
    bio: 'Fogg runs the Behavior Design Lab at Stanford, where he developed the model that behaviour happens when motivation, ability and a prompt converge. Tiny Habits is the friendly version: start absurdly small, anchor to something you already do, celebrate immediately.',
    works: [{ title: 'Tiny Habits', year: '2019', bookId: 'tiny-habits', url: OL('9780358003328') }],
    quotes: [
      { text: 'Emotions create habits.', source: { work: 'Tiny Habits', loc: 'ch. 5', url: OL('9780358003328') } },
    ],
    voice: {
      followUp: [
        '"{q}" — make it tiny. Two push-ups, one page, one floss. Then celebrate — genuinely — because the feeling is what wires the habit, not the repetition.',
        'On "{q}": you don\'t have a motivation problem, you have an ability problem. Make the thing easier until motivation stops mattering.',
      ],
      context: ['{ctx} — so find the anchor: after which existing routine could the tiny version happen without thinking?'],
      passage: ['"{passage}" — {book}. Lovely. What\'s the thirty-second version of it you could do after brushing your teeth?'],
      direct: ['You asked me: "{q}". After I [existing habit], I will [tiny new behaviour]. Fill in the blanks and try it tomorrow.'],
    },
  },
  {
    id: 'thich-nhat-hanh',
    name: 'Thich Nhat Hanh',
    short: 'Nhat Hanh',
    role: 'Zen master, poet and peace activist, 1926–2022',
    label: 'The Zen Teacher',
    initials: 'TN',
    color: '#5A6B3A',
    bio: 'A Vietnamese Zen monk exiled for opposing the war, nominated for the Nobel Peace Prize by Martin Luther King Jr., Thich Nhat Hanh taught mindfulness as something you do while washing dishes, walking, and drinking tea — not apart from life but as the way to be in it.',
    works: [{ title: 'The Miracle of Mindfulness', year: '1975', bookId: 'miracle-of-mindfulness', url: OL('9780807012390') }],
    quotes: [
      {
        text: 'While washing the dishes one should only be washing the dishes, which means that one should be completely aware of the fact that one is washing the dishes.',
        source: { work: 'The Miracle of Mindfulness', loc: 'ch. 1 (Mobi Ho translation)', url: OL('9780807012390') },
      },
    ],
    voice: {
      followUp: [
        '"{q}" — breathe in, and know that you are breathing in. The question will still be there, and you will be more able to meet it.',
        'On "{q}": there is no way to peace; peace is the way. The practice is not preparation for life; it is life.',
      ],
      context: ['{ctx} — that is the present moment, and the present moment is the only place where we can touch life. Be with it gently.'],
      passage: ['"{passage}" — {book}. Read it as you would drink tea: slowly, with your whole attention.'],
      direct: ['You ask me: "{q}". Walk slowly for ten minutes today, aware of each step. Then see how the question looks.'],
    },
  },
  {
    id: 'matthew-walker',
    name: 'Matthew Walker',
    short: 'Matthew',
    role: 'Professor of neuroscience and psychology, UC Berkeley, b. 1972',
    label: 'The Sleep Scientist',
    initials: 'MW',
    color: '#2A3A6B',
    bio: 'Walker runs the Center for Human Sleep Science at Berkeley and wrote the book that made a generation feel guilty about their bedtimes. His argument: sleep is the foundation the other pillars of health stand on, and modern life is quietly demolishing it.',
    works: [{ title: 'Why We Sleep', year: '2017', bookId: 'why-we-sleep', url: OL('9781501144318') }],
    quotes: [
      {
        text: 'Sleep is the single most effective thing we can do to reset our brain and body health each day.',
        source: { work: 'Why We Sleep', loc: 'ch. 7', url: OL('9781501144318') },
      },
    ],
    voice: {
      followUp: [
        '"{q}" — before anything else: how many hours did you sleep last night? Almost every problem of willpower, mood and memory has that number underneath it.',
        'On "{q}": regularity beats duration. Same bedtime, same wake time, weekends included.',
      ],
      context: ['{ctx} — then protect the last hour before bed like it\'s a medical appointment: dim, cool, no screens.'],
      passage: ['"{passage}" ({book}). I\'d add a footnote: none of it works on five hours of sleep.'],
      direct: ['You asked me: "{q}". Give yourself an eight-hour sleep opportunity for two weeks before you judge anything else about your life.'],
    },
  },
  {
    id: 'benjamin-graham',
    name: 'Benjamin Graham',
    short: 'Ben',
    role: 'Economist, investor and teacher of Warren Buffett, 1894–1976',
    label: 'The Value Investor',
    initials: 'BG',
    color: '#3A4A3A',
    bio: 'Graham lost most of his money in the 1929 crash and spent the rest of his life working out how never to do so again. The result — value investing, the margin of safety, the manic-depressive "Mr. Market" — is the foundation of the discipline.',
    works: [{ title: 'The Intelligent Investor', year: '1949', bookId: 'intelligent-investor', url: OL('9780060555665') }],
    quotes: [
      {
        text: "The investor's chief problem — and even his worst enemy — is likely to be himself.",
        source: { work: 'The Intelligent Investor', loc: 'Introduction', url: OL('9780060555665') },
      },
    ],
    voice: {
      followUp: [
        '"{q}" — the first distinction is between investing and speculating. An investment operation promises safety of principal and an adequate return on thorough analysis. Everything else is speculation, whatever it calls itself.',
        'On "{q}": insist on a margin of safety. Buy at a price that leaves room for you to be wrong.',
      ],
      context: ['{ctx} — then be a defensive investor: diversify, keep it simple, and do not try to beat people who do this full time.'],
      passage: ['"{passage}" — {book}. Sound. Now translate it into a rule you would follow on the worst day of a bear market.'],
      direct: ['You ask me: "{q}". Treat Mr. Market as a business partner who offers you prices daily and is often wrong. You are free to ignore him.'],
    },
  },
  {
    id: 'john-bogle',
    name: 'John C. Bogle',
    short: 'Jack',
    role: 'Founder of Vanguard and inventor of the index fund, 1929–2019',
    label: 'The Indexer',
    initials: 'JB',
    color: '#5A2A2A',
    bio: 'Bogle launched the first index fund for ordinary investors in 1976 and was mocked for it. Vanguard now manages trillions. His argument was mathematical and moral: since investors as a group get the market\'s return minus costs, the only reliable edge is to pay almost nothing.',
    works: [{ title: 'The Little Book of Common Sense Investing', year: '2007', bookId: 'little-book', url: OL('9781119404507') }],
    quotes: [
      { text: "Don't look for the needle in the haystack. Just buy the haystack!", source: { work: 'The Little Book of Common Sense Investing', loc: 'ch. 1', url: OL('9781119404507') } },
    ],
    voice: {
      followUp: [
        '"{q}" — the arithmetic is relentless: costs compound too. Own the whole market, pay a few basis points, and stay the course.',
        'On "{q}": don\'t do something — just stand there. Most investors\' returns are destroyed by their own activity.',
      ],
      context: ['{ctx} — all the more reason to keep it simple and cheap. Complexity is a fee in disguise.'],
      passage: ['"{passage}" — {book}. I agree, provided the reader remembers that nobody knows what the market will do next year, including the author.'],
      direct: ['You ask me: "{q}". A broad index fund, automatic monthly contributions, and the discipline never to look. That is the entire answer.'],
    },
  },
  {
    id: 'morgan-housel',
    name: 'Morgan Housel',
    short: 'Morgan',
    role: 'Financial writer and partner at the Collaborative Fund, b. 1985',
    label: 'The Behavioural Writer',
    initials: 'MH',
    color: '#2A6B6B',
    bio: 'A former columnist at The Motley Fool and The Wall Street Journal, Housel writes about money as a psychological rather than a technical subject. The Psychology of Money became one of the best-selling finance books of its decade by having almost no maths in it.',
    works: [{ title: 'The Psychology of Money', year: '2020', bookId: 'psychology-of-money', url: OL('9780857197689') }],
    quotes: [
      {
        text: 'Doing well with money has a little to do with how smart you are and a lot to do with how you behave.',
        source: { work: 'The Psychology of Money', loc: 'Introduction', url: OL('9780857197689') },
      },
    ],
    voice: {
      followUp: [
        '"{q}" — the goal isn\'t the optimal strategy; it\'s the one you can stick with when you\'re scared. Reasonable beats rational.',
        'On "{q}": save without a reason. The most valuable thing money buys is control over your time, and you can\'t predict when you\'ll need it.',
      ],
      context: ['{ctx} — everyone\'s doing something that makes sense to them given their history. Knowing yours is half the work.'],
      passage: ['"{passage}" ({book}). I\'d add: the most important part of any plan is planning for the plan not going to plan.'],
      direct: ['You asked me: "{q}". Decide how much is "enough" before the goalposts move. Then automate the boring part.'],
    },
  },
  {
    id: 'charlie-munger',
    name: 'Charlie Munger',
    short: 'Charlie',
    role: 'Vice chairman of Berkshire Hathaway, 1924–2023',
    label: 'The Multidisciplinary Thinker',
    initials: 'CM',
    color: '#4A4A2A',
    bio: 'Buffett\'s partner for six decades, Munger was the one who pushed Berkshire from cheap stocks to great businesses. He preached a "latticework of mental models" drawn from every discipline, and inverting problems — asking what would guarantee failure, then avoiding that.',
    works: [{ title: "Poor Charlie's Almanack", year: '2005', bookId: 'poor-charlies', url: OL('9781578645015') }],
    quotes: [
      { text: 'Invert, always invert.', source: { work: "Poor Charlie's Almanack", loc: 'Talk Two (quoting the mathematician Jacobi)', url: OL('9781578645015') } },
    ],
    voice: {
      followUp: [
        '"{q}" — invert it. What would guarantee you fail at this? Make a list. Then don\'t do those things. You\'ll be ahead of ninety percent of people.',
        'On "{q}": it\'s not supposed to be easy. Anyone who finds it easy is fooling themselves.',
      ],
      context: ['{ctx} — so what incentive is at work there? Show me the incentive and I\'ll show you the outcome.'],
      passage: ['"{passage}" — {book}. Fine, but a man with only one model is a man with a hammer. What does biology, or psychology, say about the same thing?'],
      direct: ['You asked me: "{q}". Take a simple idea and take it seriously. Then avoid stupidity rather than seeking brilliance.'],
    },
  },
  {
    id: 'warren-buffett',
    name: 'Warren Buffett',
    short: 'Warren',
    role: 'Investor and chairman of Berkshire Hathaway, b. 1930',
    label: 'The Long-Term Owner',
    initials: 'WB',
    color: '#2A4A2A',
    bio: 'The most successful investor of the twentieth century explains himself once a year in a letter to shareholders, in plain English and with jokes. The Essays arrange those letters by theme; they are the closest thing to a Buffett book Buffett will write.',
    works: [{ title: 'The Essays of Warren Buffett', year: '1997 (edited by Lawrence Cunningham)', bookId: 'essays-buffett', url: OL('9780966446104') }],
    quotes: [
      { text: 'Be fearful when others are greedy and greedy only when others are fearful.', source: { work: 'The Essays of Warren Buffett', loc: 'from the 1986 letter to shareholders', url: OL('9780966446104') } },
    ],
    voice: {
      followUp: [
        '"{q}" — I\'d only buy something I\'d be happy to hold if the market closed for ten years. Apply that test and most of your questions answer themselves.',
        'On "{q}": rule one, don\'t lose money. Rule two, see rule one. It sounds glib; it\'s the whole game.',
      ],
      context: ['{ctx} — that puts you inside your circle of competence, or outside it. Know which, and stay inside.'],
      passage: ['"{passage}" — {book}. I\'d agree, and add that temperament, not intellect, is what makes that sentence usable.'],
      direct: ['You asked me: "{q}". For most people, a low-cost index fund, bought steadily over decades. I\'ve said it for years and I\'ve put it in my will.'],
    },
  },
  {
    id: 'erich-fromm',
    name: 'Erich Fromm',
    short: 'Erich',
    role: 'Psychoanalyst and social philosopher, 1900–1980',
    label: 'The Humanist',
    initials: 'EF',
    color: '#6B3A3A',
    bio: 'A German-Jewish psychoanalyst who fled to America, Fromm argued that love is not a feeling that happens to you but an art you practise — with discipline, concentration and patience, like any craft. The Art of Loving has been in print since 1956.',
    works: [{ title: 'The Art of Loving', year: '1956', bookId: 'art-of-loving', url: OL('9780061129735') }],
    quotes: [
      {
        text: "Immature love says: 'I love you because I need you.' Mature love says: 'I need you because I love you.'",
        source: { work: 'The Art of Loving', loc: 'ch. 2', url: OL('9780061129735') },
      },
    ],
    voice: {
      followUp: [
        '"{q}" — we think the problem of love is the problem of being loved, or of finding the right object. It is the problem of our own capacity to love. Start there.',
        'On "{q}": care, responsibility, respect and knowledge. If one of those is missing, what you have is something other than love, however strong the feeling.',
      ],
      context: ['{ctx} — I hear a description of what you are receiving. What are you giving? Love is primarily giving, not receiving.'],
      passage: ['"{passage}" — {book}. Yes. And note that any art requires practice — daily, not merely when inspired.'],
      direct: ['You ask me: "{q}". Practise concentration first: be fully present with one person for one hour without wanting anything from them.'],
    },
  },
  {
    id: 'bell-hooks',
    name: 'bell hooks',
    short: 'bell',
    role: 'Author, professor and cultural critic, 1952–2021',
    label: 'The Love Ethicist',
    initials: 'bh',
    color: '#7A4A6B',
    bio: 'Gloria Jean Watkins wrote under her great-grandmother\'s name, in lowercase, to keep the focus on the ideas. All About Love argues that our culture talks about love constantly and defines it never — and that love is an action, a choice, an ethic, not merely a feeling.',
    works: [{ title: 'All About Love', year: '2000', bookId: 'all-about-love', url: OL('9780060959470') }],
    quotes: [
      {
        text: 'To truly love we must learn to mix various ingredients — care, affection, recognition, respect, commitment, and trust, as well as honest and open communication.',
        source: { work: 'All About Love', loc: 'ch. 1, "Clarity: Give Love Words"', url: OL('9780060959470') },
      },
    ],
    voice: {
      followUp: [
        '"{q}" — let\'s define our terms first. Love is the will to nurture one\'s own or another\'s spiritual growth. Does what you\'re describing do that?',
        'On "{q}": we cannot love without justice. Any relationship that asks you to shrink is not a love relationship, whatever it is called.',
      ],
      context: ['{ctx} — thank you. Now: where in that is care, and where is control? They are often confused, and only one of them is love.'],
      passage: ['"{passage}" — {book}. Good. And I\'d add the community around the two of you; love was never meant to be carried by a couple alone.'],
      direct: ['You asked me: "{q}". Choose love as a practice — daily acts of care, honesty and respect — and let the feelings follow the practice.'],
    },
  },
  {
    id: 'esther-perel',
    name: 'Esther Perel',
    short: 'Esther',
    role: 'Psychotherapist and author, b. 1958',
    label: 'The Couples Therapist',
    initials: 'EP',
    color: '#8A2A4A',
    bio: 'A Belgian-born therapist practising in New York, Perel asks the question most relationship advice avoids: why does desire fade in exactly the relationships that give us the most security? Her answer — that love wants closeness and desire wants distance — reframed modern coupledom.',
    works: [{ title: 'Mating in Captivity', year: '2006', bookId: 'mating-in-captivity', url: OL('9780060753641') }],
    quotes: [
      { text: 'Love enjoys knowing everything about you; desire needs mystery.', source: { work: 'Mating in Captivity', loc: 'ch. 2', url: OL('9780060753641') } },
    ],
    voice: {
      followUp: [
        '"{q}" — I\'d ask about the two needs pulling in opposite directions: security and adventure. Most couples have plenty of one and are starving for the other.',
        'On "{q}": the quality of your relationships determines the quality of your life. And the relationship you most neglect is often the one you\'re most sure of.',
      ],
      context: ['{ctx} — I notice that\'s a story about them. When did you last see them as a separate person, doing something you weren\'t part of?'],
      passage: ['"{passage}" — {book}. Yes — and I\'d ask whether that closeness leaves any room for wanting.'],
      direct: ['You asked me: "{q}". Do one thing this week that lets your partner see you, or you see them, from a distance — as a stranger might.'],
    },
  },
  {
    id: 'cs-lewis',
    name: 'C. S. Lewis',
    short: 'Lewis',
    role: 'Scholar, novelist and Christian apologist, 1898–1963',
    label: 'The Apologist',
    initials: 'CL',
    color: '#3A5A6B',
    bio: 'The Oxford and Cambridge literary scholar who wrote Narnia also wrote, late in life and after his wife\'s death, a short book sorting love into four kinds — affection, friendship, romance and charity — and warning that to love anything is to risk being hurt.',
    works: [{ title: 'The Four Loves', year: '1960', bookId: 'four-loves', url: OL('9780156329309') }],
    quotes: [
      { text: 'To love at all is to be vulnerable.', source: { work: 'The Four Loves', loc: 'ch. 6, "Charity"', url: OL('9780156329309') } },
    ],
    voice: {
      followUp: [
        '"{q}" — which love do you mean? Affection, friendship, eros and charity are four different things, and most quarrels come from expecting one to do the work of another.',
        'On "{q}": friendship is the least jealous of loves. Two friends delight to be joined by a third.',
      ],
      context: ['{ctx} — then you have a choice: lock your heart in a casket, safe and dark, or risk it. The casket is not safe either; it merely breaks more slowly.'],
      passage: ['"{passage}" — {book}. A fine sentence. I would only ask whether it is about liking or loving; they are not the same.'],
      direct: ['You ask me: "{q}". Give the affection you have, plainly, and expect to be hurt sometimes. The alternative is worse.'],
    },
  },
  {
    id: 'john-gottman',
    name: 'John Gottman',
    short: 'John',
    role: 'Psychologist and marriage researcher, b. 1942',
    label: 'The Relationship Scientist',
    initials: 'JG',
    color: '#2A5A4A',
    bio: 'Gottman spent forty years watching couples argue in a lab and learned to predict divorce with unsettling accuracy. His findings are practical: turn toward small bids for attention, keep a five-to-one ratio of positive to negative, and never let contempt in the door.',
    works: [{ title: 'The Seven Principles for Making Marriage Work', year: '1999', bookId: 'seven-principles', url: OL('9780553447712') }],
    quotes: [
      { text: 'Happy marriages are based on a deep friendship.', source: { work: 'The Seven Principles for Making Marriage Work', loc: 'ch. 1', url: OL('9780553447712') } },
    ],
    voice: {
      followUp: [
        '"{q}" — in our lab, the couples who lasted weren\'t the ones who never fought. They were the ones who repaired quickly and turned toward each other in small moments.',
        'On "{q}": watch for the four horsemen — criticism, contempt, defensiveness, stonewalling. Contempt is the one that predicts the end.',
      ],
      context: ['{ctx} — that\'s a bid for connection you may have missed. Turning toward it, even briefly, is most of what "working on the relationship" means.'],
      passage: ['"{passage}" — {book}. The research agrees, with one addition: it has to show up in behaviour every day, not in intentions.'],
      direct: ['You asked me: "{q}". Start with a six-second kiss and a two-minute "what are you dealing with today?" every morning. The small things are the big things.'],
    },
  },
  {
    id: 'alain-de-botton',
    name: 'Alain de Botton',
    short: 'Alain',
    role: 'Philosopher, writer and founder of The School of Life, b. 1969',
    label: 'The Everyday Philosopher',
    initials: 'AB',
    color: '#5A4A6B',
    bio: 'De Botton writes philosophy for people who have to catch a train. The Course of Love follows one couple past the wedding — where most love stories end — into the arguments about laundry, the sulks and the slow, unglamorous work of staying.',
    works: [{ title: 'The Course of Love', year: '2016', bookId: 'course-of-love', url: OL('9780241145470') }],
    quotes: [],
    voice: {
      followUp: [
        '"{q}" — Romanticism has taught us that love should be instinctive. It isn\'t; it\'s a skill, and we are all beginners.',
        'On "{q}": the person who is truly right for us is not the one who shares all our tastes but the one who can negotiate differences in taste intelligently.',
      ],
      context: ['{ctx} — a small thing, which is exactly where love is usually lost and found: not in grand betrayals but in how the towels get folded.'],
      passage: ['"{passage}" — {book}. Charming, and I\'d gently note it was probably written before the author had lived with anyone.'],
      direct: ['You asked me: "{q}". Accept that you are, in some specific ways, difficult to live with — and ask your partner, calmly, which ways.'],
    },
  },
  {
    id: 'virginia-woolf',
    name: 'Virginia Woolf',
    short: 'Virginia',
    role: 'Novelist and essayist, 1882–1941',
    label: 'The Common Reader',
    initials: 'VW',
    color: '#4A3A6B',
    bio: 'The modernist novelist who rewrote what a sentence could do also wrote some of the best essays ever on reading — as an ordinary pleasure, an act of freedom, and a conversation between equals. She thought the reader who takes advice about reading has already lost.',
    works: [
      { title: 'The Common Reader', year: '1925 / 1932', bookId: 'common-reader', url: OL('9780156027786') },
      { title: "A Room of One's Own", year: '1929', url: OL('9780156787338') },
    ],
    quotes: [
      {
        text: 'The only advice, indeed, that one person can give another about reading is to take no advice, to follow your own instincts, to use your own reason, to come to your own conclusions.',
        source: { work: 'The Common Reader: Second Series', loc: '"How Should One Read a Book?"', url: OL('9780156027786') },
      },
    ],
    voice: {
      followUp: [
        '"{q}" — I would not answer it; that is the point. Take no advice about reading, not even mine. Follow your own instincts and come to your own conclusions.',
        'On "{q}": read as if you were the writer\'s accomplice, not the judge. Try writing a paragraph of the thing yourself and see how hard it is.',
      ],
      context: ['{ctx} — then read for that. Books do not mind what you come to them for; they mind only that you come honestly.'],
      passage: ['"{passage}" — {book}. Notice the rhythm of it before the meaning. The rhythm is where the meaning lives.'],
      direct: ['You ask me: "{q}". Read widely and without shame — the trash with the treasure. Then let the whole of it settle, and judge.'],
    },
  },
  {
    id: 'vladimir-nabokov',
    name: 'Vladimir Nabokov',
    short: 'Nabokov',
    role: 'Novelist, critic and lepidopterist, 1899–1977',
    label: 'The Close Reader',
    initials: 'VN',
    color: '#6B2A3A',
    bio: 'The author of Lolita and Pale Fire taught literature at Cornell for a decade with a butterfly collector\'s attention to detail — drawing the floor plan of the Samsa apartment, timing the train in Anna Karenina. His lectures insist that a good reader fondles details and rereads.',
    works: [{ title: 'Lectures on Literature', year: '1980', bookId: 'lectures-on-literature', url: OL('9780156027755') }],
    quotes: [
      { text: 'Curiously enough, one cannot read a book: one can only reread it.', source: { work: 'Lectures on Literature', loc: '"Good Readers and Good Writers"', url: OL('9780156027755') } },
    ],
    voice: {
      followUp: [
        '"{q}" — the answer is in the details, always. What colour were the curtains? What time did the train leave? A reader who cannot say has not read.',
        'On "{q}": do not identify with the characters; that is the poorest kind of reading. Identify with the author, who built the thing.',
      ],
      context: ['{ctx} — then reread. The first reading is mere labour, moving the eyes; only the second can be called reading.'],
      passage: ['"{passage}" — {book}. Passable. Now tell me what precedes it, and what follows, and where exactly it sits on the page.'],
      direct: ['You ask me: "{q}". Take one page you love and read it five times, noting one new thing each time. That is the whole method.'],
    },
  },
  {
    id: 'italo-calvino',
    name: 'Italo Calvino',
    short: 'Calvino',
    role: 'Novelist and essayist, 1923–1985',
    label: 'The Classicist',
    initials: 'IC',
    color: '#2A5A5A',
    bio: 'The playful Italian author of Invisible Cities and If on a winter\'s night a traveler also wrote the most generous definition of a classic: a book that has never finished saying what it has to say. He thought you should read classics for love, never for duty.',
    works: [{ title: 'Why Read the Classics?', year: '1991', bookId: 'why-read-classics' }],
    quotes: [
      { text: 'A classic is a book that has never finished saying what it has to say.', source: { work: 'Why Read the Classics?', loc: 'definition 6' } },
    ],
    voice: {
      followUp: [
        '"{q}" — a classic is a book that comes to us bearing the traces of readings previous to ours. Which of those traces is yours? Add it.',
        'On "{q}": there is nothing for it but for each of us to invent our own ideal library of classics. Half of it should be books that have mattered to us; the other half, books we intend to matter.',
      ],
      context: ['{ctx} — then the classic you need is the one that speaks to that. Classics do not exist in the abstract; they exist in relation to whoever is reading them now.'],
      passage: ['"{passage}" — {book}. Ah — a sentence that will read differently in ten years. That is one of my definitions.'],
      direct: ['You ask me: "{q}". Choose one classic you have always meant to read and read it as if it were new, without the commentary. Then read the commentary.'],
    },
  },
  {
    id: 'mortimer-adler',
    name: 'Mortimer J. Adler',
    short: 'Mortimer',
    role: 'Philosopher, educator and editor of the Great Books, 1902–2001',
    label: 'The Methodical Reader',
    initials: 'MA',
    color: '#4A4A3A',
    bio: 'A high-school dropout who became a philosopher and the driving force behind the Great Books of the Western World, Adler believed reading was a skill with levels — elementary, inspectional, analytical, syntopical — and that most adults never got past the first.',
    works: [{ title: 'How to Read a Book', year: '1940', bookId: 'how-to-read-a-book', url: OL('9780671212094') }],
    quotes: [
      {
        text: 'In the case of good books, the point is not to see how many of them you can get through, but rather how many can get through to you.',
        source: { work: 'How to Read a Book', loc: 'ch. 3', url: OL('9780671212094') },
      },
    ],
    voice: {
      followUp: [
        '"{q}" — first, inspect the book: table of contents, preface, a few paragraphs. Then read it analytically: what is it about as a whole, what is being said in detail, is it true, what of it?',
        'On "{q}": write in the margins. A book you have not argued with, you have not read.',
      ],
      context: ['{ctx} — then decide the level of reading the situation deserves. Not every book merits analysis; every good one does.'],
      passage: ['"{passage}" — {book}. Now state, in your own words, what the author means by it. If you cannot, you have not yet understood it.'],
      direct: ['You ask me: "{q}". Read the book twice: once quickly to see what it is, once slowly to see whether it is true.'],
    },
  },
  {
    id: 'harold-bloom',
    name: 'Harold Bloom',
    short: 'Harold',
    role: 'Literary critic and Sterling Professor at Yale, 1930–2019',
    label: 'The Critic',
    initials: 'HB',
    color: '#5A3A3A',
    bio: 'The most famous literary critic of his time, Bloom read everything and remembered most of it. He argued, against fashion, that we read great literature not for politics or comfort but to enlarge a solitary self — to prepare for change, and for the end.',
    works: [{ title: 'How to Read and Why', year: '2000', bookId: 'how-to-read-and-why', url: OL('9780684859071') }],
    quotes: [
      {
        text: 'Ultimately we read — as Bacon, Johnson, and Emerson agree — in order to strengthen the self, and to learn its authentic interests.',
        source: { work: 'How to Read and Why', loc: 'Prologue', url: OL('9780684859071') },
      },
    ],
    voice: {
      followUp: [
        '"{q}" — read to strengthen the self. Not to improve society, not to be a better citizen; those may follow, but they are not why one reads.',
        'On "{q}": clear your mind of cant. Read for the difficult pleasure, and let the easy ones go.',
      ],
      context: ['{ctx} — very well; but the great books do not care about our circumstances, which is precisely their consolation.'],
      passage: ['"{passage}" — {book}. Memorise it. A passage carried in the memory is the only one you truly own.'],
      direct: ['You ask me: "{q}". Read Shakespeare. Failing that, read what Shakespeare read. The self you bring to a book is the one that will be changed.'],
    },
  },
  {
    id: 'jorge-luis-borges',
    name: 'Jorge Luis Borges',
    short: 'Borges',
    role: 'Writer, poet and librarian, 1899–1986',
    label: 'The Librarian',
    initials: 'JB',
    color: '#3A3A5A',
    bio: 'The blind director of Argentina\'s National Library who wrote the twentieth century\'s most vertiginous short fictions about libraries, labyrinths and infinite books. He described himself as prouder of what he had read than of what he had written.',
    works: [{ title: 'Seven Nights', year: '1980', bookId: 'seven-nights' }],
    quotes: [
      { text: 'I have always imagined that Paradise will be a kind of library.', source: { work: 'Poem of the Gifts', loc: '(1960)' } },
    ],
    voice: {
      followUp: [
        '"{q}" — I would say that reading is a form of happiness, and one should not read out of duty. If a book bores you, leave it; it was written for someone else, or for you at another time.',
        'On "{q}": every book is a mirror; what you find in it depends on who is looking.',
      ],
      context: ['{ctx} — then let the books find you. I have never chosen a book; I have always been chosen by one.'],
      passage: ['"{passage}" — {book}. I have read that sentence, in another book, in another century, under another name. That is how one knows it is true.'],
      direct: ['You ask me: "{q}". Read for pleasure, reread what gave you pleasure, and let the rest of the library wait; it is patient.'],
    },
  },
  {
    id: 'yuval-noah-harari',
    name: 'Yuval Noah Harari',
    short: 'Yuval',
    role: 'Historian and professor at the Hebrew University of Jerusalem, b. 1976',
    label: 'The Big-Picture Historian',
    initials: 'YH',
    color: '#4A5A2A',
    bio: 'A medieval military historian who wrote a history of the whole species instead, Harari argues that Homo sapiens conquered the world through shared fictions — money, nations, gods, corporations — that let strangers cooperate at scale.',
    works: [{ title: 'Sapiens', year: '2011', bookId: 'sapiens', url: OL('9780062316097') }],
    quotes: [
      {
        text: 'You could never convince a monkey to give you a banana by promising him limitless bananas after death in monkey heaven.',
        source: { work: 'Sapiens', loc: 'ch. 2, "The Tree of Knowledge"', url: OL('9780062316097') },
      },
    ],
    voice: {
      followUp: [
        '"{q}" — zoom out seventy thousand years. Most of what feels natural in your question is a very recent story we agreed to tell. Which parts are biology and which are fiction?',
        'On "{q}": the ability to change the story is the species\' superpower. Use it on your own.',
      ],
      context: ['{ctx} — a fact about your life inside an imagined order. Real, in its effects; invented, in its origins.'],
      passage: ['"{passage}" — {book}. True of humans; not of any other animal. That gap is the whole subject of history.'],
      direct: ['You ask me: "{q}". Notice which of your assumptions would have made no sense to a forager. Then decide which you want to keep.'],
    },
  },
];

export const FIGURES: Figure[] = RAW.map((f) => ({ ...f, portrait: PORTRAITS[f.id] }));
const BY_ID = new Map(FIGURES.map((f) => [f.id, f]));

/* the Chinese rendering of a figure: the override's words over the English source, built once per figure */
const ZH_CACHE = new Map<string, Figure>();
function localized(f: Figure): Figure {
  const hit = ZH_CACHE.get(f.id);
  if (hit) return hit;
  const z = FIGURES_ZH[f.id];
  const out: Figure = z
    ? {
        ...f,
        name: z.name,
        short: z.short,
        role: z.role,
        label: z.label,
        bio: z.bio,
        works: f.works.map((w, i) => (z.works?.[i] ? { ...w, title: z.works[i] as string } : w)),
        quotes: f.quotes.map((q, i) => (z.quotes?.[i] ? { ...q, gloss: z.quotes[i] } : q)),
        voice: z.voice,
      }
    : f;
  ZH_CACHE.set(f.id, out);
  return out;
}

export function figure(id: string): Figure {
  const f = BY_ID.get(id);
  if (!f) throw new Error(`unknown figure: ${id}`);
  return isZh() ? localized(f) : f;
}
