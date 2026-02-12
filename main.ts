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

export default class ExportToDocxPlugin extends Plugin {
	async onload() {
		console.log("Loading Export to Docx plugin...");
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (!(file instanceof TFile) || file.extension !== "md") return;

				menu.addItem((item) => {
					item.setTitle("Export as Word document")
						.setIcon("file-output")
						.onClick(() => {
							console.log("Hello, docx !");
						});
				});
			})
		);

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
			const lines = content.split("\n").slice(bodyStart);

			for (const line of lines) {
				paragraphs.push(
					new Paragraph({
						children: [new TextRun(line)],
					})
				);
			}
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
