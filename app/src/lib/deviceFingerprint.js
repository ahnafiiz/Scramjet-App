const encoder = new TextEncoder();

function readStorage(key) {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function writeStorage(key, value) {
	try {
		localStorage.setItem(key, value);
	} catch {
		// Private browsing modes can deny storage. The session still works.
	}
}

function getInstallId(identityKey) {
	const existing = readStorage(identityKey);
	if (existing) return existing;
	const installId = crypto.randomUUID();
	writeStorage(identityKey, installId);
	return installId;
}

function canvasSignal() {
	try {
		const canvas = document.createElement("canvas");
		canvas.width = 240;
		canvas.height = 64;
		const context = canvas.getContext("2d");
		if (!context) return "unavailable";
		context.textBaseline = "top";
		context.font = "14px Arial";
		context.fillStyle = "#1f2937";
		context.fillRect(0, 0, 240, 64);
		context.fillStyle = "#d9f99d";
		context.fillText("Classroom device signal", 8, 8);
		return canvas.toDataURL();
	} catch {
		return "unavailable";
	}
}

/**
 * Collects only coarse browser signals and immediately hashes them.
 * Raw canvas output, hardware values, and user-agent details never leave the
 * browser. The server hashes this digest again with a private salt.
 */
export async function getDeviceFingerprint(identityKey) {
	const screenData = window.screen || {};
	const signals = [
		getInstallId(identityKey),
		navigator.language || "unknown",
		navigator.platform || "unknown",
		Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
		`${screenData.width || 0}x${screenData.height || 0}x${screenData.colorDepth || 0}`,
		String(navigator.hardwareConcurrency || 0),
		String(navigator.deviceMemory || 0),
		canvasSignal(),
	].join("|");

	const digest = await crypto.subtle.digest("SHA-256", encoder.encode(signals));
	return Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, "0")
	).join("");
}

export function getSessionIdentity(identityKey) {
	const storageKey = `${identityKey}-session`;
	const existing = readStorage(storageKey);
	if (existing) return JSON.parse(existing);

	const identity = {
		sessionId: crypto.randomUUID(),
		fakeName: `Guest ${Math.floor(1000 + Math.random() * 9000)}`,
	};
	writeStorage(storageKey, JSON.stringify(identity));
	return identity;
}

export function getConsent(consentKey) {
	return readStorage(consentKey);
}

export function setConsent(consentKey, value) {
	writeStorage(consentKey, value);
}
