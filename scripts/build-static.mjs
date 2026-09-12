import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDirectory, "..");

const assets = [
	["node_modules/@mercuryworkshop/scramjet/dist", "public/scram"],
	["node_modules/@mercuryworkshop/libcurl-transport/dist", "public/libcurl"],
	["node_modules/@mercuryworkshop/bare-mux/dist", "public/baremux"],
];

// public/ is deployment output, not an additional source tree. Recreate it
// before every build so removed source files do not remain publicly reachable.
await rm(path.join(projectRoot, "public"), { recursive: true, force: true });
await mkdir(path.join(projectRoot, "public"), { recursive: true });

await Promise.all(
	assets.map(([source, destination]) =>
		cp(path.join(projectRoot, source), path.join(projectRoot, destination), {
			recursive: true,
			force: true,
		})
	)
);

console.log("Static browser assets prepared for Vercel.");
