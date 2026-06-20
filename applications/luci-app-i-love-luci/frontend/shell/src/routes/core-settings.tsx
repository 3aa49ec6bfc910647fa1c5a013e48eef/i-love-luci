import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import {
	getCoreSettings,
	getDashboardStatus,
	type ConfigSection,
	type CoreSettings,
	type DashboardStatus,
	type DhcpDomain,
	type DhcpHost,
	type DhcpLease,
	type NetworkInterfaceStatus,
	type ServiceState,
} from "@/lib/rpc";

type CorePage = "network" | "dhcp" | "firewall" | "system";

const pageMeta: Record<CorePage, { title: string; description: string; configKey: keyof CoreSettings }> = {
	network: {
		title: "Network interfaces",
		description: "Modern read-only view of interface, device, route, and live link state.",
		configKey: "network",
	},
	dhcp: {
		title: "DHCP and DNS",
		description: "Modern read-only view of dnsmasq, DHCP pools, host leases, and odhcpd sections.",
		configKey: "dhcp",
	},
	firewall: {
		title: "Firewall",
		description: "Modern read-only view of zones, forwarding, rules, redirects, and defaults.",
		configKey: "firewall",
	},
	system: {
		title: "System administration",
		description: "Modern read-only view of system, SSH, uHTTPd, and package key configuration.",
		configKey: "system",
	},
};

export function CoreSettingsPage() {
	const params = useParams();
	const page = normalizePage(params.page);
	const meta = pageMeta[page];
	const [settings, setSettings] = useState<CoreSettings | null>(null);
	const [dashboard, setDashboard] = useState<DashboardStatus | null>(null);

	useEffect(() => {
		let cancelled = false;

		void Promise.all([getCoreSettings(page), getDashboardStatus()]).then(([nextSettings, nextDashboard]) => {
			if (cancelled) {
				return;
			}

			setSettings(nextSettings);
			setDashboard(nextDashboard);
		});

		return () => {
			cancelled = true;
		};
	}, [page]);

	const sections = useMemo(() => {
		if (!settings) {
			return [];
		}

		return settings[meta.configKey] as ConfigSection[];
	}, [meta.configKey, settings]);

	return (
		<div className="mx-auto grid w-full max-w-7xl gap-5">
			<header className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div className="min-w-0">
					<h1 className="text-2xl font-semibold">{meta.title}</h1>
					<p className="text-sm text-muted-foreground">{meta.description}</p>
				</div>
				<Badge className="shrink-0 text-primary">partial modern</Badge>
			</header>

			{page === "network" ? <NetworkSummary dashboard={dashboard} /> : null}
			{page === "dhcp" && settings ? <DhcpSummary settings={settings} /> : null}
			{page === "firewall" && settings ? <FirewallSummary settings={settings} /> : null}

			<section className="grid gap-3">
				<div className="flex items-center justify-between gap-3">
					<h2 className="text-base font-semibold">Configuration</h2>
					<span className="text-xs text-muted-foreground">{sections.length} sections</span>
				</div>
				<div className="overflow-x-auto rounded-md border bg-card">
					<table className="w-full min-w-[48rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Section</th>
								<th className="px-3 py-2 font-medium">Type</th>
								<th className="px-3 py-2 font-medium">Values</th>
							</tr>
						</thead>
						<tbody>
							{sections.length ? (
								sections.map((section) => (
									<tr className="border-b align-top last:border-0" key={`${section.type}.${section.name}`}>
										<td className="px-3 py-3 font-medium">{section.name}</td>
										<td className="px-3 py-3 text-muted-foreground">{section.type}</td>
										<td className="px-3 py-3">
											<KeyValueList section={section} />
										</td>
									</tr>
								))
							) : (
								<tr>
									<td className="px-3 py-6 text-muted-foreground" colSpan={3}>
										No matching configuration sections found.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	);
}

function DhcpSummary({ settings }: { settings: CoreSettings }) {
	const leases = settings.dhcpLeases ?? [];
	const staticHosts = settings.dhcpHosts ?? [];
	const domainRecords = settings.dhcpDomains ?? [];

	return (
		<div className="grid gap-5">
			<section className="grid gap-3">
				<h2 className="text-base font-semibold">Service status</h2>
				<div className="grid gap-3 sm:grid-cols-3">
					<ServiceStatusBlock label="dnsmasq" state={settings.dhcpStatus?.dnsmasq} />
					<ServiceStatusBlock label="odhcpd" state={settings.dhcpStatus?.odhcpd} />
					<div className="rounded-md border bg-card p-3 text-sm">
						<div className="text-xs uppercase text-muted-foreground">Active leases</div>
						<div className="mt-1 text-2xl font-semibold">{leases.length}</div>
						<div className="mt-1 text-xs text-muted-foreground">{settings.dhcpStatus?.leaseFile ?? "lease file"}</div>
					</div>
				</div>
			</section>

			<LeaseTable leases={leases} />
			<StaticHostTable hosts={staticHosts} />
			<DomainRecordTable records={domainRecords} />
		</div>
	);
}

function ServiceStatusBlock({ label, state }: { label: string; state?: ServiceState | null }) {
	return (
		<div className="rounded-md border bg-card p-3 text-sm">
			<div className="text-xs uppercase text-muted-foreground">{label}</div>
			<div className="mt-3 flex flex-wrap gap-2">
				<Badge className={state?.enabled ? "text-primary" : ""}>{state?.enabled ? "enabled" : "disabled"}</Badge>
				<Badge className={state?.running ? "text-primary" : ""}>{state?.running ? "running" : "stopped"}</Badge>
			</div>
		</div>
	);
}

function LeaseTable({ leases }: { leases: DhcpLease[] }) {
	return (
		<section className="grid gap-3">
			<div className="flex items-center justify-between gap-3">
				<h2 className="text-base font-semibold">Active DHCP leases</h2>
				<span className="text-xs text-muted-foreground">{leases.length} leases</span>
			</div>
			<div className="overflow-x-auto rounded-md border bg-card">
				<table className="w-full min-w-[44rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Host</th>
							<th className="px-3 py-2 font-medium">IP</th>
							<th className="px-3 py-2 font-medium">MAC</th>
							<th className="px-3 py-2 font-medium">Expires</th>
							<th className="hidden px-3 py-2 font-medium md:table-cell">Client ID</th>
						</tr>
					</thead>
					<tbody>
						{leases.length ? (
							leases.map((lease) => (
								<tr className="border-b last:border-0" key={`${lease.mac}.${lease.ip}.${lease.clientId}`}>
									<td className="px-3 py-3 font-medium">{lease.hostname || "unknown"}</td>
									<td className="px-3 py-3 font-mono text-xs">{lease.ip}</td>
									<td className="px-3 py-3 font-mono text-xs">{lease.mac}</td>
									<td className="px-3 py-3">{formatDuration(lease.remaining)}</td>
									<td className="hidden max-w-[18rem] truncate px-3 py-3 font-mono text-xs text-muted-foreground md:table-cell">
										{lease.clientId || "none"}
									</td>
								</tr>
							))
						) : (
							<tr>
								<td className="px-3 py-6 text-muted-foreground" colSpan={5}>
									No active DHCP leases found.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</section>
	);
}

function StaticHostTable({ hosts }: { hosts: DhcpHost[] }) {
	return (
		<SimpleSectionTable
			columns={["Name", "IP", "MAC"]}
			empty="No static DHCP hosts configured."
			rows={hosts.map((host) => [host.name, host.ip, host.mac])}
			title="Static DHCP hosts"
		/>
	);
}

function DomainRecordTable({ records }: { records: DhcpDomain[] }) {
	return (
		<SimpleSectionTable
			columns={["Name", "IP"]}
			empty="No DNS host records configured."
			rows={records.map((record) => [record.name, record.ip])}
			title="DNS host records"
		/>
	);
}

function FirewallSummary({ settings }: { settings: CoreSettings }) {
	const defaults = settings.firewall.filter((section) => section.type === "defaults");
	const zones = settings.firewall.filter((section) => section.type === "zone");
	const forwardings = settings.firewall.filter((section) => section.type === "forwarding");
	const rules = settings.firewall.filter((section) => section.type === "rule");
	const redirects = settings.firewall.filter((section) => section.type === "redirect");

	return (
		<div className="grid gap-5">
			{defaults.length ? (
				<SimpleSectionTable
					columns={["Input", "Output", "Forward", "Syn flood", "Flow offload", "HW offload"]}
					empty="No firewall defaults configured."
					rows={defaults.map((section) => [
						valueText(section.values.input),
						valueText(section.values.output),
						valueText(section.values.forward),
						enabledText(section.values.synflood_protect),
						enabledText(section.values.flow_offloading),
						enabledText(section.values.flow_offloading_hw),
					])}
					title="Defaults"
				/>
			) : null}

			<SimpleSectionTable
				columns={["Zone", "Networks", "Devices", "Input", "Output", "Forward", "NAT"]}
				empty="No firewall zones configured."
				rows={zones.map((section) => [
					valueText(section.values.name || section.name),
					valueText(section.values.network),
					valueText(section.values.device),
					valueText(section.values.input),
					valueText(section.values.output),
					valueText(section.values.forward),
					enabledText(section.values.masq),
				])}
				title="Zones"
			/>

			<SimpleSectionTable
				columns={["Source", "Destination"]}
				empty="No zone forwardings configured."
				rows={forwardings.map((section) => [valueText(section.values.src), valueText(section.values.dest)])}
				title="Zone forwardings"
			/>

			<FirewallRuleTable rules={rules} />

			{redirects.length ? <FirewallRedirectTable redirects={redirects} /> : null}
		</div>
	);
}

function FirewallRuleTable({ rules }: { rules: ConfigSection[] }) {
	return (
		<section className="grid gap-3">
			<div className="flex items-center justify-between gap-3">
				<h2 className="text-base font-semibold">Traffic rules</h2>
				<span className="text-xs text-muted-foreground">{rules.length} rules</span>
			</div>
			<div className="overflow-x-auto rounded-md border bg-card">
				<table className="w-full min-w-[58rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Rule</th>
							<th className="px-3 py-2 font-medium">Status</th>
							<th className="px-3 py-2 font-medium">From</th>
							<th className="px-3 py-2 font-medium">To</th>
							<th className="px-3 py-2 font-medium">Protocol</th>
							<th className="px-3 py-2 font-medium">Ports</th>
							<th className="px-3 py-2 font-medium">Target</th>
						</tr>
					</thead>
					<tbody>
						{rules.length ? (
							rules.map((rule) => (
								<tr className="border-b align-top last:border-0" key={rule.name}>
									<td className="px-3 py-3 font-medium">{valueText(rule.values.name || rule.name)}</td>
									<td className="px-3 py-3">
										<Badge className={isEnabledValue(rule.values.enabled) ? "text-primary" : ""}>
											{isEnabledValue(rule.values.enabled) ? "enabled" : "disabled"}
										</Badge>
									</td>
									<td className="px-3 py-3">{firewallEndpoint(rule.values.src, rule.values.src_ip)}</td>
									<td className="px-3 py-3">{firewallEndpoint(rule.values.dest, rule.values.dest_ip)}</td>
									<td className="px-3 py-3">{valueText(rule.values.proto)}</td>
									<td className="px-3 py-3">{valueText(rule.values.dest_port || rule.values.src_port || rule.values.icmp_type)}</td>
									<td className="px-3 py-3">{targetText(rule.values.target, rule.values.family)}</td>
								</tr>
							))
						) : (
							<tr>
								<td className="px-3 py-6 text-muted-foreground" colSpan={7}>
									No traffic rules configured.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</section>
	);
}

function FirewallRedirectTable({ redirects }: { redirects: ConfigSection[] }) {
	return (
		<SimpleSectionTable
			columns={["Name", "Status", "Source", "External port", "Destination", "Internal", "Protocol"]}
			empty="No port forwards configured."
			rows={redirects.map((redirect) => [
				valueText(redirect.values.name || redirect.name),
				isEnabledValue(redirect.values.enabled) ? "enabled" : "disabled",
				valueText(redirect.values.src),
				valueText(redirect.values.src_dport),
				valueText(redirect.values.dest),
				[valueText(redirect.values.dest_ip), valueText(redirect.values.dest_port)].filter((value) => value !== "none").join(":") ||
					"none",
				valueText(redirect.values.proto),
			])}
			title="Port forwards"
		/>
	);
}

function SimpleSectionTable({
	columns,
	empty,
	rows,
	title,
}: {
	columns: string[];
	empty: string;
	rows: string[][];
	title: string;
}) {
	return (
		<section className="grid gap-3">
			<div className="flex items-center justify-between gap-3">
				<h2 className="text-base font-semibold">{title}</h2>
				<span className="text-xs text-muted-foreground">{rows.length} entries</span>
			</div>
			<div className="overflow-x-auto rounded-md border bg-card">
				<table className="w-full min-w-[34rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							{columns.map((column) => (
								<th className="px-3 py-2 font-medium" key={column}>
									{column}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.length ? (
							rows.map((row, index) => (
								<tr className="border-b last:border-0" key={`${title}.${index}`}>
									{row.map((value, valueIndex) => (
										<td className="px-3 py-3" key={`${title}.${index}.${valueIndex}`}>
											{value || "none"}
										</td>
									))}
								</tr>
							))
						) : (
							<tr>
								<td className="px-3 py-6 text-muted-foreground" colSpan={columns.length}>
									{empty}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</section>
	);
}

function NetworkSummary({ dashboard }: { dashboard: DashboardStatus | null }) {
	const interfaces = [...(dashboard?.interfaces ?? [])].sort(sortNetworkInterfaces);
	const devices = Object.entries(dashboard?.devices ?? {})
		.filter(([, device]) => device.present && device.devtype === "ethernet")
		.sort(([a], [b]) => a.localeCompare(b));

	if (!interfaces.length && !devices.length) {
		return null;
	}

	return (
		<div className="grid gap-5">
			{interfaces.length ? <InterfaceStatusTable interfaces={interfaces} /> : null}
			{devices.length ? <DeviceStatusTable devices={devices} /> : null}
		</div>
	);
}

function InterfaceStatusTable({ interfaces }: { interfaces: NetworkInterfaceStatus[] }) {
	return (
		<section className="grid gap-3">
			<div className="flex items-center justify-between gap-3">
				<h2 className="text-base font-semibold">Interfaces</h2>
				<span className="text-xs text-muted-foreground">{interfaces.length} interfaces</span>
			</div>
			<div className="overflow-x-auto rounded-md border bg-card">
				<table className="w-full min-w-[58rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Interface</th>
							<th className="px-3 py-2 font-medium">State</th>
							<th className="px-3 py-2 font-medium">Protocol</th>
							<th className="px-3 py-2 font-medium">Device</th>
							<th className="px-3 py-2 font-medium">Addresses</th>
							<th className="px-3 py-2 font-medium">Uptime</th>
						</tr>
					</thead>
					<tbody>
						{interfaces.map((iface) => {
							const addresses = getInterfaceAddresses(iface);
							const name = iface.interface ?? iface.device ?? "unknown";

							return (
								<tr className="border-b align-top last:border-0" key={name}>
									<td className="px-3 py-3 font-medium">{name}</td>
									<td className="px-3 py-3">
										<div className="flex flex-wrap gap-2">
											<Badge className={iface.up ? "text-primary" : ""}>{iface.up ? "up" : "down"}</Badge>
											{iface.pending ? <Badge>pending</Badge> : null}
											{iface.dynamic ? <Badge>dynamic</Badge> : null}
											{iface.available === false ? <Badge>unavailable</Badge> : null}
										</div>
									</td>
									<td className="px-3 py-3 text-muted-foreground">{iface.proto ?? "unknown"}</td>
									<td className="px-3 py-3">
										<div className="grid gap-1">
											<span>{iface.l3_device ?? iface.device ?? "none"}</span>
											{iface.device && iface.device !== iface.l3_device ? (
												<span className="text-xs text-muted-foreground">base {iface.device}</span>
											) : null}
										</div>
									</td>
									<td className="px-3 py-3">
										{addresses.length ? (
											<div className="grid gap-1 font-mono text-xs">
												{addresses.map((address) => (
													<span key={`${name}.${address}`}>{address}</span>
												))}
											</div>
										) : (
											<span className="text-muted-foreground">none</span>
										)}
									</td>
									<td className="px-3 py-3 text-muted-foreground">{formatUptime(iface.uptime)}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</section>
	);
}

function DeviceStatusTable({ devices }: { devices: Array<[string, DashboardStatus["devices"][string]]> }) {
	return (
		<section className="grid gap-3">
			<div className="flex items-center justify-between gap-3">
				<h2 className="text-base font-semibold">Live devices</h2>
				<span className="text-xs text-muted-foreground">{devices.length} devices</span>
			</div>
			<div className="overflow-x-auto rounded-md border bg-card">
				<table className="w-full min-w-[42rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Device</th>
							<th className="px-3 py-2 font-medium">State</th>
							<th className="px-3 py-2 font-medium">Speed</th>
							<th className="px-3 py-2 text-right font-medium">RX</th>
							<th className="px-3 py-2 text-right font-medium">TX</th>
						</tr>
					</thead>
					<tbody>
						{devices.map(([name, device]) => (
							<tr className="border-b last:border-0" key={name}>
								<td className="px-3 py-3 font-medium">{name}</td>
								<td className="px-3 py-3">
									<Badge className={device.carrier ? "text-primary" : ""}>
										{device.carrier ? "connected" : device.up ? "up" : "down"}
									</Badge>
								</td>
								<td className="px-3 py-3 text-muted-foreground">{device.speed ?? "unknown"}</td>
								<td className="px-3 py-3 text-right">{formatBytes(device.statistics?.rx_bytes)}</td>
								<td className="px-3 py-3 text-right">{formatBytes(device.statistics?.tx_bytes)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}

function KeyValueList({ section }: { section: ConfigSection }) {
	const entries = Object.entries(section.values).filter(([, value]) => value !== "" && value != null);

	if (!entries.length) {
		return <span className="text-muted-foreground">No values</span>;
	}

	return (
		<dl className="grid gap-1">
			{entries.map(([key, value]) => (
				<div className="grid gap-1 sm:grid-cols-[10rem_minmax(0,1fr)]" key={key}>
					<dt className="text-xs font-medium uppercase text-muted-foreground">{key}</dt>
					<dd className="min-w-0 break-words">{formatValue(value)}</dd>
				</div>
			))}
		</dl>
	);
}

function normalizePage(page?: string): CorePage {
	if (page === "dhcp" || page === "firewall" || page === "system") {
		return page;
	}

	return "network";
}

function formatValue(value: ConfigSection["values"][string]) {
	return Array.isArray(value) ? value.join(", ") : String(value);
}

function valueText(value: ConfigSection["values"][string] | undefined) {
	if (value == null || value === "") {
		return "none";
	}

	return formatValue(value);
}

function isEnabledValue(value: ConfigSection["values"][string] | undefined) {
	return value == null || value === "" || value === "1" || value === 1 || value === true;
}

function enabledText(value: ConfigSection["values"][string] | undefined) {
	return isEnabledValue(value) ? "enabled" : "disabled";
}

function firewallEndpoint(zone: ConfigSection["values"][string] | undefined, address: ConfigSection["values"][string] | undefined) {
	const parts = [valueText(zone), valueText(address)].filter((value) => value !== "none");
	return parts.length ? parts.join(" / ") : "any";
}

function targetText(target: ConfigSection["values"][string] | undefined, family: ConfigSection["values"][string] | undefined) {
	const targetValue = valueText(target);
	const familyValue = valueText(family);

	return familyValue === "none" || familyValue === "any" ? targetValue : `${targetValue} (${familyValue})`;
}

function formatBytes(value?: number) {
	if (!value) {
		return "0 B";
	}

	const units = ["B", "KB", "MB", "GB", "TB"];
	const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
	const scaled = value / 1024 ** index;

	return `${scaled >= 10 || index === 0 ? scaled.toFixed(0) : scaled.toFixed(1)} ${units[index]}`;
}

function getInterfaceAddresses(iface: NetworkInterfaceStatus) {
	const ipv4 = (iface["ipv4-address"] ?? []).map((address) => formatCidr(address.address, address.mask));
	const ipv6 = (iface["ipv6-address"] ?? []).map((address) => formatCidr(address.address, address.mask));
	const prefixes = (iface["ipv6-prefix-assignment"] ?? []).map((prefix) =>
		formatCidr(prefix["local-address"]?.address ?? prefix.address, prefix["local-address"]?.mask ?? prefix.mask),
	);

	return [...ipv4, ...ipv6, ...prefixes].filter((address): address is string => Boolean(address));
}

function formatCidr(address?: string, mask?: number) {
	if (!address) {
		return null;
	}

	return typeof mask === "number" ? `${address}/${mask}` : address;
}

function formatDuration(seconds?: number) {
	if (!seconds) {
		return "expired";
	}

	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	if (hours >= 24) {
		const days = Math.floor(hours / 24);
		return `${days}d ${hours % 24}h`;
	}

	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	}

	return `${minutes}m`;
}

function formatUptime(seconds?: number) {
	if (typeof seconds !== "number") {
		return "unknown";
	}

	if (seconds < 60) {
		return `${Math.max(0, Math.floor(seconds))}s`;
	}

	return formatDuration(seconds);
}

function sortNetworkInterfaces(a: NetworkInterfaceStatus, b: NetworkInterfaceStatus) {
	const aName = a.interface ?? "";
	const bName = b.interface ?? "";

	if (aName === "loopback") {
		return 1;
	}

	if (bName === "loopback") {
		return -1;
	}

	return aName.localeCompare(bName);
}
