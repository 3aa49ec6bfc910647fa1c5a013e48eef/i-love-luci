import { getShellConfig } from "@/lib/config";

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

export type SystemMemory = {
	total?: number;
	free?: number;
	shared?: number;
	buffered?: number;
	available?: number;
	cached?: number;
};

export type SystemInfo = {
	uptime?: number;
	localtime?: number;
	load?: number[];
	memory?: SystemMemory;
	root?: {
		total?: number;
		free?: number;
		used?: number;
		avail?: number;
	};
	tmp?: {
		total?: number;
		free?: number;
		used?: number;
		avail?: number;
	};
};

export type BoardInfo = {
	hostname?: string;
	model?: string;
	system?: string;
	release?: {
		distribution?: string;
		version?: string;
		description?: string;
		target?: string;
	};
};

export type DeviceStatus = {
	present?: boolean;
	type?: string;
	up?: boolean;
	carrier?: boolean;
	speed?: string | number;
	devtype?: string;
	"bridge-members"?: string[];
	statistics?: {
		rx_bytes?: number;
		tx_bytes?: number;
		rx_packets?: number;
		tx_packets?: number;
		rx_errors?: number;
		tx_errors?: number;
		rx_dropped?: number;
		tx_dropped?: number;
	};
};

export type DashboardStatus = {
	collectedAt?: number;
	board: BoardInfo;
	system: SystemInfo;
	devices: Record<string, DeviceStatus>;
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

const fallbackDashboard: DashboardStatus = {
	board: {},
	system: {},
	devices: {},
};

async function callBridge<T>(method: string): Promise<T> {
	const config = getShellConfig();

	if (!config.sessionId) {
		throw new Error("Missing LuCI session id");
	}

	const endpoint = "/ubus/";
	const response = await fetch(endpoint, {
		method: "POST",
		headers: { "content-type": "application/json" },
		credentials: "same-origin",
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: method,
			method: "call",
			params: [config.sessionId, "luci.iloveluci", method, {}],
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

export async function getDashboardStatus(): Promise<DashboardStatus> {
	try {
		return await callBridge<DashboardStatus>("dashboard_status");
	}
	catch {
		return fallbackDashboard;
	}
}
