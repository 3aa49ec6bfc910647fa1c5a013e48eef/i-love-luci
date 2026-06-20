export type MenuItem = {
	title: string;
	path: string;
	legacy: boolean;
};

export type SessionInfo = {
	user: string;
	features: {
		mfa: boolean;
		passkeys: boolean;
		legacyFrame: boolean;
	};
};

type BridgeResponse<T> = {
	ok: boolean;
	data: T;
};

const fallbackSession: SessionInfo = {
	user: "root",
	features: {
		mfa: false,
		passkeys: false,
		legacyFrame: true,
	},
};

const fallbackMenu: MenuItem[] = [
	{ title: "Status overview", path: "/admin/status/overview", legacy: true },
	{ title: "Network interfaces", path: "/admin/network/network", legacy: true },
	{ title: "DHCP and DNS", path: "/admin/network/dhcp", legacy: true },
	{ title: "Firewall", path: "/admin/network/firewall", legacy: true },
	{ title: "I Love LuCI settings", path: "/settings", legacy: false },
];

async function callBridge<T>(method: string): Promise<T> {
	const endpoint = "/ubus/";
	const response = await fetch(endpoint, {
		method: "POST",
		headers: { "content-type": "application/json" },
		credentials: "same-origin",
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: method,
			method: "call",
			params: [null, "luci.iloveluci", method, {}],
		}),
	});

	if (!response.ok) {
		throw new Error(`Bridge call failed: ${response.status}`);
	}

	const payload = await response.json();
	const result = payload?.result?.[1] as BridgeResponse<T> | undefined;

	if (!result?.ok) {
		throw new Error(`Bridge returned invalid response for ${method}`);
	}

	return result.data;
}

export async function getSessionInfo(): Promise<SessionInfo> {
	try {
		return await callBridge<SessionInfo>("session_info");
	}
	catch {
		return fallbackSession;
	}
}

export async function getMenuTree(): Promise<MenuItem[]> {
	try {
		const data = await callBridge<{ items: MenuItem[] }>("menu_tree");
		return data.items;
	}
	catch {
		return fallbackMenu;
	}
}

export async function getPendingChanges(): Promise<number> {
	try {
		const data = await callBridge<{ changes: unknown[] }>("changes_list");
		return data.changes.length;
	}
	catch {
		return 0;
	}
}
