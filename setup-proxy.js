#!/usr/bin/env node

/**
 * Wireproxy Setup Helper Script
 * Helps you create and test wireproxy configurations
 * 
 * Usage: node setup-proxy.js
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

async function main() {
	console.log("\n🔐 Wireproxy Configuration Setup Helper\n");
	console.log("This tool helps you set up rotating IP proxies using wireproxy.\n");

	const choice = await question(
		"What would you like to do?\n" +
		"1. Create new proxy configuration\n" +
		"2. List existing proxies\n" +
		"3. Test a proxy\n" +
		"4. Start all proxies\n" +
		"5. Exit\n\n" +
		"Enter choice (1-5): "
	);

	switch (choice.trim()) {
		case "1":
			await createProxyConfig();
			break;
		case "2":
			await listProxies();
			break;
		case "3":
			await testProxy();
			break;
		case "4":
			await startAllProxies();
			break;
		case "5":
			console.log("Goodbye!");
			rl.close();
			process.exit(0);
			break;
		default:
			console.log("Invalid choice");
			rl.close();
			process.exit(1);
	}
}

async function createProxyConfig() {
	console.log("\n📝 Creating new proxy configuration\n");

	const configDir = path.join(__dirname, "config/wireproxy");
	await fs.mkdir(configDir, { recursive: true });

	// Get existing configs to assign next number
	const existing = await fs.readdir(configDir);
	const configs = existing.filter((f) => f.match(/^proxy\d+\.conf$/));
	const nextNum = (configs.length || 0) + 1;
	const configName = `proxy${nextNum}.conf`;
	const configPath = path.join(configDir, configName);

	console.log("Enter your WireGuard credentials:");
	const privateKey = await question("Private Key: ");
	const publicKey = await question("Peer Public Key: ");
	const address = await question("Address (e.g., 10.64.1.1/32): ");
	const endpoint = await question("Endpoint (e.g., 193.67.79.5:51820): ");
	const port = await question(`SOCKS5 Port (default: ${9000 + nextNum}): `) || `${9000 + nextNum}`;

	const config = `[Interface]
Address = ${address}
PrivateKey = ${privateKey}
DNS = 1.1.1.1

[Peer]
PublicKey = ${publicKey}
Endpoint = ${endpoint}
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25

[Socks5]
BindAddress = 127.0.0.1:${port}
`;

	await fs.writeFile(configPath, config);
	console.log(`\n✅ Config created: ${configName}`);
	console.log(`📍 Location: ${configPath}`);
	console.log(`🔌 Port: ${port}\n`);

	const again = await question("Create another? (y/n): ");
	if (again.toLowerCase() === "y") {
		await createProxyConfig();
	} else {
		const test = await question("Test this proxy now? (y/n): ");
		if (test.toLowerCase() === "y") {
			console.log(`\nRun this in a terminal:\n`);
			console.log(`wireproxy -c ${configName}\n`);
			console.log(`Then in another terminal:\n`);
			console.log(`curl -x socks5://127.0.0.1:${port} https://ipinfo.io/json\n`);
		}
		rl.close();
	}
}

async function listProxies() {
	console.log("\n📋 Existing Proxy Configurations\n");

	const configDir = path.join(__dirname, "config/wireproxy");
	
	try {
		const files = await fs.readdir(configDir);
		const configs = files.filter((f) => f.endsWith(".conf"));

		if (configs.length === 0) {
			console.log("No proxy configurations found.");
			console.log("Create one with option 1.\n");
			rl.close();
			return;
		}

		for (let i = 0; i < configs.length; i++) {
			const configName = configs[i];
			const configPath = path.join(configDir, configName);
			const content = await fs.readFile(configPath, "utf-8");
			const portMatch = content.match(/BindAddress = 127\.0\.0\.1:(\d+)/);
			const port = portMatch ? portMatch[1] : "unknown";

			console.log(`${i + 1}. ${configName}`);
			console.log(`   Port: ${port}`);
			console.log();
		}
	} catch (error) {
		if (error.code === "ENOENT") {
			console.log("Config directory not found.\n");
		} else {
			console.error("Error:", error.message);
		}
	}

	const again = await question("Continue to main menu? (y/n): ");
	if (again.toLowerCase() === "y") {
		await main();
	} else {
		rl.close();
	}
}

async function testProxy() {
	console.log("\n🧪 Test Proxy Configuration\n");

	const configDir = path.join(__dirname, "config/wireproxy");
	
	try {
		const files = await fs.readdir(configDir);
		const configs = files.filter((f) => f.endsWith(".conf"));

		if (configs.length === 0) {
			console.log("No proxies to test.\n");
			rl.close();
			return;
		}

		console.log("Select a proxy to test:");
		configs.forEach((config, i) => {
			console.log(`${i + 1}. ${config}`);
		});

		const choice = await question("\nEnter number: ");
		const selectedConfig = configs[parseInt(choice) - 1];

		if (!selectedConfig) {
			console.log("Invalid choice.\n");
			rl.close();
			return;
		}

		const configPath = path.join(configDir, selectedConfig);
		const content = await fs.readFile(configPath, "utf-8");
		const portMatch = content.match(/BindAddress = 127\.0\.0\.1:(\d+)/);
		const port = portMatch ? portMatch[1] : "9001";

		console.log(`\n✅ Test instructions for ${selectedConfig}:\n`);
		console.log("1. Open a terminal and run:");
		console.log(`   wireproxy -c config/wireproxy/${selectedConfig}\n`);
		console.log("2. In another terminal, run:");
		console.log(`   curl -x socks5://127.0.0.1:${port} https://ipinfo.io/json\n`);
		console.log("3. You should see your VPN's IP address in the response.\n");
		console.log("4. Run the curl command again to verify it works consistently.\n");
	} catch (error) {
		console.error("Error:", error.message);
	}

	rl.close();
}

async function startAllProxies() {
	console.log("\n🚀 Start All Proxies\n");

	const configDir = path.join(__dirname, "config/wireproxy");
	
	try {
		const files = await fs.readdir(configDir);
		const configs = files.filter((f) => f.endsWith(".conf"));

		if (configs.length === 0) {
			console.log("No proxy configurations found.\n");
			rl.close();
			return;
		}

		console.log(`Found ${configs.length} proxy configuration(s):\n`);
		
		configs.forEach((config) => {
			console.log(`Start this in a terminal:`);
			console.log(`  wireproxy -c config/wireproxy/${config}\n`);
		});

		console.log(`Or start all at once:\n`);
		console.log("Windows (PowerShell):");
		console.log("  Get-ChildItem config/wireproxy/*.conf | ForEach-Object {");
		console.log("    Start-Process wireproxy -ArgumentList '-c', $_.FullName, '-d'");
		console.log("  }\n");

		console.log("Linux/macOS:");
		console.log("  for config in config/wireproxy/*.conf; do");
		console.log("    wireproxy -c \"$config\" -d &");
		console.log("  done\n");
	} catch (error) {
		console.error("Error:", error.message);
	}

	rl.close();
}

main().catch(console.error);
