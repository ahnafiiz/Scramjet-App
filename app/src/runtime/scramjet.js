import { appConfig } from "../config";

let controllerPromise;
let transportPromise;
let connection;

function endpoints() {
	return window.SCRAMJET_APP_CONFIG?.transport?.endpoints || [
		"wss://wisp.webmc.fun/",
		"wss://wisp.mercurywork.shop/",
	];
}

async function ensureTransport() {
	if (transportPromise) return transportPromise;
	transportPromise = (async () => {
		if (typeof window.registerSW === "function") await window.registerSW();
		if (!connection) connection = new window.BareMux.BareMuxConnection("/baremux/worker.js");

		let lastError;
		for (const endpoint of endpoints()) {
			try {
				await connection.setTransport("/libcurl/index.mjs", [
					{ websocket: endpoint },
				]);
				return endpoint;
			} catch (error) {
				lastError = error;
				console.warn(`Unable to use Wisp endpoint ${endpoint}.`, error);
			}
		}
		throw lastError || new Error("No public Wisp endpoint is available.");
	})();

	try {
		return await transportPromise;
	} catch (error) {
		transportPromise = null;
		throw error;
	}
}

async function ensureController() {
	if (controllerPromise) return controllerPromise;
	controllerPromise = (async () => {
		await ensureTransport();
		if (!window.$scramjetLoadController) {
			throw new Error("Scramjet controller assets are missing.");
		}
		const { ScramjetController } = window.$scramjetLoadController();
		const controller = new ScramjetController({
			files: {
				wasm: "/scram/scramjet.wasm.wasm",
				all: "/scram/scramjet.all.js",
				sync: "/scram/scramjet.sync.js",
			},
		});
		controller.init();
		return controller;
	})();
	try {
		return await controllerPromise;
	} catch (error) {
		controllerPromise = null;
		throw error;
	}
}

export function createScramjetRuntime() {
	const frames = new Map();

	return {
		async navigate(tabId, container, url) {
			const controller = await ensureController();
			let frame = frames.get(tabId);
			if (!frame) {
				frame = controller.createFrame();
				frame.frame.className = "browser-frame";
				frame.frame.dataset.tabId = tabId;
				container.appendChild(frame.frame);
				frames.set(tabId, frame);
			}
			for (const [id, candidate] of frames) {
				candidate.frame.hidden = id !== tabId;
			}
			frame.frame.hidden = false;
			await frame.go(url);
		},
		async reload(tabId) {
			const frame = frames.get(tabId);
			if (frame?.frame.contentWindow) frame.frame.contentWindow.location.reload();
		},
		remove(tabId) {
			const frame = frames.get(tabId);
			frame?.frame.remove();
			frames.delete(tabId);
		},
	};
}

export { appConfig };
