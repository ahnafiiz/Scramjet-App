import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
	parseWireproxyConfig,
	ProxyRotationManager,
	SocksProxySocket,
} from "../src/proxyRotation.js";

const config = `[Interface]
Address = 10.0.0.2/32

[Socks5]
BindAddress = 127.0.0.1:9001
Username = user
Password = pass
`;

test("parses the SOCKS endpoint and optional credentials", () => {
	assert.deepEqual(parseWireproxyConfig(config), {
		host: "127.0.0.1",
		port: 9001,
		username: "user",
		password: "pass",
	});
});

test("ignores example configurations and keeps assignments sticky", async () => {
	const directory = await mkdtemp(path.join(os.tmpdir(), "wireproxy-test-"));
	await writeFile(path.join(directory, "first.conf"), config);
	await writeFile(path.join(directory, "sample.example.conf"), config);

	const manager = new ProxyRotationManager({ configPath: directory, healthCheckInterval: 0 });
	manager.proxies = await manager.discoverProxyConfigs();
	for (const proxy of manager.proxies) {
		proxy.ready = true;
		manager.stats.set(proxy.id, { usageCount: 0, successCount: 0, errorCount: 0 });
	}

	assert.equal(manager.proxies.length, 1);
	assert.equal(manager.getProxyForSession("session-a").name, "first");
	assert.equal(manager.getProxyForSession("session-a").name, "first");
	await manager.cleanup();
});

test("opens a Wisp-compatible stream through SOCKS5", async (context) => {
	const server = net.createServer((client) => {
		let stage = 0;
		client.on("data", (data) => {
			if (stage === 0) {
				assert.deepEqual([...data], [0x05, 0x01, 0x00]);
				stage = 1;
				client.write(Buffer.from([0x05, 0x00]));
				return;
			}

			if (stage === 1) {
				assert.equal(data[0], 0x05);
				assert.equal(data[1], 0x01);
				assert.equal(data.subarray(5, -2).toString(), "example.com");
				stage = 2;
				client.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 127, 0, 0, 1, 0, 80, 79, 75]));
				return;
			}

			assert.equal(data.toString(), "ping");
		});
	});

	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	context.after(() => new Promise((resolve) => server.close(resolve)));
	const { port } = server.address();
	const manager = new ProxyRotationManager({ enabled: true, healthCheckInterval: 0 });
	manager.stats.set("mock", { usageCount: 0, successCount: 0, errorCount: 0 });

	const socket = new SocksProxySocket(
		"example.com",
		443,
		{ id: "mock", host: "127.0.0.1", port, username: "", password: "" },
		manager
	);
	await socket.connect();
	assert.equal((await socket.recv()).toString(), "OK");
	await socket.send(Buffer.from("ping"));
	await socket.close();
	assert.equal(manager.stats.get("mock").successCount, 1);
});
