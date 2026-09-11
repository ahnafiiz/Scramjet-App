export const appConfig = {
	brand: "Classroom",
	searchEngine: "https://www.google.com/search?q=%s",
	quickLinks: [
		{
			label: "GeForce Now",
			url: "https://play.geforcenow.com/",
			glyph: "G",
			icon: "https://cdn.simpleicons.org/nvidia/76b900",
			color: "#76b900",
		},
		{
			label: "TikTok",
			url: "https://www.tiktok.com/",
			glyph: "T",
			icon: "https://cdn.simpleicons.org/tiktok/25f4ee",
			color: "#25f4ee",
		},
		{
			label: "Snapchat",
			url: "https://web.snapchat.com/",
			glyph: "S",
			icon: "https://cdn.simpleicons.org/snapchat/fffc00",
			color: "#fffc00",
		},
		{
			label: "YouTube",
			url: "https://www.youtube.com/",
			glyph: "Y",
			icon: "https://cdn.simpleicons.org/youtube/ff0000",
			color: "#ff0000",
		},
		{
			label: "Quenq",
			url: "https://quenq.com/",
			glyph: "Q",
			icon: "https://www.google.com/s2/favicons?domain=quenq.com&sz=64",
			color: "#8b9cff",
		},
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
