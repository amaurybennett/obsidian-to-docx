import type { MenuItem, TFolder } from "obsidian";

export interface NotebookNavigatorAPI {
	menus?: {
		registerFolderMenu(
			callback: (context: {
				addItem: (cb: (item: MenuItem) => void) => void;
				folder: TFolder;
			}) => void,
		): (() => void) | undefined;
	};
}
