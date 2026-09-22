// Renders every council/runs/*.md into council/runs/index.html (one page, newest first).
// Run:  deno run --allow-read --allow-write scripts/view_runs.ts   then open council/runs/index.html
const dir = "council/runs";
const files: string[] = [];
for await (const e of Deno.readDir(dir)) if (e.isFile && e.name.endsWith(".md")) files.push(e.name);
files.sort().reverse();
const runs = await Promise.all(files.map(async (f) => ({ name: f, md: await Deno.readTextFile(`${dir}/${f}`) })));

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Council runs</title>
<style>
 body{margin:0;background:#faf4e6;color:#1a1a1a;font:16px/1.55 Georgia,serif}
 nav{position:sticky;top:0;background:#fff;border-bottom:1px solid #e2d9c5;padding:10px 20px;font:14px system-ui}
 nav a{margin-right:14px;color:#8a1c1c}
 main{max-width:820px;margin:0 auto;padding:20px}
 article{background:#fff;border:1px solid #e2d9c5;border-radius:12px;padding:20px 24px;margin:0 0 24px}
 article h1{font-size:22px;margin-top:0} article h2{font-size:18px;border-top:1px solid #e2d9c5;padding-top:12px}
 code{font:12px ui-monospace,monospace;color:#6b6660;background:#f7f1e3;padding:1px 4px;border-radius:4px}
 table{border-collapse:collapse;font:13px system-ui} td,th{border:1px solid #e2d9c5;padding:4px 8px}
 details summary{cursor:pointer;color:#6b6660;font:13px system-ui}
</style></head><body>
<nav>${runs.map((r, i) => `<a href="#r${i}">${r.name.replace(/\.md$/, "")}</a>`).join("")}</nav>
<main>${runs.map((r, i) => `<article id="r${i}"><div class="md">${r.md.replace(/</g, "&lt;")}</div></article>`).join("")}</main>
<script type="module">
import { marked } from "https://cdn.jsdelivr.net/npm/marked@12/+esm";
for (const el of document.querySelectorAll(".md")) el.innerHTML = marked.parse(el.textContent);
</script></body></html>`;

await Deno.writeTextFile(`${dir}/index.html`, html);
console.log(`wrote ${dir}/index.html (${runs.length} run${runs.length === 1 ? "" : "s"})`);
