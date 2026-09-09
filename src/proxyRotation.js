/**
 * Proxy Rotation Manager for Wireproxy
 * Manages rotating IPs through multiple WireGuard peers
 * Implements session-sticky rotation (same IP per session)
 */

import { EventEmitter } from "events";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ProxyRotationManager extends EventEmitter {
	constructor(options = {}) {
		super();
		this.proxies = [];
		this.currentIndex = 0;
		this.processes = new Map();
		this.sessionProxyMap = new Map();
		this.proxyConfigPath = options.configPath || path.join(__dirname, "../config/wireproxy");
		this.wireproxyBinary = options.wireproxyBinary || "wireproxy";
		this.enabled = options.enabled !== false;
		this.rotationStrategy = options.rotationStrategy || "round-robin"; // round-robin, random, least-used
		this.sessionTimeout = options.sessionTimeout || 3600000; // 1 hour default
		this.healthCheckInterval = options.healthCheckInterval || 30000; // 30 seconds
		
		// Track usage stats
		this.stats = new Map();
	}

	/**
	 * Initialize proxy rotation with list of proxy configs
	 * @param {Array} proxies - Array of proxy config paths or objects
	 */
	async init(proxies) {
		if (!this.enabled) {
			console.log("[ProxyRotation] Proxy rotation disabled");
			return;
		}

		try {
			this.proxies = proxies || await this.discoverProxyConfigs();
			
			if (this.proxies.length === 0) {
				console.warn("[ProxyRotation] No proxy configurations found");
				this.enabled = false;
				return;
			}

			console.log(`[ProxyRotation] Initialized with ${this.proxies.length} proxies`);

			// Initialize stats for each proxy
			this.proxies.forEach((proxy) => {
				this.stats.set(proxy.name || proxy.id, {
					usageCount: 0,
					lastUsed: null,
					healthy: true,
					successCount: 0,
					errorCount: 0,
				});
			});

			// Start health checks
			this.startHealthChecks();

			this.emit("initialized");
		} catch (error) {
			console.error("[ProxyRotation] Initialization failed:", error);
			this.enabled = false;
		}
	}

	/**
	 * Discover wireproxy configurations in config directory
	 */
	async discoverProxyConfigs() {
		try {
			const configPath = this.proxyConfigPath;
			await fs.mkdir(configPath, { recursive: true });

			const files = await fs.readdir(configPath);
			const configs = files
				.filter((f) => f.endsWith(".conf"))
				.map((f) => ({
					name: f.replace(".conf", ""),
					id: f.replace(".conf", ""),
					configPath: path.join(configPath, f),
					port: 9000 + files.indexOf(f), // Assign ports sequentially
				}));

			return configs;
		} catch (error) {
			console.error("[ProxyRotation] Failed to discover configs:", error);
			return [];
		}
	}

	/**
	 * Get proxy for a session (sticky within session duration)
	 * @param {string} sessionId - Unique session identifier
	 * @returns {Object} Proxy configuration with address and port
	 */
	getProxyForSession(sessionId) {
		if (!this.enabled || this.proxies.length === 0) {
			return null;
		}

		// Check if session already has an assigned proxy
		if (this.sessionProxyMap.has(sessionId)) {
			const assignment = this.sessionProxyMap.get(sessionId);
			if (Date.now() - assignment.assignedAt < this.sessionTimeout) {
				return assignment.proxy;
			}
			// Session timeout - clear and reassign
			this.sessionProxyMap.delete(sessionId);
		}

		// Assign new proxy based on rotation strategy
		const proxy = this.selectProxy();

		// Store assignment with timestamp
		this.sessionProxyMap.set(sessionId, {
			proxy,
			assignedAt: Date.now(),
		});

		// Update stats
		const stats = this.stats.get(proxy.name);
		if (stats) {
			stats.usageCount++;
			stats.lastUsed = new Date();
		}

		return proxy;
	}

	/**
	 * Select proxy based on rotation strategy
	 */
	selectProxy() {
		if (this.proxies.length === 0) return null;

		// Filter healthy proxies
		const healthyProxies = this.proxies.filter((p) => {
			const stats = this.stats.get(p.name);
			return !stats || stats.healthy;
		});

		const availableProxies = healthyProxies.length > 0 ? healthyProxies : this.proxies;

		let selected;

		switch (this.rotationStrategy) {
			case "random":
				selected = availableProxies[Math.floor(Math.random() * availableProxies.length)];
				break;

			case "least-used":
				selected = availableProxies.reduce((min, proxy) => {
					const minStats = this.stats.get(min.name);
					const proxyStats = this.stats.get(proxy.name);
					return (proxyStats?.usageCount || 0) < (minStats?.usageCount || 0)
						? proxy
						: min;
				});
				break;

			case "round-robin":
			default:
				const healthyIndex = availableProxies.findIndex(
					(p) => p.name === this.proxies[this.currentIndex]?.name
				);
				if (healthyIndex !== -1) {
					this.currentIndex = (healthyIndex + 1) % availableProxies.length;
				} else {
					this.currentIndex = 0;
				}
				selected = availableProxies[this.currentIndex];
				break;
		}

		return selected;
	}

	/**
	 * Mark successful request through proxy
	 */
	recordSuccess(proxyId) {
		const stats = this.stats.get(proxyId);
		if (stats) {
			stats.successCount++;
		}
	}

	/**
	 * Mark failed request through proxy
	 */
	recordError(proxyId) {
		const stats = this.stats.get(proxyId);
		if (stats) {
			stats.errorCount++;
			// Mark unhealthy if too many errors
			if (stats.errorCount > 5) {
				stats.healthy = false;
				this.emit("proxy-unhealthy", proxyId);
			}
		}
	}

	/**
	 * Perform health checks on all proxies
	 */
	async startHealthChecks() {
		setInterval(async () => {
			for (const proxy of this.proxies) {
				try {
					await this.checkProxyHealth(proxy);
				} catch (error) {
					console.error(`[ProxyRotation] Health check failed for ${proxy.name}:`, error);
				}
			}
		}, this.healthCheckInterval);
	}

	/**
	 * Check if a proxy is healthy
	 */
	async checkProxyHealth(proxy) {
		try {
			// Try to connect through proxy using a test request
			// This is a placeholder - actual implementation depends on proxy type
			const stats = this.stats.get(proxy.name);
			if (stats) {
				// Mark healthy if recent success rate is good
				const totalRequests = stats.successCount + stats.errorCount;
				const successRate = totalRequests > 0 ? stats.successCount / totalRequests : 1;
				stats.healthy = successRate > 0.7;
			}
		} catch (error) {
			const stats = this.stats.get(proxy.name);
			if (stats) {
				stats.healthy = false;
			}
		}
	}

	/**
	 * Get proxy statistics
	 */
	getStats() {
		const stats = {};
		this.stats.forEach((value, key) => {
			stats[key] = value;
		});
		return stats;
	}

	/**
	 * Cleanup and stop all proxy processes
	 */
	async cleanup() {
		this.sessionProxyMap.clear();

		for (const [proxyId, process] of this.processes) {
			try {
				process.kill();
			} catch (error) {
				console.error(`[ProxyRotation] Error stopping proxy ${proxyId}:`, error);
			}
		}

		this.processes.clear();
		console.log("[ProxyRotation] Cleanup complete");
	}
}

/**
 * Get SOCKS5 proxy URL for session
 */
export function getProxyUrl(proxyManager, sessionId) {
	if (!proxyManager.enabled) return null;

	const proxy = proxyManager.getProxyForSession(sessionId);
	if (!proxy) return null;

	// Format: socks5://username:password@host:port
	// Adjust based on your wireproxy configuration
	return `socks5://127.0.0.1:${proxy.port}`;
}

/**
 * Create proxy agent for HTTP requests through rotating proxy
 */
export function createProxyAgent(proxyManager, sessionId) {
	const proxyUrl = getProxyUrl(proxyManager, sessionId);
	if (!proxyUrl) return null;

	// This requires an HTTP/SOCKS proxy agent library
	// Example: HttpProxyAgent or SocksProxyAgent
	// You'll need to install: npm install proxy-from-env socks-proxy-agent
	
	return {
		proxyUrl,
		sessionId,
		recordSuccess: () => {
			const proxy = proxyManager.getProxyForSession(sessionId);
			if (proxy) proxyManager.recordSuccess(proxy.name);
		},
		recordError: () => {
			const proxy = proxyManager.getProxyForSession(sessionId);
			if (proxy) proxyManager.recordError(proxy.name);
		},
	};
}

// Export default instance
export default ProxyRotationManager;
