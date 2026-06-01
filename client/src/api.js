// Empty string uses same origin + Vite /api proxy in dev (see vite.config.js).
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";
const CLIENT_ID_STORAGE_KEY = "spendAnalyzerClientId";

function getClientId() {
	if (typeof window === "undefined" || typeof localStorage === "undefined") {
		return null;
	}

	try {
		let clientId = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
		if (clientId) return clientId;

		clientId = crypto.randomUUID();
		localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId);
		return clientId;
	} catch (error) {
		console.warn("[api] failed to load client id:", error);
		return null;
	}
}

async function parseJsonSafe(res) {
	try {
		return await res.json();
	} catch {
		return null;
	}
}

function createHttpError(res, data) {
	// Mimic the subset of axios error shape we use in UI.
	return {
		response: { status: res.status, data },
		message: data?.error || `Request failed with status ${res.status}`,
	};
}

async function request(method, path, body) {
	console.log(`[api] ${method} ${path}`, body);

	const headers = {};
	if (body) headers["Content-Type"] = "application/json";

	const clientId = getClientId();
	if (clientId) {
		headers["X-Client-Id"] = clientId;
	}

	const res = await fetch(`${API_BASE_URL}${path}`, {
		method,
		headers,
		body: body ? JSON.stringify(body) : undefined,
	});

	const data = await parseJsonSafe(res);
	if (!res.ok) {
		console.error(`[api] error: ${res.status}`, data);
		throw createHttpError(res, data);
	}

	console.log(`[api] ${method} ${path} success`, data);
	return { data };
}

export const api = {
	get: (path) => request("GET", path),
	post: (path, body) => request("POST", path, body),
	put: (path, body) => request("PUT", path, body),
	delete: (path) => request("DELETE", path),
};
