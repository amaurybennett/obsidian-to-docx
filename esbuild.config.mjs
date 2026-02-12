import esbuild from "esbuild";
import { builtinModules } from "module";

esbuild
	.build({
		entryPoints: ["main.ts"],
		bundle: true,
		external: [
			"obsidian",
			"electron",
			...builtinModules.map((m) => `node:${m}`),
		],
		format: "cjs",
		target: "es2018",
		logLevel: "info",
		sourcemap: "inline",
		platform: "node",
		outfile: "main.js",
	})
	.catch(() => process.exit(1));
