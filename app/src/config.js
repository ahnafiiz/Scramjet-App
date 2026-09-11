export const appConfig = {
	brand: "Classroom",
	searchEngine: "https://www.google.com/search?q=%s",
	quickLinks: [
		{
			label: "GeForce Now",
			url: "https://play.geforcenow.com/",
			glyph: "G",
			icon: "/brands/geforce-now.png",
			color: "#76b900",
		},
		{
			label: "TikTok",
			url: "https://www.tiktok.com/",
			glyph: "T",
			icon: "/brands/tiktok.svg",
			color: "#25f4ee",
		},
		{
			label: "Snapchat",
			url: "https://web.snapchat.com/",
			glyph: "S",
			icon: "/brands/snapchat.svg",
			color: "#fffc00",
		},
		{
			label: "YouTube",
			url: "https://www.youtube.com/",
			glyph: "Y",
			icon: "/brands/youtube.svg",
			color: "#ff0000",
		},
		{
			label: "Quenq",
			url: "https://quenq.com/",
			glyph: "Q",
			icon: "/brands/quenq.ico",
			color: "#8b9cff",
		},
	],
	changeLog: [
		{
			version: "2.2",
			date: "Sep 2026",
			title: "A calmer browser shell",
			summary:
				"Cleaner controls, stronger icons, and a more useful home screen.",
			details: [
				"Reworked the top browser controls into one compact toolbar.",
				"Added theme-aware service marks for every quick link.",
			],
		},
		{
			version: "2.1",
			date: "Sep 2026",
			title: "Google-first search",
			summary:
				"Searches continue to use Google while tabs keep independent history.",
			details: [
				"Each tab owns its URL, title, back stack, and forward stack.",
				"The document title remains Home - Classroom.",
			],
		},
		{
			version: "2.0",
			date: "Sep 2026",
			title: "BETA foundation",
			summary:
				"Introduced the client-side browser shell and protected admin route.",
			details: [
				"Static Vercel deployment with no proxy serverless functions.",
				"Optional Supabase-backed device protection for /admin.",
			],
		},
	],
	// Add or rename files in app/public/blocked and add one entry here.
	// Weights are relative, so 70 / 25 / 5 behaves like 70% / 25% / 5%.
	blockedAssets: [
		{
			name: "Common classroom",
			src: "/blocked/blocked-common.svg",
			weight: 70,
			tier: "common",
			alt: "Common access restriction",
		},
		{
			name: "Uncommon classroom",
			src: "/blocked/blocked-uncommon.svg",
			weight: 25,
			tier: "uncommon",
			alt: "Uncommon access restriction",
		},
		{
			name: "Mythic classroom",
			src: "/blocked/blocked-mythic.svg",
			weight: 5,
			tier: "mythic",
			alt: "Rare access restriction",
		},
	],
	fingerprint: {
		consentKey: "classroom-privacy-consent",
		identityKey: "classroom-anonymous-identity",
	},
};

export function getRuntimeConfig() {
	return window.SCRAMJET_APP_CONFIG || {};
}
