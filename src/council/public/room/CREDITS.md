# Council room art

| file | what it is |
|---|---|
| `council-room.webp` | the council room at rest: three wing chairs, the round table, the arched window at dusk |
| `council-room-beams.webp` | the same room once the council is seated — warm beams through the window, the lamp lifted |

Both are the project's own artwork, supplied with the Council Room design (v6). They are not
Wikimedia files and are not covered by `public/portraits/CREDITS.md`; do not treat them as
public-domain or Creative Commons material.

The two paintings are pixel-aligned (941 × 1020) so the app can cross-fade between them: the
base layer is always on screen and the beams layer fades in when the three seats fill. The
seat positions in `src/screens/CouncilScreen.css` are percentages of this frame, so replacing
the art means re-measuring them.

Source files were delivered as JPEG (341 KB + 325 KB) and are stored here as WebP at quality
0.82 (149 KB + 130 KB), which is visually identical at the sizes the app draws them.
