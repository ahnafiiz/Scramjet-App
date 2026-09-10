import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script, createContext } from "node:vm";
import test from "node:test";

test("browser config exposes the required quick links and client transport", async () => {
	const source = await readFile(
		new URL("../public/config.js", import.meta.url),
		"utf8"
	);
	const context = createContext({ window: {} });

	new Script(source).runInContext(context);

	const config = context.window.SCRAMJET_APP_CONFIG;
	assert.deepEqual(
		Array.from(config.quickLinks, (quickLink) => quickLink.label),
		["Geforce Now", "TikTok", "Snapchat", "YouTube", "Quenq"]
	);
	assert.equal(config.transport.strategy, "round-robin");
	assert.equal(config.transport.selectEndpoint(), "wss://wisp.webmc.fun/");
	assert.equal(Object.isFrozen(config), true);
});

test("the service worker takes control without a manual refresh", async () => {
	const source = await readFile(
		new URL("../public/sw.js", import.meta.url),
		"utf8"
	);

	assert.match(source, /self\.skipWaiting\(\)/);
	assert.match(source, /self\.clients\.claim\(\)/);
});

test("service-worker registration waits for controller activation", async () => {
	const source = await readFile(
		new URL("../public/register-sw.js", import.meta.url),
		"utf8"
	);

	assert.match(source, /registration\.update\(\)/);
	assert.match(source, /controllerchange/);
	assert.doesNotMatch(source, /Refresh once to activate/);
});

test("the browser uses Google for address-bar searches", async () => {
	const source = await readFile(
		new URL("../public/index.html", import.meta.url),
		"utf8"
	);

	assert.match(source, /https:\/\/www\.google\.com\/search\?q=%s/);
	assert.doesNotMatch(source, /bing\.com\/search/);
	assert.doesNotMatch(source, /duckduckgo\.com/);
});
