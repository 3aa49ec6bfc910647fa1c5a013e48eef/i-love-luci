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
	const rows = Object.entries(dashboard?.devices ?? {})
		.filter(([, device]) => device.present && device.devtype === "ethernet")
		.sort(([a], [b]) => a.localeCompare(b));

	if (!rows.length) {
		return null;
	}

	return (
		<section className="grid gap-3">
			<h2 className="text-base font-semibold">Live interfaces</h2>
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
						{rows.map(([name, device]) => (
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

function formatBytes(value?: number) {
	if (!value) {
		return "0 B";
	}

	const units = ["B", "KB", "MB", "GB", "TB"];
	const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
	const scaled = value / 1024 ** index;

	return `${scaled >= 10 || index === 0 ? scaled.toFixed(0) : scaled.toFixed(1)} ${units[index]}`;
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
