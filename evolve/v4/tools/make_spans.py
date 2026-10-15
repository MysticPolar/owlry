"""Generate seeds/protected-spans.json from the v0 champion prompts.

A protected span is a byte-exact substring of the system part that every challenger must still
contain exactly once. The list is deliberately narrow: the product contract (fictional cast, book
basis, the publication-year quotation rule, the pd field, turn range, output line, ending, dignity,
no demographic inference, the user's language) and, on the Gemini lane, the basis plumbing fix.
Section 3 as a whole is NOT protected: its old wording ("when verified, the relevant chapter or
section", "(verified URL)") produced the fabricated chapter numbers in every round-12 Gemini debate.

Usage: python3 tools/make_spans.py  (run from the package root)
"""
import hashlib, json, re, sys

USER_HEADING = "## User’s situation"

COMMON = {
    "language": "Use the user’s language.",
    "fictional_cast": "Choose three perspectives suited to this situation. Use descriptive role titles only, such as “The Experimenter” or “The Relationship Critic.” Do not give them personal names or impersonate real thinkers.",
    "book_basis": "Ground each mind primarily in one book by one identifiable thinker.",
    "quotation_rule": "1. Book published before 1931: you may quote its exact words. Use a direct quotation only when the exact wording strengthens the position, sharpens a disagreement, or reveals a tension that paraphrasing would lose. Keep quotations brief and verify their wording. For a translated or revised text, also verify that the edition supplying the quoted wording was published before 1931.\n2. Book published in 1931 or later: do not quote. Express the idea naturally in your own words, without quotation marks around the paraphrase, and name the author and book in the accompanying fields and reference.",
    "pd_field": "Set `pd` to the JSON boolean `true` if the cited book was published before 1931, otherwise `false`. Use `pd` strictly as this publication-date flag.",
    "no_demographic_inference": "Do not infer personality, preferences, or motives from demographic labels.",
    "dignity": "Attack arguments freely; respect the dignity of the user and other people.",
    "turn_range": "Write 9–12 speaking turns, usually 25–65 words each, excluding references.",
    "ending": "Keep the synthesis shorter than the debate. Do not end with a question or request for user input.",
}
LANE = {
    "gemini": {
        "basis_plumbing": "Every speaking turn must include a concise reference to its supporting book in the final `basis` field, in exactly this plain-text form:\nBasis: Author, Book",
        "format_line": '{"speaker":"The [Role Title]","text":"Natural dialogue responding to the discussion.","author":"Author","book":"Book","pd":false,"basis":"Basis: Author, Book"}',
        "per_turn_quote_check": "Check each line before writing the next: when `pd` is false, `text` contains no quotation marks of any kind.",
    },
    "sonnet": {
        "format_line": '{"speaker":"The [Role Title]","text":"Natural dialogue responding to the discussion.","author":"Author","book":"Book","pd":false,"basis":"[Basis: Author, Book, verified section if available](verified URL)"}',
    },
}

def system_part(path):
    text = open(path, encoding="utf-8").read()
    i = text.index(USER_HEADING)
    return text[:i].rstrip() + "\n"

out = {}
ok = True
for lane in ("gemini", "sonnet"):
    path = f"prompts/castDebate.{lane}.v0.md"
    sys_part = system_part(path)
    spans = []
    for sid, txt in {**COMMON, **LANE[lane]}.items():
        n = sys_part.count(txt)
        if n != 1:
            print(f"ERROR {lane}/{sid}: occurs {n} times", file=sys.stderr); ok = False
        spans.append({"id": sid, "text": txt, "sha256": hashlib.sha256(txt.encode("utf-8")).hexdigest()})
    out[lane] = {
        "source_file": path,
        "system_sha256": hashlib.sha256(sys_part.encode("utf-8")).hexdigest(),
        "system_word_count": len(sys_part.split()),
        "user_template": "{{question}}",
        "protected_spans": spans,
    }
json.dump(out, open("seeds/protected-spans.json", "w", encoding="utf-8"), indent=2, ensure_ascii=False)
print("wrote seeds/protected-spans.json", {k: len(v["protected_spans"]) for k, v in out.items()}, "ok" if ok else "WITH ERRORS")
sys.exit(0 if ok else 1)
