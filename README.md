# Export to Docx

An [Obsidian](https://obsidian.md) plugin that exports a folder of markdown notes into a single Word (.docx) file.

## Features

- Right-click any folder in the file explorer → **Export as Word document**
- Each note becomes a chapter, starting on a new page with an H1 title
- Inline markdown formatting is preserved: **bold**, *italic*, ***bold-italic***, ~~strikethrough~~
- Chapter titles are pulled from the `dxtitle` frontmatter field (falls back to the filename)

## Installation

### Manual

1. Clone this repository into your vault's `.obsidian/plugins/` directory
2. Install dependencies and build:
   ```
   npm install
   npm run build
   ```
3. Enable the plugin in Obsidian → Settings → Community plugins

## Usage

1. Right-click a folder in the file explorer
2. Select **Export as Word document**
3. The `.docx` file is created next to the folder

### Frontmatter options

Use the `dxtitle` field to set a custom chapter title:

```yaml
---
dxtitle: A Better Title
---
```

## Development

```
npm install
npm run build
```

The build bundles everything into `main.js` using esbuild. After building, reload Obsidian (Ctrl+R) to pick up changes.
