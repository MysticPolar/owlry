/* ============================================================
   owlry — 简体中文 reading letters (guides) overlay, mirroring
   content/guides.ts. Resolved by lib/bookRegistry.getGuide()
   when the language is zh.
   ============================================================ */
import type { Guide, GuideId } from './types';

/* Filled by the catalog translation pass. */
export const GUIDES_ZH: Partial<Record<GuideId, Guide>> = {};
