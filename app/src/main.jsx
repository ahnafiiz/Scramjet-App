import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { adminRequest, checkAccess, supabase } from "./api";
import { appConfig } from "./config";
import {
	getConsent,
	getDeviceFingerprint,
	getSessionIdentity,
	setConsent,
} from "./lib/deviceFingerprint";
import { chooseBlockedAsset } from "./lib/weightedRandom";
import { createScramjetRuntime } from "./runtime/scramjet";
import "./styles.css";

const APP_TITLE = "Home - Classroom";

function useRoute() {
	const [route, setRoute] = useState(window.location.pathname);

	useEffect(() => {
		const onPopState = () => setRoute(window.location.pathname);
		window.addEventListener("popstate", onPopState);
		return () => window.removeEventListener("popstate", onPopState);
	}, []);

	return [route, (nextRoute) => {
		window.history.pushState({}, "", nextRoute);
		setRoute(nextRoute);
	}];
}

function App() {
	const [route, navigate] = useRoute();
	useEffect(() => {
		document.title = APP_TITLE;
	}, []);

	if (route === "/admin" || route.startsWith("/admin/")) {
		return <AdminApp />;
	}
	if (route === "/blocked") return <BlockedPage onHome={() => navigate("/")} />;
	return <BrowserApp onRoute={navigate} />;
}

function BrowserApp({ onRoute }) {
	const runtime = useMemo(() => createScramjetRuntime(), []);
	const contentRef = useRef(null);
	const [browserState, setBrowserState] = useState(() => {
		const tab = makeTab();
		return { tabs: [tab], activeTabId: tab.id };
	});
	const { tabs, activeTabId } = browserState;
	const setTabs = (nextTabs) =>
		setBrowserState((current) => ({ ...current, tabs: typeof nextTabs === "function" ? nextTabs(current.tabs) : nextTabs }));
	const setActiveTabId = (nextId) =>
		setBrowserState((current) => ({ ...current, activeTabId: typeof nextId === "function" ? nextId(current.activeTabId) : nextId }));
	const [address, setAddress] = useState("");
	const [quickLinksOpen, setQuickLinksOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [isReloading, setIsReloading] = useState(false);
	const [status, setStatus] = useState("Ready when you are");
	const [theme, setTheme] = useState(readTheme);
	const [access, setAccess] = useState({ state: "checking" });
	const [consent, setConsentState] = useState(() =>
		getConsent(appConfig.fingerprint.consentKey)
	);
	const identity = useMemo(
		() => getSessionIdentity(appConfig.fingerprint.identityKey),
		[]
	);
	const routeRef = useRef(onRoute);
	routeRef.current = onRoute;

	const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];

	useEffect(() => {
		document.documentElement.dataset.theme = theme;
		try {
			localStorage.setItem("classroom-theme", theme);
		} catch {
			// Storage can be disabled in private browsing; the visual preference still applies.
		}
	}, [theme]);

	useEffect(() => {
		if (activeTab) setAddress(activeTab.url || "");
	}, [activeTabId, activeTab?.url]);

	useEffect(() => {
		if (consent !== "accepted") {
			setAccess({ state: "ready" });
			return;
		}

		let cancelled = false;
		(async () => {
			try {
				const deviceHash = await getDeviceFingerprint(
					appConfig.fingerprint.identityKey
				);
				const result = await checkAccess({
					deviceHash,
					sessionId: identity.sessionId,
					fakeName: identity.fakeName,
				});
				if (cancelled) return;
				if (result.banned) {
					setAccess({ state: "blocked", reason: result.reason });
					routeRef.current("/blocked");
				} else {
					setAccess({ state: "ready" });
				}
			} catch (error) {
				console.warn("Privacy access check unavailable; continuing locally.", error);
				if (!cancelled) setAccess({ state: "ready", offline: true });
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [consent, identity]);

	useEffect(() => {
		if (!contentRef.current) return;
		for (const tab of tabs) {
			const frame = contentRef.current.querySelector(
				`iframe[data-tab-id="${tab.id}"]`
			);
			if (frame) frame.hidden = tab.id !== activeTabId;
		}
	}, [tabs, activeTabId]);

	function updateTab(tabId, updater) {
		setTabs((current) =>
			current.map((tab) => (tab.id === tabId ? updater(tab) : tab))
		);
	}

	async function openUrl(rawValue, options = {}) {
		const url = resolveAddress(rawValue);
		if (!url || !activeTab) return;
		const tabId = options.tabId || activeTab.id;
		const targetTab = tabs.find((tab) => tab.id === tabId);
		if (!targetTab) return;

		const nextHistory = options.historyIndex == null
			? [...targetTab.history.slice(0, targetTab.historyIndex + 1), url]
			: targetTab.history;
		const nextIndex = options.historyIndex ?? nextHistory.length - 1;
		updateTab(tabId, (tab) => ({
			...tab,
			url,
			title: titleFor(url),
			history: nextHistory,
			historyIndex: nextIndex,
		}));
		setStatus("Opening");
		try {
			await runtime.navigate(tabId, contentRef.current, url);
			setStatus("");
		} catch (error) {
			setStatus("The browser transport is unavailable right now.");
			console.error(error);
		}
	}

	function newTab() {
		const tab = makeTab();
		setTabs((current) => [...current, tab]);
		setActiveTabId(tab.id);
		setAddress("");
	}

	function closeTab(tabId) {
		const index = tabs.findIndex((tab) => tab.id === tabId);
		if (index < 0) return;
		runtime.remove(tabId);
		const remaining = tabs.filter((tab) => tab.id !== tabId);
		if (!remaining.length) {
			const tab = makeTab();
			setTabs([tab]);
			setActiveTabId(tab.id);
			return;
		}
		setTabs(remaining);
		if (tabId === activeTabId) {
			setActiveTabId(remaining[Math.min(index, remaining.length - 1)].id);
		}
	}

	function selectTab(tabId) {
		setActiveTabId(tabId);
		const selected = tabs.find((tab) => tab.id === tabId);
		setAddress(selected?.url || "");
	}

	async function reload() {
		if (!activeTab?.url) return;
		setIsReloading(true);
		setStatus("Refreshing");
		try {
			await runtime.reload(activeTab.id);
		} finally {
			window.setTimeout(() => {
				setIsReloading(false);
				setStatus("");
			}, 650);
		}
	}

	function moveHistory(direction) {
		if (!activeTab) return;
		const nextIndex = activeTab.historyIndex + direction;
		if (nextIndex < 0 || nextIndex >= activeTab.history.length) return;
		openUrl(activeTab.history[nextIndex], {
			tabId: activeTab.id,
			historyIndex: nextIndex,
		});
	}

	function acceptConsent() {
		setConsent(appConfig.fingerprint.consentKey, "accepted");
		setConsentState("accepted");
	}

	function declineConsent() {
		setConsent(appConfig.fingerprint.consentKey, "declined");
		setConsentState("declined");
	}

	if (access.state === "checking") return <LoadingScreen />;
	if (access.state === "blocked") return null;

	return (
		<div className="app-frame">
			<header className="browser-header">
				<div className="brand-lockup" aria-label="Classroom home">
					<span className="brand-mark"><span /></span>
					<span className="brand-name">classroom</span>
					<span className="brand-version">beta</span>
				</div>
				<div className="window-title">Home - Classroom</div>
				<div className="header-actions">
					<span className="origin-status">Stable workspace</span>
					<button className="round-button" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
						{theme === "dark" ? "☼" : "☾"}
					</button>
					<button
						className="round-button"
						aria-label="Open settings"
						title="Settings"
						onClick={() => setSettingsOpen(true)}
					>
						⚙
					</button>
				</div>
			</header>

			<section className="tab-bar" aria-label="Open tabs">
				<div className="tabs-scroll" role="tablist">
					{tabs.map((tab) => (
						<div className={`tab ${tab.id === activeTabId ? "tab-active" : ""}`} key={tab.id}>
							<button role="tab" aria-selected={tab.id === activeTabId} onClick={() => selectTab(tab.id)}>
								<span className="tab-dot" />
								<span>{tab.title}</span>
							</button>
							<button className="tab-close" aria-label={`Close ${tab.title}`} onClick={() => closeTab(tab.id)}>×</button>
						</div>
					))}
				</div>
				<button className="new-tab" aria-label="New tab" onClick={newTab}>+</button>
			</section>

			<section className="control-bar">
				<div className="nav-controls">
					<button disabled={!activeTab || activeTab.historyIndex <= 0} onClick={() => moveHistory(-1)} aria-label="Back">←</button>
					<button disabled={!activeTab || activeTab.historyIndex >= activeTab.history.length - 1} onClick={() => moveHistory(1)} aria-label="Forward">→</button>
					<button className={isReloading ? "reload-button is-loading" : "reload-button"} disabled={!activeTab?.url} onClick={reload} aria-label="Reload" title="Reload">↻</button>
				</div>
				<form className="address-bar" onSubmit={(event) => { event.preventDefault(); openUrl(address); }}>
					<span className="address-lock">⌁</span>
					<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Search or enter an address" aria-label="Search or enter an address" />
					<button type="submit" className="go-button">Go</button>
				</form>
				<div className="links-wrap">
					<button className="links-button" onClick={() => setQuickLinksOpen((value) => !value)} aria-expanded={quickLinksOpen}>Quick links <span>⌄</span></button>
					{quickLinksOpen && <QuickLinks onOpen={(url) => { setQuickLinksOpen(false); openUrl(url); }} />}
				</div>
			</section>

			<main className="browser-stage" ref={contentRef}>
				{!activeTab?.url && <HomeView identity={identity} status={status} onSearch={openUrl} onQuickLink={openUrl} />}
				{status && activeTab?.url && <div className="status-toast">{status}<span className="status-pulse" /></div>}
			</main>

			{consent === null && <ConsentBanner onAccept={acceptConsent} onDecline={declineConsent} />}
			{settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} identity={identity} theme={theme} onThemeChange={setTheme} />}
		</div>
	);
}

function HomeView({ identity, status, onSearch, onQuickLink }) {
	return (
		<div className="home-view view-enter">
			<img className="home-logo" src="/sj.png" alt="Classroom" />
			<p className="eyebrow">Your browser, kept simple</p>
			<h1>Search the web.</h1>
			<p className="home-copy">A compact workspace for the tabs<br className="desktop-break" /> you use every day.</p>
			<form className="home-search" onSubmit={(event) => { event.preventDefault(); onSearch(event.currentTarget.elements.query.value); }}>
				<span>⌕</span><input name="query" placeholder="Search with Google or enter a URL" autoComplete="off" /><button type="submit">Open</button>
			</form>
			<div className="home-meta"><span className="online-dot" /> {status || "Ready"}<span className="meta-divider" /> {identity.fakeName}</div>
			<div className="quick-launches"><span>Jump back in</span>{appConfig.quickLinks.slice(0, 4).map((link) => <button key={link.label} onClick={() => onQuickLink(link.url)}><b>{link.glyph}</b>{link.label}</button>)}</div>
		</div>
	);
}

function QuickLinks({ onOpen }) {
	return <div className="quick-menu">{appConfig.quickLinks.map((link) => <button key={link.label} onClick={() => onOpen(link.url)}><b>{link.glyph}</b><span>{link.label}</span><small>↗</small></button>)}</div>;
}

function ConsentBanner({ onAccept, onDecline }) {
	return <aside className="consent-banner"><div className="consent-icon">◌</div><div><strong>Help keep Classroom safe</strong><p>We use a one-way, anonymous device signal to enforce bans. No raw device details are stored.</p></div><div className="consent-actions"><button className="text-button" onClick={onDecline}>Not now</button><button className="solid-button" onClick={onAccept}>Allow protection</button></div></aside>;
}

function SettingsPanel({ onClose, identity, theme, onThemeChange }) {
	return <div className="overlay-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="side-panel" role="dialog" aria-modal="true" aria-labelledby="settings-heading"><div className="panel-top"><div><p className="eyebrow">Workspace</p><h2 id="settings-heading">Settings</h2></div><button className="close-button" onClick={onClose}>×</button></div><div className="settings-section"><p className="section-label">Your session</p><div className="identity-card"><span className="avatar-mark">{identity.fakeName.slice(-2)}</span><div><strong>{identity.fakeName}</strong><span>Anonymous session</span></div><i>Protected</i></div></div><div className="settings-section"><p className="section-label">Appearance</p><div className="theme-picker"><button className={theme === "dark" ? "theme-option selected" : "theme-option"} onClick={() => onThemeChange("dark")}>Dark</button><button className={theme === "light" ? "theme-option selected" : "theme-option"} onClick={() => onThemeChange("light")}>Light</button></div></div><div className="settings-section"><p className="section-label">About privacy</p><p className="settings-note">Classroom never needs your real name or email to open a tab. Device protection is opt-in and uses a one-way identifier.</p></div><div className="panel-footer"><span>Home - Classroom</span><span>v1 runtime</span></div></aside></div>;
}

function BlockedPage({ onHome }) {
	const [asset] = useState(() => chooseBlockedAsset(appConfig.blockedAssets));
	return <div className="blocked-page"><div className="blocked-noise" /><div className="blocked-card view-enter"><span className="blocked-kicker">Access paused</span><img src={asset} alt="Access restricted" /><h1>This space is closed<br />for this session.</h1><p>Your device or session is currently restricted. If you think this is a mistake, contact the administrator.</p><button className="solid-button" onClick={onHome}>Return home</button><span className="blocked-reference">Reference · {asset.split("/").pop()}</span></div></div>;
}

function LoadingScreen() {
	return <div className="loading-screen"><span className="brand-mark"><span /></span><p>Preparing your workspace</p></div>;
}

function AdminApp() {
	return <AdminDashboard />;
}

function AdminDashboard() {
	const [session, setSession] = useState(null);
	const [devices, setDevices] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!supabase) {
			setLoading(false);
			return;
		}
		supabase.auth.getSession().then(({ data }) => setSession(data.session));
		const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
		return () => data.subscription.unsubscribe();
	}, []);

	useEffect(() => {
		if (!session) {
			setLoading(false);
			return;
		}
		loadDevices();
	}, [session]);

	async function loadDevices() {
		setLoading(true);
		try {
			const result = await adminRequest("/api/admin/devices");
			setDevices(result.devices || []);
			setError("");
		} catch (loadError) {
			setError(loadError.message);
		} finally {
			setLoading(false);
		}
	}

	async function toggleBan(device) {
		try {
			await adminRequest("/api/admin/devices", { method: "PATCH", body: JSON.stringify({ deviceId: device.id, isBanned: !device.is_banned }) });
			await loadDevices();
		} catch (toggleError) {
			setError(toggleError.message);
		}
	}

	if (!session) return <AdminLogin configured={Boolean(supabase)} />;
	return <div className="admin-page"><header className="admin-header"><div className="brand-lockup"><span className="brand-mark"><span /></span><span className="brand-name">classroom</span><span className="brand-version">admin</span></div><div className="admin-user">{session.user.email}<button className="quiet-button" onClick={() => supabase.auth.signOut()}>Sign out</button></div></header><main className="admin-main"><div className="admin-intro"><div><p className="eyebrow">Control room</p><h1>Device protection</h1><p>Review anonymous sessions and keep access fair.</p></div><button className="outline-button" onClick={loadDevices}>↻ Refresh</button></div>{error && <div className="admin-error">{error}</div>}<section className="admin-stats"><div><span>Tracked devices</span><strong>{devices.length}</strong></div><div><span>Active bans</span><strong>{devices.filter((device) => device.is_banned).length}</strong></div><div><span>Last updated</span><strong>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong></div></section><section className="device-table"><div className="table-heading"><span>Anonymous device</span><span>Session</span><span>Last seen</span><span>Status</span><span>Action</span></div>{loading ? <div className="table-empty">Loading registry…</div> : devices.length ? devices.map((device) => <div className="device-row" key={device.id}><div><strong>{device.device_label || "Anonymous device"}</strong><small>{device.id.slice(0, 8)}…{device.id.slice(-6)}</small></div><span>{device.latest_session_name || "No name"}</span><span>{formatDate(device.last_seen_at)}</span><span className={device.is_banned ? "status-banned" : "status-clear"}>{device.is_banned ? "Banned" : "Clear"}</span><button className={device.is_banned ? "outline-button" : "danger-button"} onClick={() => toggleBan(device)}>{device.is_banned ? "Restore" : "Ban"}</button></div>) : <div className="table-empty">No devices have checked in yet.</div>}</section></main></div>;
}

function AdminLogin({ configured }) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	async function signIn(event) {
		event.preventDefault();
		if (!supabase) return;
		const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
		if (signInError) setError(signInError.message);
	}
	return <div className="admin-page"><div className="login-card"><div className="brand-lockup"><span className="brand-mark"><span /></span><span className="brand-name">classroom</span></div><p className="eyebrow">Restricted area</p><h1>Sign in to control room</h1>{!configured ? <p className="admin-error">Supabase is not configured. Add the Vercel environment variables before using admin access.</p> : <form onSubmit={signIn}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <p className="form-error">{error}</p>}<button className="solid-button" type="submit">Sign in securely</button></form>}</div></div>;
}

function makeTab() {
	const id = tabsafeId();
	return { id, title: "New tab", url: "", history: [], historyIndex: -1 };
}

function tabsafeId() {
	return crypto.randomUUID?.() || `tab-${Date.now()}-${Math.random()}`;
}

function resolveAddress(value) {
	const input = value.trim();
	if (!input) return "";
	if (/^[a-z][a-z\d+.-]*:\/\//i.test(input)) return input;
	if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(input)) return `https://${input}`;
	return appConfig.searchEngine.replace("%s", encodeURIComponent(input));
}

function titleFor(url) {
	try {
		return new URL(url).hostname.replace(/^www\./, "") || "New tab";
	} catch {
		return "New tab";
	}
}

function formatDate(date) {
	return date ? new Date(date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—";
}

function readTheme() {
	try {
		return localStorage.getItem("classroom-theme") || "dark";
	} catch {
		return "dark";
	}
}

createRoot(document.getElementById("app")).render(<App />);
