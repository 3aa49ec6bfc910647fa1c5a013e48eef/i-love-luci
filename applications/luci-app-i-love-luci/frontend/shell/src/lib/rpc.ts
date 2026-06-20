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
	nativeAutoMode?: "modern" | "legacy";
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

export type PendingChange = {
	config: string;
	action: string;
	section: string;
	option: string;
	value: string;
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
	nexthop?: string;
	source?: string;
};

export type NetworkInterfaceAddress = {
	address?: string;
	mask?: number;
};

export type NetworkInterfacePrefixAssignment = NetworkInterfaceAddress & {
	"local-address"?: NetworkInterfaceAddress;
};

export type NetworkInterfaceStatus = {
	interface?: string;
	up?: boolean;
	pending?: boolean;
	available?: boolean;
	autostart?: boolean;
	dynamic?: boolean;
	uptime?: number;
	l3_device?: string;
	device?: string;
	proto?: string;
	"dns-server"?: string[];
	"ipv4-address"?: NetworkInterfaceAddress[];
	"ipv6-address"?: NetworkInterfaceAddress[];
	"ipv6-prefix-assignment"?: NetworkInterfacePrefixAssignment[];
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

export type DhcpLease = {
	expires: number;
	remaining: number;
	mac: string;
	ip: string;
	hostname: string;
	clientId: string;
};

export type DhcpHost = {
	name: string;
	ip: string;
	mac: string;
};

export type DhcpDomain = {
	name: string;
	ip: string;
};

export type DhcpStatus = {
	dnsmasq?: ServiceState | null;
	odhcpd?: ServiceState | null;
	leaseFile?: string;
	leaseCount?: number;
};

export type CoreSettings = {
	page: string;
	network: ConfigSection[];
	dhcp: ConfigSection[];
	dhcpLeases?: DhcpLease[];
	dhcpHosts?: DhcpHost[];
	dhcpDomains?: DhcpDomain[];
	dhcpStatus?: DhcpStatus;
	firewall: ConfigSection[];
	system: ConfigSection[];
};

export type CommandBlock = {
	title: string;
	output: string;
};

export type PackageSearchResult = {
	query: string;
	manager: string;
	lines: string[];
	warnings: string[];
	message: string;
};

export type ServiceState = {
	name: string;
	enabled: boolean;
	running: boolean;
};

export type InitAction = "enable" | "disable" | "start" | "stop" | "restart" | "status";

export type InitActionResult = {
	ok: boolean;
	message: string;
	state: ServiceState | null;
};

export type CustomCommand = {
	id: string;
	name: string;
	command: string;
	param: boolean;
	public: boolean;
};

export type CustomCommandResult = {
	ok: boolean;
	message: string;
	command: string;
	stdout: string;
	stderr: string;
	exitcode: number;
	binary: boolean;
};

export type ServiceFile = {
	title: string;
	path: string;
	exists: boolean;
	size: number;
	lines: number;
	preview: string[];
};

export type NativeService = {
	id?: string;
	name?: string;
	title: string;
	package?: string;
	init?: ServiceState | null;
	sections?: ConfigSection[];
	customCommands?: CustomCommand[];
	files?: ServiceFile[];
	logs?: Record<string, string>;
	enabled?: boolean;
	running?: boolean;
};

export type DropbearConfigInput = {
	enable: string;
	Port: string;
	PasswordAuth: string;
	RootPasswordAuth: string;
	GatewayPorts: string;
	Interface?: string;
};

export type DropbearConfigResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	section: ConfigSection | null;
	init: ServiceState | null;
};

export type NativePageData = {
	page: string;
	board: BoardInfo;
	system: SystemInfo;
	commands: CommandBlock[];
	sections: ConfigSection[];
	services: NativeService[];
	lines: string[];
	text: string;
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

export async function getPendingChangeList(): Promise<PendingChange[]> {
	try {
		const data = await callBridge<{ changes: PendingChange[] }>("changes_list");
		return data.changes ?? [];
	}
	catch {
		return [];
	}
}

export async function revertPendingChanges(): Promise<{ reverted: boolean; count: number }> {
	try {
		return await callBridge<{ reverted: boolean; count: number }>("changes_revert");
	}
	catch {
		return {
			reverted: false,
			count: 0,
		};
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
		const data = await callBridge<Omit<CoreSettings, "dhcpLeases"> & { dhcpLeases?: Array<DhcpLease | string> }>(
			"core_settings",
			{ page },
		);

		return {
			...data,
			dhcpLeases: (data.dhcpLeases ?? []).map((lease) => {
				if (typeof lease !== "string") {
					return lease;
				}

				const [remaining = "0", mac = "", ip = "", hostname = "", clientId = ""] = lease.split("\t");

				return {
					expires: 0,
					remaining: Number(remaining) || 0,
					mac,
					ip,
					hostname,
					clientId,
				};
			}),
		};
	}
	catch {
		return {
			page,
			network: [],
			dhcp: [],
			dhcpLeases: [],
			dhcpHosts: [],
			dhcpDomains: [],
			dhcpStatus: {},
			firewall: [],
			system: [],
		};
	}
}

export async function getNativePage(page: string): Promise<NativePageData> {
	try {
		return await callBridge<NativePageData>("native_page", { page });
	}
	catch {
		return {
			page,
			board: {},
			system: {},
			commands: [],
			sections: [],
			services: [],
			lines: [],
			text: "",
		};
	}
}

export async function searchPackages(query: string): Promise<PackageSearchResult> {
	try {
		return await callBridge<PackageSearchResult>("package_search", { query });
	}
	catch {
		return {
			query,
			manager: "unknown",
			lines: [],
			warnings: [],
			message: "Package search failed.",
		};
	}
}

export async function getServiceDetail(id: string): Promise<NativeService> {
	try {
		return await callBridge<NativeService>("service_detail", { id });
	}
	catch {
		return {
			id,
			title: id,
			sections: [],
			files: [],
			logs: {},
		};
	}
}

export async function runServiceAction(id: string, action: InitAction): Promise<InitActionResult> {
	try {
		return await callBridge<InitActionResult>("service_action", { id, action });
	}
	catch {
		return {
			ok: false,
			message: "Service action failed.",
			state: null,
		};
	}
}

export async function runStartupAction(name: string, action: InitAction): Promise<InitActionResult> {
	try {
		return await callBridge<InitActionResult>("startup_action", { name, action });
	}
	catch {
		return {
			ok: false,
			message: "Startup action failed.",
			state: null,
		};
	}
}

export async function saveDropbearConfig(config: DropbearConfigInput): Promise<DropbearConfigResult> {
	try {
		return await callBridge<DropbearConfigResult>("dropbear_config_save", { config });
	}
	catch {
		return {
			saved: false,
			message: "SSH access save failed.",
			changed: false,
			section: null,
			init: null,
		};
	}
}

export async function runDiagnostics(tool: string, target: string): Promise<string> {
	try {
		const data = await callBridge<{ output: string }>("diagnostics_run", { tool, target });
		return data.output;
	}
	catch {
		return "Diagnostic command failed.";
	}
}

export async function runCustomCommand(id: string, args: string): Promise<CustomCommandResult> {
	try {
		return await callBridge<CustomCommandResult>("custom_command_run", { id, args });
	}
	catch {
		return {
			ok: false,
			message: "Command failed.",
			command: "",
			stdout: "",
			stderr: "",
			exitcode: 1,
			binary: false,
		};
	}
}

export async function saveCrontab(text: string): Promise<{ saved: boolean; message: string }> {
	try {
		return await callBridge<{ saved: boolean; message: string }>("crontab_save", { text });
	}
	catch {
		return {
			saved: false,
			message: "Crontab save failed.",
		};
	}
}

export async function saveSshKeys(text: string): Promise<{ saved: boolean; message: string }> {
	try {
		return await callBridge<{ saved: boolean; message: string }>("ssh_keys_save", { text });
	}
	catch {
		return {
			saved: false,
			message: "SSH keys save failed.",
		};
	}
}

export async function saveRcLocal(text: string): Promise<{ saved: boolean; message: string }> {
	try {
		return await callBridge<{ saved: boolean; message: string }>("rc_local_save", { text });
	}
	catch {
		return {
			saved: false,
			message: "Local startup save failed.",
		};
	}
}

export async function setRouterPassword(
	username: string,
	password: string,
	confirm: string,
): Promise<{ saved: boolean; message: string }> {
	try {
		return await callBridge<{ saved: boolean; message: string }>("password_set", { username, password, confirm });
	}
	catch {
		return {
			saved: false,
			message: "Password change failed.",
		};
	}
}
