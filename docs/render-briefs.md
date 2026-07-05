# OWLRY — Cast Render Briefs (3D production assets)

*Per-owl specifications for the production character renders that will replace
the SVG stand-ins. Written to be handed, as-is, to a 3D artist **or** pasted
(per-owl prompt blocks below) into an image model. Character truth comes from
`docs/story-bible.md`; visual law comes from the Owl Theatre design brief; the
current SVG symbols in `index.html` define each owl's silhouette, mount, and
proportions — match their shapes, upgrade their craft.*

---

## 1. Global spec (applies to all five)

**Style anchor.** Soft, long-pile plush fur — a hand-made toy that breathes.
Rounded, huggable geometry; stylized, not realistic (no true raptor anatomy,
no sharp talons, no predator eyes). Charming, warm, a little theatrical.
Original character design — not imitating any studio's house style.

**Format & delivery**
- Single character per image, **transparent background**, PNG, **1024 px
  minimum** on the short edge (2048 preferred for the hero).
- **Two poses per owl:** `perch` (hero — ¾ angle) and `stand` (mini —
  near-frontal, simplified). Ten base renders total.
- **Two eye variants per pose:** `day` (warm brown iris `#4A2F14`) and
  `night` (gold iris `#FFC017` with a soft gold self-glow). The app cannot
  recolor a PNG the way it recolors the SVGs, so night eyes must be a
  delivered variant — either separate PNGs or a layered source file
  (eyes on their own layer). Twenty finals, or ten layered sources.
- **No baked ground shadow** (the app draws its own). If a contact shadow is
  rendered, deliver it on a separate layer.
- **No text, no logos, no badges or emblems** anywhere on the character —
  the owls themselves are the brand seals.

**Camera & consistency**
- Hero pose: ¾ view, camera at the owl's eye height, slight look-up (≈5°) so
  the character reads friendly-dominant. **Same camera and lens across all
  five** — the cast must compose into a lineup (the marketing site stands
  all five in a row occluding the headline).
- Mini pose: near-frontal, feet (where the owl has feet) on a common ground
  line, same light rig.

**Lighting (the house rig)**
- 3-point warm key; key color like candlelight.
- **Gold rim light** (`#FFC017`) from upper-back — every owl carries a thread
  of the house light on its silhouette edge.
- Soft, warm shadows. No harsh speculars except in the eyes.

**Eyes (the cast's soul — get these right first)**
- Combined eye area ≈ **55% of head width** (per-owl deviations below).
- Each visible eye: **two specular highlights** — one large upper-left, one
  pinprick lower-right.
- Sclera `#FFF9E9` (night variant `#FFF3C9`), iris day `#4A2F14`, iris night
  `#FFC017`, pupil near-black `#17110B`.

**Shared anatomy palette**
| part | hex |
|---|---|
| beak + feet (glossy keratin, soft edges) | `#E9A238` |
| belly / face disc plush | `#F4E6C4` |
| house gold (rim light, gold props) | `#FFC017` |

**Per-owl feather palettes (day rig — render in these; the app's night rig
adds glow, it does not recolor fur)**
| owl | base | light | deep |
|---|---|---|---|
| Scout (ember) | `#D8481E` | `#FF9163` | `#93290C` |
| Peek (teal) | `#177E71` | `#5CC0B1` | `#0B5348` |
| Scribe (quill) | `#3A55B4` | `#7E93E6` | `#1F326E` |
| Mirror (violet) | `#7451CC` | `#B29AEF` | `#452B93` |
| Keeper (moss) | `#156D44` | `#5FB183` | `#0C4A2C` |

**Size hierarchy** (relative heights in the lineup): Scout 100 · Keeper 90
(but widest) · Peek 85 (tallest-thinnest) · Scribe 80 · Mirror 80.

**The silhouette law.** Filled solid black, each owl must be nameable:
*leaning teardrop · tall crane · neat upright + quill · sealed oval · wide
trapezoid on a book stack.* If a render fails this test, revise the pose, not
the fur.

---

## 2. SCOUT — the Postmaster · ember

*The finder. Overeager, warm, fastest heart in the building. Found all the
others. Fronts the desk and the Today marquee.*

- **Geometry:** forward-leaning teardrop — the whole body tips ≈8° toward
  the viewer's left (the wordmark's own lean). Narrow at the crown, full at
  the belly. Two tall ear tufts standing **up** like antennae, slightly
  windblown.
- **Eyes:** the biggest of the cast (push past the 55% guide — Scout is the
  wide-eyed one). Both fully open, brows up, sparkling. Eager, never manic.
- **Prop:** a fan of **three tiny book spines** tucked under the right wing
  — colors: one deep gold `#A8730A`, one cream `#F4E6C4`, one deep ember
  `#93290C`. It always brings back three too many.
- **Hero pose (`perch`):** just landed — leaning forward into the wind of
  its own arrival, wings half-settled, one foot slightly ahead, chest out,
  the book fan visible under the wing. The pose says *"okay okay okay —
  found it."*
- **Mini pose (`stand`):** upright but still leaning ~5°, fan visible.
- **Fur:** long-pile, slightly ruffled — Scout has been outside.

**Image-model prompt:**
> Stylized plush owl character, soft long-pile fur, warm ember-orange
> (#D8481E base, #FF9163 highlights, #93290C shading) with cream belly
> (#F4E6C4), two tall upright ear tufts, enormous round amber-brown eyes
> (dark iris #4A2F14, two specular highlights each), small glossy gold beak
> (#E9A238), whole body leaning forward about 8 degrees as if it just landed
> mid-excitement, three tiny book spines (gold, cream, deep red) fanned
> under one wing, 3-point warm candlelight key with a gold rim light
> (#FFC017), ¾ view, transparent background, single character, no text, no
> badges, charming toy-like character design, 2048px.

---

## 3. PEEK — First Chapters · teal

*The previewer. Impatient, breezy, famously never finishes a book. Rides the
Draft. Appears in the reading-letter header.*

- **Geometry:** the tallest and narrowest — a craning, stretched silhouette,
  visibly off-balance: weight on one foot, the other mid-step; head tilted
  ≈5°. Everything about Peek is asymmetric.
- **Eyes:** ONE visible eye, **huge** (the single biggest eye in the cast),
  wide with curiosity. The other eye is fully covered by a raised wing —
  beneath it (for the animation/layered source) the hidden eye is shut
  tight.
- **Props:** one small ear tuft with a **gold ribbon bookmark** (`#FFC017`)
  tucked behind it, clearly never used. Nothing else.
- **Hero pose (`perch`):** caught mid-peek — wing raised over one eye, torso
  craned around an imaginary corner, one foot lifted. The pose asks *"just
  the first chapter."*
- **Mini pose (`stand`):** same wing-over-eye, less crane, both feet down
  but weight still on one.
- **Fur:** long-pile, wind-teased — Peek lives in a draft.

**Image-model prompt:**
> Stylized plush owl character, soft long-pile fur, deep teal (#177E71 base,
> #5CC0B1 highlights, #0B5348 shading) with cream belly (#F4E6C4), tall
> narrow craning body tilted slightly sideways, one wing raised covering one
> eye, the single visible eye enormous and curious (dark iris #4A2F14, two
> specular highlights), small gold ribbon bookmark (#FFC017) tucked behind a
> single ear tuft, one foot lifted mid-step, glossy gold beak (#E9A238),
> 3-point warm candlelight key with gold rim light (#FFC017), ¾ view,
> transparent background, single character, no text, playful sneaky-peeking
> toy-like character design, 2048px.

---

## 4. SCRIBE — the Archive · quill blue

*The archivist. Remembers every line, verbatim. Precise, pedantic, deeply
sentimental underneath. Lives in the quotes tab.*

- **Geometry:** compact, perfectly upright, the tidiest posture in the cast
  — and critically, **the only owl with short, smooth, groomed fur** (satin
  pile, combed flat; everyone else is fluffy). The oversized quill breaks
  the neat outline diagonally.
- **Eyes:** small, dot-like, behind **round spectacles that dominate the
  face** — the lenses are bigger than the eyes (dark frames `#2A2013`, a
  gold rim-light glint on each lens edge). The face reads: lenses first,
  eyes second.
- **Props:** the **oversized writing quill** (feather in `#7E93E6` with a
  `#1F326E` rib, gold-tan shaft) held tucked at its side mid-jot; **exactly
  one ink smudge** (`#2A2013`) low on the cream belly — the one imperfection
  on the tidiest owl, kept on purpose.
- **Hero pose (`perch`):** upright, chin slightly down as if mid-citation,
  quill angled outward past the body's edge, one wingtip pushing the
  spectacles up.
- **Mini pose (`stand`):** square, symmetric, quill at rest against the
  side, smudge visible.
- **Fur:** short-pile, satin-smooth, combed. Not fluffy. This is Scribe's
  entire texture identity.

**Image-model prompt:**
> Stylized plush owl character with SHORT smooth satin-groomed fur (not
> fluffy), royal quill-blue (#3A55B4 base, #7E93E6 highlights, #1F326E
> shading) with cream belly (#F4E6C4), compact perfectly upright tidy
> posture, large round dark spectacles (#2A2013) dominating the face with
> small dot eyes behind them (dark iris #4A2F14) and a tiny gold glint on
> each lens, an oversized writing quill (light blue feather, gold shaft)
> tucked at its side breaking the silhouette diagonally, one small dark ink
> smudge on the lower belly, glossy gold beak (#E9A238), 3-point warm
> candlelight key with gold rim light (#FFC017), ¾ view, transparent
> background, single character, no text, fastidious librarian-clerk toy-like
> character design, 2048px.

---

## 5. MIRROR — the Reader of Readers · violet

*The radar. Near-silent, never blinks, always right. Nobody saw it arrive.
Owns the Profile screen.*

- **Geometry:** the only **perfectly symmetrical** owl — a sealed, seamless
  oval. Wings closed flush into the body (visible only as faint seams), feet
  **not visible** (tucked entirely under the belly plush; it appears to
  hover a few millimetres). No tufts. No stray fibres. Stillness as shape.
- **Eyes:** heavy **half-lidded** almonds — lids permanently at half-mast,
  calm, unreadable, kind. Smaller and quieter speculars than the others
  (one modest highlight each). **Never render Mirror mid-blink or
  wide-eyed.**
- **Prop:** none — absence is Mirror's prop. Only marking: a **crescent
  moon mark** centered on the chest in deep violet `#452B93`, catching a
  faint gold sheen on its edge.
- **Hero pose (`perch`):** dead-centre symmetry, facing 5° off-camera as if
  it was already looking at the viewer before the camera arrived. No lean,
  no gesture.
- **Mini pose (`stand`):** identical, smaller. (Mirror has one pose. That is
  the character.)
- **Fur:** medium-pile but unnaturally orderly — smooth gradients, no
  flyaways.

**Image-model prompt:**
> Stylized plush owl character, soft violet fur (#7451CC base, #B29AEF
> highlights, #452B93 shading) with cream belly (#F4E6C4), perfectly
> symmetrical sealed oval body with wings folded seamlessly flush and no
> visible feet as if hovering slightly, heavy half-lidded calm eyes (dark
> iris #4A2F14, single modest highlight each) that never blink, a deep
> violet crescent moon mark centered on the chest with a faint gold sheen,
> small glossy gold beak (#E9A238), absolutely still and serene, 3-point
> warm candlelight key with gold rim light (#FFC017), ¾ view, transparent
> background, single character, no text, mysterious quiet oracle toy-like
> character design, 2048px.

---

## 6. KEEPER — the Ledger and the Flame · moss

*The librarian-hoarder. Counts everything twice. Gruff shell, soft center.
Guards the library and the streak flame.*

- **Geometry:** the **widest and lowest** — a chunky trapezoid, nearly as
  wide as tall, planted like furniture. Heavy **brow tufts angled down**
  toward the centre (a grumpy V — the deliberate opposite of Scout's
  up-tufts).
- **Eyes:** smallish, half-shadowed under the brows, pupils shifted a touch
  to one side — a suspicious side-eye that stops just short of a glare.
- **Props:** a small **ember-red book** (`#D8481E` cover, cream pages, one
  centre line) clutched to the belly with **both wingtips wrapped around
  it** — possessive, not decorative. And beneath its feet, a **pedestal of
  two or three stacked books** in muted non-cast colors (worn tan `#7A5230`,
  dusty plum `#5D4460`) — the hoard. Keeper does not stand on floors.
- **Hero pose (`perch`):** planted atop the stack, hugging the book,
  side-eyeing the camera: *someone touched the shelves.*
- **Mini pose (`stand`):** same, compressed; the stack may reduce to one
  book but never disappears.
- **Fur:** the longest, shaggiest pile of the cast — an old cardigan of an
  owl — with the brow tufts extra coarse.

**Image-model prompt:**
> Stylized plush owl character, long shaggy moss-green fur (#156D44 base,
> #5FB183 highlights, #0C4A2C shading) with wide cream belly (#F4E6C4),
> extra-wide low chunky body nearly as wide as tall, heavy dark brow tufts
> angled down in a grumpy V over smallish suspicious side-glancing eyes
> (dark iris #4A2F14, two small highlights), both wingtips wrapped
> possessively around a small ember-red book (#D8481E) held against the
> belly, standing on a small stack of two worn books (tan and dusty plum),
> glossy gold beak (#E9A238), 3-point warm candlelight key with gold rim
> light (#FFC017), ¾ view, transparent background, single character, no
> text, grumpy-but-lovable librarian toy-like character design, 2048px.

---

## 7. Review checklist (run per delivered render)

1. **Silhouette test** — solid-black fill still names the owl.
2. **Palette test** — feathers within the owl's three hexes; belly cream;
   beak/feet gold-tan; no color borrowed from another owl.
3. **Eye spec** — ≈55% head width (Scout above, Scribe's *lenses* above but
   eyes below, Mirror half-lidded), two speculars (one for Mirror), correct
   iris variant per day/night deliverable.
4. **Prop discipline** — only the listed prop(s); no added badges, seals,
   scarves, hats, or accessories (the 画蛇添足 guard).
5. **Personality pose** — Scout leans, Peek cranes, Scribe stands neat,
   Mirror doesn't move, Keeper hunkers. If two owls could swap poses,
   reject.
6. **Lineup test** — composite all five at the §1 size hierarchy on one
   ground line: five instantly distinct characters, one family, gold rim
   light agreeing across all of them.
7. **Never-list check** (from the story bible) — nothing in the render
   contradicts an owl's nevers (e.g., Mirror wide-eyed, Keeper without its
   book, Scribe fluffy).

## 8. Integration notes (engineering)

- Swap-in points are the existing mounts: `<svg class="owl hero">` (Today
  marquee, Scout) and `<svg class="owl mini">` (headers, letter, quotes) —
  replace with `<img>`/`<picture>` of the renders at the same boxes; the
  night rig's gold drop-shadow glow on `.owl` carries over to PNGs as-is.
- Day/night eye variants switch on the same `data-mode` attribute that
  drives the token swap (a `<picture>` source swap or a CSS
  `content`/`src` swap — decide at implementation).
- The SVG symbols stay in the bundle as fallbacks and as the blink/peek
  animation layer until the render pipeline covers motion.
