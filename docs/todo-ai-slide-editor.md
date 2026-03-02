# TODO: AI Agent in Slide Editor

Refine AI-generated title, description, and extended content from within the slide editor.

---

## Option 1 — Per-field "Regenerate" buttons (simplest)

Small AI wand button next to each field (Title, Description, Extended Content). Click opens a mini popover: optional instruction textarea + a Generate button. Calls a new Netlify function with the current content + instruction, returns a revised version for the user to accept or discard.

- **Effort:** Low — one new Netlify function, small UI additions
- **Best for:** Quick spot fixes ("make it shorter", "change the tone")

---

## Option 2 — AI tab in the slide editor ★ Recommended

Add a 4th tab "AI" to the existing slide tab set (alongside Content / Location / Media). Shows current title + description + extended content, an instruction field, and a Generate button. User reviews the AI output and clicks Accept to overwrite the fields.

- **Effort:** Medium — keeps the UI contained within the existing pattern
- **Best for:** Reviewing and rewriting all three fields together with context

---

## Option 3 — Contextual side panel (chat-style)

A collapsible panel that slides in alongside the editor. Has a short conversation history so you can say "make it more Berger", then "now shorten the description", then "add a reference to the GPS coordinates". Each turn shows the current and proposed content.

- **Effort:** Higher — needs a conversation state model and more UI
- **Best for:** Iterative refinement over several turns

---

## Option 4 — Quick-action preset buttons ★ Recommended (combine with Option 2)

Pre-wired buttons: **Shorten** / **Expand** / **Change voice** / **Focus on location** / **Make more poetic**. Each sends the current content with a fixed system instruction. No typing needed.

- **Effort:** Low-medium — can combine with Option 1 or 2
- **Best for:** Fast, consistent operations without writing prompts

---

## Recommended approach

**Option 2 (AI tab) + Option 4 (preset buttons).** The tab keeps the UI clean, the presets cover 80% of use cases without typing, and there's still a free-text instruction field for anything custom. Maps naturally onto the three fields (title, description, extended content) as a unified "review and revise" view.

---

## Technical notes

All options require a new Netlify function, e.g. `netlify/functions/refine-slide.js`:

```js
// POST body:
{
  slide_id,
  field,               // 'title' | 'description' | 'extended_content' | 'all'
  instruction,         // e.g. "make it shorter", "change to Berger voice"
  current_content,     // existing text
  voice_style,         // optional — carry over from import
  story_context        // optional — title, chapter name, GPS coords
}
// Returns: { title, description, extended_content }
// User approves before save — does NOT auto-write to DB
```

- The existing `generate-captions` function is bulk/write-only — refinement needs a **read-modify-return** pattern where the user approves before saving.
- **Streaming** is possible with Netlify Functions — user sees text written in real time. Adds polish, more implementation complexity.
- Character limits must be enforced: description ≤ 340 chars, extended_content ≤ 1100 chars.
