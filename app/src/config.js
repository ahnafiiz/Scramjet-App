export const appConfig = {
	brand: "Classroom",
	searchEngine: "https://www.google.com/search?q=%s",
	quickLinks: [
		{ label: "Geforce Now", url: "https://play.geforcenow.com/", glyph: "G" },
		{ label: "TikTok", url: "https://www.tiktok.com/", glyph: "T" },
		{ label: "Snapchat", url: "https://web.snapchat.com/", glyph: "S" },
		{ label: "YouTube", url: "https://www.youtube.com/", glyph: "Y" },
		{ label: "Quenq", url: "https://quenq.com/", glyph: "Q" },
	],
	blockedAssets: [
		{ src: "/blocked/blocked-common.svg", weight: 70, tier: "common" },
		{ src: "/blocked/blocked-uncommon.svg", weight: 25, tier: "uncommon" },
		{ src: "/blocked/blocked-mythic.svg", weight: 5, tier: "mythic" },
	],
	fingerprint: {
		consentKey: "classroom-privacy-consent",
		identityKey: "classroom-anonymous-identity",
	},
};

export function getRuntimeConfig() {
	return window.SCRAMJET_APP_CONFIG || {};
}
