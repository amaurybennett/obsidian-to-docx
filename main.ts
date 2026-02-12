import { Notice, Plugin, TFile, TFolder } from "obsidian";
import {
	AlignmentType,
	convertMillimetersToTwip,
	Document,
	HeadingLevel,
	Packer,
	Paragraph,
	TextRun,
} from "docx";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Root, PhrasingContent } from "mdast";
import type { NotebookNavigatorAPI } from "./notebook-navigator";

const docStyles = {
	paragraphStyles: [
		{
			id: "Normal",
			name: "Normal",
			run: { font: "Georgia", size: 24 },
			paragraph: {
				alignment: AlignmentType.JUSTIFIED,
				indent: { firstLine: convertMillimetersToTwip(10) },
				spacing: { line: 320 },
			},
		},
		{
			id: "Heading1",
			name: "Heading 1",
			basedOn: "Normal",
			next: "Normal",
			run: { font: "Georgia", size: 36, color: "000000" },
			paragraph: {
				alignment: AlignmentType.LEFT,
				indent: { firstLine: 0 },
				spacing: { line: 240, after: 480 },
			},
		},
	],
};

interface InlineFlags {
	bold?: boolean;
	italics?: boolean;
	strike?: boolean;
}

function inlineToRuns(node: PhrasingContent, flags: InlineFlags): TextRun[] {
	switch (node.type) {
		case "text":
			return [new TextRun({ text: node.value, ...flags })];
		case "strong":
			return node.children.flatMap((c) =>
				inlineToRuns(c, { ...flags, bold: true })
			);
		case "emphasis":
			return node.children.flatMap((c) =>
				inlineToRuns(c, { ...flags, italics: true })
			);
		case "delete":
			return node.children.flatMap((c) =>
				inlineToRuns(c, { ...flags, strike: true })
			);
		default:
			// Unsupported inline nodes (links, images, code, etc.) → plain text
			if ("value" in node) {
				return [new TextRun({ text: (node as { value: string }).value, ...flags })];
			}
			if ("children" in node) {
				return (node as { children: PhrasingContent[] }).children.flatMap(
					(c) => inlineToRuns(c, flags)
				);
			}
			return [];
	}
}

function markdownToDocxParagraphs(body: string): Paragraph[] {
	const tree = unified().use(remarkParse).use(remarkGfm).parse(body) as Root;
	const paragraphs: Paragraph[] = [];

	for (const node of tree.children) {
		if (node.type === "paragraph") {
			const runs = node.children.flatMap((c) => inlineToRuns(c, {}));
			paragraphs.push(new Paragraph({ children: runs }));
		} else {
			// Non-paragraph blocks (lists, code, blockquote, etc.) → plain text fallback
			const text = body.slice(
				node.position!.start.offset!,
				node.position!.end.offset!
			);
			paragraphs.push(new Paragraph({ children: [new TextRun(text)] }));
		}
	}

	return paragraphs;
}

export default class ExportToDocxPlugin extends Plugin {
	private nnDispose?: () => void;

	async onload() {
		console.log("Loading Obsidian to Docx plugin...");

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (!(file instanceof TFolder)) return;

				menu.addItem((item) => {
					item.setTitle("Export as Word document")
						.setIcon("file-output")
						.onClick(() => this.exportFolder(file));
				});
			})
		);

		const nn = (this.app as any).plugins?.plugins["notebook-navigator"]
			?.api as Partial<NotebookNavigatorAPI> | undefined;

		if (nn?.menus) {
			const dispose = nn.menus.registerFolderMenu(({ addItem, folder }) => {
				addItem((item) => {
					item.setTitle("Export as Word document")
						.setIcon("file-output")
						.onClick(() => this.exportFolder(folder));
				});
			});
			if (dispose) {
				this.nnDispose = dispose;
			}
		}
	}

	onunload() {
		this.nnDispose?.();
	}

	async exportFolder(folder: TFolder) {
		const paragraphs: Paragraph[] = [];

		for (const child of folder.children) {
			if (!(child instanceof TFile) || child.extension !== "md") continue;

			const cache = this.app.metadataCache.getFileCache(child);
			const title = cache?.frontmatter?.dxtitle ?? child.basename;

			paragraphs.push(
				new Paragraph({
					heading: HeadingLevel.HEADING_1,
					pageBreakBefore: true,
					children: [new TextRun(title)],
				})
			);

			const content = await this.app.vault.read(child);
			const fmPos = cache?.frontmatterPosition;
			const bodyStart = fmPos ? fmPos.end.line + 1 : 0;
			const body = content.split("\n").slice(bodyStart).join("\n");

			paragraphs.push(...markdownToDocxParagraphs(body));
		}

		const doc = new Document({
			styles: docStyles,
			sections: [{ children: paragraphs }],
		});

		const buffer = await Packer.toBuffer(doc);
		const parentPath = folder.parent?.path ?? "";
		const docxPath = parentPath
			? `${parentPath}/${folder.name}.docx`
			: `${folder.name}.docx`;

		await this.app.vault.adapter.writeBinary(docxPath, buffer);
		new Notice(`Exported to ${docxPath}`);
	}
}
