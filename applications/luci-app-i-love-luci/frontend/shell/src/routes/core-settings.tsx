import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	getCoreSettings,
	getDashboardStatus,
	saveDhcpDomains,
	saveDhcpHosts,
	saveDhcpPools,
	saveSystemSettings,
	type ConfigSection,
	type CoreSettings,
	type DashboardStatus,
	type DhcpDomain,
	type DhcpHost,
	type DhcpLease,
	type DhcpPool,
	type NetworkInterfaceStatus,
	type ServiceState,
	type SystemSettingsInput,
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
		description: "Modern DHCP view with static host reservations, active leases, and DNS summaries.",
		configKey: "dhcp",
	},
	firewall: {
		title: "Firewall",
		description: "Modern read-only view of zones, forwarding, rules, redirects, and defaults.",
		configKey: "firewall",
	},
	system: {
		title: "System administration",
		description: "Modern editor for identity, logging, and NTP with summaries for SSH, uHTTPd, LEDs, and keys.",
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
			</header>

			{page === "network" ? <NetworkSummary dashboard={dashboard} /> : null}
			{page === "dhcp" && settings ? <DhcpSummary onSettingsChange={setSettings} settings={settings} /> : null}
			{page === "firewall" && settings ? <FirewallSummary settings={settings} /> : null}
			{page === "system" && settings ? <SystemSummary settings={settings} dashboard={dashboard} /> : null}

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

function DhcpSummary({
	onSettingsChange,
	settings,
}: {
	onSettingsChange: (settings: CoreSettings) => void;
	settings: CoreSettings;
}) {
	const leases = settings.dhcpLeases ?? [];
	const staticHosts = settings.dhcpHosts ?? [];
	const domainRecords = settings.dhcpDomains ?? [];
	const pools = settings.dhcpPools ?? [];

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

			<DhcpPoolEditor
				onSaved={(nextPools, sections) =>
					onSettingsChange({
						...settings,
						dhcp: sections,
						dhcpPools: nextPools,
					})
				}
				pools={pools}
			/>
			<LeaseTable leases={leases} />
			<StaticHostEditor
				hosts={staticHosts}
				onSaved={(hosts, sections) =>
					onSettingsChange({
						...settings,
						dhcp: sections,
						dhcpHosts: hosts,
					})
				}
			/>
			<DomainRecordEditor
				onSaved={(domains, sections) =>
					onSettingsChange({
						...settings,
						dhcp: sections,
						dhcpDomains: domains,
					})
				}
				records={domainRecords}
			/>
		</div>
	);
}

function DhcpPoolEditor({
	onSaved,
	pools,
}: {
	onSaved: (pools: DhcpPool[], sections: ConfigSection[]) => void;
	pools: DhcpPool[];
}) {
	const [rows, setRows] = useState(() => pools.map(normalizeDhcpPool));
	const [savedRows, setSavedRows] = useState(rows);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

	function updateRow(index: number, field: keyof DhcpPool, value: string) {
		setRows((current) =>
			current.map((row, rowIndex) =>
				rowIndex === index
					? {
							...row,
							[field]: value,
						}
					: row,
			),
		);
	}

	function addRow() {
		setRows((current) => [
			...current,
			{ section: "", interface: "", ignore: "0", start: "", limit: "", leasetime: "12h", dhcpv4: "server", dhcpv6: "", ra: "" },
		]);
	}

	function removeRow(index: number) {
		setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await saveDhcpPools(rows);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextRows = result.pools.map(normalizeDhcpPool);
		toast.success(result.message);
		setRows(nextRows);
		setSavedRows(nextRows);
		onSaved(nextRows, result.sections);
	}

	return (
		<section className="grid gap-3">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-base font-semibold">DHCP pools</h2>
					<p className="text-sm text-muted-foreground">Configure address ranges and router advertisement mode per interface.</p>
				</div>
				<Button onClick={addRow} type="button" variant="outline">
					<Plus className="mr-1 size-4" />
					Add pool
				</Button>
			</div>
			<form className="grid gap-3" onSubmit={(event) => void submit(event)}>
				<div className="overflow-x-auto rounded-md border bg-card">
					<table className="w-full min-w-[64rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Interface</th>
								<th className="px-3 py-2 font-medium">Ignore</th>
								<th className="px-3 py-2 font-medium">Start</th>
								<th className="px-3 py-2 font-medium">Limit</th>
								<th className="px-3 py-2 font-medium">Lease</th>
								<th className="px-3 py-2 font-medium">DHCPv4</th>
								<th className="px-3 py-2 font-medium">DHCPv6</th>
								<th className="px-3 py-2 font-medium">RA</th>
								<th className="px-3 py-2 text-right font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{rows.length ? (
								rows.map((pool, index) => (
									<tr className="border-b align-top last:border-0" key={`${pool.section || "new"}.${index}`}>
										<td className="px-3 py-3">
											<Input
												aria-label="Interface"
												onChange={(event) => updateRow(index, "interface", event.target.value)}
												value={pool.interface}
											/>
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`dhcp-pool-ignore-${index}`}
												onChange={(value) => updateRow(index, "ignore", value)}
												options={[
													["0", "No"],
													["1", "Yes"],
												]}
												value={pool.ignore}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Start address offset"
												inputMode="numeric"
												onChange={(event) => updateRow(index, "start", event.target.value)}
												value={pool.start}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Address limit"
												inputMode="numeric"
												onChange={(event) => updateRow(index, "limit", event.target.value)}
												value={pool.limit}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Lease time"
												onChange={(event) => updateRow(index, "leasetime", event.target.value)}
												value={pool.leasetime}
											/>
										</td>
										<td className="px-3 py-3">
											<DhcpModeSelect
												id={`dhcp-pool-v4-${index}`}
												onChange={(value) => updateRow(index, "dhcpv4", value)}
												value={pool.dhcpv4}
											/>
										</td>
										<td className="px-3 py-3">
											<DhcpModeSelect
												id={`dhcp-pool-v6-${index}`}
												onChange={(value) => updateRow(index, "dhcpv6", value)}
												value={pool.dhcpv6}
											/>
										</td>
										<td className="px-3 py-3">
											<DhcpModeSelect
												id={`dhcp-pool-ra-${index}`}
												onChange={(value) => updateRow(index, "ra", value)}
												value={pool.ra}
											/>
										</td>
										<td className="px-3 py-3 text-right">
											<Button
												aria-label={`Remove ${pool.interface || "pool"}`}
												onClick={() => removeRow(index)}
												size="icon"
												type="button"
												variant="ghost"
											>
												<Trash2 className="size-4" />
											</Button>
										</td>
									</tr>
								))
							) : (
								<tr>
									<td className="px-3 py-6 text-muted-foreground" colSpan={9}>
										No DHCP pools configured.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
				<div className="flex justify-end gap-2">
					<Button disabled={!dirty || saving} onClick={() => setRows(savedRows)} type="button" variant="outline">
						Cancel
					</Button>
					<Button disabled={!dirty || saving} type="submit">
						Save
					</Button>
				</div>
			</form>
		</section>
	);
}

function DhcpModeSelect({ id, onChange, value }: { id: string; onChange: (value: string) => void; value: string }) {
	return (
		<SelectField
			id={id}
			onChange={onChange}
			options={[
				["", "Default"],
				["server", "Server"],
				["relay", "Relay"],
				["hybrid", "Hybrid"],
				["disabled", "Disabled"],
			]}
			value={value}
		/>
	);
}

function normalizeDhcpPool(pool: DhcpPool): DhcpPool {
	return {
		section: pool.section ?? "",
		interface: pool.interface ?? "",
		ignore: pool.ignore === "1" ? "1" : "0",
		start: pool.start ?? "",
		limit: pool.limit ?? "",
		leasetime: pool.leasetime ?? "",
		dhcpv4: pool.dhcpv4 ?? "",
		dhcpv6: pool.dhcpv6 ?? "",
		ra: pool.ra ?? "",
	};
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

function StaticHostEditor({
	hosts,
	onSaved,
}: {
	hosts: DhcpHost[];
	onSaved: (hosts: DhcpHost[], sections: ConfigSection[]) => void;
}) {
	const [rows, setRows] = useState(() => hosts.map(normalizeDhcpHost));
	const [savedRows, setSavedRows] = useState(rows);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

	function updateRow(index: number, field: keyof DhcpHost, value: string) {
		setRows((current) =>
			current.map((row, rowIndex) =>
				rowIndex === index
					? {
							...row,
							[field]: value,
						}
					: row,
			),
		);
	}

	function addRow() {
		setRows((current) => [...current, { section: "", name: "", ip: "", mac: "" }]);
	}

	function removeRow(index: number) {
		setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await saveDhcpHosts(rows);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextRows = result.hosts.map(normalizeDhcpHost);
		toast.success(result.message);
		setRows(nextRows);
		setSavedRows(nextRows);
		onSaved(nextRows, result.sections);
	}

	return (
		<section className="grid gap-3">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-base font-semibold">Static DHCP hosts</h2>
					<p className="text-sm text-muted-foreground">Reserve addresses by MAC address.</p>
				</div>
				<Button onClick={addRow} type="button" variant="outline">
					<Plus className="mr-1 size-4" />
					Add host
				</Button>
			</div>
			<form className="grid gap-3" onSubmit={(event) => void submit(event)}>
				<div className="overflow-x-auto rounded-md border bg-card">
					<table className="w-full min-w-[46rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Name</th>
								<th className="px-3 py-2 font-medium">IP</th>
								<th className="px-3 py-2 font-medium">MAC</th>
								<th className="px-3 py-2 text-right font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{rows.length ? (
								rows.map((host, index) => (
									<tr className="border-b align-top last:border-0" key={`${host.section || "new"}.${index}`}>
										<td className="px-3 py-3">
											<Input
												aria-label="Host name"
												onChange={(event) => updateRow(index, "name", event.target.value)}
												value={host.name}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Reserved IP"
												inputMode="numeric"
												onChange={(event) => updateRow(index, "ip", event.target.value)}
												value={host.ip}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="MAC address"
												onChange={(event) => updateRow(index, "mac", event.target.value)}
												value={host.mac}
											/>
										</td>
										<td className="px-3 py-3 text-right">
											<Button
												aria-label={`Remove ${host.name || host.ip || "host"}`}
												onClick={() => removeRow(index)}
												size="icon"
												type="button"
												variant="ghost"
											>
												<Trash2 className="size-4" />
											</Button>
										</td>
									</tr>
								))
							) : (
								<tr>
									<td className="px-3 py-6 text-muted-foreground" colSpan={4}>
										No static DHCP hosts configured.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
				<div className="flex justify-end gap-2">
					<Button disabled={!dirty || saving} onClick={() => setRows(savedRows)} type="button" variant="outline">
						Cancel
					</Button>
					<Button disabled={!dirty || saving} type="submit">
						Save
					</Button>
				</div>
			</form>
		</section>
	);
}

function normalizeDhcpHost(host: DhcpHost): DhcpHost {
	return {
		section: host.section ?? "",
		name: host.name ?? "",
		ip: host.ip ?? "",
		mac: host.mac ?? "",
	};
}

function DomainRecordEditor({
	onSaved,
	records,
}: {
	onSaved: (domains: DhcpDomain[], sections: ConfigSection[]) => void;
	records: DhcpDomain[];
}) {
	const [rows, setRows] = useState(() => records.map(normalizeDhcpDomain));
	const [savedRows, setSavedRows] = useState(rows);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

	function updateRow(index: number, field: keyof DhcpDomain, value: string) {
		setRows((current) =>
			current.map((row, rowIndex) =>
				rowIndex === index
					? {
							...row,
							[field]: value,
						}
					: row,
			),
		);
	}

	function addRow() {
		setRows((current) => [...current, { section: "", name: "", ip: "" }]);
	}

	function removeRow(index: number) {
		setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await saveDhcpDomains(rows);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextRows = result.domains.map(normalizeDhcpDomain);
		toast.success(result.message);
		setRows(nextRows);
		setSavedRows(nextRows);
		onSaved(nextRows, result.sections);
	}

	return (
		<section className="grid gap-3">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-base font-semibold">DNS host records</h2>
					<p className="text-sm text-muted-foreground">Map local names to fixed addresses.</p>
				</div>
				<Button onClick={addRow} type="button" variant="outline">
					<Plus className="mr-1 size-4" />
					Add record
				</Button>
			</div>
			<form className="grid gap-3" onSubmit={(event) => void submit(event)}>
				<div className="overflow-x-auto rounded-md border bg-card">
					<table className="w-full min-w-[38rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Name</th>
								<th className="px-3 py-2 font-medium">IP</th>
								<th className="px-3 py-2 text-right font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{rows.length ? (
								rows.map((record, index) => (
									<tr className="border-b align-top last:border-0" key={`${record.section || "new"}.${index}`}>
										<td className="px-3 py-3">
											<Input
												aria-label="DNS name"
												onChange={(event) => updateRow(index, "name", event.target.value)}
												value={record.name}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="DNS IP"
												inputMode="numeric"
												onChange={(event) => updateRow(index, "ip", event.target.value)}
												value={record.ip}
											/>
										</td>
										<td className="px-3 py-3 text-right">
											<Button
												aria-label={`Remove ${record.name || record.ip || "record"}`}
												onClick={() => removeRow(index)}
												size="icon"
												type="button"
												variant="ghost"
											>
												<Trash2 className="size-4" />
											</Button>
										</td>
									</tr>
								))
							) : (
								<tr>
									<td className="px-3 py-6 text-muted-foreground" colSpan={3}>
										No DNS host records configured.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
				<div className="flex justify-end gap-2">
					<Button disabled={!dirty || saving} onClick={() => setRows(savedRows)} type="button" variant="outline">
						Cancel
					</Button>
					<Button disabled={!dirty || saving} type="submit">
						Save
					</Button>
				</div>
			</form>
		</section>
	);
}

function normalizeDhcpDomain(record: DhcpDomain): DhcpDomain {
	return {
		section: record.section ?? "",
		name: record.name ?? "",
		ip: record.ip ?? "",
	};
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

function SystemSummary({ settings, dashboard }: { settings: CoreSettings; dashboard: DashboardStatus | null }) {
	const [systemSections, setSystemSections] = useState(settings.system);
	const system = systemSections.find((section) => section.type === "system");
	const timeservers = systemSections.filter((section) => section.type === "timeserver");
	const leds = systemSections.filter((section) => section.type === "led");
	const dropbear = systemSections.filter((section) => section.type === "dropbear");
	const uhttpd = systemSections.filter((section) => section.type === "uhttpd");
	const certs = systemSections.filter((section) => section.type === "cert");

	return (
		<div className="grid gap-5">
			<SystemSettingsEditor dashboard={dashboard} onSaved={setSystemSections} sections={systemSections} />

			<SimpleSectionTable
				columns={["Hostname", "Timezone", "Local time", "Uptime", "Log size", "Console log", "Cron log"]}
				empty="No system identity configured."
				rows={
					system
						? [
								[
									valueText(system.values.hostname || dashboard?.board.hostname),
									valueText(system.values.zonename || system.values.timezone),
									formatLocalTime(dashboard?.system.localtime),
									formatUptime(dashboard?.system.uptime),
									valueText(system.values.log_size),
									valueText(system.values.conloglevel),
									valueText(system.values.cronloglevel),
								],
							]
						: []
				}
				title="System"
			/>

			<SimpleSectionTable
				columns={["Section", "Servers"]}
				empty="No NTP servers configured."
				rows={timeservers.map((section) => [section.name, valueText(section.values.server)])}
				title="Time servers"
			/>

			<SimpleSectionTable
				columns={["Section", "Status", "Port", "Password auth", "Root password auth"]}
				empty="No Dropbear instances configured."
				rows={dropbear.map((section) => [
					section.name,
					enabledText(section.values.enable),
					valueText(section.values.Port),
					valueText(section.values.PasswordAuth),
					valueText(section.values.RootPasswordAuth),
				])}
				title="SSH access"
			/>

			<SimpleSectionTable
				columns={["Section", "HTTP", "HTTPS", "HTTPS redirect", "Home", "Max connections", "Ubus"]}
				empty="No uHTTPd instances configured."
				rows={uhttpd.map((section) => [
					section.name,
					valueText(section.values.listen_http),
					valueText(section.values.listen_https),
					enabledText(section.values.redirect_https),
					valueText(section.values.home),
					valueText(section.values.max_connections),
					valueText(section.values.ubus_prefix),
				])}
				title="Web server"
			/>

			<SimpleSectionTable
				columns={["LED", "Device", "Trigger", "Mode", "Interface"]}
				empty="No LEDs configured."
				rows={leds.map((section) => [
					valueText(section.values.name || section.name),
					valueText(section.values.sysfs),
					valueText(section.values.trigger),
					valueText(section.values.mode),
					valueText(section.values.dev),
				])}
				title="LEDs"
			/>

			{certs.length ? (
				<SimpleSectionTable
					columns={["Section", "Days", "Key type", "Bits", "Curve", "Common name"]}
					empty="No certificate defaults configured."
					rows={certs.map((section) => [
						section.name,
						valueText(section.values.days),
						valueText(section.values.key_type),
						valueText(section.values.bits),
						valueText(section.values.ec_curve),
						valueText(section.values.commonname),
					])}
					title="Certificate defaults"
				/>
			) : null}
		</div>
	);
}

function SystemSettingsEditor({
	dashboard,
	onSaved,
	sections,
}: {
	dashboard: DashboardStatus | null;
	onSaved: (sections: ConfigSection[]) => void;
	sections: ConfigSection[];
}) {
	const [values, setValues] = useState(() => systemSettingsValues(sections, dashboard));
	const [savedValues, setSavedValues] = useState(values);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(values) !== JSON.stringify(savedValues);

	function updateField(field: keyof SystemSettingsInput, value: string) {
		setValues((current) => ({
			...current,
			[field]: value,
		}));
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await saveSystemSettings(values);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		toast.success(result.message);
		onSaved(result.sections);
		setSavedValues(values);
	}

	return (
		<section className="grid gap-3 border-t pt-4">
			<div className="flex flex-col gap-1">
				<h2 className="text-base font-semibold">System settings</h2>
				<p className="text-sm text-muted-foreground">Edit identity, logging, and basic NTP configuration.</p>
			</div>
			<form className="grid gap-4 rounded-md border bg-card p-4" onSubmit={(event) => void submit(event)}>
				<div className="grid gap-4 md:grid-cols-2">
					<Field label="Hostname" target="system-hostname">
						<Input
							id="system-hostname"
							onChange={(event) => updateField("hostname", event.target.value)}
							value={values.hostname}
						/>
					</Field>
					<Field label="Description" target="system-description">
						<Input
							id="system-description"
							onChange={(event) => updateField("description", event.target.value)}
							value={values.description}
						/>
					</Field>
					<Field label="Log buffer size" target="system-log-size">
						<Input
							id="system-log-size"
							inputMode="numeric"
							onChange={(event) => updateField("log_size", event.target.value)}
							value={values.log_size}
						/>
					</Field>
					<Field label="Log protocol" target="system-log-proto">
						<SelectField
							id="system-log-proto"
							onChange={(value) => updateField("log_proto", value)}
							options={[
								["udp", "UDP"],
								["tcp", "TCP"],
							]}
							value={values.log_proto}
						/>
					</Field>
					<Field label="Console log level" target="system-console-log">
						<LogLevelSelect
							id="system-console-log"
							onChange={(value) => updateField("conloglevel", value)}
							value={values.conloglevel}
						/>
					</Field>
					<Field label="Cron log level" target="system-cron-log">
						<LogLevelSelect
							id="system-cron-log"
							onChange={(value) => updateField("cronloglevel", value)}
							value={values.cronloglevel}
						/>
					</Field>
					<Field label="NTP client" target="system-ntp-enabled">
						<SelectField
							id="system-ntp-enabled"
							onChange={(value) => updateField("ntp_enabled", value)}
							options={[
								["1", "Enabled"],
								["0", "Disabled"],
							]}
							value={values.ntp_enabled}
						/>
					</Field>
					<Field label="Use DHCP advertised servers" target="system-ntp-dhcp">
						<SelectField
							id="system-ntp-dhcp"
							onChange={(value) => updateField("ntp_use_dhcp", value)}
							options={[
								["1", "Enabled"],
								["0", "Disabled"],
							]}
							value={values.ntp_use_dhcp}
						/>
					</Field>
				</div>
				<Field label="NTP servers" target="system-ntp-servers">
					<textarea
						className="min-h-28 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
						id="system-ntp-servers"
						onChange={(event) => updateField("ntp_servers", event.target.value)}
						spellCheck={false}
						value={values.ntp_servers}
					/>
				</Field>
				<div className="flex justify-end gap-2">
					<Button disabled={!dirty || saving} onClick={() => setValues(savedValues)} type="button" variant="outline">
						Cancel
					</Button>
					<Button disabled={!dirty || saving} type="submit">
						Save
					</Button>
				</div>
			</form>
		</section>
	);
}

function Field({ children, label, target }: { children: ReactNode; label: string; target: string }) {
	return (
		<div className="grid gap-2">
			<label className="text-sm font-medium" htmlFor={target}>
				{label}
			</label>
			{children}
		</div>
	);
}

function SelectField({
	id,
	onChange,
	options,
	value,
}: {
	id: string;
	onChange: (value: string) => void;
	options: [string, string][];
	value: string;
}) {
	return (
		<select
			className="h-10 rounded-md border bg-card px-3 text-sm outline-none focus-visible:border-ring"
			id={id}
			onChange={(event) => onChange(event.target.value)}
			value={value}
		>
			{options.map(([optionValue, label]) => (
				<option key={optionValue} value={optionValue}>
					{label}
				</option>
			))}
		</select>
	);
}

function LogLevelSelect({ id, onChange, value }: { id: string; onChange: (value: string) => void; value: string }) {
	return (
		<SelectField
			id={id}
			onChange={onChange}
			options={[
				["", "Default"],
				["0", "0"],
				["1", "1"],
				["2", "2"],
				["3", "3"],
				["4", "4"],
				["5", "5"],
				["6", "6"],
				["7", "7"],
				["8", "8"],
				["9", "9"],
			]}
			value={value}
		/>
	);
}

function systemSettingsValues(sections: ConfigSection[], dashboard: DashboardStatus | null): SystemSettingsInput {
	const system = sections.find((section) => section.type === "system");
	const ntp = sections.find((section) => section.type === "timeserver");

	return {
		hostname: rawValue(system?.values.hostname || dashboard?.board.hostname || "OpenWrt"),
		description: rawValue(system?.values.description),
		log_size: rawValue(system?.values.log_size),
		log_proto: rawValue(system?.values.log_proto || "udp"),
		conloglevel: rawValue(system?.values.conloglevel),
		cronloglevel: rawValue(system?.values.cronloglevel),
		ntp_enabled: rawValue(ntp?.values.enabled || "1") === "0" ? "0" : "1",
		ntp_use_dhcp: rawValue(ntp?.values.use_dhcp || "1") === "0" ? "0" : "1",
		ntp_servers: rawListValue(ntp?.values.server).join("\n"),
	};
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

function rawValue(value: unknown) {
	if (Array.isArray(value)) {
		return value.map((item) => `${item}`).join("\n");
	}

	return value == null ? "" : `${value}`;
}

function rawListValue(value: unknown) {
	if (Array.isArray(value)) {
		return value.map((item) => `${item}`);
	}

	const text = rawValue(value);
	return text ? [text] : [];
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

function formatLocalTime(value?: number) {
	if (typeof value !== "number") {
		return "unknown";
	}

	return new Date(value * 1000).toLocaleString();
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
