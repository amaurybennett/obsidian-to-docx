# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build

```
npm run build
```

Runs esbuild via `esbuild.config.mjs`. Output is `main.js` (CJS, ES2018 target, inline sourcemaps). All dependencies except `obsidian`, `electron`, and Node builtins are bundled.

There are no tests or lint scripts configured.

## What this plugin does

An Obsidian plugin that exports a folder of markdown notes into a single `.docx` file. Right-click a folder in Obsidian's file explorer → "Export as Word document".

## Architecture

Everything lives in a single file: **`main.ts`**.

- **`ObsidianToDocxPlugin`** — The Obsidian `Plugin` subclass. Registers two file-menu events (one for single files, one for folders). The folder handler calls `exportFolder()`.
- **`exportFolder(folder)`** — Iterates over markdown files in the folder. For each file, reads the `dxtitle` frontmatter field (falls back to filename) as an H1, then passes the post-frontmatter body to `markdownToDocxParagraphs()`. Assembles a `Document` with `docx` and writes the packed buffer via Obsidian's vault adapter.
- **`markdownToDocxParagraphs(body)`** — Parses markdown into an mdast AST using `unified` + `remark-parse` + `remark-gfm`. Paragraph nodes have their inline children converted to formatted `TextRun` objects; other block types fall back to plain text.
- **`inlineToRuns(node, flags)`** — Recursively converts mdast inline nodes (`text`, `strong`, `emphasis`, `delete`) into `TextRun[]`, accumulating bold/italic/strike flags through nesting.
- **`docStyles`** — Document-level paragraph styles (Normal: Georgia 12pt justified with first-line indent; Heading 1: Georgia 18pt left-aligned).

## Key dependencies

- **`docx`** — Generates .docx files (`Document`, `Paragraph`, `TextRun`, `Packer`)
- **`unified` / `remark-parse` / `remark-gfm`** — Parses markdown to mdast AST (including GFM strikethrough)
- **`obsidian`** — Obsidian plugin API (external, not bundled)

## CI / Releases

GitHub Actions workflow at `.github/workflows/build.yml`:
- Pushes to `main` and PRs: builds and uploads `main.js` + `manifest.json` as an artifact
- Pushing a semver tag (`v*.*.*`): also creates a GitHub release with those files attached

## Manual testing

After `npm run build`, reload Obsidian (Ctrl+R), right-click a folder containing markdown notes, and choose "Export as Word document". The `.docx` is written next to the folder.
