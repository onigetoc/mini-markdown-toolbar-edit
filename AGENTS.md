# AGENTS.md — GC Mini Markdown Toolbar

## Project structure

All functionality is in a single self-contained HTML file:

- `mini-markdown-editor-toolbar-all-in-one.html` — the editor (modify this one)
- `demo/minimdtoolbar.html` + `.ts` + `.css` — separated source variant (TypeScript with types)
- `mini-markdown-editor-toolbar-pre-adapter-BACKUP.html` — do not modify
- `README.md` — project docs

No build step, no dependencies, no package manager, no tests for the main file. For `demo/`, compile `.ts` with `tsc --strict --target es2020 --module es2020 demo/minimdtoolbar.ts --outDir demo/`. Open the HTML directly in a browser.

## Key facts

- **Only file that matters**: `mini-markdown-editor-toolbar-all-in-one.html`. All CSS, HTML, and JS are inlined.
- **Preview** is not supported — the toolbar inserts markdown syntax into the textarea; rendering is left to the consumer (Obsidian, GitHub, etc.).
- **Backup file** exists at `*-BACKUP.html` — never edit it.
- **No framework** — vanilla HTML/CSS/JS, uses GitHub's [`<markdown-toolbar>`](https://github.com/github/markdown-toolbar-element) web component custom elements.
- **Dark theme default** — toggle via the moon/sun button; `body.light` toggles light mode.
- **Responsive overflow** — toolbar buttons that overflow are moved into a "More options" dropdown via `ResizeObserver`; the overflow logic is in a self-invoking function.
- **Undo/Redo** is custom (not browser-native), with a 500ms throttle on history pushes.
- **Smart # and @** — custom `md-tag` and `md-mention` elements override the default `prefixSpace` behavior to expand to word boundaries and insert `#`/`@`.

## Common tasks

- **Translate textarea content**: edit the `<textarea id="textarea">` block at line ~210.
- **Add/modify toolbar buttons**: add an element with a matching custom element tag (e.g., `<md-bold>`) or use `data-md-button` attribute for `manualStyles` lookup.
- **Change markdown style syntax**: update `manualStyles` object (line ~576) or the per-element `connectedCallback` in the custom element classes.

## Conventions

- Keep the single-file nature — no external CSS/JS files.
- Tooltips (`title` attr) should be in English.
- SVG icons use 24x24 viewBox, 16x16 rendered size, stroke-based Lucide-style paths.
