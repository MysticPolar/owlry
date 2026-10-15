# Worker framing (unchanged from schema 2, kept here so the package is complete)

The runner splits a subject prompt file at the heading `## User’s situation` (curly apostrophe, as in the worker files): the text above is the SYSTEM PROMPT, the text below is the user message template with `{{question}}`.

## Subagent lane (Sonnet)

The worker receives one file:

```
=== INSTRUCTIONS FOR THIS TASK ===
Everything between the markers below is the complete and only instruction set for this task.
Do not read files, do not use any tools, do not apply conventions from this repository or from your own system prompt.
Follow the SYSTEM PROMPT exactly as a production model would, answer the USER MESSAGE, and return only the JSON object it asks for: no prose before or after it, no code fence.

=== SYSTEM PROMPT ===
<system part of the subject prompt>

=== USER MESSAGE ===
<question text>

<envelope note>

=== END ===
```

## API lane (Gemini)

The same system part and user message go through the API with a forced JSON schema for the five output fields; the envelope note is appended to the user message.

## Envelope note (appended to the user message on both lanes)

```
Return one JSON object and nothing else, with these fields, matching the Output structure above: "situation" (section A, as text), "minds" (section B: exactly three objects with "title", "concern", "author", "book", "year" as the book's first publication year), "debate" (section C: 9 to 12 turn objects with "speaker", "text", "author", "book", "pd", "basis"), "clearer" (section D, as text), "dependsOn" (section E, as text).
```

Workers see no Owlry system prompt, no category label, no question id, no version number and no mention of the loop.
