/* ============================================================
   owlry — ticket stubs (docs/gamification-design.md §8).

   The album's vocabulary. Every stub is granted from the ledger (or,
   for guests, the local engine) — nothing here decides anything, it
   just gives each one a face and a name in both languages.
   ============================================================ */

export interface StubMeta {
  /** tabler glyph */
  i: string;
  en: string;
  zh: string;
  /** the quiet line under the stub in the album */
  noteEn: string;
  noteZh: string;
}

/* Icon names are sprite ids from index.html — only those exist. */
export const STUBS: Record<string, StubMeta> = {
  opening_night: {
    i: 'ti-sparkles',
    en: 'opening night',
    zh: '首演之夜',
    noteEn: 'you came through the door',
    noteZh: '你推门进来了',
  },
  first_finish: {
    i: 'ti-book-2',
    en: 'first finish',
    zh: '读完第一本',
    noteEn: 'a book, all the way through',
    noteZh: '一本书，从头到尾',
  },
  seven_nights: {
    i: 'ti-flame',
    en: 'seven nights',
    zh: '七夜不灭',
    noteEn: 'keeper minded the flame a week',
    noteZh: 'Keeper 守了七夜的火',
  },
  twenty_books: {
    i: 'ti-books',
    en: 'twenty books',
    zh: '二十本',
    noteEn: 'the shelf got heavy',
    noteZh: '书架沉了',
  },
  night_owl: {
    i: 'ti-moon',
    en: 'night owl',
    zh: '夜猫子',
    noteEn: 'read past the last bell',
    noteZh: '过了最后一遍铃还在读',
  },
  marathon: {
    i: 'ti-clock',
    en: 'marathon',
    zh: '长跑',
    noteEn: 'an hour, end to end',
    noteZh: '整整一小时',
  },
  full_well: {
    i: 'ti-inkdrop',
    en: 'the full well',
    zh: '墨井满溢',
    noteEn: 'filled it to the brim once',
    noteZh: '有一回，满到了井口',
  },
  returning_patron: {
    i: 'ti-home',
    en: 'returning patron',
    zh: '旧客回座',
    noteEn: 'the house kept your seat',
    noteZh: '剧院给你留着座位',
  },
  last_season_flame: {
    i: 'ti-flame',
    en: "last season's flame",
    zh: '上一季的火',
    noteEn: 'kept as a keepsake',
    noteZh: '留作纪念',
  },
  encore: {
    i: 'ti-star',
    en: 'encore',
    zh: '返场',
    noteEn: 'another thousand, past the front row',
    noteZh: '坐到第一排之后，又是一千',
  },
};

/** short label per language, for toasts */
export const STUB_LABEL: Record<string, { en: string; zh: string }> = Object.fromEntries(
  Object.entries(STUBS).map(([id, s]) => [id, { en: s.en, zh: s.zh }]),
);
