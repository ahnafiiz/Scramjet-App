import { createServer } from "node:http";
import { fileURLToPath } from "url";
import { hostname } from "node:os";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { ProxyRotationManager, getProxyUrl } from "./proxyRotation.js";
import { setupScraperAPI } from "./scraperApi.js";

// Check if running on Vercel (serverless)
const isVercel = process.env.VERCEL === '1';

const publicPath = fileURLToPath(new URL("../public/", import.meta.url));

// ============================================
// PROXY ROTATION SETUP
// ============================================
const proxyManager = new ProxyRotationManager({
	enabled: process.env.PROXY_ROTATION_ENABLED !== "false" && process.env.VERCEL !== '1',
	configPath: process.env.PROXY_CONFIG_PATH || "./config/wireproxy",
	rotationStrategy: process.env.PROXY_ROTATION_STRATEGY || "round-robin", // round-robin, random, least-used
	sessionTimeout: parseInt(process.env.PROXY_SESSION_TIMEOUT || "3600000"), // 1 hour default
});

// Initialize proxy rotation if enabled
if (proxyManager.enabled) {
	try {
		await proxyManager.init();
		console.log("[Proxy Rotation] Initialized successfully");
	} catch (error) {
		console.warn("[Proxy Rotation] Failed to initialize, running without rotation:", error.message);
		proxyManager.enabled = false;
	}
}

// ============================================
// WISP CONFIGURATION
// ============================================

// ============================================
// WISP CONFIGURATION
// ============================================
// Refer to the documentation at https://www.npmjs.com/package/@mercuryworkshop/wisp-js

logging.set_level(logging.NONE);
Object.assign(wisp.options, {
	allow_udp_streams: false,
	hostname_blacklist: [/example\.com/],
	dns_servers: ["1.1.1.3", "1.0.0.3"],
	// Optional: Apply proxy settings for reCaptcha-prone domains
	// This will rotate IPs for ChatGPT, Claude, TikTok, etc.
});

// ============================================
// SESSION TRACKING FOR PROXY ROTATION
// ============================================
// Track sessions to maintain IP stickiness within a session

const sessionProxyMap = new Map();

// Record the sticky proxy selected for a Wisp connection without mutating the
// imported Wisp module (ES module namespace exports are read-only).
function applyProxySession(req) {
	if (proxyManager.enabled) {
		// Extract or create session ID from request
		const sessionId = req.headers["x-session-id"] || 
						  req.headers["cookie"]?.match(/sessionId=([^;]+)/)?.[1] ||
						  `session-${Date.now()}-${Math.random()}`;
		
		// Get proxy for this session
		const proxyUrl = getProxyUrl(proxyManager, sessionId);
		
		if (proxyUrl) {
			// Store for later reference
			if (!sessionProxyMap.has(sessionId)) {
				sessionProxyMap.set(sessionId, proxyUrl);
			}
			
			// Add proxy info to request headers for logging
			req.headers["x-proxy-url"] = proxyUrl;
			req.headers["x-session-id"] = sessionId;
		}
	}
}

const fastify = Fastify({
	serverFactory: (handler) => {
		return createServer()
			.on("request", (req, res) => {
				res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
				res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
				handler(req, res);
			})
			.on("upgrade", (req, socket, head) => {
				if (req.url.endsWith("/wisp/")) {
					applyProxySession(req);
					wisp.routeRequest(req, socket, head);
				}
				else socket.end();
			});
	},
});

fastify.register(fastifyStatic, {
	root: publicPath,
	decorateReply: true,
});

try {
	fastify.register(fastifyStatic, {
		root: scramjetPath,
		prefix: "/scram/",
		decorateReply: false,
	});

	fastify.register(fastifyStatic, {
		root: libcurlPath,
		prefix: "/libcurl/",
		decorateReply: false,
	});

	fastify.register(fastifyStatic, {
		root: baremuxPath,
		prefix: "/baremux/",
		decorateReply: false,
	});
} catch (error) {
	console.warn("[Static Files] Some optional static routes failed to register:", error.message);
}

fastify.setNotFoundHandler((request, reply) => {
	return reply.code(404).type("text/html").sendFile("404.html");
});

// ============================================
// SIMPLE HEALTH CHECK
// ============================================
fastify.get("/", async (request, reply) => {
	return reply.type("application/json").send({
		status: "ok",
		message: "Scramjet app is running",
		environment: process.env.VERCEL ? "vercel" : "local",
	});
});

// ============================================
// PROXY ROTATION STATUS ENDPOINT
// ============================================
// Expose proxy rotation statistics for monitoring

fastify.get("/api/proxy-status", async (request, reply) => {
	if (!proxyManager.enabled) {
		return reply.send({
			enabled: false,
			message: "Proxy rotation is disabled",
		});
	}

	const stats = proxyManager.getStats();
	const activeSessions = sessionProxyMap.size;

	return reply.send({
		enabled: true,
		activeProxies: proxyManager.proxies.length,
		activeSessions,
		rotationStrategy: proxyManager.rotationStrategy,
		statistics: stats,
	});
});

// ============================================
// SCRAPER API SETUP (For Vercel Deployment)
// ============================================
try {
	setupScraperAPI(fastify);
	console.log("[ScraperAPI] Endpoints available at /api/scraper-health and /api/scrape");
} catch (error) {
	console.error("[ScraperAPI] Setup failed:", error.message);
}

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================
fastify.get("/api/health", async (request, reply) => {
	return reply.send({
		status: "ok",
		timestamp: new Date().toISOString(),
		proxyRotation: proxyManager.enabled ? "enabled" : "disabled",
		scraperApi: process.env.SCRAPER_API_KEY ? "configured" : "not configured",
	});
});

fastify.server.on("listening", () => {
	const address = fastify.server.address();

	// by default we are listening on 0.0.0.0 (every interface)
	// we just need to list a few
	console.log("Listening on:");
	console.log(`\thttp://localhost:${address.port}`);
	console.log(`\thttp://${hostname()}:${address.port}`);
	console.log(
		`\thttp://${
			address.family === "IPv6" ? `[${address.address}]` : address.address
		}:${address.port}`
	);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
	console.log("SIGTERM signal received: closing HTTP server");
	
	// Cleanup proxy rotation
	if (proxyManager.enabled) {
		proxyManager.cleanup().catch(console.error);
	}
	
	fastify.close();
	process.exit(0);
}

let port = parseInt(process.env.PORT || "");

if (isNaN(port)) port = 8080;

fastify.listen({
	port: port,
	host: "0.0.0.0",
});

// Export for Vercel serverless
export default fastify;
