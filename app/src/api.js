import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
	supabaseUrl && supabaseAnonKey
		? createClient(supabaseUrl, supabaseAnonKey)
		: null;

export async function checkAccess(payload) {
	const response = await fetch("/api/ban/check", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(payload),
	});
	if (!response.ok && response.status !== 503) {
		throw new Error("Access check failed.");
	}
	return response.json();
}

export async function adminRequest(path, options = {}) {
	if (!supabase) throw new Error("Supabase is not configured.");
	const { data } = await supabase.auth.getSession();
	const token = data.session?.access_token;
	if (!token) throw new Error("Sign in as an administrator first.");

	const response = await fetch(path, {
		...options,
		headers: {
			"content-type": "application/json",
			Authorization: `Bearer ${token}`,
			...(options.headers || {}),
		},
	});
	const result = await response.json().catch(() => ({}));
	if (!response.ok) throw new Error(result.error || "Admin request failed.");
	return result;
}
