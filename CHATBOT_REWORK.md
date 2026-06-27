# Floating Chatbot (Bus Sathi Bot) — rework log

_2026-06-27. Complete from-scratch rework of the floating AI chat widget for
responsiveness + usability. Backend contract unchanged (SSE `/api/chat`,
pathname-aware fleet snapshot + route dataset)._

## Kept
- `app/api/chat/route.ts` (backend, streaming) — untouched.
- `hooks/useChat.ts` streaming/SSE contract — **extended** (not replaced).

## What changed / added
- [x] **`hooks/useChat.ts`** — added (a) **localStorage persistence** (conversation
  survives close/refresh, capped), (b) **Stop generating** via AbortController
  (keeps partial answer, no error), (c) abort-vs-error distinction.
- [x] **`components/Markdown.tsx`** — new lightweight, dependency-free, XSS-safe
  markdown renderer (bold/italic/inline code/code-blocks/lists/headings/links).
  Assistant answers were previously raw text.
- [x] **`components/ChatWidget.tsx`** — full rewrite:
  - **Responsive**: true bottom-sheet on mobile (slides up, body-scroll-locked),
    floating card on desktop with an **expand/maximize** toggle for long answers.
  - **Usability**: markdown answers, **copy** button per assistant message,
    **Stop** button while streaming, auto-growing textarea, **Esc** to close,
    **Ctrl/⌘-K** to toggle, focus management, "scroll to latest" affordance,
    error message with **Retry**.
  - **Accessibility**: dialog role, aria-labels, keyboard-first.
  - Refreshed empty state + suggested prompts (fleet + route + rationalisation).

## Visual QA (2026-06-27) — done ✅
Ran the dev server + browser preview at desktop and mobile (375px):
- Desktop floating card, mobile bottom-sheet (drag handle, backdrop), empty
  state + prompts, composer + hints — all render correctly.
- Live send → user bubble + streaming "Thinking…" + Stop affordance confirmed.
- **Bug found & fixed**: markdown renderer was italicising snake_case underscores
  (`FIREBASE_PRIVATE_KEY` → FIREBASE<em>PRIVATE</em>KEY). Underscore/asterisk
  emphasis now requires word boundaries; re-verified in-browser. Commit d7f8a73.
- `tsc` + `next build` pass.

## Status: SHIPPED — dashboard main @ d7f8a73 (+ this log update).

## Notes
- No new npm deps (markdown renderer is hand-rolled + safe; animations are CSS).
- Launcher = compact FAB on mobile, labelled pill on desktop.
- Backend (`/api/chat`) returns a graceful fallback locally without Firebase/OpenAI
  keys; real answers require those env vars on the deployed environment.
