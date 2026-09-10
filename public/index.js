"use strict";

const appConfig = window.SCRAMJET_APP_CONFIG || {
	defaultSettings: { showBlockedImage: false, enableKonamiShortcut: false },
	quickLinks: [],
};
const storageKey = "classroom-browser-settings";
const konamiSequence = [
	"ArrowUp",
	"ArrowUp",
	"ArrowDown",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight",
	"ArrowLeft",
	"ArrowRight",
	"b",
	"a",
];

const form = document.getElementById("sj-form");
const address = document.getElementById("sj-address");
const searchEngine = document.getElementById("sj-search-engine");
const tabList = document.getElementById("tab-list");
const homeView = document.getElementById("home-view");
const browserContent = document.getElementById("browser-content");
const browserStatus = document.getElementById("browser-status");
const backButton = document.getElementById("back-button");
const forwardButton = document.getElementById("forward-button");
const reloadButton = document.getElementById("reload-button");
const newTabButton = document.getElementById("new-tab");
const quickLinksToggle = document.getElementById("quick-links-toggle");
const quickLinksMenu = document.getElementById("quick-links-menu");
const settingsButton = document.getElementById("settings-button");
const settingsDialog = document.getElementById("settings-dialog");
const settingsClose = document.getElementById("settings-close");
const blockedImageSetting = document.getElementById("blocked-image-setting");
const konamiSetting = document.getElementById("konami-setting");
const restrictionOverlay = document.getElementById("restriction-overlay");
const blockedDismiss = document.getElementById("blocked-dismiss");

const { ScramjetController } = $scramjetLoadController();
const scramjet = new ScramjetController({
	files: {
		wasm: "/scram/scramjet.wasm.wasm",
		all: "/scram/scramjet.all.js",
		sync: "/scram/scramjet.sync.js",
	},
});
scramjet.init();

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
const state = {
	tabs: [],
	activeTabId: null,
	transportReady: false,
	settings: loadSettings(),
	konamiIndex: 0,
	konamiTimer: null,
};

function loadSettings() {
	const defaults = { ...appConfig.defaultSettings };
	try {
		return { ...defaults, ...JSON.parse(localStorage.getItem(storageKey) || "{}") };
	} catch {
		return defaults;
	}
}

function saveSettings() {
	localStorage.setItem(storageKey, JSON.stringify(state.settings));
}

function getActiveTab() {
	return state.tabs.find((tab) => tab.id === state.activeTabId) || null;
}

function createId() {
	return globalThis.crypto?.randomUUID?.() || `tab-${Date.now()}-${Math.random()}`;
}

function getTitleForUrl(url) {
	if (!url) return "New tab";
	try {
		return new URL(url).hostname.replace(/^www\./, "") || "New tab";
	} catch {
		return "New tab";
	}
}

function setStatus(message) {
	browserStatus.textContent = message;
}

function createTab() {
	const tab = {
		id: createId(),
		title: "New tab",
		url: "",
		history: [],
		historyIndex: -1,
		frame: null,
	};
	state.tabs.push(tab);
	selectTab(tab.id);
	return tab;
}

function selectTab(tabId) {
	const tab = state.tabs.find((candidate) => candidate.id === tabId);
	if (!tab) return;

	state.activeTabId = tabId;
	for (const candidate of state.tabs) {
		if (candidate.frame) candidate.frame.frame.hidden = candidate.id !== tabId;
	}

	homeView.hidden = Boolean(tab.frame);
	address.value = tab.url;
	document.title = `${tab.title} - Classroom`;
	setStatus(tab.frame ? "" : "Ready");
	renderTabs();
	updateNavigationControls();
}

function closeTab(tabId) {
	const index = state.tabs.findIndex((tab) => tab.id === tabId);
	if (index === -1) return;

	const [tab] = state.tabs.splice(index, 1);
	if (tab.frame) tab.frame.frame.remove();

	if (state.tabs.length === 0) {
		createTab();
		return;
	}

	if (state.activeTabId === tabId) {
		selectTab(state.tabs[Math.max(0, index - 1)].id);
	} else {
		renderTabs();
	}
}

function renderTabs() {
	tabList.replaceChildren();
	for (const tab of state.tabs) {
		const tabButton = document.createElement("button");
		tabButton.className = `tab${tab.id === state.activeTabId ? " active" : ""}`;
		tabButton.type = "button";
		tabButton.role = "tab";
		tabButton.ariaSelected = String(tab.id === state.activeTabId);
		tabButton.dataset.tabId = tab.id;
		tabButton.title = tab.title;

		const title = document.createElement("span");
		title.className = "tab-title";
		title.textContent = tab.title;

		const close = document.createElement("span");
		close.className = "tab-close";
		close.dataset.closeTab = tab.id;
		close.setAttribute("aria-label", `Close ${tab.title}`);
		close.textContent = "x";

		tabButton.append(title, close);
		tabList.append(tabButton);
	}
}

function updateNavigationControls() {
	const tab = getActiveTab();
	backButton.disabled = !tab || tab.historyIndex <= 0;
	forwardButton.disabled = !tab || tab.historyIndex >= tab.history.length - 1;
	reloadButton.disabled = !tab?.url;
}

async function ensureTransport() {
	if (state.transportReady) return;
	await registerSW();

	const wispUrl = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/wisp/`;
	if ((await connection.getTransport()) !== "/libcurl/index.mjs") {
		await connection.setTransport("/libcurl/index.mjs", [{ websocket: wispUrl }]);
	}
	state.transportReady = true;
}

async function navigateTo(url, options = {}) {
	const tab = getActiveTab();
	if (!tab) return;

	try {
		setStatus("Connecting...");
		await ensureTransport();

		if (!tab.frame) {
			tab.frame = scramjet.createFrame();
			tab.frame.frame.className = "browser-frame";
			tab.frame.frame.id = `sj-frame-${tab.id}`;
			browserContent.appendChild(tab.frame.frame);
		}

		if (options.historyIndex == null) {
			tab.history.splice(tab.historyIndex + 1);
			tab.history.push(url);
			tab.historyIndex = tab.history.length - 1;
		} else {
			tab.historyIndex = options.historyIndex;
		}

		tab.url = url;
		tab.title = getTitleForUrl(url);
		tab.frame.frame.hidden = false;
		homeView.hidden = true;
		address.value = url;
		tab.frame.go(url);
		setStatus("");
		document.title = `${tab.title} - Classroom`;
		renderTabs();
		updateNavigationControls();
	} catch (error) {
		setStatus("Could not open that page. Check that the proxy server is available.");
		console.error(error);
	}
}

function goBack() {
	const tab = getActiveTab();
	if (tab && tab.historyIndex > 0) navigateTo(tab.history[tab.historyIndex - 1], { historyIndex: tab.historyIndex - 1 });
}

function goForward() {
	const tab = getActiveTab();
	if (tab && tab.historyIndex < tab.history.length - 1) {
		navigateTo(tab.history[tab.historyIndex + 1], { historyIndex: tab.historyIndex + 1 });
	}
}

function reload() {
	const tab = getActiveTab();
	if (tab?.url) navigateTo(tab.url, { historyIndex: tab.historyIndex });
}

function renderQuickLinks() {
	quickLinksMenu.replaceChildren();
	for (const quickLink of appConfig.quickLinks || []) {
		const link = document.createElement("a");
		link.href = quickLink.url;
		link.textContent = quickLink.label;
		link.addEventListener("click", (event) => {
			event.preventDefault();
			quickLinksMenu.hidden = true;
			quickLinksToggle.setAttribute("aria-expanded", "false");
			navigateTo(quickLink.url);
		});
		quickLinksMenu.append(link);
	}
}

function applySettings() {
	blockedImageSetting.checked = state.settings.showBlockedImage;
	konamiSetting.checked = state.settings.enableKonamiShortcut;
	const showOverlay = state.settings.showBlockedImage;
	restrictionOverlay.hidden = !showOverlay;
	restrictionOverlay.setAttribute("aria-hidden", String(!showOverlay));
}

function dismissBlockedScreen() {
	restrictionOverlay.hidden = true;
	restrictionOverlay.setAttribute("aria-hidden", "true");
}

tabList.addEventListener("click", (event) => {
	const closeTarget = event.target.closest("[data-close-tab]");
	if (closeTarget) {
		closeTab(closeTarget.dataset.closeTab);
		return;
	}

	const tabTarget = event.target.closest("[data-tab-id]");
	if (tabTarget) selectTab(tabTarget.dataset.tabId);
});

form.addEventListener("submit", (event) => {
	event.preventDefault();
	const input = address.value.trim();
	if (!input) return;
	navigateTo(search(input, searchEngine.value));
});

backButton.addEventListener("click", goBack);
forwardButton.addEventListener("click", goForward);
reloadButton.addEventListener("click", reload);
newTabButton.addEventListener("click", createTab);

quickLinksToggle.addEventListener("click", () => {
	const isOpen = !quickLinksMenu.hidden;
	quickLinksMenu.hidden = isOpen;
	quickLinksToggle.setAttribute("aria-expanded", String(!isOpen));
});

document.addEventListener("click", (event) => {
	if (!event.target.closest(".quick-links-control")) {
		quickLinksMenu.hidden = true;
		quickLinksToggle.setAttribute("aria-expanded", "false");
	}
});

settingsButton.addEventListener("click", () => settingsDialog.showModal());
settingsClose.addEventListener("click", () => settingsDialog.close());
settingsDialog.addEventListener("click", (event) => {
	if (event.target === settingsDialog) settingsDialog.close();
});

blockedImageSetting.addEventListener("change", () => {
	state.settings.showBlockedImage = blockedImageSetting.checked;
	saveSettings();
	applySettings();
});

konamiSetting.addEventListener("change", () => {
	state.settings.enableKonamiShortcut = konamiSetting.checked;
	saveSettings();
	applySettings();
});

blockedDismiss.addEventListener("click", dismissBlockedScreen);

document.addEventListener("keydown", (event) => {
	if (event.ctrlKey && event.key.toLowerCase() === "l") {
		event.preventDefault();
		address.focus();
		address.select();
		return;
	}

	if (!state.settings.enableKonamiShortcut || restrictionOverlay.hidden) return;
	clearTimeout(state.konamiTimer);
	const expectedKey = konamiSequence[state.konamiIndex];
	if (event.key.toLowerCase() === expectedKey.toLowerCase()) {
		state.konamiIndex += 1;
		if (state.konamiIndex === konamiSequence.length) {
			dismissBlockedScreen();
			state.konamiIndex = 0;
		}
	} else {
		state.konamiIndex = 0;
	}

	state.konamiTimer = setTimeout(() => {
		state.konamiIndex = 0;
	}, 2500);
});

renderQuickLinks();
applySettings();
createTab();
