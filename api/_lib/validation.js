const defaultDeviceLabel = "Anonymous device";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const controlCharacters = /[\u0000-\u001F\u007F]/g;

export function isUuid(value) {
	return typeof value === "string" && uuidPattern.test(value);
}

export function normaliseDeviceLabel(value) {
	if (typeof value !== "string") return null;
	const label = value
		.normalize("NFKC")
		.replace(controlCharacters, " ")
		.replace(/\s+/g, " ")
		.trim();
	if (label.length > 64) return null;
	return label || defaultDeviceLabel;
}

export { defaultDeviceLabel };
