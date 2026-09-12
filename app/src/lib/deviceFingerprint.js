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
	const installId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
	writeStorage(identityKey, installId);
	return installId;
}

/**
 * Returns a locally generated, pseudonymous installation identifier. It is
 * deliberately not based on canvas, hardware, IP address, or browser traits.
 * The server hashes it again with a private salt before storage.
 */
export function getDeviceIdentity(identityKey) {
	return getInstallId(identityKey);
}

export function getSessionIdentity(identityKey) {
	const storageKey = `${identityKey}-session`;
	const existing = readStorage(storageKey);
	if (existing) {
		try {
			const parsed = JSON.parse(existing);
			if (
				typeof parsed?.sessionId === "string" &&
				typeof parsed?.fakeName === "string"
			) {
				return parsed;
			}
		} catch {
			// A malformed local value is replaced with a fresh anonymous session.
		}
	}

	const identity = {
		sessionId: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
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
