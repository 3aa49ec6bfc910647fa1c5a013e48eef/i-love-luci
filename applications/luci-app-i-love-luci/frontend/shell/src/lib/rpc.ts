import { getShellConfig } from "@/lib/config";

export type MenuItem = {
	id?: string;
	title: string;
	path: string;
	parentPath?: string | null;
	order?: number;
	depth?: number;
	actionType?: string;
	actionPath?: string | null;
	firstChildPath?: string | null;
	resolvedPath?: string;
	nativePath?: string | null;
	nativeStatus?: "supported" | "partial" | "unsupported";
	effectiveMode?: "modern" | "legacy" | "hidden";
	configuredMode?: "auto" | "modern" | "legacy" | "hidden";
	eligible?: boolean;
	hidden?: boolean;
	hasChildren?: boolean;
	legacy: boolean;
	children?: MenuItem[];
};

export type MenuTree = {
	items: MenuItem[];
	routes?: MenuItem[];
	tree: MenuItem[];
};

export type SessionInfo = {
	user: string;
	features: {
		mfa: boolean;
		passkeys: boolean;
		legacyFrame: boolean;
	};
};

export type ConsoleStatus = {
	available: boolean;
	enabled: boolean;
	port?: string;
	ssl?: boolean;
	username?: string;
	password?: string;
	path?: string;
	url?: string;
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

export type NetworkInterfaceRoute = {
	target?: string;
	mask?: number;
};

export type NetworkInterfaceStatus = {
	interface?: string;
	up?: boolean;
	l3_device?: string;
	device?: string;
	proto?: string;
	route?: NetworkInterfaceRoute[];
};

export type DashboardStatus = {
	collectedAt?: number;
	board: BoardInfo;
	system: SystemInfo;
	interfaces?: NetworkInterfaceStatus[];
	devices: Record<string, DeviceStatus>;
};

export type ConfigValue = string | number | boolean | Array<string | number | boolean>;

export type ConfigSection = {
	name: string;
	type: string;
	values: Record<string, ConfigValue>;
};

export type CoreSettings = {
	page: string;
	network: ConfigSection[];
	dhcp: ConfigSection[];
	firewall: ConfigSection[];
	system: ConfigSection[];
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

const fallbackMenu: MenuTree = {
	items: [
		{ title: "Status overview", path: "/admin/status/overview", nativePath: "/", legacy: false },
		{ title: "Network interfaces", path: "/admin/network/network", legacy: true },
		{ title: "DHCP and DNS", path: "/admin/network/dhcp", legacy: true },
		{ title: "Firewall", path: "/admin/network/firewall", legacy: true },
		{ title: "I Love LuCI settings", path: "/settings", legacy: false },
	],
	tree: [
		{ title: "Dashboard", path: "/admin/status/overview", nativePath: "/", legacy: false },
		{ title: "Network", path: "/admin/network/network", legacy: true },
		{ title: "DHCP and DNS", path: "/admin/network/dhcp", legacy: true },
		{ title: "Settings", path: "/settings", legacy: false },
	],
	routes: [],
};

const fallbackDashboard: DashboardStatus = {
	board: {},
	system: {},
	devices: {},
};

async function callBridge<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
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
			params: [config.sessionId, "luci.iloveluci", method, args],
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

export async function getMenuTree(): Promise<MenuTree> {
	try {
		const data = await callBridge<MenuTree>("menu_tree");
		return {
			items: data.items ?? [],
			routes: data.routes ?? data.items ?? [],
			tree: data.tree ?? data.items ?? [],
		};
	}
	catch {
		return fallbackMenu;
	}
}

export async function setRouteMode(path: string, mode: NonNullable<MenuItem["configuredMode"]>): Promise<boolean> {
	try {
		const data = await callBridge<{ saved: boolean }>("route_mode_set", { path, mode });
		return data.saved;
	}
	catch {
		return false;
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

export async function getConsoleStatus(): Promise<ConsoleStatus> {
	try {
		return await callBridge<ConsoleStatus>("console_status");
	}
	catch {
		return {
			available: false,
			enabled: false,
		};
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

export async function getCoreSettings(page: string): Promise<CoreSettings> {
	try {
		return await callBridge<CoreSettings>("core_settings", { page });
	}
	catch {
		return {
			page,
			network: [],
			dhcp: [],
			firewall: [],
			system: [],
		};
	}
}
