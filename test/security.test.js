import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { isUuid, normaliseDeviceLabel } from "../api/_lib/validation.js";

test("device labels are concise, safe household labels", () => {
	assert.equal(normaliseDeviceLabel("  Alex\n—\tDesk PC  "), "Alex — Desk PC");
	assert.equal(normaliseDeviceLabel(""), "Anonymous device");
	assert.equal(normaliseDeviceLabel("x".repeat(65)), null);
	assert.equal(normaliseDeviceLabel(null), null);
});

test("identity and session values must be UUIDs", () => {
	assert.equal(isUuid("5bfd7c83-85bd-4b9c-a132-24bc2d5d9597"), true);
	assert.equal(isUuid("not-a-device"), false);
	assert.equal(isUuid("5bfd7c83-85bd-0b9c-a132-24bc2d5d9597"), false);
});

test("the consented identity is not a browser fingerprint", async () => {
	const source = await readFile(
		new URL("../app/src/lib/deviceFingerprint.js", import.meta.url),
		"utf8"
	);
	assert.match(source, /randomUUID/);
	assert.doesNotMatch(source, /canvasSignal|deviceMemory|hardwareConcurrency/);
});

test("deployment responses send restrictive browser security headers", async () => {
	const source = await readFile(
		new URL("../vercel.json", import.meta.url),
		"utf8"
	);
	assert.match(source, /Content-Security-Policy/);
	assert.match(source, /Permissions-Policy/);
	assert.match(source, /X-Content-Type-Options/);
	assert.match(source, /frame-ancestors 'none'/);
});
