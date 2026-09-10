/**
 * Select one item from a weighted collection.
 *
 * The random source is injectable so the selection can be tested without
 * weakening the browser's cryptographic randomness in production.
 */
export function weightedRandom(items, randomSource = secureRandom) {
	const validItems = items.filter(
		(item) => item && Number.isFinite(item.weight) && item.weight > 0
	);
	const totalWeight = validItems.reduce((total, item) => total + item.weight, 0);

	if (!validItems.length || totalWeight <= 0) {
		throw new Error("Weighted selection needs at least one positive weight.");
	}

	let cursor = randomSource() * totalWeight;
	for (const item of validItems) {
		cursor -= item.weight;
		if (cursor < 0) return item;
	}

	return validItems.at(-1);
}

function secureRandom() {
	const buffer = new Uint32Array(1);
	crypto.getRandomValues(buffer);
	return buffer[0] / 2 ** 32;
}

export function chooseBlockedAsset(assets) {
	return weightedRandom(assets).src;
}
