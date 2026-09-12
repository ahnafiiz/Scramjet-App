import { requireAdmin, sendJson } from "../_lib/supabase.js";
import { isUuid, normaliseDeviceLabel } from "../_lib/validation.js";

export default async function handler(request, response) {
	const access = await requireAdmin(request);
	if (access.error)
		return sendJson(response, access.status, { error: access.error });

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
						.select("device_id,session_id,fake_name,last_seen_at")
						.in("device_id", ids)
						.order("last_seen_at", { ascending: false })
				: { data: [], error: null };
			if (sessionsError) throw sessionsError;
			const latestSession = new Map();
			for (const session of sessions || []) {
				if (!latestSession.has(session.device_id))
					latestSession.set(session.device_id, session);
			}
			return sendJson(response, 200, {
				devices: (devices || []).map((device) => ({
					...device,
					device_code: shortCode("D", device.id),
					latest_session_name: latestSession.get(device.id)?.fake_name || null,
					latest_session_code: latestSession.get(device.id)
						? shortCode("S", latestSession.get(device.id).session_id)
						: null,
				})),
			});
		}

		if (request.method === "PATCH") {
			const body =
				typeof request.body === "string"
					? JSON.parse(request.body)
					: request.body || {};
			if (!isUuid(body.deviceId)) {
				return sendJson(response, 400, { error: "Invalid device update." });
			}

			if (typeof body.deviceLabel === "string") {
				const deviceLabel = normaliseDeviceLabel(body.deviceLabel);
				if (!deviceLabel) {
					return sendJson(response, 400, {
						error: "A device label can contain up to 64 characters.",
					});
				}
				const { error } = await access.supabase
					.from("device_registry")
					.update({ device_label: deviceLabel })
					.eq("id", body.deviceId);
				if (error) throw error;
				return sendJson(response, 200, { ok: true, deviceLabel });
			}

			if (typeof body.isBanned !== "boolean") {
				return sendJson(response, 400, { error: "Invalid device update." });
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
		return sendJson(response, 500, {
			error: "Unable to update the device registry.",
		});
	}
}

function shortCode(prefix, value) {
	return `${prefix}-${String(value).replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}
