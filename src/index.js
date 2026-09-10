import { createServer } from "node:http";
import { hostname } from "node:os";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { scramjetPath } from "@mercuryworkshop/scramjet/path";

import {
	createProxySocketFactory,
	parseBoolean,
	ProxyRotationManager,
} from "./proxyRotation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const publicPath = path.join(projectRoot, "public");

function loadEnvironmentFile(file) {
	if (!existsSync(file)) return;
	for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
		const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
		if (!match || process.env[match[1]] != null) continue;
		process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
	}
}

loadEnvironmentFile(path.join(projectRoot, ".env"));
loadEnvironmentFile(path.join(projectRoot, ".env.local"));

const isVercel = process.env.VERCEL === "1";
const port = Number.parseInt(process.env.PORT || "8080", 10);

const proxyManager = new ProxyRotationManager({
	enabled: !isVercel && parseBoolean(process.env.PROXY_ROTATION_ENABLED, true),
	autostart: parseBoolean(process.env.WIREPROXY_AUTOSTART, false),
	required: parseBoolean(process.env.WIREPROXY_REQUIRED, false),
	configPath: process.env.PROXY_CONFIG_PATH || path.join(projectRoot, "config/wireproxy"),
	wireproxyBinary: process.env.WIREPROXY_BINARY || "wireproxy",
	rotationStrategy: process.env.PROXY_ROTATION_STRATEGY || "round-robin",
	sessionTimeout: Number.parseInt(process.env.PROXY_SESSION_TIMEOUT || "3600000", 10),
	healthCheckInterval: Number.parseInt(process.env.PROXY_HEALTH_CHECK_INTERVAL || "30000", 10),
});

await proxyManager.init();

logging.set_level(logging.WARN);
Object.assign(wisp.options, {
	allow_udp_streams: false,
	allow_direct_ip: false,
	allow_private_ips: false,
	allow_loopback_ips: false,
	dns_method: "resolve",
	dns_servers: ["1.1.1.1", "1.0.0.1"],
	dns_result_order: "ipv4first",
});

function isWispRequest(request) {
	try {
		return new URL(request.url, "http://localhost").pathname === "/wisp/";
	} catch {
		return false;
	}
}

function getSessionId(request) {
	return (
		request.headers["sec-websocket-key"] ||
		`${request.socket.remoteAddress || "unknown"}:${request.socket.remotePort || "0"}`
	);
}

const fastify = Fastify({
	logger: true,
	serverFactory: (handler) =>
		createServer()
			.on("request", (request, reply) => {
				reply.setHeader("Cross-Origin-Opener-Policy", "same-origin");
				reply.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
				handler(request, reply);
			})
			.on("upgrade", (request, socket, head) => {
				if (!isWispRequest(request)) {
					socket.destroy();
					return;
				}

				const proxy = proxyManager.getProxyForSession(getSessionId(request));
				if (!proxy && proxyManager.required) {
					socket.destroy();
					return;
				}

				const connectionOptions = proxy
					? { TCPSocket: createProxySocketFactory(proxyManager, proxy) }
					: undefined;
				wisp.routeRequest(request, socket, head, connectionOptions);
			}),
});

await fastify.register(fastifyStatic, {
	root: publicPath,
	decorateReply: true,
});

await fastify.register(fastifyStatic, {
	root: scramjetPath,
	prefix: "/scram/",
	decorateReply: false,
});

await fastify.register(fastifyStatic, {
	root: libcurlPath,
	prefix: "/libcurl/",
	decorateReply: false,
});

await fastify.register(fastifyStatic, {
	root: baremuxPath,
	prefix: "/baremux/",
	decorateReply: false,
});

fastify.get("/api/health", async () => ({
	status: "ok",
	timestamp: new Date().toISOString(),
	environment: isVercel ? "vercel" : "local",
	proxyRotation: proxyManager.getStatus(),
}));

fastify.get("/api/proxy-status", async () => proxyManager.getStatus());

fastify.setNotFoundHandler((request, reply) =>
	reply.code(404).type("text/html").sendFile("404.html")
);

async function shutdown(signal) {
	fastify.log.info(`${signal} received. Closing server.`);
	await proxyManager.cleanup();
	await fastify.close();
}

process.once("SIGINT", () => shutdown("SIGINT").finally(() => process.exit(0)));
process.once("SIGTERM", () => shutdown("SIGTERM").finally(() => process.exit(0)));

if (!isVercel) {
	try {
		await fastify.listen({
			port: Number.isFinite(port) ? port : 8080,
			host: "0.0.0.0",
		});
		const address = fastify.server.address();
		console.log("Listening on:");
		console.log(`\thttp://localhost:${address.port}`);
		console.log(`\thttp://${hostname()}:${address.port}`);
	} catch (error) {
		fastify.log.error(error, "Unable to start server");
		process.exit(1);
	}
}

export default fastify;
