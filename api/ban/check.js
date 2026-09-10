import {
	getRequestIp,
	getSupabaseAdmin,
	hashServerSide,
	sendJson,
} from "../_lib/supabase.js";

export default async function handler(request, response) {
	if (request.method !== "POST") return sendJson(response, 405, { error: "Method not allowed." });
	const supabase = getSupabaseAdmin();
	if (!supabase) return sendJson(response, 503, { configured: false, banned: false });

	try {
		const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
		const { deviceHash, sessionId, fakeName } = body;
		if (!/^[a-f0-9]{64}$/i.test(deviceHash || "") || !/^[0-9a-f-]{20,}$/i.test(sessionId || "")) {
			return sendJson(response, 400, { error: "Invalid anonymous identity." });
		}

		const fingerprintHash = hashServerSide(deviceHash);
		const ipHash = hashServerSide(getRequestIp(request));
		const { data: device, error: deviceError } = await supabase
			.from("device_registry")
			.upsert(
				{
					fingerprint_hash: fingerprintHash,
					last_ip_hash: ipHash,
					last_seen_at: new Date().toISOString(),
					device_label: "Anonymous device",
				},
				{ onConflict: "fingerprint_hash" }
			)
			.select("id,is_banned")
			.single();
		if (deviceError) throw deviceError;

		const { data: session, error: sessionError } = await supabase
			.from("browser_sessions")
			.upsert(
				{
					session_id: sessionId,
					device_id: device.id,
					fake_name: String(fakeName || "Anonymous").slice(0, 80),
					last_seen_at: new Date().toISOString(),
				},
				{ onConflict: "session_id" }
			)
			.select("is_banned")
			.single();
		if (sessionError) throw sessionError;

		const banned = Boolean(device.is_banned || session.is_banned);
		return sendJson(response, 200, {
			configured: true,
			banned,
			reason: device.is_banned ? "device" : session.is_banned ? "session" : null,
		});
	} catch (error) {
		console.error("Anonymous access check failed", error);
		return sendJson(response, 500, { error: "Access check unavailable." });
	}
}
