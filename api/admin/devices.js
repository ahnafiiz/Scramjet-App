import { requireAdmin, sendJson } from "../_lib/supabase.js";

export default async function handler(request, response) {
	const access = await requireAdmin(request);
	if (access.error) return sendJson(response, access.status, { error: access.error });

	try {
		if (request.method === "GET") {
			const { data: devices, error } = await access.supabase
				.from("device_registry")
				.select("id,device_label,is_banned,last_seen_at,created_at")
				.order("last_seen_at", { ascending: false })
				.limit(250);
			if (error) throw error;
			const ids = (devices || []).map((device) => device.id);
			const { data: sessions, error: sessionsError } = ids.length
				? await access.supabase
						.from("browser_sessions")
						.select("device_id,fake_name,last_seen_at")
						.in("device_id", ids)
						.order("last_seen_at", { ascending: false })
				: { data: [], error: null };
			if (sessionsError) throw sessionsError;
			const latestSession = new Map();
			for (const session of sessions || []) {
				if (!latestSession.has(session.device_id)) latestSession.set(session.device_id, session);
			}
			return sendJson(response, 200, {
				devices: (devices || []).map((device) => ({
					...device,
					latest_session_name: latestSession.get(device.id)?.fake_name || null,
				})),
			});
		}

		if (request.method === "PATCH") {
			const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
			if (!body.deviceId || typeof body.isBanned !== "boolean") {
				return sendJson(response, 400, { error: "Invalid ban update." });
			}
			const { error } = await access.supabase
				.from("device_registry")
				.update({ is_banned: body.isBanned })
				.eq("id", body.deviceId);
			if (error) throw error;
			const { error: sessionsError } = await access.supabase
				.from("browser_sessions")
				.update({ is_banned: body.isBanned })
				.eq("device_id", body.deviceId);
			if (sessionsError) throw sessionsError;
			return sendJson(response, 200, { ok: true });
		}

		return sendJson(response, 405, { error: "Method not allowed." });
	} catch (error) {
		console.error("Admin device operation failed", error);
		return sendJson(response, 500, { error: "Unable to update the device registry." });
	}
}
