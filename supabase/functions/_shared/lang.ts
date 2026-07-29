// ============================================================
// owlry — reader language prefs (en | zh) for edge functions.
// Client sends `lang` on owl-chat / owl-peek; we coerce + force it
// onto the semantic_query so Scout/Peek never default to English.
// ============================================================

export type ReaderLang = 'en' | 'zh';

export function coerceLang(raw: unknown): ReaderLang {
  return raw === 'zh' ? 'zh' : 'en';
}
