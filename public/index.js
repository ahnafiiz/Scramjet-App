"use strict";

// ============================================
// RESTRICTION OVERLAY - KONAMI CODE BYPASS
// ============================================
const restrictionOverlay = document.getElementById("restriction-overlay");
const konamiSequence = ["ArrowUp", "ArrowDown", "ArrowUp", "ArrowDown"];
let konamiIndex = 0;
let konamiTimeout;

document.addEventListener("keydown", (event) => {
	// Clear timeout if keys stop being pressed
	clearTimeout(konamiTimeout);

	// Check if the current key matches the expected sequence
	if (event.key === konamiSequence[konamiIndex]) {
		konamiIndex++;

		// If the full sequence is entered, remove the restriction overlay
		if (konamiIndex === konamiSequence.length) {
			restrictionOverlay.classList.add("hidden");
			konamiIndex = 0; // Reset for potential re-locking
		}
	} else {
		// Reset if wrong key is pressed
		konamiIndex = 0;
		// Check if this key is the first in the sequence
		if (event.key === konamiSequence[0]) {
			konamiIndex = 1;
		}
	}

	// Reset sequence after 2 seconds of inactivity
	konamiTimeout = setTimeout(() => {
		konamiIndex = 0;
	}, 2000);
});

// ============================================
// ORIGINAL SCRAMJET FUNCTIONALITY
// ============================================

/**
 * @type {HTMLFormElement}
 */
const form = document.getElementById("sj-form");
/**
 * @type {HTMLInputElement}
 */
const address = document.getElementById("sj-address");
/**
 * @type {HTMLInputElement}
 */
const searchEngine = document.getElementById("sj-search-engine");
/**
 * @type {HTMLParagraphElement}
 */
const error = document.getElementById("sj-error");
/**
 * @type {HTMLPreElement}
 */
const errorCode = document.getElementById("sj-error-code");

const { ScramjetController } = $scramjetLoadController();

const scramjet = new ScramjetController({
	files: {
		wasm: "/scram/scramjet.wasm.wasm",
		all: "/scram/scramjet.all.js",
		sync: "/scram/scramjet.sync.js",
	},
});

scramjet.init();

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

form.addEventListener("submit", async (event) => {
	event.preventDefault();

	try {
		await registerSW();
	} catch (err) {
		error.textContent = "Failed to register service worker.";
		errorCode.textContent = err.toString();
		throw err;
	}

	const url = search(address.value, searchEngine.value);

	let wispUrl =
		(location.protocol === "https:" ? "wss" : "ws") +
		"://" +
		location.host +
		"/wisp/";
	if ((await connection.getTransport()) !== "/libcurl/index.mjs") {
		await connection.setTransport("/libcurl/index.mjs", [
			{ websocket: wispUrl },
		]);
	}
	const frame = scramjet.createFrame();
	frame.frame.id = "sj-frame";
	document.body.appendChild(frame.frame);
	frame.go(url);
});
