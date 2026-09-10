import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class AsyncQueue {
	constructor(maxSize = 128) {
		this.max_size = maxSize;
		this.values = [];
		this.waiters = [];
		this.closed = false;
	}

	get size() {
		return this.values.length;
	}

	put(value) {
		if (this.closed) return;
		const waiter = this.waiters.shift();
		if (waiter) waiter(value);
		else this.values.push(value);
	}

	get() {
		if (this.values.length > 0) return Promise.resolve(this.values.shift());
		if (this.closed) return Promise.resolve(null);
		return new Promise((resolve) => this.waiters.push(resolve));
	}

	close() {
		if (this.closed) return;
		this.closed = true;
		for (const waiter of this.waiters.splice(0)) waiter(null);
	}
}

function parseBoolean(value, fallback = false) {
	if (value == null || value === "") return fallback;
	return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function parseBindAddress(value) {
	const match = String(value || "").trim().match(/^\[?([^\]]+)\]?:([0-9]{1,5})$/);
	if (!match) return null;

	const port = Number(match[2]);
	if (port < 1 || port > 65535) return null;

	return { host: match[1], port };
}

function parseWireproxyConfig(source) {
	let section = "";
	const values = new Map();

	for (const rawLine of source.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#") || line.startsWith(";")) continue;

		const sectionMatch = line.match(/^\[([^\]]+)]$/);
		if (sectionMatch) {
			section = sectionMatch[1].toLowerCase();
			continue;
		}

		const equalsIndex = line.indexOf("=");
		if (equalsIndex === -1 || !section) continue;

		const key = line.slice(0, equalsIndex).trim().toLowerCase();
		const configValue = line.slice(equalsIndex + 1).trim();
		values.set(`${section}.${key}`, configValue);
	}

	const bind = parseBindAddress(values.get("socks5.bindaddress"));
	if (!bind) return null;

	return {
		host: bind.host,
		port: bind.port,
		username: values.get("socks5.username") || "",
		password: values.get("socks5.password") || "",
	};
}

function waitForPort(host, port, timeout = 1200) {
	return new Promise((resolve) => {
		const socket = net.connect({ host, port });
		const finish = (ready) => {
			socket.removeAllListeners();
			socket.destroy();
			resolve(ready);
		};

		socket.setTimeout(timeout);
		socket.once("connect", () => finish(true));
		socket.once("timeout", () => finish(false));
		socket.once("error", () => finish(false));
	});
}

function withTimeout(promise, timeout, message) {
	let timer;
	return Promise.race([
		promise,
		new Promise((_, reject) => {
			timer = setTimeout(() => reject(new Error(message)), timeout);
		}),
	]).finally(() => clearTimeout(timer));
}

/**
 * Manages local wireproxy instances and assigns one healthy SOCKS endpoint to
 * each Wisp connection. A connection keeps its selected endpoint until expiry.
 */
export class ProxyRotationManager {
	constructor(options = {}) {
		this.enabled = options.enabled !== false;
		this.autostart = options.autostart ?? false;
		this.required = options.required ?? false;
		this.proxyConfigPath = path.resolve(
			options.configPath || path.join(__dirname, "../config/wireproxy")
		);
		this.wireproxyBinary = options.wireproxyBinary || "wireproxy";
		this.rotationStrategy = options.rotationStrategy || "round-robin";
		this.sessionTimeout = options.sessionTimeout || 3_600_000;
		this.healthCheckInterval = options.healthCheckInterval || 30_000;
		this.proxies = [];
		this.currentIndex = 0;
		this.sessionProxyMap = new Map();
		this.stats = new Map();
		this.processes = new Map();
		this.healthTimer = null;
	}

	async init() {
		if (!this.enabled) return;

		this.proxies = await this.discoverProxyConfigs();
		for (const proxy of this.proxies) {
			this.stats.set(proxy.id, {
				usageCount: 0,
				successCount: 0,
				errorCount: 0,
				lastUsed: null,
				lastError: null,
			});
		}

		if (this.autostart) {
			await Promise.all(this.proxies.map((proxy) => this.startProxy(proxy)));
		}

		await this.checkAllProxies();
		this.startHealthChecks();
	}

	async discoverProxyConfigs() {
		try {
			const files = await fs.readdir(this.proxyConfigPath);
			const configs = files
				.filter((file) => file.endsWith(".conf") && !file.endsWith(".example.conf"))
				.sort();

			const proxies = [];
			for (const [index, file] of configs.entries()) {
				const configPath = path.join(this.proxyConfigPath, file);
				const source = await fs.readFile(configPath, "utf8");
				const socks = parseWireproxyConfig(source);
				if (!socks) {
					console.warn(`[Wireproxy] Skipping ${file}: no valid [Socks5] BindAddress found.`);
					continue;
				}

				proxies.push({
					id: path.basename(file, ".conf"),
					name: path.basename(file, ".conf"),
					configPath,
					...socks,
					infoAddress: `127.0.0.1:${19_000 + index}`,
					status: "configured",
					ready: false,
				});
			}

			return proxies;
		} catch (error) {
			if (error.code !== "ENOENT") {
				console.warn(`[Wireproxy] Unable to read configs: ${error.message}`);
			}
			return [];
		}
	}

	async startProxy(proxy) {
		if (this.processes.has(proxy.id)) return;

		try {
			const child = spawn(
				this.wireproxyBinary,
				["-c", proxy.configPath, "-i", proxy.infoAddress],
				{ windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }
			);

			this.processes.set(proxy.id, child);
			proxy.status = "starting";
			child.stdout.on("data", (data) => console.info(`[Wireproxy:${proxy.name}] ${data}`.trim()));
			child.stderr.on("data", (data) => console.warn(`[Wireproxy:${proxy.name}] ${data}`.trim()));
			child.once("error", (error) => {
				proxy.status = "error";
				proxy.lastError = error.message;
				this.processes.delete(proxy.id);
			});
			child.once("exit", (code, signal) => {
				this.processes.delete(proxy.id);
				if (!proxy.shuttingDown) {
					proxy.status = "stopped";
					proxy.lastError = `wireproxy exited (${signal || code || "unknown"})`;
				}
			});

			const ready = await this.waitForProxy(proxy, 12_000);
			if (!ready) {
				proxy.status = "error";
				proxy.lastError = "SOCKS listener did not become ready.";
			}
		} catch (error) {
			proxy.status = "error";
			proxy.lastError = error.message;
			console.warn(`[Wireproxy] Could not start ${proxy.name}: ${error.message}`);
		}
	}

	async waitForProxy(proxy, timeout) {
		const startedAt = Date.now();
		while (Date.now() - startedAt < timeout) {
			if (await waitForPort(proxy.host, proxy.port, 700)) return true;
			await new Promise((resolve) => setTimeout(resolve, 250));
		}
		return false;
	}

	async checkProxyHealth(proxy) {
		const ready = await waitForPort(proxy.host, proxy.port);
		proxy.ready = ready;
		if (ready) {
			proxy.status = "ready";
		} else if (proxy.status !== "error" && proxy.status !== "starting") {
			proxy.status = "unavailable";
		}
		return ready;
	}

	async checkAllProxies() {
		await Promise.all(this.proxies.map((proxy) => this.checkProxyHealth(proxy)));
	}

	startHealthChecks() {
		if (!this.healthCheckInterval || this.healthTimer) return;
		this.healthTimer = setInterval(() => {
			this.checkAllProxies().catch((error) => {
				console.warn(`[Wireproxy] Health check failed: ${error.message}`);
			});
		}, this.healthCheckInterval);
		this.healthTimer.unref?.();
	}

	getProxyForSession(sessionId) {
		if (!this.enabled) return null;
		this.pruneSessions();

		const assignment = this.sessionProxyMap.get(sessionId);
		if (assignment) return assignment.proxy;

		const proxy = this.selectProxy();
		if (!proxy) return null;

		this.sessionProxyMap.set(sessionId, { proxy, assignedAt: Date.now() });
		const stats = this.stats.get(proxy.id);
		if (stats) {
			stats.usageCount += 1;
			stats.lastUsed = new Date().toISOString();
		}
		return proxy;
	}

	selectProxy() {
		const available = this.proxies.filter((proxy) => proxy.ready);
		if (available.length === 0) return null;

		if (this.rotationStrategy === "random") {
			return available[Math.floor(Math.random() * available.length)];
		}

		if (this.rotationStrategy === "least-used") {
			return available.reduce((leastUsed, proxy) => {
				const current = this.stats.get(proxy.id)?.usageCount || 0;
				const lowest = this.stats.get(leastUsed.id)?.usageCount || 0;
				return current < lowest ? proxy : leastUsed;
			});
		}

		const proxy = available[this.currentIndex % available.length];
		this.currentIndex = (this.currentIndex + 1) % available.length;
		return proxy;
	}

	recordSuccess(proxyId) {
		const stats = this.stats.get(proxyId);
		if (stats) stats.successCount += 1;
	}

	recordError(proxyId, error) {
		const stats = this.stats.get(proxyId);
		if (stats) {
			stats.errorCount += 1;
			stats.lastError = error?.message || String(error || "Connection failed");
		}
	}

	pruneSessions() {
		const oldestAllowed = Date.now() - this.sessionTimeout;
		for (const [sessionId, assignment] of this.sessionProxyMap) {
			if (assignment.assignedAt < oldestAllowed) this.sessionProxyMap.delete(sessionId);
		}
	}

	getStatus() {
		return {
			enabled: this.enabled,
			autostart: this.autostart,
			required: this.required,
			rotationStrategy: this.rotationStrategy,
			configuredProxies: this.proxies.length,
			readyProxies: this.proxies.filter((proxy) => proxy.ready).length,
			activeSessions: this.sessionProxyMap.size,
			proxies: this.proxies.map((proxy) => ({
				name: proxy.name,
				endpoint: `${proxy.host}:${proxy.port}`,
				status: proxy.status,
				lastError: proxy.lastError || null,
				statistics: this.stats.get(proxy.id),
			})),
		};
	}

	async cleanup() {
		if (this.healthTimer) clearInterval(this.healthTimer);
		this.healthTimer = null;
		this.sessionProxyMap.clear();

		for (const proxy of this.proxies) proxy.shuttingDown = true;
		for (const child of this.processes.values()) child.kill();
		this.processes.clear();
	}
}

/**
 * Socket implementation compatible with wisp-js's TCPSocket hook. It performs
 * a SOCKS5 handshake with the local wireproxy listener before passing bytes to
 * the Wisp stream.
 */
export class SocksProxySocket {
	constructor(hostname, port, proxy, proxyManager) {
		this.hostname = hostname;
		this.port = port;
		this.proxy = proxy;
		this.proxyManager = proxyManager;
		this.recv_buffer_size = 128;
		this.data_queue = new AsyncQueue(this.recv_buffer_size);
		this.socket = null;
		this.connected = false;
		this.paused = false;
		this.handshakeComplete = false;
		this.handshakeBuffer = Buffer.alloc(0);
		this.handshakeWaiter = null;
	}

	async connect() {
		try {
			await this.openSocket();
			await this.performHandshake();
			this.connected = true;
			this.proxyManager.recordSuccess(this.proxy.id);
		} catch (error) {
			this.proxyManager.recordError(this.proxy.id, error);
			await this.close();
			throw error;
		}
	}

	async openSocket() {
		this.socket = new net.Socket();
		this.socket.setNoDelay(true);
		this.socket.on("data", (data) => this.handleData(data));
		this.socket.on("error", (error) => this.handleError(error));
		this.socket.on("close", () => this.data_queue.close());

		await withTimeout(
			new Promise((resolve, reject) => {
				const onConnect = () => {
					cleanup();
					resolve();
				};
				const onError = (error) => {
					cleanup();
					reject(error);
				};
				const cleanup = () => {
					this.socket.off("connect", onConnect);
					this.socket.off("error", onError);
				};
				this.socket.once("connect", onConnect);
				this.socket.once("error", onError);
				this.socket.connect({ host: this.proxy.host, port: this.proxy.port });
			}),
			10_000,
			`Timed out connecting to wireproxy at ${this.proxy.host}:${this.proxy.port}`
		);
	}

	handleData(data) {
		if (this.handshakeComplete) {
			this.data_queue.put(data);
			return;
		}

		this.handshakeBuffer = Buffer.concat([this.handshakeBuffer, data]);
		if (this.handshakeWaiter) {
			const waiter = this.handshakeWaiter;
			this.handshakeWaiter = null;
			waiter();
		}
	}

	handleError(error) {
		if (this.handshakeWaiter) {
			const waiter = this.handshakeWaiter;
			this.handshakeWaiter = null;
			waiter(error);
		}
		this.data_queue.close();
	}

	async performHandshake() {
		const supportsAuth = Boolean(this.proxy.username || this.proxy.password);
		await this.write(Buffer.from(supportsAuth ? [0x05, 0x02, 0x00, 0x02] : [0x05, 0x01, 0x00]));
		const response = await this.readExactly(2);
		if (response[0] !== 0x05 || response[1] === 0xff) {
			throw new Error("wireproxy rejected the SOCKS5 authentication method.");
		}

		if (response[1] === 0x02) await this.authenticate();
		else if (response[1] !== 0x00) {
			throw new Error("wireproxy requested an unsupported SOCKS5 authentication method.");
		}

		const hostname = Buffer.from(this.hostname, "utf8");
		if (hostname.length === 0 || hostname.length > 255) {
			throw new Error("The destination hostname is not valid for SOCKS5.");
		}

		const request = Buffer.alloc(7 + hostname.length);
		request.set([0x05, 0x01, 0x00, 0x03, hostname.length], 0);
		hostname.copy(request, 5);
		request.writeUInt16BE(this.port, 5 + hostname.length);
		await this.write(request);

		const reply = await this.readExactly(4);
		if (reply[0] !== 0x05 || reply[1] !== 0x00) {
			throw new Error(`wireproxy could not open ${this.hostname}:${this.port} (SOCKS5 code ${reply[1]}).`);
		}

		const addressLength = reply[3] === 0x01 ? 4 : reply[3] === 0x04 ? 16 : null;
		if (reply[3] === 0x03) {
			const length = await this.readExactly(1);
			await this.readExactly(length[0] + 2);
		} else if (addressLength != null) {
			await this.readExactly(addressLength + 2);
		} else {
			throw new Error("wireproxy returned an invalid SOCKS5 response.");
		}

		this.handshakeComplete = true;
		if (this.handshakeBuffer.length > 0) {
			this.data_queue.put(this.handshakeBuffer);
			this.handshakeBuffer = Buffer.alloc(0);
		}
	}

	async authenticate() {
		const username = Buffer.from(this.proxy.username, "utf8");
		const password = Buffer.from(this.proxy.password, "utf8");
		if (username.length > 255 || password.length > 255) {
			throw new Error("wireproxy SOCKS5 credentials are too long.");
		}

		const request = Buffer.concat([
			Buffer.from([0x01, username.length]),
			username,
			Buffer.from([password.length]),
			password,
		]);
		await this.write(request);
		const response = await this.readExactly(2);
		if (response[0] !== 0x01 || response[1] !== 0x00) {
			throw new Error("wireproxy rejected the SOCKS5 credentials.");
		}
	}

	async readExactly(length) {
		while (this.handshakeBuffer.length < length) {
			await withTimeout(
				new Promise((resolve, reject) => {
					this.handshakeWaiter = (error) => (error ? reject(error) : resolve());
				}),
				10_000,
				"Timed out during the wireproxy SOCKS5 handshake."
			);
		}

		const data = this.handshakeBuffer.subarray(0, length);
		this.handshakeBuffer = this.handshakeBuffer.subarray(length);
		return data;
	}

	async recv() {
		return this.data_queue.get();
	}

	async write(data) {
		if (!this.socket || this.socket.destroyed) throw new Error("The wireproxy socket is closed.");
		await new Promise((resolve, reject) => {
			this.socket.write(data, (error) => (error ? reject(error) : resolve()));
		});
	}

	async send(data) {
		return this.write(data);
	}

	async close() {
		this.data_queue.close();
		if (!this.socket) return;
		const socket = this.socket;
		this.socket = null;
		socket.end();
		socket.destroy();
	}

	pause() {
		if (this.socket && this.data_queue.size >= this.data_queue.max_size) {
			this.socket.pause();
			this.paused = true;
		}
	}

	resume() {
		if (this.socket && this.paused) {
			this.socket.resume();
			this.paused = false;
		}
	}
}

export function createProxySocketFactory(proxyManager, proxy) {
	return class WireproxySocket extends SocksProxySocket {
		constructor(hostname, port) {
			super(hostname, port, proxy, proxyManager);
		}
	};
}

export function getProxyUrl(proxyManager, sessionId) {
	const proxy = proxyManager.getProxyForSession(sessionId);
	if (!proxy) return null;
	return `socks5h://${proxy.host}:${proxy.port}`;
}

export { parseBoolean, parseWireproxyConfig };
