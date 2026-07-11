// Ambient declaration for the vendored foliate-js entry module (plain JS, no
// bundled types). We import it only for its side effect — it registers the
// <foliate-view> custom element — and drive it through the DOM from
// src/components/reader/FoliateView.tsx, so a minimal surface is enough.
declare module '*/vendor/foliate-js/view.js' {
  export const makeBook: (file: File | Blob | string) => Promise<unknown>;
}
