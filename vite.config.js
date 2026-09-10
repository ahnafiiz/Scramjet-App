import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	root: path.join(projectRoot, "app"),
	publicDir: path.join(projectRoot, "app", "public"),
	build: {
		outDir: path.join(projectRoot, "public"),
		emptyOutDir: false,
		assetsDir: "assets",
		sourcemap: false,
	},
});
