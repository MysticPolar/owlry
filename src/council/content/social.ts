import type { Post } from '../store/types';
import { isZh } from '../i18n';
import { seedPostsZh, SEED_HIGHLIGHTS_ZH } from './zh/social';

/* ============================================================
   Seed posts for the social feed. Every quote is a real line from the
   book named; the reflection underneath is the poster's own words.
   ============================================================ */
const H = 3600_000;
const D = 24 * H;

/** the demo library's two starting highlights, in the interface language */
export function seedHighlights(): { meditations: string; atomicHabits: string; note: string } {
  if (isZh()) return SEED_HIGHLIGHTS_ZH;
  return {
    meditations: 'Am I then yet unwilling to go about that, for which I myself was born and brought forth into this world?',
    atomicHabits: 'Every action you take is a vote for the type of person you wish to become.',
    note: 'Tuesday votes.',
  };
}

export function seedPosts(now = Date.now()): Post[] {
  if (isZh()) return seedPostsZh(now);
  return [
    {
      id: 'p_alex',
      author: { handle: 'alex.reader', name: 'Alex', color: '#B07A2A', initial: 'A' },
      ts: now - 2 * H,
      quote: 'Am I then yet unwilling to go about that, for which I myself was born and brought forth into this world?',
      bookId: 'meditations',
      attribution: 'Meditations, Book V · Marcus Aurelius',
      caption: 'A calmer mind leads to a brighter life. This hit different today — discipline really is freedom. 🙂',
      likes: 342,
      comments: 18,
      prompt: 'What did this change for you?',
    },
    {
      id: 'p_luna',
      author: { handle: 'luna.reads', name: 'Luna', color: '#8A5CE0', initial: 'L' },
      ts: now - 5 * H,
      quote: 'One is not born, but rather becomes, a woman.',
      bookId: 'second-sex',
      attribution: 'The Second Sex · Simone de Beauvoir',
      caption: 'Still becoming… but at least I’m reading. 🌙',
      likes: 129,
      comments: 7,
      prompt: 'What did this change for you?',
    },
    {
      id: 'p_sam',
      author: { handle: 'sam.stoic', name: 'Sam', color: '#2FB8A6', initial: 'S' },
      ts: now - 1 * D,
      quote: 'There are more things, Lucilius, likely to frighten us than there are to crush us; we suffer more often in imagination than in reality.',
      bookId: 'letters-stoic',
      attribution: 'Letters from a Stoic, XIII · Seneca',
      caption: 'Read this at 2am. Closed the laptop. Slept. That’s the whole review.',
      likes: 88,
      comments: 4,
      prompt: 'What did this change for you?',
    },
    {
      id: 'p_priya',
      author: { handle: 'priya.pages', name: 'Priya', color: '#E2483C', initial: 'P' },
      ts: now - 2 * D,
      quote: 'Desire is a contract that you make with yourself to be unhappy until you get what you want.',
      bookId: 'almanack',
      attribution: 'The Almanack of Naval Ravikant',
      caption: 'Unsubscribed from three newsletters after this. What did it change for me? The scroll.',
      likes: 210,
      comments: 12,
      prompt: 'What did this change for you?',
    },
    {
      id: 'p_theo',
      author: { handle: 'theo.turnspages', name: 'Theo', color: '#4C86F5', initial: 'T' },
      ts: now - 3 * D,
      quote: 'The only advice, indeed, that one person can give another about reading is to take no advice, to follow your own instincts, to use your own reason, to come to your own conclusions.',
      bookId: 'common-reader',
      attribution: '“How Should One Read a Book?” · Virginia Woolf',
      caption: 'A permission slip for my whole TBR pile.',
      likes: 64,
      comments: 3,
      prompt: 'What did this change for you?',
    },
  ];
}

export const FOLLOWING = ['luna.reads', 'sam.stoic'];
