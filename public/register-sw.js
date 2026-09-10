"use strict";
const stockSW = "./sw.js";

/**
 * List of hostnames that are allowed to run serviceworkers on http://
 */
const swAllowedHostnames = ["localhost", "127.0.0.1"];

/**
 * Global util
 * Used in 404.html and index.html
 */
async function registerSW() {
	if (!navigator.serviceWorker) {
		if (
			location.protocol !== "https:" &&
			!swAllowedHostnames.includes(location.hostname)
		)
			throw new Error("Service workers cannot be registered without https.");

		throw new Error("Your browser doesn't support service workers.");
	}

	const controllerReady = new Promise((resolve) => {
		if (navigator.serviceWorker.controller) {
			resolve();
			return;
		}

		navigator.serviceWorker.addEventListener("controllerchange", resolve, {
			once: true,
		});
	});

	const registration = await navigator.serviceWorker.register(stockSW, {
		updateViaCache: "none",
	});
	await navigator.serviceWorker.ready;
	if (!navigator.serviceWorker.controller) {
		// Force an update check when an older service worker is already active.
		// This also lets the new activate handler claim the current page.
		await registration.update();
		await Promise.race([
			controllerReady,
			new Promise((resolve) => setTimeout(resolve, 5000)),
		]);
	}
	if (!navigator.serviceWorker.controller) {
		throw new Error("The browser service worker could not take control.");
	}
	return registration;
}
