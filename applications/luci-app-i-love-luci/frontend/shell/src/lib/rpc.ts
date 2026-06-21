import { getShellConfig } from "@/lib/config";
import { redirectToLogin } from "@/lib/auth";

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
	nativeStatus?: "supported" | "compat" | "unsupported";
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
	packageVersion?: string;
	features: {
		mfa: boolean;
		passkeys: boolean;
		legacyFrame: boolean;
	};
};

export type AuthSessionStatus = "valid" | "expired" | "unknown";

export type AuthSessionProbe = {
	status: AuthSessionStatus;
	message?: string;
};

export type ConsoleStatus = {
	available: boolean;
	enabled: boolean;
	port?: string;
	ssl?: boolean;
	path?: string;
	url?: string;
};

export type ConsoleLaunch = ConsoleStatus & {
	username?: string;
	password?: string;
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
	section: string;
	name: string;
	ip: string;
	mac: string;
	leasetime: string;
	duid: string;
	hostid: string;
	tag: string;
	match_tag: string;
	instance: string;
	broadcast: string;
	dns: string;
};

export type DhcpDomain = {
	section: string;
	name: string;
	ip: string;
};

export type DhcpPool = {
	section: string;
	interface: string;
	ignore: string;
	start: string;
	limit: string;
	leasetime: string;
	dhcpv4: string;
	dhcpv6: string;
	ra: string;
};

export type DhcpRelay = {
	section: string;
	local_addr: string;
	server_addr: string;
	interface: string;
};

export type DhcpBoot = {
	section: string;
	filename: string;
	servername: string;
	serveraddress: string;
	dhcp_option: string;
	networkid: string;
	force: string;
	instance: string;
};

export type DhcpBoot6 = {
	section: string;
	url: string;
	arch: string;
};

export type DhcpTag = {
	section: string;
	dhcp_option: string;
	force: string;
};

export type DhcpMatch = {
	section: string;
	match: string;
	networkid: string;
	force: string;
};

export type DhcpVendorClass = {
	section: string;
	vendorclass: string;
	networkid: string;
	force: string;
};

export type DhcpUserClass = {
	section: string;
	userclass: string;
	networkid: string;
	force: string;
};

export type DhcpStatus = {
	dnsmasq?: ServiceState | null;
	odhcpd?: ServiceState | null;
	leaseFile?: string;
	leaseCount?: number;
};

export type StaticRoute = {
	section: string;
	family: string;
	interface: string;
	type: string;
	target: string;
	netmask: string;
	gateway: string;
	metric: string;
	table: string;
	source: string;
	mtu: string;
	onlink: string;
	disabled: string;
};

export type PolicyRule = {
	section: string;
	family: string;
	in: string;
	out: string;
	src: string;
	dest: string;
	priority: string;
	lookup: string;
	fwmark: string;
	ipproto: string;
	goto: string;
	sport: string;
	dport: string;
	tos: string;
	uidrange: string;
	suppress_prefixlength: string;
	action: string;
	invert: string;
	disabled: string;
};

export type CoreSettings = {
	page: string;
	network: ConfigSection[];
	networkRoutes?: StaticRoute[];
	networkRules?: PolicyRule[];
	dhcp: ConfigSection[];
	dhcpLeases?: DhcpLease[];
	dhcpHosts?: DhcpHost[];
	dhcpDomains?: DhcpDomain[];
	dhcpPools?: DhcpPool[];
	dhcpRelays?: DhcpRelay[];
	dhcpBoots?: DhcpBoot[];
	dhcpBoot6s?: DhcpBoot6[];
	dhcpTags?: DhcpTag[];
	dhcpMatches?: DhcpMatch[];
	dhcpVendorClasses?: DhcpVendorClass[];
	dhcpUserClasses?: DhcpUserClass[];
	dhcpStatus?: DhcpStatus;
	firewall: ConfigSection[];
	firewallFiles?: ServiceFile[];
	system: ConfigSection[];
	timezones?: Record<string, { tzstring?: string }>;
};

export type SystemTimeSyncResult = {
	ok: boolean;
	message: string;
	localtime?: number;
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

export type PackageAction = "install" | "remove" | "update" | "upgrade";

export type PackageActionResult = {
	ok: boolean;
	manager: string;
	action: PackageAction;
	name: string;
	simulate: boolean;
	command: string;
	output: string;
	message: string;
};

export type PackageJobStatus = {
	id: string;
	running: boolean;
	done: boolean;
	result: PackageActionResult;
};

export type PackageJobStartResult = {
	started: boolean;
	job: PackageJobStatus | null;
	result: PackageActionResult | null;
};

export type PackageActionOptions = {
	overwrite?: boolean;
	autoremove?: boolean;
	i18nPackages?: string[];
};

export type PackageFileStageResult = {
	ok: boolean;
	message: string;
	filename: string;
	path: string;
	size: number;
	checksum: string;
	sha256sum: string;
};

export type PackageFeedRow = {
	id: string;
	file: string;
	index: number;
	type: "repository" | "comment" | "blank";
	enabled: boolean;
	value: string;
	raw?: string;
};

export type PackageFeedsResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	feeds: PackageFeedRow[];
};

export type AttendedSysupgradeConfigInput = {
	server_url: string;
	rebuilder: string;
	upgrade_packages: string;
	auto_search: string;
	advanced_mode: string;
	login_check_for_upgrades: string;
};

export type AttendedSysupgradeConfigResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	sections: ConfigSection[];
};

export type AttendedSysupgradePlanAction = "check" | "list" | "blob";

export type AttendedSysupgradePlanResult = {
	ok: boolean;
	helper: string;
	action: AttendedSysupgradePlanAction | string;
	command: string;
	output: string;
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

export type CustomCommandsSaveResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	commands: CustomCommand[];
	sections: ConfigSection[];
};

export type ServiceFile = {
	title: string;
	path: string;
	exists: boolean;
	size: number;
	lines: number;
	preview: string[];
	editable?: boolean;
	content?: string;
};

export type NativeService = {
	id?: string;
	name?: string;
	title: string;
	package?: string;
	init?: ServiceState | null;
	sections?: ConfigSection[];
	customCommands?: CustomCommand[];
	upnpActiveRules?: UpnpdActiveRule[];
	files?: ServiceFile[];
	logs?: Record<string, string>;
	enabled?: boolean;
	running?: boolean;
};

export type RebootResult = {
	accepted: boolean;
	message: string;
	hostname?: string;
	delay?: number;
};

export type ConfigBackupResult = {
	ok: boolean;
	message: string;
	filename: string;
	size: number;
	mime: string;
	data: string;
};

export type FlashMtdBlock = {
	id: string;
	name: string;
	size: number;
	eraseSize: number;
	path: string;
	filename: string;
};

export type FlashBackupContext = {
	available: boolean;
	hasRootfsData?: boolean;
	storageSize?: number;
	list: string[];
	config: string;
	mtdBlocks?: FlashMtdBlock[];
};

export type SysupgradeConfigResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	config: string;
};

export type RestoreBackupValidationResult = {
	ok: boolean;
	message: string;
	filename: string;
	entries: string[];
};

export type DestructiveActionResult = {
	accepted: boolean;
	message: string;
	output?: string;
};

export type FirmwareValidationResult = {
	ok: boolean;
	message: string;
	filename: string;
	board?: string;
	size: number;
	checksum: string;
	sha256sum: string;
	valid: boolean;
	forceable: boolean;
	allowBackup: boolean;
	tooBig: boolean;
	output: string;
};

export type FirmwareFlashOptions = {
	confirm: "flash-firmware";
	keep: boolean;
	force: boolean;
	skipOriginal: boolean;
	backupPackages: boolean;
};

export type DropbearConfigInput = {
	section?: string;
	bindMode?: "all" | "interface" | "direct";
	enable: string;
	Port: string;
	PasswordAuth: string;
	RootPasswordAuth: string;
	GatewayPorts: string;
	Interface?: string;
	DirectInterface?: string;
};

export type DropbearConfigResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	section: ConfigSection | null;
	sections?: ConfigSection[];
	init: ServiceState | null;
};

export type LedConfigRow = {
	section: string;
	name: string;
	sysfs: string;
	trigger: string;
	default: string;
	dev: string;
	mode: string;
	interval: string;
	delayon: string;
	delayoff: string;
	inverted: string;
};

export type LedConfigResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	sections: ConfigSection[];
};

export type UhttpdConfigInput = {
	section?: string;
	redirect_https: string;
	listen_http: string;
	listen_https: string;
	home: string;
	rfc1918_filter: string;
	no_symlinks: string;
	no_dirlists: string;
	max_requests: string;
	max_connections: string;
	cert: string;
	key: string;
	cgi_prefix: string;
	index_page: string;
	interpreter: string;
	alias: string;
	lua_prefix: string;
	lua_handler: string;
	realm: string;
	config: string;
	error_page: string;
	script_timeout: string;
	network_timeout: string;
	http_keepalive: string;
	tcp_keepalive: string;
	ubus_prefix: string;
	ubus_socket: string;
	ubus_cors: string;
	no_ubusauth: string;
};

export type UhttpdConfigResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	section: ConfigSection | null;
	sections?: ConfigSection[];
	init: ServiceState | null;
};

export type UhttpdCertificateFileStatus = {
	title: string;
	path: string;
	exists: boolean;
	size: number;
};

export type UhttpdCertificateFileResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	kind?: "cert" | "key";
	path?: string;
	size?: number;
	encoding?: "text" | "base64";
	section: ConfigSection | null;
	sections?: ConfigSection[];
	files?: UhttpdCertificateFileStatus[];
	init: ServiceState | null;
};

export type UpnpdConfigInput = {
	enabled: string;
	enable_upnp: string;
	enable_natpmp: string;
	download: string;
	upload: string;
	internal_iface: string;
	port: string;
	igdv1: string;
	use_stun: string;
	stun_host: string;
	stun_port: string;
	secure_mode: string;
	notify_interval: string;
	presentation_url: string;
	uuid: string;
	model_number: string;
	serial_number: string;
	system_uptime: string;
	log_output: string;
	upnp_lease_file: string;
};

export type UpnpdRule = {
	section: string;
	action: string;
	ext_ports: string;
	int_addr: string;
	int_ports: string;
	comment: string;
};

export type UpnpdConfigResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	config: ConfigSection | null;
	rules: UpnpdRule[];
	activeRules?: UpnpdActiveRule[];
	sections: ConfigSection[];
};

export type UpnpdActiveRule = {
	num?: string | number;
	host_hint?: string;
	intaddr?: string;
	intport?: string | number;
	extport?: string | number;
	proto?: string;
	expires?: number;
	descr?: string;
};

export type UpnpdActiveRuleDeleteResult = {
	ok: boolean;
	message: string;
	activeRules: UpnpdActiveRule[];
};

export type AdblockFastConfigInput = {
	enabled: string;
	dns: string;
	dnsmasq_config_file_url: string;
	dnsmasq_instance: string;
	force_dns: string;
	force_dns_port: string;
	parallel_downloads: string;
	verbosity: string;
	auto_update_enabled: string;
	config_update_enabled: string;
	config_update_url: string;
	ipv6_enabled: string;
	download_timeout: string;
	pause_timeout: string;
	curl_max_file_size: string;
	curl_retry: string;
	compressed_cache: string;
	compressed_cache_dir: string;
	dnsmasq_sanity_check: string;
	dnsmasq_validity_check: string;
	debug_init_script: string;
	rpcd_token: string;
	led: string;
	allowed_domain: string;
	blocked_domain: string;
};

export type AdblockFastFeed = {
	section: string;
	enabled: string;
	action: string;
	name: string;
	url: string;
	size: string;
};

export type AdblockFastConfigResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	config: ConfigSection | null;
	feeds: AdblockFastFeed[];
	sections: ConfigSection[];
};

export type BanipConfigInput = {
	ban_enabled: string;
	ban_autodetect: string;
	ban_autoallowlist: string;
	ban_autoblocklist: string;
	ban_allowlistonly: string;
	ban_protov4: string;
	ban_protov6: string;
	ban_blockpolicy: string;
	ban_nftpolicy: string;
	ban_nftpriority: string;
	ban_nftloglevel: string;
	ban_loglimit: string;
	ban_fetchretry: string;
	ban_icmplimit: string;
	ban_synlimit: string;
	ban_udplimit: string;
	ban_feed: string;
	ban_country: string;
	ban_trigger: string;
	ban_ifv4: string;
	ban_ifv6: string;
	ban_dev: string;
	ban_logterm: string;
};

export type BanipConfigResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	section: ConfigSection | null;
	sections: ConfigSection[];
};

export type BanipFileResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	file: ServiceFile | null;
};

export type UhttpdCertDefaultsInput = {
	section: string;
	days: string;
	key_type: string;
	bits: string;
	ec_curve: string;
	country: string;
	state: string;
	location: string;
	organization: string;
	commonname: string;
};

export type UhttpdCertDefaultsResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	sections: ConfigSection[];
};

export type SystemSettingsInput = {
	hostname: string;
	description: string;
	notes: string;
	zonename: string;
	timezone: string;
	clock_timestyle: string;
	clock_hourcycle: string;
	log_size: string;
	log_ip: string;
	log_port: string;
	log_proto: string;
	log_file: string;
	conloglevel: string;
	cronloglevel: string;
	ntp_enabled: string;
	ntp_enable_server: string;
	ntp_interface: string;
	ntp_use_dhcp: string;
	ntp_servers: string;
};

export type SystemSettingsResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	sections: ConfigSection[];
};

export type LuciUiSettingsInput = {
	lang: string;
	mediaurlbase: string;
	tablefilters: string;
	sessiontime: string;
	rollback: string;
	holdoff: string;
	timeout: string;
	display: string;
};

export type LuciUiSettingsResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	sections: ConfigSection[];
};

export type DhcpHostsResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	hosts: DhcpHost[];
	sections: ConfigSection[];
};

export type DhcpDomainsResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	domains: DhcpDomain[];
	sections: ConfigSection[];
};

export type DhcpPoolsResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	pools: DhcpPool[];
	sections: ConfigSection[];
};

export type DhcpRelaysResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	relays: DhcpRelay[];
	sections: ConfigSection[];
};

export type DhcpBootsResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	boots: DhcpBoot[];
	sections: ConfigSection[];
};

export type DhcpBoot6sResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	boots: DhcpBoot6[];
	sections: ConfigSection[];
};

export type DhcpTagsResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	tags: DhcpTag[];
	sections: ConfigSection[];
};

export type DhcpMatchesResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	matches: DhcpMatch[];
	sections: ConfigSection[];
};

export type DhcpVendorClassesResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	classes: DhcpVendorClass[];
	sections: ConfigSection[];
};

export type DhcpUserClassesResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	classes: DhcpUserClass[];
	sections: ConfigSection[];
};

export type DnsmasqConfigInput = {
	domainneeded: string;
	localise_queries: string;
	rebind_protection: string;
	rebind_localhost: string;
	expandhosts: string;
	readethers: string;
	localservice: string;
	authoritative: string;
	sequential_ip: string;
	address_as_local: string;
	nonwildcard: string;
	logdhcp: string;
	quietdhcp: string;
	enable_tftp: string;
	allservers: string;
	boguspriv: string;
	filterwin2k: string;
	filter_aaaa: string;
	filter_a: string;
	nonegcache: string;
	noresolv: string;
	strictorder: string;
	ignore_hosts_dir: string;
	nohosts: string;
	logqueries: string;
	stripmac: string;
	stripsubnet: string;
	local: string;
	domain: string;
	cachesize: string;
	dhcpleasemax: string;
	dnsforwardmax: string;
	min_cache_ttl: string;
	max_cache_ttl: string;
	ednspacket_max: string;
	port: string;
	queryport: string;
	minport: string;
	maxport: string;
	leasefile: string;
	resolvfile: string;
	serversfile: string;
	logfacility: string;
	addmac: string;
	addsubnet: string;
	tftp_root: string;
	dhcp_boot: string;
	server: string;
	address: string;
	rebind_domain: string;
	bogusnxdomain: string;
	addnhosts: string;
	interface: string;
	listen_address: string;
	notinterface: string;
};

export type DnsmasqConfigResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	section: ConfigSection | null;
	sections: ConfigSection[];
};

export type OdhcpdConfigInput = {
	maindhcp: string;
	leasefile: string;
	leasetrigger: string;
	hostsdir: string;
	piodir: string;
	loglevel: string;
};

export type OdhcpdConfigResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	section: ConfigSection | null;
	sections: ConfigSection[];
};

export type StaticRoutesResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	routes: StaticRoute[];
	sections: ConfigSection[];
};

export type PolicyRulesResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	rules: PolicyRule[];
	sections: ConfigSection[];
};

export type NetworkInterfaceConfig = {
	section: string;
	remove?: string;
	isNew?: string;
	zone?: string;
	zoneName?: string;
	proto: string;
	device: string;
	disabled: string;
	auto: string;
	force_link: string;
	defaultroute: string;
	ipaddr: string;
	netmask: string;
	gateway: string;
	broadcast: string;
	ip6assign: string;
	ip6hint: string;
	ip6ifaceid: string;
	ip6class: string;
	ip6prefix: string;
	dns: string;
	dns_metric: string;
	metric: string;
	peerdns: string;
	delegate: string;
	hostname: string;
	clientid: string;
	vendorid: string;
	norelease: string;
};

export type NetworkInterfacesResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	interfaces: NetworkInterfaceConfig[];
	sections: ConfigSection[];
	firewallSections?: ConfigSection[];
};

export type NetworkInterfaceAction = "status";

export type NetworkInterfaceActionResult = {
	ok: boolean;
	name: string;
	action: NetworkInterfaceAction | string;
	message: string;
	state: NetworkInterfaceStatus | null;
};

export type NetworkDeviceConfig = {
	section: string;
	name: string;
	type: string;
	ports: string;
	macaddr: string;
	mtu: string;
};

export type NetworkDevicesResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	devices: NetworkDeviceConfig[];
	sections: ConfigSection[];
};

export type FirewallDefaultsInput = {
	input: string;
	output: string;
	forward: string;
	synflood_protect: string;
	drop_invalid: string;
	flow_offloading: string;
	flow_offloading_hw: string;
};

export type FirewallDefaultsResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	section: ConfigSection | null;
	sections: ConfigSection[];
};

export type FirewallZone = {
	section: string;
	name: string;
	network: string;
	device: string;
	input: string;
	output: string;
	forward: string;
	masq: string;
	mtu_fix: string;
	subnet: string;
	family: string;
	masq6: string;
	masq_src: string;
	masq_dest: string;
	masq_allow_invalid: string;
	auto_helper: string;
	helper: string;
	log: string;
	log_limit: string;
	extra_src: string;
	extra_dest: string;
};

export type FirewallZonesResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	zones: FirewallZone[];
	sections: ConfigSection[];
};

export type FirewallForwarding = {
	section: string;
	src: string;
	dest: string;
};

export type FirewallForwardingsResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	forwardings: FirewallForwarding[];
	sections: ConfigSection[];
};

export type FirewallRuleRow = {
	section: string;
	name: string;
	enabled: string;
	src: string;
	dest: string;
	proto: string;
	src_ip: string;
	dest_ip: string;
	src_port: string;
	dest_port: string;
	icmp_type: string;
	family: string;
	direction: string;
	device: string;
	ipset: string;
	src_mac: string;
	set_mark: string;
	set_xmark: string;
	set_dscp: string;
	set_helper: string;
	helper: string;
	mark: string;
	dscp: string;
	limit: string;
	limit_burst: string;
	log: string;
	log_limit: string;
	extra: string;
	weekdays: string;
	monthdays: string;
	start_time: string;
	stop_time: string;
	start_date: string;
	stop_date: string;
	utc_time: string;
	target: string;
};

export type FirewallRulesResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	rules: FirewallRuleRow[];
	sections: ConfigSection[];
};

export type FirewallRedirect = {
	section: string;
	name: string;
	enabled: string;
	src: string;
	src_ip: string;
	src_mac: string;
	src_port: string;
	src_dip: string;
	src_dport: string;
	dest: string;
	dest_ip: string;
	dest_port: string;
	proto: string;
	family: string;
	target: string;
	ipset: string;
	reflection: string;
	reflection_src: string;
	reflection_zone: string;
	helper: string;
	mark: string;
	limit: string;
	limit_burst: string;
	log: string;
	log_limit: string;
	extra: string;
};

export type FirewallRedirectsResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	redirects: FirewallRedirect[];
	sections: ConfigSection[];
};

export type FirewallNat = {
	section: string;
	name: string;
	enabled: string;
	family: string;
	proto: string;
	src: string;
	src_ip: string;
	src_port: string;
	dest_ip: string;
	dest_port: string;
	target: string;
	snat_ip: string;
	snat_port: string;
	ipset: string;
	device: string;
	mark: string;
	limit: string;
	limit_burst: string;
	log: string;
	extra: string;
	weekdays: string;
	monthdays: string;
	start_time: string;
	stop_time: string;
	start_date: string;
	stop_date: string;
	utc_time: string;
};

export type FirewallNatsResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	nats: FirewallNat[];
	sections: ConfigSection[];
};

export type FirewallIpSet = {
	section: string;
	name: string;
	comment: string;
	family: string;
	match: string;
	entry: string;
	maxelem: string;
	external: string;
	storage: string;
	iprange: string;
	portrange: string;
	netmask: string;
	hashsize: string;
	loadfile: string;
	timeout: string;
	counters: string;
	enabled: string;
};

export type FirewallIpSetsResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	ipsets: FirewallIpSet[];
	sections: ConfigSection[];
};

export type FirewallInclude = {
	section: string;
	path: string;
	type: string;
	enabled: string;
	reload: string;
	editable?: boolean;
};

export type FirewallIncludesResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	includes: FirewallInclude[];
	sections: ConfigSection[];
};

export type FirewallFileResult = {
	saved: boolean;
	message: string;
	changed: boolean;
	file: ServiceFile | null;
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
	packageAvailable?: string[];
	packageFeeds?: PackageFeedRow[];
	flashBackup?: FlashBackupContext;
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
		redirectToLogin();
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

	if (response.status === 403 || response.headers.get("X-LuCI-Login-Required") === "yes") {
		redirectToLogin();
		throw new Error("LuCI login required");
	}

	if (!response.ok) {
		throw new Error(`Bridge call failed: ${response.status}`);
	}

	const payload = await response.json();
	const ubusCode = payload?.result?.[0];

	if (isAuthRejectedPayload(payload)) {
		redirectToLogin();
		throw new Error(payload?.error?.message ?? "LuCI session rejected");
	}

	if (payload?.error || (typeof ubusCode === "number" && ubusCode !== 0)) {
		throw new Error(payload?.error?.message ?? `Bridge call failed: ubus status ${ubusCode}`);
	}

	const result = payload?.result?.[1] as BridgeResponse<T> | undefined;

	if (!result?.ok) {
		throw new Error(`Bridge returned invalid response for ${method}`);
	}

	return result.data;
}

function isAuthRejectedPayload(payload: { error?: { message?: string }; result?: unknown[] } | undefined): boolean {
	const ubusCode = payload?.result?.[0];
	const message = String(payload?.error?.message ?? "").toLowerCase();

	return ubusCode === 6 || message.includes("permission denied") || message.includes("access denied");
}

export async function getSessionInfo(): Promise<SessionInfo> {
	try {
		return await callBridge<SessionInfo>("session_info");
	}
	catch {
		return fallbackSession;
	}
}

export async function probeAuthSession(): Promise<AuthSessionProbe> {
	const config = getShellConfig();

	if (!config.sessionId) {
		return { status: "expired", message: "Missing LuCI session id" };
	}

	try {
		const response = await fetch("/ubus/", {
			method: "POST",
			headers: { "content-type": "application/json" },
			credentials: "same-origin",
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: "auth_probe",
				method: "call",
				params: [config.sessionId, "luci.iloveluci", "session_info", {}],
			}),
		});

		if (response.status === 403 || response.headers.get("X-LuCI-Login-Required") === "yes") {
			return { status: "expired", message: "LuCI login required" };
		}

		if (!response.ok) {
			return { status: "unknown", message: `Auth probe failed: ${response.status}` };
		}

		const payload = await response.json();
		const ubusCode = payload?.result?.[0];
		const result = payload?.result?.[1] as BridgeResponse<SessionInfo> | undefined;

		if (ubusCode === 0 && result?.ok) {
			return { status: "valid" };
		}

		if (payload?.error || (typeof ubusCode === "number" && ubusCode !== 0)) {
			return { status: "expired", message: payload?.error?.message ?? "LuCI session rejected" };
		}

		return { status: "unknown", message: "Auth probe returned unexpected payload" };
	}
	catch (error) {
		return { status: "unknown", message: error instanceof Error ? error.message : "Auth probe failed" };
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

export async function getConsoleLaunch(): Promise<ConsoleLaunch> {
	try {
		return await callBridge<ConsoleLaunch>("console_launch");
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
			dhcpPools: [],
			dhcpStatus: {},
			firewall: [],
			firewallFiles: [],
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

export async function runPackageAction(action: PackageAction, name = "", simulate = true, options: PackageActionOptions = {}): Promise<PackageActionResult> {
	try {
		return await callBridge<PackageActionResult>("package_action", { action, name, simulate, options });
	}
	catch {
		return {
			ok: false,
			manager: "unknown",
			action,
			name,
			simulate,
			command: "",
			output: "",
			message: "Package action failed.",
		};
	}
}

export async function startPackageJob(action: PackageAction, name = "", options: PackageActionOptions = {}): Promise<PackageJobStartResult> {
	try {
		return await callBridge<PackageJobStartResult>("package_job_start", { action, name, options });
	}
	catch {
		return {
			started: false,
			job: null,
			result: {
				ok: false,
				manager: "unknown",
				action,
				name,
				simulate: false,
				command: "",
				output: "",
				message: "Package job start failed.",
			},
		};
	}
}

export async function getPackageJobStatus(id: string): Promise<PackageJobStatus> {
	try {
		return await callBridge<PackageJobStatus>("package_job_status", { id });
	}
	catch {
		return {
			id,
			running: false,
			done: true,
			result: {
				ok: false,
				manager: "unknown",
				action: "install",
				name: "",
				simulate: false,
				command: "",
				output: "",
				message: "Package job status failed.",
			},
		};
	}
}

export async function stagePackageFile(filename: string, data: string): Promise<PackageFileStageResult> {
	try {
		return await callBridge<PackageFileStageResult>("package_file_stage", { filename, data });
	}
	catch {
		return {
			ok: false,
			message: "Package file staging failed.",
			filename,
			path: "",
			size: 0,
			checksum: "",
			sha256sum: "",
		};
	}
}

export async function savePackageFeeds(rows: PackageFeedRow[]): Promise<PackageFeedsResult> {
	try {
		return await callBridge<PackageFeedsResult>("package_feeds_save", { rows });
	}
	catch {
		return {
			saved: false,
			message: "Package feed configuration save failed.",
			changed: false,
			feeds: [],
		};
	}
}

export async function saveAttendedSysupgradeConfig(config: AttendedSysupgradeConfigInput): Promise<AttendedSysupgradeConfigResult> {
	try {
		return await callBridge<AttendedSysupgradeConfigResult>("attendedsysupgrade_config_save", { config });
	}
	catch {
		return {
			saved: false,
			message: "Attended sysupgrade settings save failed.",
			changed: false,
			sections: [],
		};
	}
}

export async function runAttendedSysupgradePlan(action: AttendedSysupgradePlanAction): Promise<AttendedSysupgradePlanResult> {
	try {
		return await callBridge<AttendedSysupgradePlanResult>("attendedsysupgrade_plan", { action });
	}
	catch {
		return {
			ok: false,
			helper: "unknown",
			action,
			command: "",
			output: "",
			lines: [],
			warnings: [],
			message: "Attended sysupgrade planning failed.",
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

export async function saveDropbearConfigs(rows: DropbearConfigInput[]): Promise<DropbearConfigResult> {
	try {
		return await callBridge<DropbearConfigResult>("dropbear_config_save", { config: { rows } });
	}
	catch {
		return {
			saved: false,
			message: "SSH access save failed.",
			changed: false,
			section: null,
			sections: [],
			init: null,
		};
	}
}

export async function saveLedConfig(rows: LedConfigRow[], allowEmpty = false): Promise<LedConfigResult> {
	try {
		return await callBridge<LedConfigResult>("led_config_save", { rows, allow_empty: allowEmpty });
	}
	catch {
		return {
			saved: false,
			message: "LED configuration save failed.",
			changed: false,
			sections: [],
		};
	}
}

export async function saveUhttpdConfig(config: UhttpdConfigInput): Promise<UhttpdConfigResult> {
	try {
		return await callBridge<UhttpdConfigResult>("uhttpd_config_save", { config });
	}
	catch {
		return {
			saved: false,
			message: "HTTP access save failed.",
			changed: false,
			section: null,
			init: null,
		};
	}
}

export async function saveUhttpdConfigs(rows: UhttpdConfigInput[]): Promise<UhttpdConfigResult> {
	try {
		return await callBridge<UhttpdConfigResult>("uhttpd_config_save", { config: { rows } });
	}
	catch {
		return {
			saved: false,
			message: "HTTP access save failed.",
			changed: false,
			section: null,
			sections: [],
			init: null,
		};
	}
}

export async function saveUhttpdCertificateFile(kind: "cert" | "key", filename: string, text: string, encoding: "text" | "base64" = "text"): Promise<UhttpdCertificateFileResult> {
	try {
		return await callBridge<UhttpdCertificateFileResult>("uhttpd_certificate_file_save", { kind, filename, text, encoding });
	}
	catch {
		return {
			saved: false,
			message: "Certificate file save failed.",
			changed: false,
			section: null,
			sections: [],
			init: null,
		};
	}
}

export async function removeUhttpdCertificate(action: "remove_files" | "remove_config"): Promise<UhttpdCertificateFileResult> {
	try {
		return await callBridge<UhttpdCertificateFileResult>("uhttpd_certificate_remove", { action, confirm: "remove" });
	}
	catch {
		return {
			saved: false,
			message: "Certificate removal failed.",
			changed: false,
			section: null,
			sections: [],
			init: null,
		};
	}
}

export async function saveUpnpdConfig(config: UpnpdConfigInput, rules: UpnpdRule[]): Promise<UpnpdConfigResult> {
	try {
		return await callBridge<UpnpdConfigResult>("upnpd_config_save", { config, rules });
	}
	catch {
		return {
			saved: false,
			message: "UPnP settings save failed.",
			changed: false,
			config: null,
			rules: [],
			activeRules: [],
			sections: [],
		};
	}
}

export async function deleteUpnpdActiveRule(token: string): Promise<UpnpdActiveRuleDeleteResult> {
	try {
		return await callBridge<UpnpdActiveRuleDeleteResult>("upnpd_active_rule_delete", { token });
	}
	catch {
		return {
			ok: false,
			message: "UPnP port map delete failed.",
			activeRules: [],
		};
	}
}

export async function saveAdblockFastConfig(config: AdblockFastConfigInput, feeds: AdblockFastFeed[]): Promise<AdblockFastConfigResult> {
	try {
		return await callBridge<AdblockFastConfigResult>("adblock_fast_config_save", { config, feeds });
	}
	catch {
		return {
			saved: false,
			message: "AdBlock Fast settings save failed.",
			changed: false,
			config: null,
			feeds: [],
			sections: [],
		};
	}
}

export async function saveBanipConfig(config: BanipConfigInput): Promise<BanipConfigResult> {
	try {
		return await callBridge<BanipConfigResult>("banip_config_save", { config });
	}
	catch {
		return {
			saved: false,
			message: "banIP settings save failed.",
			changed: false,
			section: null,
			sections: [],
		};
	}
}

export async function saveBanipFile(path: string, text: string): Promise<BanipFileResult> {
	try {
		return await callBridge<BanipFileResult>("banip_file_save", { path, text });
	}
	catch {
		return {
			saved: false,
			message: "banIP file save failed.",
			changed: false,
			file: null,
		};
	}
}

export async function saveSystemSettings(config: SystemSettingsInput): Promise<SystemSettingsResult> {
	try {
		return await callBridge<SystemSettingsResult>("system_settings_save", { config });
	}
	catch {
		return {
			saved: false,
			message: "System settings save failed.",
			changed: false,
			sections: [],
		};
	}
}

export async function syncSystemTime(action: "browser" | "ntp", localtime?: number): Promise<SystemTimeSyncResult> {
	try {
		return await callBridge<SystemTimeSyncResult>("system_time_sync", { action, localtime });
	}
	catch {
		return {
			ok: false,
			message: "System time sync failed.",
		};
	}
}

export async function saveLuciUiSettings(config: LuciUiSettingsInput): Promise<LuciUiSettingsResult> {
	try {
		return await callBridge<LuciUiSettingsResult>("luci_ui_settings_save", { config });
	}
	catch {
		return {
			saved: false,
			message: "LuCI UI settings save failed.",
			changed: false,
			sections: [],
		};
	}
}

export async function saveUhttpdCertDefaults(config: UhttpdCertDefaultsInput): Promise<UhttpdCertDefaultsResult> {
	try {
		return await callBridge<UhttpdCertDefaultsResult>("uhttpd_cert_defaults_save", { config });
	}
	catch {
		return {
			saved: false,
			message: "Certificate defaults save failed.",
			changed: false,
			sections: [],
		};
	}
}

export async function saveDhcpHosts(rows: DhcpHost[]): Promise<DhcpHostsResult> {
	try {
		return await callBridge<DhcpHostsResult>("dhcp_hosts_save", { rows });
	}
	catch {
		return {
			saved: false,
			message: "Static DHCP hosts save failed.",
			changed: false,
			hosts: [],
			sections: [],
		};
	}
}

export async function saveDhcpDomains(rows: DhcpDomain[]): Promise<DhcpDomainsResult> {
	try {
		return await callBridge<DhcpDomainsResult>("dhcp_domains_save", { rows });
	}
	catch {
		return {
			saved: false,
			message: "DNS host records save failed.",
			changed: false,
			domains: [],
			sections: [],
		};
	}
}

export async function saveDhcpPools(rows: DhcpPool[]): Promise<DhcpPoolsResult> {
	try {
		return await callBridge<DhcpPoolsResult>("dhcp_pools_save", { rows });
	}
	catch {
		return {
			saved: false,
			message: "DHCP pools save failed.",
			changed: false,
			pools: [],
			sections: [],
		};
	}
}

export async function saveDhcpRelays(rows: DhcpRelay[]): Promise<DhcpRelaysResult> {
	try {
		return await callBridge<DhcpRelaysResult>("dhcp_relays_save", { rows });
	}
	catch {
		return {
			saved: false,
			message: "DHCP relay save failed.",
			changed: false,
			relays: [],
			sections: [],
		};
	}
}

export async function saveDhcpBoots(rows: DhcpBoot[]): Promise<DhcpBootsResult> {
	try {
		return await callBridge<DhcpBootsResult>("dhcp_boots_save", { rows });
	}
	catch {
		return {
			saved: false,
			message: "PXE/TFTP boot options save failed.",
			changed: false,
			boots: [],
			sections: [],
		};
	}
}

export async function saveDhcpBoot6s(rows: DhcpBoot6[]): Promise<DhcpBoot6sResult> {
	try {
		return await callBridge<DhcpBoot6sResult>("dhcp_boot6s_save", { rows });
	}
	catch {
		return {
			saved: false,
			message: "IPv6 PXE boot options save failed.",
			changed: false,
			boots: [],
			sections: [],
		};
	}
}

export async function saveDhcpTags(rows: DhcpTag[]): Promise<DhcpTagsResult> {
	try {
		return await callBridge<DhcpTagsResult>("dhcp_tags_save", { rows });
	}
	catch {
		return {
			saved: false,
			message: "DHCP tag save failed.",
			changed: false,
			tags: [],
			sections: [],
		};
	}
}

export async function saveDhcpMatches(rows: DhcpMatch[]): Promise<DhcpMatchesResult> {
	try {
		return await callBridge<DhcpMatchesResult>("dhcp_matches_save", { rows });
	}
	catch {
		return {
			saved: false,
			message: "DHCP match save failed.",
			changed: false,
			matches: [],
			sections: [],
		};
	}
}

export async function saveDhcpVendorClasses(rows: DhcpVendorClass[]): Promise<DhcpVendorClassesResult> {
	try {
		return await callBridge<DhcpVendorClassesResult>("dhcp_vendorclasses_save", { rows });
	}
	catch {
		return {
			saved: false,
			message: "DHCP vendor class save failed.",
			changed: false,
			classes: [],
			sections: [],
		};
	}
}

export async function saveDhcpUserClasses(rows: DhcpUserClass[]): Promise<DhcpUserClassesResult> {
	try {
		return await callBridge<DhcpUserClassesResult>("dhcp_userclasses_save", { rows });
	}
	catch {
		return {
			saved: false,
			message: "DHCP user class save failed.",
			changed: false,
			classes: [],
			sections: [],
		};
	}
}

export async function saveDnsmasqConfig(config: DnsmasqConfigInput): Promise<DnsmasqConfigResult> {
	try {
		return await callBridge<DnsmasqConfigResult>("dnsmasq_config_save", { config });
	}
	catch {
		return {
			saved: false,
			message: "DNS settings save failed.",
			changed: false,
			section: null,
			sections: [],
		};
	}
}

export async function saveOdhcpdConfig(config: OdhcpdConfigInput): Promise<OdhcpdConfigResult> {
	try {
		return await callBridge<OdhcpdConfigResult>("odhcpd_config_save", { config });
	}
	catch {
		return {
			saved: false,
			message: "odhcpd settings save failed.",
			changed: false,
			section: null,
			sections: [],
		};
	}
}

export async function saveNetworkRoutes(rows: StaticRoute[], allowEmpty = false): Promise<StaticRoutesResult> {
	try {
		return await callBridge<StaticRoutesResult>("network_routes_save", { rows, allow_empty: allowEmpty });
	}
	catch {
		return {
			saved: false,
			message: "Static routes save failed.",
			changed: false,
			routes: [],
			sections: [],
		};
	}
}

export async function saveNetworkRules(rows: PolicyRule[], allowEmpty = false): Promise<PolicyRulesResult> {
	try {
		return await callBridge<PolicyRulesResult>("network_rules_save", { rows, allow_empty: allowEmpty });
	}
	catch {
		return {
			saved: false,
			message: "Policy rules save failed.",
			changed: false,
			rules: [],
			sections: [],
		};
	}
}

export async function saveNetworkInterfaces(rows: NetworkInterfaceConfig[]): Promise<NetworkInterfacesResult> {
	try {
		return await callBridge<NetworkInterfacesResult>("network_interfaces_save", { rows });
	}
	catch {
		return {
			saved: false,
			message: "Network interfaces save failed.",
			changed: false,
			interfaces: [],
			sections: [],
		};
	}
}

export async function runNetworkInterfaceAction(name: string, action: NetworkInterfaceAction = "status"): Promise<NetworkInterfaceActionResult> {
	try {
		return await callBridge<NetworkInterfaceActionResult>("network_interface_action", { name, action });
	}
	catch {
		return {
			ok: false,
			name,
			action,
			message: "Network interface action failed.",
			state: null,
		};
	}
}

export async function saveNetworkDevices(rows: NetworkDeviceConfig[]): Promise<NetworkDevicesResult> {
	try {
		return await callBridge<NetworkDevicesResult>("network_devices_save", { rows });
	}
	catch {
		return {
			saved: false,
			message: "Network devices save failed.",
			changed: false,
			devices: [],
			sections: [],
		};
	}
}

export async function saveFirewallDefaults(config: FirewallDefaultsInput): Promise<FirewallDefaultsResult> {
	try {
		return await callBridge<FirewallDefaultsResult>("firewall_defaults_save", { config });
	}
	catch {
		return {
			saved: false,
			message: "Firewall defaults save failed.",
			changed: false,
			section: null,
			sections: [],
		};
	}
}

export async function saveFirewallZones(rows: FirewallZone[]): Promise<FirewallZonesResult> {
	try {
		return await callBridge<FirewallZonesResult>("firewall_zones_save", { rows });
	}
	catch {
		return {
			saved: false,
			message: "Firewall zones save failed.",
			changed: false,
			zones: [],
			sections: [],
		};
	}
}

export async function saveFirewallForwardings(rows: FirewallForwarding[]): Promise<FirewallForwardingsResult> {
	try {
		return await callBridge<FirewallForwardingsResult>("firewall_forwardings_save", { rows });
	}
	catch {
		return {
			saved: false,
			message: "Firewall forwardings save failed.",
			changed: false,
			forwardings: [],
			sections: [],
		};
	}
}

export async function saveFirewallRules(rows: FirewallRuleRow[]): Promise<FirewallRulesResult> {
	try {
		return await callBridge<FirewallRulesResult>("firewall_rules_save", { rows });
	}
	catch {
		return {
			saved: false,
			message: "Firewall rules save failed.",
			changed: false,
			rules: [],
			sections: [],
		};
	}
}

export async function saveFirewallRedirects(rows: FirewallRedirect[]): Promise<FirewallRedirectsResult> {
	try {
		return await callBridge<FirewallRedirectsResult>("firewall_redirects_save", { rows });
	}
	catch {
		return {
			saved: false,
			message: "Firewall redirects save failed.",
			changed: false,
			redirects: [],
			sections: [],
		};
	}
}

export async function saveFirewallNats(rows: FirewallNat[]): Promise<FirewallNatsResult> {
	try {
		return await callBridge<FirewallNatsResult>("firewall_nats_save", { rows });
	}
	catch {
		return {
			saved: false,
			message: "Firewall NAT rules save failed.",
			changed: false,
			nats: [],
			sections: [],
		};
	}
}

export async function saveFirewallIpSets(rows: FirewallIpSet[], allowEmpty = false): Promise<FirewallIpSetsResult> {
	try {
		return await callBridge<FirewallIpSetsResult>("firewall_ipsets_save", { rows, allow_empty: allowEmpty });
	}
	catch {
		return {
			saved: false,
			message: "Firewall IP sets save failed.",
			changed: false,
			ipsets: [],
			sections: [],
		};
	}
}

export async function saveFirewallIncludes(rows: FirewallInclude[]): Promise<FirewallIncludesResult> {
	try {
		return await callBridge<FirewallIncludesResult>("firewall_includes_save", { rows });
	}
	catch {
		return {
			saved: false,
			message: "Firewall includes save failed.",
			changed: false,
			includes: [],
			sections: [],
		};
	}
}

export async function saveFirewallFile(path: string, text: string): Promise<FirewallFileResult> {
	try {
		return await callBridge<FirewallFileResult>("firewall_file_save", { path, text });
	}
	catch {
		return {
			saved: false,
			message: "Firewall file save failed.",
			changed: false,
			file: null,
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

export async function saveCustomCommands(rows: CustomCommand[]): Promise<CustomCommandsSaveResult> {
	try {
		return await callBridge<CustomCommandsSaveResult>("custom_commands_save", { rows });
	}
	catch {
		return {
			saved: false,
			message: "Custom commands save failed.",
			changed: false,
			commands: [],
			sections: [],
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

export async function confirmReboot(confirm: string): Promise<RebootResult> {
	try {
		return await callBridge<RebootResult>("reboot_confirm", { confirm });
	}
	catch {
		return {
			accepted: false,
			message: "Reboot request failed.",
		};
	}
}

export async function createConfigBackup(dryRun = false): Promise<ConfigBackupResult> {
	try {
		return await callBridge<ConfigBackupResult>("config_backup_create", { dry_run: dryRun });
	}
	catch {
		return {
			ok: false,
			message: "Configuration backup failed.",
			filename: "",
			size: 0,
			mime: "application/gzip",
			data: "",
		};
	}
}

export async function saveSysupgradeConfig(text: string): Promise<SysupgradeConfigResult> {
	try {
		return await callBridge<SysupgradeConfigResult>("sysupgrade_config_save", { text });
	}
	catch {
		return {
			saved: false,
			message: "Backup configuration list save failed.",
			changed: false,
			config: text,
		};
	}
}

export async function validateRestoreBackup(filename: string, data: string): Promise<RestoreBackupValidationResult> {
	try {
		return await callBridge<RestoreBackupValidationResult>("restore_backup_validate", { filename, data });
	}
	catch {
		return {
			ok: false,
			message: "Backup archive validation failed.",
			filename,
			entries: [],
		};
	}
}

export async function applyRestoreBackup(): Promise<DestructiveActionResult> {
	try {
		return await callBridge<DestructiveActionResult>("restore_backup_apply", { confirm: "restore-backup" });
	}
	catch {
		return {
			accepted: false,
			message: "Backup restore request failed.",
		};
	}
}

export async function applyFactoryReset(): Promise<DestructiveActionResult> {
	try {
		return await callBridge<DestructiveActionResult>("firstboot_apply", { confirm: "erase-settings" });
	}
	catch {
		return {
			accepted: false,
			message: "Factory reset request failed.",
		};
	}
}

export async function downloadMtdBlock(id: string): Promise<ConfigBackupResult> {
	try {
		return await callBridge<ConfigBackupResult>("mtdblock_download", { id });
	}
	catch {
		return {
			ok: false,
			message: "MTD block download failed.",
			filename: "",
			size: 0,
			mime: "application/octet-stream",
			data: "",
		};
	}
}

export async function validateFirmwareImage(filename: string, data: string): Promise<FirmwareValidationResult> {
	try {
		return await callBridge<FirmwareValidationResult>("firmware_validate", { filename, data });
	}
	catch {
		return {
			ok: false,
			message: "Firmware image validation failed.",
			filename,
			size: 0,
			checksum: "",
			sha256sum: "",
			valid: false,
			forceable: false,
			allowBackup: false,
			tooBig: false,
			output: "",
		};
	}
}

export async function flashFirmware(options: FirmwareFlashOptions): Promise<DestructiveActionResult> {
	try {
		return await callBridge<DestructiveActionResult>("firmware_flash", { options });
	}
	catch {
		return {
			accepted: false,
			message: "Firmware flash request failed.",
		};
	}
}
