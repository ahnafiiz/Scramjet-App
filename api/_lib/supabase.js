import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
	const url = process.env.SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) return null;
	return createClient(url, key, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
}

export function hashServerSide(value) {
	const salt = process.env.BAN_HASH_SALT;
	if (!salt) throw new Error("BAN_HASH_SALT is not configured.");
	return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export async function requireAdmin(request) {
	const supabase = getSupabaseAdmin();
	if (!supabase) return { error: "Supabase server configuration is missing.", status: 503 };

	const header = request.headers.authorization || "";
	const token = header.startsWith("Bearer ") ? header.slice(7) : "";
	if (!token) return { error: "Authentication required.", status: 401 };

	const { data, error } = await supabase.auth.getUser(token);
	if (error || !data.user) return { error: "Authentication expired.", status: 401 };

	const { data: admin, error: adminError } = await supabase
		.from("admin_users")
		.select("user_id")
		.eq("user_id", data.user.id)
		.maybeSingle();
	if (adminError || !admin) return { error: "Administrator access required.", status: 403 };

	return { supabase, user: data.user };
}

export function getRequestIp(request) {
	return (
		request.headers["x-vercel-forwarded-for"] ||
		request.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
		request.headers["x-real-ip"] ||
		"unknown"
	);
}

export function sendJson(response, status, payload) {
	response
		.status(status)
		.setHeader("content-type", "application/json; charset=utf-8")
		.setHeader("cache-control", "no-store")
		.setHeader("x-content-type-options", "nosniff")
		.end(JSON.stringify(payload));
}
