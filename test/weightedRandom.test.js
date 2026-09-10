import assert from "node:assert/strict";
import test from "node:test";
import { weightedRandom } from "../app/src/lib/weightedRandom.js";

test("weighted random selection honors cumulative boundaries", () => {
	const items = [
		{ label: "common", weight: 70 },
		{ label: "uncommon", weight: 25 },
		{ label: "mythic", weight: 5 },
	];

	assert.equal(weightedRandom(items, () => 0).label, "common");
	assert.equal(weightedRandom(items, () => 0.7).label, "uncommon");
	assert.equal(weightedRandom(items, () => 0.95).label, "mythic");
});

test("weighted random selection rejects invalid collections", () => {
	assert.throws(() => weightedRandom([]), /positive weight/);
	assert.throws(() => weightedRandom([{ weight: 0 }]), /positive weight/);
});
