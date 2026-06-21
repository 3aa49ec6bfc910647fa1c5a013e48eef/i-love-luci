import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	getCoreSettings,
	getDashboardStatus,
	saveFirewallDefaults,
	saveFirewallFile,
	saveFirewallForwardings,
	saveFirewallIncludes,
	saveFirewallRedirects,
	saveFirewallRules,
	saveFirewallZones,
	saveDhcpDomains,
	saveDhcpHosts,
	saveDhcpPools,
	saveDnsmasqConfig,
	saveLuciUiSettings,
	saveNetworkDevices,
	saveNetworkInterfaces,
	saveNetworkRules,
	saveNetworkRoutes,
	saveSystemSettings,
	saveUhttpdCertDefaults,
	type ConfigSection,
	type CoreSettings,
	type DashboardStatus,
	type DhcpDomain,
	type DhcpHost,
	type DhcpLease,
	type DhcpPool,
	type DnsmasqConfigInput,
	type FirewallDefaultsInput,
	type FirewallForwarding,
	type FirewallInclude,
	type FirewallRedirect,
	type FirewallRuleRow,
	type FirewallZone,
	type LuciUiSettingsInput,
	type NetworkDeviceConfig,
	type NetworkInterfaceConfig,
	type NetworkInterfaceStatus,
	type PolicyRule,
	type ServiceFile,
	type ServiceState,
	type StaticRoute,
	type SystemSettingsInput,
	type UhttpdCertDefaultsInput,
} from "@/lib/rpc";

type CorePage = "network" | "dhcp" | "firewall" | "system";

const pageMeta: Record<CorePage, { title: string; description: string; configKey: keyof CoreSettings }> = {
	network: {
		title: "Network interfaces",
		description: "Modern network view with interface, device, static route, policy rule, and live link state.",
		configKey: "network",
	},
	dhcp: {
		title: "DHCP and DNS",
		description: "Modern DHCP view with static host reservations, active leases, and DNS summaries.",
		configKey: "dhcp",
	},
	firewall: {
		title: "Firewall",
		description: "Modern firewall view with defaults, zones, forwarding, rules, and redirects.",
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

			{page === "network" && settings ? (
				<NetworkSummary
					dashboard={dashboard}
					onSettingsChange={(nextSettings) => setSettings(nextSettings)}
					settings={settings}
				/>
			) : null}
			{page === "dhcp" && settings ? <DhcpSummary onSettingsChange={setSettings} settings={settings} /> : null}
			{page === "firewall" && settings ? <FirewallSummary onSettingsChange={setSettings} settings={settings} /> : null}
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
	const dnsmasq = settings.dhcp.find((section) => section.type === "dnsmasq") ?? null;

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

			{dnsmasq ? (
				<DnsmasqSettingsEditor
					onSaved={(sections) =>
						onSettingsChange({
							...settings,
							dhcp: sections,
						})
					}
					section={dnsmasq}
				/>
			) : null}
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

function DnsmasqSettingsEditor({ onSaved, section }: { onSaved: (sections: ConfigSection[]) => void; section: ConfigSection }) {
	const [values, setValues] = useState(() => dnsmasqSettingsValues(section));
	const [savedValues, setSavedValues] = useState(values);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(values) !== JSON.stringify(savedValues);

	function updateField(field: keyof DnsmasqConfigInput, value: string) {
		setValues((current) => ({
			...current,
			[field]: value,
		}));
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await saveDnsmasqConfig(values);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextValues = result.section ? dnsmasqSettingsValues(result.section) : values;
		toast.success(result.message);
		setValues(nextValues);
		setSavedValues(nextValues);
		onSaved(result.sections);
	}

	return (
		<section className="grid gap-3">
			<div>
				<h2 className="text-base font-semibold">DNS settings</h2>
				<p className="text-sm text-muted-foreground">Configure common dnsmasq behavior and upstream server sources.</p>
			</div>
			<form className="grid gap-4 rounded-md border bg-card p-4" onSubmit={(event) => void submit(event)}>
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					<BooleanField
						id="dns-domain-needed"
						label="Domain required"
						onChange={(value) => updateField("domainneeded", value)}
						value={values.domainneeded}
					/>
					<BooleanField
						id="dns-localise"
						label="Localise queries"
						onChange={(value) => updateField("localise_queries", value)}
						value={values.localise_queries}
					/>
					<BooleanField
						id="dns-rebind"
						label="Rebind protection"
						onChange={(value) => updateField("rebind_protection", value)}
						value={values.rebind_protection}
					/>
					<BooleanField
						id="dns-rebind-localhost"
						label="Allow localhost rebind"
						onChange={(value) => updateField("rebind_localhost", value)}
						value={values.rebind_localhost}
					/>
					<BooleanField
						id="dns-expandhosts"
						label="Expand hosts"
						onChange={(value) => updateField("expandhosts", value)}
						value={values.expandhosts}
					/>
					<BooleanField
						id="dns-readethers"
						label="Read ethers"
						onChange={(value) => updateField("readethers", value)}
						value={values.readethers}
					/>
					<BooleanField
						id="dns-localservice"
						label="Local service only"
						onChange={(value) => updateField("localservice", value)}
						value={values.localservice}
					/>
					<BooleanField
						id="dns-authoritative"
						label="Authoritative"
						onChange={(value) => updateField("authoritative", value)}
						value={values.authoritative}
					/>
					<BooleanField
						id="dns-sequential-ip"
						label="Sequential IP"
						onChange={(value) => updateField("sequential_ip", value)}
						value={values.sequential_ip}
					/>
					<Field label="Local domain" target="dns-local">
						<Input id="dns-local" onChange={(event) => updateField("local", event.target.value)} value={values.local} />
					</Field>
					<Field label="Search domain" target="dns-domain">
						<Input id="dns-domain" onChange={(event) => updateField("domain", event.target.value)} value={values.domain} />
					</Field>
					<Field label="Cache size" target="dns-cachesize">
						<Input
							id="dns-cachesize"
							inputMode="numeric"
							onChange={(event) => updateField("cachesize", event.target.value)}
							value={values.cachesize}
						/>
					</Field>
					<Field label="EDNS packet max" target="dns-edns">
						<Input
							id="dns-edns"
							inputMode="numeric"
							onChange={(event) => updateField("ednspacket_max", event.target.value)}
							value={values.ednspacket_max}
						/>
					</Field>
					<Field label="Lease file" target="dns-leasefile">
						<Input id="dns-leasefile" onChange={(event) => updateField("leasefile", event.target.value)} value={values.leasefile} />
					</Field>
					<Field label="Resolver file" target="dns-resolvfile">
						<Input id="dns-resolvfile" onChange={(event) => updateField("resolvfile", event.target.value)} value={values.resolvfile} />
					</Field>
					<Field label="Servers file" target="dns-serversfile">
						<Input
							id="dns-serversfile"
							onChange={(event) => updateField("serversfile", event.target.value)}
							value={values.serversfile}
						/>
					</Field>
				</div>
				<Field label="Upstream servers" target="dns-servers">
					<textarea
						className="min-h-24 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
						id="dns-servers"
						onChange={(event) => updateField("server", event.target.value)}
						spellCheck={false}
						value={values.server}
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

function BooleanField({
	id,
	label,
	onChange,
	value,
}: {
	id: string;
	label: string;
	onChange: (value: string) => void;
	value: string;
}) {
	return (
		<Field label={label} target={id}>
			<SelectField
				id={id}
				onChange={onChange}
				options={[
					["1", "Enabled"],
					["0", "Disabled"],
				]}
				value={value}
			/>
		</Field>
	);
}

function dnsmasqSettingsValues(section: ConfigSection): DnsmasqConfigInput {
	return {
		domainneeded: booleanValue(section.values.domainneeded),
		localise_queries: booleanValue(section.values.localise_queries),
		rebind_protection: booleanValue(section.values.rebind_protection),
		rebind_localhost: booleanValue(section.values.rebind_localhost),
		expandhosts: booleanValue(section.values.expandhosts),
		readethers: booleanValue(section.values.readethers),
		localservice: booleanValue(section.values.localservice),
		authoritative: booleanValue(section.values.authoritative),
		sequential_ip: booleanValue(section.values.sequential_ip),
		local: rawValue(section.values.local),
		domain: rawValue(section.values.domain),
		cachesize: rawValue(section.values.cachesize),
		ednspacket_max: rawValue(section.values.ednspacket_max),
		leasefile: rawValue(section.values.leasefile),
		resolvfile: rawValue(section.values.resolvfile),
		serversfile: rawValue(section.values.serversfile),
		server: rawListValue(section.values.server).join("\n"),
	};
}

function booleanValue(value: unknown) {
	return rawValue(value) === "1" ? "1" : "0";
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

function FirewallSummary({
	onSettingsChange,
	settings,
}: {
	onSettingsChange: (settings: CoreSettings) => void;
	settings: CoreSettings;
}) {
	const defaults = settings.firewall.filter((section) => section.type === "defaults");
	const zones = settings.firewall.filter((section) => section.type === "zone");
	const forwardings = settings.firewall.filter((section) => section.type === "forwarding");
	const rules = settings.firewall.filter((section) => section.type === "rule");
	const redirects = settings.firewall.filter((section) => section.type === "redirect");
	const includes = settings.firewall.filter((section) => section.type === "include");
	const firstDefaults = defaults[0] ?? null;

	return (
		<div className="grid gap-5">
			{firstDefaults ? (
				<FirewallDefaultsEditor
					onSaved={(sections) =>
						onSettingsChange({
							...settings,
							firewall: sections,
						})
					}
					section={firstDefaults}
				/>
			) : null}

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

			<FirewallZoneEditor
				onSaved={(sections) =>
					onSettingsChange({
						...settings,
						firewall: sections,
					})
				}
				zones={zones}
			/>

			<FirewallForwardingEditor
				forwardings={forwardings}
				onSaved={(sections) =>
					onSettingsChange({
						...settings,
						firewall: sections,
					})
				}
			/>

			<FirewallRuleEditor
				onSaved={(sections) =>
					onSettingsChange({
						...settings,
						firewall: sections,
					})
				}
				rules={rules}
			/>

			<FirewallRedirectEditor
				onSaved={(sections) =>
					onSettingsChange({
						...settings,
						firewall: sections,
					})
				}
				redirects={redirects}
			/>

			<FirewallIncludeEditor
				includes={includes}
				onSaved={(sections) =>
					onSettingsChange({
						...settings,
						firewall: sections,
					})
				}
			/>

			<FirewallFilesEditor files={settings.firewallFiles ?? []} />
		</div>
	);
}

function FirewallIncludeEditor({
	includes,
	onSaved,
}: {
	includes: ConfigSection[];
	onSaved: (sections: ConfigSection[]) => void;
}) {
	const initial = useMemo(() => includes.map(firewallIncludeValues).filter((row) => row.editable), [includes]);
	const readonly = useMemo(() => includes.map(firewallIncludeValues).filter((row) => !row.editable), [includes]);
	const [rows, setRows] = useState(initial);
	const [savedRows, setSavedRows] = useState(initial);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

	function addRow() {
		setRows((current) => [
			...current,
			{
				section: "",
				path: "/etc/nftables.d/10-custom-filter-chains.nft",
				type: "nftables",
				enabled: "1",
				reload: "0",
				editable: true,
			},
		]);
	}

	function updateRow(index: number, key: keyof FirewallInclude, value: string) {
		setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
	}

	function removeRow(index: number) {
		setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
	}

	async function save() {
		setSaving(true);
		const result = await saveFirewallIncludes(rows);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextRows = result.includes.filter((row) => row.editable);
		setRows(nextRows);
		setSavedRows(nextRows);
		onSaved(result.sections);
		toast.success(result.message);
	}

	return (
		<section className="grid gap-3">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="text-base font-semibold">Firewall include sections</h2>
					<p className="text-xs text-muted-foreground">Manage UCI include entries for whitelisted nftables files.</p>
				</div>
				<Button onClick={addRow} size="sm" type="button" variant="outline">
					<Plus className="size-4" />
					Add include
				</Button>
			</div>
			<div className="overflow-x-auto rounded-md border bg-card">
				<table className="w-full min-w-[56rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Path</th>
							<th className="px-3 py-2 font-medium">Type</th>
							<th className="px-3 py-2 font-medium">Enabled</th>
							<th className="px-3 py-2 font-medium">Reload</th>
							<th className="px-3 py-2 font-medium text-right">Actions</th>
						</tr>
					</thead>
					<tbody>
						{rows.length ? (
							rows.map((row, index) => (
								<tr className="border-b align-top last:border-0" key={`${row.section}.${index}`}>
									<td className="px-3 py-3">
										<Input onChange={(event) => updateRow(index, "path", event.target.value)} value={row.path} />
									</td>
									<td className="px-3 py-3">
										<select className="h-9 w-full rounded-md border bg-background px-2 text-sm" onChange={(event) => updateRow(index, "type", event.target.value)} value={row.type || "nftables"}>
											<option value="nftables">nftables</option>
											<option value="script">script</option>
										</select>
									</td>
									<td className="px-3 py-3">
										<select className="h-9 w-full rounded-md border bg-background px-2 text-sm" onChange={(event) => updateRow(index, "enabled", event.target.value)} value={row.enabled}>
											<option value="1">enabled</option>
											<option value="0">disabled</option>
										</select>
									</td>
									<td className="px-3 py-3">
										<select className="h-9 w-full rounded-md border bg-background px-2 text-sm" onChange={(event) => updateRow(index, "reload", event.target.value)} value={row.reload}>
											<option value="0">no</option>
											<option value="1">yes</option>
										</select>
									</td>
									<td className="px-3 py-3 text-right">
										<Button onClick={() => removeRow(index)} size="icon" type="button" variant="ghost">
											<Trash2 className="size-4" />
										</Button>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td className="px-3 py-6 text-muted-foreground" colSpan={5}>
									No managed firewall include sections configured.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
			{readonly.length ? (
				<div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
					{readonly.length} non-whitelisted include sections are preserved in LuCI compat.
				</div>
			) : null}
			<div className="flex justify-end gap-2">
				<Button disabled={!dirty || saving} onClick={() => setRows(savedRows)} type="button" variant="outline">
					Cancel
				</Button>
				<Button disabled={!dirty || saving} onClick={() => void save()} type="button">
					Save
				</Button>
			</div>
		</section>
	);
}

function firewallIncludeValues(section: ConfigSection): FirewallInclude {
	const path = rawValue(section.values.path);

	return {
		section: section.name,
		path,
		type: rawValue(section.values.type || "nftables"),
		enabled: rawValue(section.values.enabled || "1") === "0" ? "0" : "1",
		reload: rawValue(section.values.reload || "0") === "1" ? "1" : "0",
		editable: firewallIncludePathAllowed(path),
	};
}

function firewallIncludePathAllowed(path: string) {
	if (path === "/etc/firewall.user") {
		return true;
	}

	if (!path.startsWith("/etc/nftables.d/") || !path.endsWith(".nft")) {
		return false;
	}

	const name = path.slice("/etc/nftables.d/".length);
	return Boolean(name) && !name.includes("/") && !name.includes("..") && /^[A-Za-z0-9_.-]+$/.test(name);
}

function FirewallFilesEditor({ files }: { files: ServiceFile[] }) {
	if (!files.length) {
		return (
			<section className="grid gap-3">
				<h2 className="text-base font-semibold">Custom nftables files</h2>
				<div className="rounded-md border bg-card px-4 py-5 text-sm text-muted-foreground">
					No editable firewall include files found.
				</div>
			</section>
		);
	}

	return (
		<section className="grid gap-4">
			<div className="flex items-center justify-between gap-3">
				<h2 className="text-base font-semibold">Custom nftables files</h2>
				<span className="text-xs text-muted-foreground">{files.length} files</span>
			</div>
			<div className="overflow-x-auto rounded-md border bg-card">
				<table className="w-full min-w-[42rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">File</th>
							<th className="px-3 py-2 font-medium">Path</th>
							<th className="px-3 py-2 font-medium">Status</th>
							<th className="px-3 py-2 font-medium">Lines</th>
							<th className="px-3 py-2 font-medium">Size</th>
						</tr>
					</thead>
					<tbody>
						{files.map((file) => (
							<tr className="border-b align-top last:border-0" key={file.path}>
								<td className="px-3 py-3 font-medium">{file.title}</td>
								<td className="px-3 py-3 font-mono text-xs text-muted-foreground">{file.path}</td>
								<td className="px-3 py-3">{file.exists ? "present" : "missing"}</td>
								<td className="px-3 py-3 font-mono text-xs">{file.lines}</td>
								<td className="px-3 py-3 font-mono text-xs">{formatBytes(file.size)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{files
				.filter((file) => file.editable)
				.map((file) => (
					<FirewallFileEditor file={file} key={file.path} />
				))}
		</section>
	);
}

function FirewallFileEditor({ file }: { file: ServiceFile }) {
	const initial = file.content ?? file.preview.join("\n");
	const [text, setText] = useState(initial);
	const [savedText, setSavedText] = useState(initial);
	const [savedFile, setSavedFile] = useState(file);
	const [saving, setSaving] = useState(false);
	const dirty = text !== savedText;

	async function save() {
		setSaving(true);
		const result = await saveFirewallFile(savedFile.path, text);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextFile = result.file ?? savedFile;
		const nextText = nextFile.content ?? text;
		setSavedFile(nextFile);
		setText(nextText);
		setSavedText(nextText);
		toast.success(result.message);
	}

	return (
		<div className="grid gap-3 rounded-md border bg-card p-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="grid gap-1">
					<h3 className="text-sm font-semibold">{savedFile.title}</h3>
					<p className="font-mono text-xs text-muted-foreground">{savedFile.path}</p>
				</div>
				<div className="flex gap-2">
					<Button disabled={!dirty || saving} onClick={() => setText(savedText)} size="sm" type="button" variant="outline">
						Cancel
					</Button>
					<Button disabled={!dirty || saving} onClick={() => void save()} size="sm" type="button">
						Save
					</Button>
				</div>
			</div>
			<textarea
				className="min-h-72 rounded-md border bg-background px-3 py-2 font-mono text-xs outline-none focus-visible:border-ring"
				onChange={(event) => setText(event.target.value)}
				spellCheck={false}
				value={text}
			/>
		</div>
	);
}

function FirewallDefaultsEditor({
	onSaved,
	section,
}: {
	onSaved: (sections: ConfigSection[]) => void;
	section: ConfigSection;
}) {
	const [values, setValues] = useState(() => firewallDefaultsValues(section));
	const [savedValues, setSavedValues] = useState(values);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(values) !== JSON.stringify(savedValues);

	function updateField(field: keyof FirewallDefaultsInput, value: string) {
		setValues((current) => ({
			...current,
			[field]: value,
		}));
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await saveFirewallDefaults(values);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextValues = result.section ? firewallDefaultsValues(result.section) : values;
		toast.success(result.message);
		setValues(nextValues);
		setSavedValues(nextValues);
		onSaved(result.sections);
	}

	return (
		<section className="grid gap-3">
			<div>
				<h2 className="text-base font-semibold">Firewall defaults</h2>
				<p className="text-sm text-muted-foreground">Configure default packet policies and flow offloading.</p>
			</div>
			<form className="grid gap-4 rounded-md border bg-card p-4" onSubmit={(event) => void submit(event)}>
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					<Field label="Input" target="firewall-default-input">
						<FirewallPolicySelect
							id="firewall-default-input"
							onChange={(value) => updateField("input", value)}
							value={values.input}
						/>
					</Field>
					<Field label="Output" target="firewall-default-output">
						<FirewallPolicySelect
							id="firewall-default-output"
							onChange={(value) => updateField("output", value)}
							value={values.output}
						/>
					</Field>
					<Field label="Forward" target="firewall-default-forward">
						<FirewallPolicySelect
							id="firewall-default-forward"
							onChange={(value) => updateField("forward", value)}
							value={values.forward}
						/>
					</Field>
					<BooleanField
						id="firewall-synflood"
						label="Syn flood protection"
						onChange={(value) => updateField("synflood_protect", value)}
						value={values.synflood_protect}
					/>
					<BooleanField
						id="firewall-drop-invalid"
						label="Drop invalid packets"
						onChange={(value) => updateField("drop_invalid", value)}
						value={values.drop_invalid}
					/>
					<BooleanField
						id="firewall-flow-offload"
						label="Software flow offload"
						onChange={(value) => updateField("flow_offloading", value)}
						value={values.flow_offloading}
					/>
					<BooleanField
						id="firewall-flow-offload-hw"
						label="Hardware flow offload"
						onChange={(value) => updateField("flow_offloading_hw", value)}
						value={values.flow_offloading_hw}
					/>
				</div>
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

function FirewallPolicySelect({ id, onChange, value }: { id: string; onChange: (value: string) => void; value: string }) {
	return (
		<SelectField
			id={id}
			onChange={onChange}
			options={[
				["ACCEPT", "Accept"],
				["REJECT", "Reject"],
				["DROP", "Drop"],
			]}
			value={value}
		/>
	);
}

function firewallDefaultsValues(section: ConfigSection): FirewallDefaultsInput {
	return {
		input: firewallPolicyText(section.values.input),
		output: firewallPolicyText(section.values.output),
		forward: firewallPolicyText(section.values.forward),
		synflood_protect: booleanValue(section.values.synflood_protect),
		drop_invalid: booleanValue(section.values.drop_invalid),
		flow_offloading: booleanValue(section.values.flow_offloading),
		flow_offloading_hw: booleanValue(section.values.flow_offloading_hw),
	};
}

function firewallPolicyText(value: unknown) {
	const text = rawValue(value).toUpperCase();
	return text === "ACCEPT" || text === "DROP" || text === "REJECT" ? text : "REJECT";
}

function FirewallZoneEditor({
	onSaved,
	zones,
}: {
	onSaved: (sections: ConfigSection[]) => void;
	zones: ConfigSection[];
}) {
	const [rows, setRows] = useState(() => zones.map(firewallZoneValues));
	const [savedRows, setSavedRows] = useState(rows);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

	function updateRow(index: number, field: keyof FirewallZone, value: string) {
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
			{
				section: "",
				name: "",
				network: "",
				device: "",
				input: "REJECT",
				output: "ACCEPT",
				forward: "REJECT",
				masq: "0",
				mtu_fix: "0",
			},
		]);
	}

	function removeRow(index: number) {
		setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await saveFirewallZones(rows);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextRows = result.zones.map(normalizeFirewallZone);
		toast.success(result.message);
		setRows(nextRows);
		setSavedRows(nextRows);
		onSaved(result.sections);
	}

	return (
		<section className="grid gap-3">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-base font-semibold">Zones</h2>
					<p className="text-sm text-muted-foreground">Configure firewall zones, interface membership, policies, and NAT flags.</p>
				</div>
				<Button onClick={addRow} type="button" variant="outline">
					<Plus className="mr-1 size-4" />
					Add zone
				</Button>
			</div>
			<form className="grid gap-3" onSubmit={(event) => void submit(event)}>
				<div className="overflow-x-auto rounded-md border bg-card">
					<table className="w-full min-w-[78rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Name</th>
								<th className="px-3 py-2 font-medium">Networks</th>
								<th className="px-3 py-2 font-medium">Devices</th>
								<th className="px-3 py-2 font-medium">Input</th>
								<th className="px-3 py-2 font-medium">Output</th>
								<th className="px-3 py-2 font-medium">Forward</th>
								<th className="px-3 py-2 font-medium">NAT</th>
								<th className="px-3 py-2 font-medium">MTU fix</th>
								<th className="px-3 py-2 text-right font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{rows.length ? (
								rows.map((zone, index) => (
									<tr className="border-b align-top last:border-0" key={`${zone.section || "new"}.${index}`}>
										<td className="px-3 py-3">
											<Input
												aria-label="Zone name"
												onChange={(event) => updateRow(index, "name", event.target.value)}
												value={zone.name}
											/>
										</td>
										<td className="px-3 py-3">
											<textarea
												aria-label="Networks"
												className="min-h-10 w-48 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "network", event.target.value)}
												spellCheck={false}
												value={zone.network}
											/>
										</td>
										<td className="px-3 py-3">
											<textarea
												aria-label="Devices"
												className="min-h-10 w-48 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "device", event.target.value)}
												spellCheck={false}
												value={zone.device}
											/>
										</td>
										<td className="px-3 py-3">
											<FirewallPolicySelect
												id={`firewall-zone-input-${index}`}
												onChange={(value) => updateRow(index, "input", value)}
												value={zone.input}
											/>
										</td>
										<td className="px-3 py-3">
											<FirewallPolicySelect
												id={`firewall-zone-output-${index}`}
												onChange={(value) => updateRow(index, "output", value)}
												value={zone.output}
											/>
										</td>
										<td className="px-3 py-3">
											<FirewallPolicySelect
												id={`firewall-zone-forward-${index}`}
												onChange={(value) => updateRow(index, "forward", value)}
												value={zone.forward}
											/>
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`firewall-zone-masq-${index}`}
												onChange={(value) => updateRow(index, "masq", value)}
												options={[
													["0", "No"],
													["1", "Yes"],
												]}
												value={zone.masq}
											/>
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`firewall-zone-mtu-${index}`}
												onChange={(value) => updateRow(index, "mtu_fix", value)}
												options={[
													["0", "No"],
													["1", "Yes"],
												]}
												value={zone.mtu_fix}
											/>
										</td>
										<td className="px-3 py-3 text-right">
											<Button
												aria-label={`Remove ${zone.name || "zone"}`}
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
										No firewall zones configured.
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

function firewallZoneValues(section: ConfigSection): FirewallZone {
	return normalizeFirewallZone({
		section: section.name,
		name: rawValue(section.values.name || section.name),
		network: rawListValue(section.values.network).join("\n"),
		device: rawListValue(section.values.device).join("\n"),
		input: firewallPolicyText(section.values.input),
		output: firewallPolicyText(section.values.output),
		forward: firewallPolicyText(section.values.forward),
		masq: booleanValue(section.values.masq),
		mtu_fix: booleanValue(section.values.mtu_fix),
	});
}

function normalizeFirewallZone(zone: FirewallZone): FirewallZone {
	return {
		section: zone.section ?? "",
		name: zone.name ?? "",
		network: zone.network ?? "",
		device: zone.device ?? "",
		input: firewallPolicyText(zone.input),
		output: firewallPolicyText(zone.output),
		forward: firewallPolicyText(zone.forward),
		masq: zone.masq === "1" ? "1" : "0",
		mtu_fix: zone.mtu_fix === "1" ? "1" : "0",
	};
}

function FirewallForwardingEditor({
	forwardings,
	onSaved,
}: {
	forwardings: ConfigSection[];
	onSaved: (sections: ConfigSection[]) => void;
}) {
	const [rows, setRows] = useState(() => forwardings.map(firewallForwardingValues));
	const [savedRows, setSavedRows] = useState(rows);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

	function updateRow(index: number, field: keyof FirewallForwarding, value: string) {
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
			{
				section: "",
				src: "",
				dest: "",
			},
		]);
	}

	function removeRow(index: number) {
		setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await saveFirewallForwardings(rows);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextRows = result.forwardings.map(normalizeFirewallForwarding);
		toast.success(result.message);
		setRows(nextRows);
		setSavedRows(nextRows);
		onSaved(result.sections);
	}

	return (
		<section className="grid gap-3">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-base font-semibold">Zone forwardings</h2>
					<p className="text-sm text-muted-foreground">Configure allowed forwarding paths between firewall zones.</p>
				</div>
				<Button onClick={addRow} type="button" variant="outline">
					<Plus className="mr-1 size-4" />
					Add forwarding
				</Button>
			</div>
			<form className="grid gap-3" onSubmit={(event) => void submit(event)}>
				<div className="overflow-x-auto rounded-md border bg-card">
					<table className="w-full min-w-[34rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Source</th>
								<th className="px-3 py-2 font-medium">Destination</th>
								<th className="px-3 py-2 text-right font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{rows.length ? (
								rows.map((forwarding, index) => (
									<tr className="border-b align-top last:border-0" key={`${forwarding.section || "new"}.${index}`}>
										<td className="px-3 py-3">
											<Input
												aria-label="Source zone"
												onChange={(event) => updateRow(index, "src", event.target.value)}
												value={forwarding.src}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Destination zone"
												onChange={(event) => updateRow(index, "dest", event.target.value)}
												value={forwarding.dest}
											/>
										</td>
										<td className="px-3 py-3 text-right">
											<Button
												aria-label={`Remove ${forwarding.src || "source"} to ${forwarding.dest || "destination"}`}
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
										No zone forwardings configured.
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

function firewallForwardingValues(section: ConfigSection): FirewallForwarding {
	return normalizeFirewallForwarding({
		section: section.name,
		src: rawValue(section.values.src),
		dest: rawValue(section.values.dest),
	});
}

function normalizeFirewallForwarding(forwarding: FirewallForwarding): FirewallForwarding {
	return {
		section: forwarding.section ?? "",
		src: forwarding.src ?? "",
		dest: forwarding.dest ?? "",
	};
}

function FirewallRuleEditor({
	onSaved,
	rules,
}: {
	onSaved: (sections: ConfigSection[]) => void;
	rules: ConfigSection[];
}) {
	const [rows, setRows] = useState(() => rules.map(firewallRuleValues));
	const [savedRows, setSavedRows] = useState(rows);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

	function updateRow(index: number, field: keyof FirewallRuleRow, value: string) {
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
			{
				section: "",
				name: "",
				enabled: "1",
				src: "",
				dest: "",
				proto: "",
				src_ip: "",
				dest_ip: "",
				src_port: "",
				dest_port: "",
				icmp_type: "",
				family: "",
				limit: "",
				target: "ACCEPT",
			},
		]);
	}

	function removeRow(index: number) {
		setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await saveFirewallRules(rows);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextRows = result.rules.map(normalizeFirewallRule);
		toast.success(result.message);
		setRows(nextRows);
		setSavedRows(nextRows);
		onSaved(result.sections);
	}

	return (
		<section className="grid gap-3">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-base font-semibold">Traffic rules</h2>
					<p className="text-sm text-muted-foreground">Configure common allow, reject, and drop rules.</p>
				</div>
				<Button onClick={addRow} type="button" variant="outline">
					<Plus className="mr-1 size-4" />
					Add rule
				</Button>
			</div>
			<form className="grid gap-3" onSubmit={(event) => void submit(event)}>
				<div className="overflow-x-auto rounded-md border bg-card">
					<table className="w-full min-w-[112rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Name</th>
								<th className="px-3 py-2 font-medium">Status</th>
								<th className="px-3 py-2 font-medium">Source</th>
								<th className="px-3 py-2 font-medium">Destination</th>
								<th className="px-3 py-2 font-medium">Protocols</th>
								<th className="px-3 py-2 font-medium">Source IP</th>
								<th className="px-3 py-2 font-medium">Destination IP</th>
								<th className="px-3 py-2 font-medium">Source port</th>
								<th className="px-3 py-2 font-medium">Destination port</th>
								<th className="px-3 py-2 font-medium">ICMP types</th>
								<th className="px-3 py-2 font-medium">Family</th>
								<th className="px-3 py-2 font-medium">Limit</th>
								<th className="px-3 py-2 font-medium">Target</th>
								<th className="px-3 py-2 text-right font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{rows.length ? (
								rows.map((rule, index) => (
									<tr className="border-b align-top last:border-0" key={`${rule.section || "new"}.${index}`}>
										<td className="px-3 py-3">
											<Input
												aria-label="Rule name"
												onChange={(event) => updateRow(index, "name", event.target.value)}
												value={rule.name}
											/>
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`firewall-rule-enabled-${index}`}
												onChange={(value) => updateRow(index, "enabled", value)}
												options={[
													["1", "Enabled"],
													["0", "Disabled"],
												]}
												value={rule.enabled}
											/>
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Source zone" onChange={(event) => updateRow(index, "src", event.target.value)} value={rule.src} />
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Destination zone"
												onChange={(event) => updateRow(index, "dest", event.target.value)}
												value={rule.dest}
											/>
										</td>
										<td className="px-3 py-3">
											<textarea
												aria-label="Protocols"
												className="min-h-10 w-40 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "proto", event.target.value)}
												spellCheck={false}
												value={rule.proto}
											/>
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Source IP" onChange={(event) => updateRow(index, "src_ip", event.target.value)} value={rule.src_ip} />
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Destination IP"
												onChange={(event) => updateRow(index, "dest_ip", event.target.value)}
												value={rule.dest_ip}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Source port"
												onChange={(event) => updateRow(index, "src_port", event.target.value)}
												value={rule.src_port}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Destination port"
												onChange={(event) => updateRow(index, "dest_port", event.target.value)}
												value={rule.dest_port}
											/>
										</td>
										<td className="px-3 py-3">
											<textarea
												aria-label="ICMP types"
												className="min-h-10 w-56 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "icmp_type", event.target.value)}
												spellCheck={false}
												value={rule.icmp_type}
											/>
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`firewall-rule-family-${index}`}
												onChange={(value) => updateRow(index, "family", value)}
												options={[
													["", "Any"],
													["ipv4", "IPv4"],
													["ipv6", "IPv6"],
												]}
												value={rule.family}
											/>
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Limit" onChange={(event) => updateRow(index, "limit", event.target.value)} value={rule.limit} />
										</td>
										<td className="px-3 py-3">
											<FirewallPolicySelect
												id={`firewall-rule-target-${index}`}
												onChange={(value) => updateRow(index, "target", value)}
												value={rule.target}
											/>
										</td>
										<td className="px-3 py-3 text-right">
											<Button
												aria-label={`Remove ${rule.name || "rule"}`}
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
									<td className="px-3 py-6 text-muted-foreground" colSpan={14}>
										No traffic rules configured.
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

function firewallRuleValues(section: ConfigSection): FirewallRuleRow {
	return normalizeFirewallRule({
		section: section.name,
		name: rawValue(section.values.name || section.name),
		enabled: isEnabledValue(section.values.enabled) ? "1" : "0",
		src: rawValue(section.values.src),
		dest: rawValue(section.values.dest),
		proto: rawListValue(section.values.proto).join("\n"),
		src_ip: rawValue(section.values.src_ip),
		dest_ip: rawValue(section.values.dest_ip),
		src_port: rawValue(section.values.src_port),
		dest_port: rawValue(section.values.dest_port),
		icmp_type: rawListValue(section.values.icmp_type).join("\n"),
		family: firewallFamilyText(section.values.family),
		limit: rawValue(section.values.limit),
		target: firewallPolicyText(section.values.target),
	});
}

function normalizeFirewallRule(rule: FirewallRuleRow): FirewallRuleRow {
	return {
		section: rule.section ?? "",
		name: rule.name ?? "",
		enabled: rule.enabled === "0" ? "0" : "1",
		src: rule.src ?? "",
		dest: rule.dest ?? "",
		proto: rule.proto ?? "",
		src_ip: rule.src_ip ?? "",
		dest_ip: rule.dest_ip ?? "",
		src_port: rule.src_port ?? "",
		dest_port: rule.dest_port ?? "",
		icmp_type: rule.icmp_type ?? "",
		family: firewallFamilyText(rule.family),
		limit: rule.limit ?? "",
		target: firewallPolicyText(rule.target),
	};
}

function firewallFamilyText(value: unknown) {
	const text = rawValue(value);
	return text === "ipv4" || text === "ipv6" ? text : "";
}

function FirewallRedirectEditor({
	onSaved,
	redirects,
}: {
	onSaved: (sections: ConfigSection[]) => void;
	redirects: ConfigSection[];
}) {
	const [rows, setRows] = useState(() => redirects.map(firewallRedirectValues));
	const [savedRows, setSavedRows] = useState(rows);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

	function updateRow(index: number, field: keyof FirewallRedirect, value: string) {
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
			{
				section: "",
				name: "",
				enabled: "1",
				src: "wan",
				src_dport: "",
				dest: "lan",
				dest_ip: "",
				dest_port: "",
				proto: "tcp",
				family: "",
				target: "DNAT",
			},
		]);
	}

	function removeRow(index: number) {
		setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await saveFirewallRedirects(rows);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextRows = result.redirects.map(normalizeFirewallRedirect);
		toast.success(result.message);
		setRows(nextRows);
		setSavedRows(nextRows);
		onSaved(result.sections);
	}

	return (
		<section className="grid gap-3">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-base font-semibold">Port forwards</h2>
					<p className="text-sm text-muted-foreground">Configure common DNAT/SNAT redirect entries.</p>
				</div>
				<Button onClick={addRow} type="button" variant="outline">
					<Plus className="mr-1 size-4" />
					Add redirect
				</Button>
			</div>
			<form className="grid gap-3" onSubmit={(event) => void submit(event)}>
				<div className="overflow-x-auto rounded-md border bg-card">
					<table className="w-full min-w-[92rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Name</th>
								<th className="px-3 py-2 font-medium">Status</th>
								<th className="px-3 py-2 font-medium">Source</th>
								<th className="px-3 py-2 font-medium">External port</th>
								<th className="px-3 py-2 font-medium">Destination</th>
								<th className="px-3 py-2 font-medium">Internal IP</th>
								<th className="px-3 py-2 font-medium">Internal port</th>
								<th className="px-3 py-2 font-medium">Protocols</th>
								<th className="px-3 py-2 font-medium">Family</th>
								<th className="px-3 py-2 font-medium">Target</th>
								<th className="px-3 py-2 text-right font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{rows.length ? (
								rows.map((redirect, index) => (
									<tr className="border-b align-top last:border-0" key={`${redirect.section || "new"}.${index}`}>
										<td className="px-3 py-3">
											<Input
												aria-label="Redirect name"
												onChange={(event) => updateRow(index, "name", event.target.value)}
												value={redirect.name}
											/>
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`firewall-redirect-enabled-${index}`}
												onChange={(value) => updateRow(index, "enabled", value)}
												options={[
													["1", "Enabled"],
													["0", "Disabled"],
												]}
												value={redirect.enabled}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Source zone"
												onChange={(event) => updateRow(index, "src", event.target.value)}
												value={redirect.src}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="External port"
												onChange={(event) => updateRow(index, "src_dport", event.target.value)}
												value={redirect.src_dport}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Destination zone"
												onChange={(event) => updateRow(index, "dest", event.target.value)}
												value={redirect.dest}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Internal IP"
												onChange={(event) => updateRow(index, "dest_ip", event.target.value)}
												value={redirect.dest_ip}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Internal port"
												onChange={(event) => updateRow(index, "dest_port", event.target.value)}
												value={redirect.dest_port}
											/>
										</td>
										<td className="px-3 py-3">
											<textarea
												aria-label="Protocols"
												className="min-h-10 w-40 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "proto", event.target.value)}
												spellCheck={false}
												value={redirect.proto}
											/>
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`firewall-redirect-family-${index}`}
												onChange={(value) => updateRow(index, "family", value)}
												options={[
													["", "Any"],
													["ipv4", "IPv4"],
													["ipv6", "IPv6"],
												]}
												value={redirect.family}
											/>
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`firewall-redirect-target-${index}`}
												onChange={(value) => updateRow(index, "target", value)}
												options={[
													["DNAT", "DNAT"],
													["SNAT", "SNAT"],
												]}
												value={redirect.target}
											/>
										</td>
										<td className="px-3 py-3 text-right">
											<Button
												aria-label={`Remove ${redirect.name || "redirect"}`}
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
									<td className="px-3 py-6 text-muted-foreground" colSpan={11}>
										No port forwards configured.
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

function firewallRedirectValues(section: ConfigSection): FirewallRedirect {
	return normalizeFirewallRedirect({
		section: section.name,
		name: rawValue(section.values.name || section.name),
		enabled: isEnabledValue(section.values.enabled) ? "1" : "0",
		src: rawValue(section.values.src),
		src_dport: rawValue(section.values.src_dport),
		dest: rawValue(section.values.dest),
		dest_ip: rawValue(section.values.dest_ip),
		dest_port: rawValue(section.values.dest_port),
		proto: rawListValue(section.values.proto).join("\n"),
		family: firewallFamilyText(section.values.family),
		target: firewallRedirectTargetText(section.values.target),
	});
}

function normalizeFirewallRedirect(redirect: FirewallRedirect): FirewallRedirect {
	return {
		section: redirect.section ?? "",
		name: redirect.name ?? "",
		enabled: redirect.enabled === "0" ? "0" : "1",
		src: redirect.src ?? "",
		src_dport: redirect.src_dport ?? "",
		dest: redirect.dest ?? "",
		dest_ip: redirect.dest_ip ?? "",
		dest_port: redirect.dest_port ?? "",
		proto: redirect.proto ?? "",
		family: firewallFamilyText(redirect.family),
		target: firewallRedirectTargetText(redirect.target),
	};
}

function firewallRedirectTargetText(value: unknown) {
	const text = rawValue(value).toUpperCase();
	return text === "SNAT" ? "SNAT" : "DNAT";
}

function SystemSummary({ settings, dashboard }: { settings: CoreSettings; dashboard: DashboardStatus | null }) {
	const [systemSections, setSystemSections] = useState(settings.system);
	const system = systemSections.find((section) => section.type === "system");
	const timeservers = systemSections.filter((section) => section.type === "timeserver");
	const leds = systemSections.filter((section) => section.type === "led");
	const dropbear = systemSections.filter((section) => section.type === "dropbear");
	const uhttpd = systemSections.filter((section) => section.type === "uhttpd");
	const certs = systemSections.filter((section) => section.type === "cert");
	const luciMain = systemSections.find((section) => section.name === "main" && section.values.mediaurlbase != null);
	const luciApply = systemSections.find((section) => section.name === "apply");
	const luciThemes = systemSections.find((section) => section.name === "themes");
	const luciLanguages = systemSections.find((section) => section.name === "languages");

	return (
		<div className="grid gap-5">
			<SystemSettingsEditor dashboard={dashboard} onSaved={setSystemSections} sections={systemSections} />

			{luciMain && luciApply && luciThemes ? (
				<LuciUiSettingsEditor
					apply={luciApply}
					languages={luciLanguages}
					main={luciMain}
					onSaved={setSystemSections}
					themes={luciThemes}
				/>
			) : null}

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

			{certs.length ? <CertDefaultsEditor certs={certs} onSaved={setSystemSections} /> : null}
		</div>
	);
}

function LuciUiSettingsEditor({
	apply,
	languages,
	main,
	onSaved,
	themes,
}: {
	apply: ConfigSection;
	languages?: ConfigSection;
	main: ConfigSection;
	onSaved: (sections: ConfigSection[]) => void;
	themes: ConfigSection;
}) {
	const themeOptions = useMemo(() => luciThemeOptions(themes), [themes]);
	const languageOptions = useMemo(() => luciLanguageOptions(languages), [languages]);
	const [values, setValues] = useState(() => luciUiSettingsValues(main, apply, themeOptions));
	const [savedValues, setSavedValues] = useState(values);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(values) !== JSON.stringify(savedValues);

	function updateField(field: keyof LuciUiSettingsInput, value: string) {
		setValues((current) => ({
			...current,
			[field]: value,
		}));
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await saveLuciUiSettings(values);
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
		<section className="grid gap-3">
			<div className="flex flex-col gap-1">
				<h2 className="text-base font-semibold">LuCI interface</h2>
				<p className="text-sm text-muted-foreground">Edit language, theme, session, and apply rollback timing.</p>
			</div>
			<form className="grid gap-4 rounded-md border bg-card p-4" onSubmit={(event) => void submit(event)}>
				<div className="grid gap-4 md:grid-cols-2">
					<Field label="Language" target="luci-language">
						<SelectField id="luci-language" onChange={(value) => updateField("lang", value)} options={languageOptions} value={values.lang} />
					</Field>
					<Field label="Theme" target="luci-theme">
						<SelectField
							id="luci-theme"
							onChange={(value) => updateField("mediaurlbase", value)}
							options={themeOptions}
							value={values.mediaurlbase}
						/>
					</Field>
					<Field label="Session timeout" target="luci-session-timeout">
						<Input
							id="luci-session-timeout"
							inputMode="numeric"
							onChange={(event) => updateField("sessiontime", event.target.value)}
							value={values.sessiontime}
						/>
					</Field>
					<Field label="Rollback timeout" target="luci-rollback">
						<Input id="luci-rollback" inputMode="numeric" onChange={(event) => updateField("rollback", event.target.value)} value={values.rollback} />
					</Field>
					<Field label="Apply holdoff" target="luci-holdoff">
						<Input id="luci-holdoff" inputMode="numeric" onChange={(event) => updateField("holdoff", event.target.value)} value={values.holdoff} />
					</Field>
					<Field label="Apply timeout" target="luci-timeout">
						<Input id="luci-timeout" inputMode="numeric" onChange={(event) => updateField("timeout", event.target.value)} value={values.timeout} />
					</Field>
					<Field label="Display delay" target="luci-display">
						<Input id="luci-display" inputMode="decimal" onChange={(event) => updateField("display", event.target.value)} value={values.display} />
					</Field>
				</div>
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

function luciUiSettingsValues(main: ConfigSection, apply: ConfigSection, themeOptions: [string, string][]): LuciUiSettingsInput {
	const mediaurlbase = rawValue(main.values.mediaurlbase || themeOptions[0]?.[0] || "");

	return {
		lang: rawValue(main.values.lang || "auto"),
		mediaurlbase,
		sessiontime: rawValue(main.values.sessiontime || "3600"),
		rollback: rawValue(apply.values.rollback || "90"),
		holdoff: rawValue(apply.values.holdoff || "4"),
		timeout: rawValue(apply.values.timeout || "5"),
		display: rawValue(apply.values.display || "1.5"),
	};
}

function luciThemeOptions(themes: ConfigSection): [string, string][] {
	return Object.entries(themes.values)
		.map(([name, value]) => [rawValue(value), name] as [string, string])
		.filter(([value]) => Boolean(value));
}

function luciLanguageOptions(languages?: ConfigSection): [string, string][] {
	const entries = languages
		? Object.entries(languages.values).map(([name, value]) => [name, rawValue(value) || name] as [string, string])
		: [];

	return [["auto", "Auto"], ...entries.filter(([value]) => value !== "auto")];
}

function CertDefaultsEditor({ certs, onSaved }: { certs: ConfigSection[]; onSaved: (sections: ConfigSection[]) => void }) {
	const [values, setValues] = useState(() => certDefaultsValues(certs[0]));
	const [savedValues, setSavedValues] = useState(values);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(values) !== JSON.stringify(savedValues);

	function updateField(field: keyof UhttpdCertDefaultsInput, value: string) {
		setValues((current) => ({
			...current,
			[field]: value,
		}));
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await saveUhttpdCertDefaults(values);
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
		<section className="grid gap-3">
			<div className="flex flex-col gap-1">
				<h2 className="text-base font-semibold">Certificate defaults</h2>
				<p className="text-sm text-muted-foreground">Configure defaults used when uHTTPd self-signed certificates are generated.</p>
			</div>
			<form className="grid gap-4 rounded-md border bg-card p-4" onSubmit={(event) => void submit(event)}>
				<div className="grid gap-4 md:grid-cols-2">
					<Field label="Days" target="cert-days">
						<Input id="cert-days" inputMode="numeric" onChange={(event) => updateField("days", event.target.value)} value={values.days} />
					</Field>
					<Field label="Key type" target="cert-key-type">
						<SelectField
							id="cert-key-type"
							onChange={(value) => updateField("key_type", value)}
							options={[
								["ec", "EC"],
								["rsa", "RSA"],
							]}
							value={values.key_type}
						/>
					</Field>
					<Field label="Bits" target="cert-bits">
						<Input id="cert-bits" inputMode="numeric" onChange={(event) => updateField("bits", event.target.value)} value={values.bits} />
					</Field>
					<Field label="EC curve" target="cert-curve">
						<Input id="cert-curve" onChange={(event) => updateField("ec_curve", event.target.value)} value={values.ec_curve} />
					</Field>
					<Field label="Country" target="cert-country">
						<Input id="cert-country" maxLength={2} onChange={(event) => updateField("country", event.target.value)} value={values.country} />
					</Field>
					<Field label="State" target="cert-state">
						<Input id="cert-state" onChange={(event) => updateField("state", event.target.value)} value={values.state} />
					</Field>
					<Field label="Location" target="cert-location">
						<Input id="cert-location" onChange={(event) => updateField("location", event.target.value)} value={values.location} />
					</Field>
					<Field label="Organization" target="cert-organization">
						<Input id="cert-organization" onChange={(event) => updateField("organization", event.target.value)} value={values.organization} />
					</Field>
					<Field label="Common name" target="cert-common-name">
						<Input id="cert-common-name" onChange={(event) => updateField("commonname", event.target.value)} value={values.commonname} />
					</Field>
				</div>
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
					<Field label="Timezone name" target="system-zonename">
						<Input
							id="system-zonename"
							onChange={(event) => updateField("zonename", event.target.value)}
							value={values.zonename}
						/>
					</Field>
					<Field label="POSIX timezone" target="system-timezone">
						<Input
							id="system-timezone"
							onChange={(event) => updateField("timezone", event.target.value)}
							value={values.timezone}
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
		zonename: rawValue(system?.values.zonename),
		timezone: rawValue(system?.values.timezone),
		log_size: rawValue(system?.values.log_size),
		log_proto: rawValue(system?.values.log_proto || "udp"),
		conloglevel: rawValue(system?.values.conloglevel),
		cronloglevel: rawValue(system?.values.cronloglevel),
		ntp_enabled: rawValue(ntp?.values.enabled || "1") === "0" ? "0" : "1",
		ntp_use_dhcp: rawValue(ntp?.values.use_dhcp || "1") === "0" ? "0" : "1",
		ntp_servers: rawListValue(ntp?.values.server).join("\n"),
	};
}

function certDefaultsValues(section: ConfigSection): UhttpdCertDefaultsInput {
	return {
		section: section.name,
		days: rawValue(section.values.days),
		key_type: rawValue(section.values.key_type || "ec"),
		bits: rawValue(section.values.bits),
		ec_curve: rawValue(section.values.ec_curve),
		country: rawValue(section.values.country),
		state: rawValue(section.values.state),
		location: rawValue(section.values.location),
		organization: rawValue(section.values.organization),
		commonname: rawValue(section.values.commonname),
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

function NetworkSummary({
	dashboard,
	onSettingsChange,
	settings,
}: {
	dashboard: DashboardStatus | null;
	onSettingsChange: (settings: CoreSettings) => void;
	settings: CoreSettings;
}) {
	const interfaces = [...(dashboard?.interfaces ?? [])].sort(sortNetworkInterfaces);
	const devices = Object.entries(dashboard?.devices ?? {})
		.filter(([, device]) => device.present && device.devtype === "ethernet")
		.sort(([a], [b]) => a.localeCompare(b));
	const routes = settings.networkRoutes ?? [];
	const rules = settings.networkRules ?? [];
	const configInterfaces = settings.network.filter((section) => section.type === "interface");
	const configDevices = settings.network.filter((section) => section.type === "device");

	if (!interfaces.length && !devices.length && !settings.network.length) {
		return null;
	}

	return (
		<div className="grid gap-5">
			{configInterfaces.length ? (
				<NetworkInterfaceEditor
					interfaces={configInterfaces}
					onSaved={(sections) =>
						onSettingsChange({
							...settings,
							network: sections,
						})
					}
				/>
			) : null}
			{configDevices.length ? (
				<NetworkDeviceEditor
					devices={configDevices}
					onSaved={(sections) =>
						onSettingsChange({
							...settings,
							network: sections,
						})
					}
				/>
			) : null}
			{interfaces.length ? <InterfaceStatusTable interfaces={interfaces} /> : null}
			{devices.length ? <DeviceStatusTable devices={devices} /> : null}
			<StaticRouteEditor
				onSaved={(nextRoutes, sections) =>
					onSettingsChange({
						...settings,
						network: sections,
						networkRoutes: nextRoutes,
					})
				}
				routes={routes}
			/>
			<PolicyRuleEditor
				onSaved={(nextRules, sections) =>
					onSettingsChange({
						...settings,
						network: sections,
						networkRules: nextRules,
					})
				}
				rules={rules}
			/>
		</div>
	);
}

function NetworkInterfaceEditor({
	interfaces,
	onSaved,
}: {
	interfaces: ConfigSection[];
	onSaved: (sections: ConfigSection[]) => void;
}) {
	const [rows, setRows] = useState(() => interfaces.map(networkInterfaceValues));
	const [savedRows, setSavedRows] = useState(rows);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

	function updateRow(index: number, field: keyof NetworkInterfaceConfig, value: string) {
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

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await saveNetworkInterfaces(rows);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextRows = result.interfaces.map(normalizeNetworkInterface);
		toast.success(result.message);
		setRows(nextRows);
		setSavedRows(nextRows);
		onSaved(result.sections);
	}

	return (
		<section className="grid gap-3">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h2 className="text-base font-semibold">Interface configuration</h2>
					<p className="text-sm text-muted-foreground">Edit common UCI interface fields while preserving advanced options.</p>
				</div>
				<span className="text-xs text-muted-foreground">{rows.length} interfaces</span>
			</div>
			<form className="grid gap-3" onSubmit={(event) => void submit(event)}>
				<div className="overflow-x-auto rounded-md border bg-card">
					<table className="w-full min-w-[92rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Interface</th>
								<th className="px-3 py-2 font-medium">Protocol</th>
								<th className="px-3 py-2 font-medium">Device</th>
								<th className="px-3 py-2 font-medium">IPv4 address</th>
								<th className="px-3 py-2 font-medium">Netmask</th>
								<th className="px-3 py-2 font-medium">Gateway</th>
								<th className="px-3 py-2 font-medium">IPv6 assign</th>
								<th className="px-3 py-2 font-medium">DNS</th>
								<th className="px-3 py-2 font-medium">Peer DNS</th>
								<th className="px-3 py-2 font-medium">Delegate</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((row, index) => (
								<tr className="border-b align-top last:border-0" key={row.section}>
									<td className="px-3 py-3 font-medium">{row.section}</td>
									<td className="px-3 py-3">
										<Input aria-label="Protocol" onChange={(event) => updateRow(index, "proto", event.target.value)} value={row.proto} />
									</td>
									<td className="px-3 py-3">
										<Input aria-label="Device" onChange={(event) => updateRow(index, "device", event.target.value)} value={row.device} />
									</td>
									<td className="px-3 py-3">
										<textarea
											aria-label="IPv4 address"
											className="min-h-10 w-48 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
											onChange={(event) => updateRow(index, "ipaddr", event.target.value)}
											spellCheck={false}
											value={row.ipaddr}
										/>
									</td>
									<td className="px-3 py-3">
										<Input aria-label="Netmask" onChange={(event) => updateRow(index, "netmask", event.target.value)} value={row.netmask} />
									</td>
									<td className="px-3 py-3">
										<Input aria-label="Gateway" onChange={(event) => updateRow(index, "gateway", event.target.value)} value={row.gateway} />
									</td>
									<td className="px-3 py-3">
										<Input
											aria-label="IPv6 assignment length"
											inputMode="numeric"
											onChange={(event) => updateRow(index, "ip6assign", event.target.value)}
											value={row.ip6assign}
										/>
									</td>
									<td className="px-3 py-3">
										<textarea
											aria-label="DNS servers"
											className="min-h-10 w-48 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
											onChange={(event) => updateRow(index, "dns", event.target.value)}
											spellCheck={false}
											value={row.dns}
										/>
									</td>
									<td className="px-3 py-3">
										<SelectField
											id={`network-interface-peerdns-${index}`}
											onChange={(value) => updateRow(index, "peerdns", value)}
											options={[
												["1", "Yes"],
												["0", "No"],
											]}
											value={row.peerdns}
										/>
									</td>
									<td className="px-3 py-3">
										<SelectField
											id={`network-interface-delegate-${index}`}
											onChange={(value) => updateRow(index, "delegate", value)}
											options={[
												["1", "Yes"],
												["0", "No"],
											]}
											value={row.delegate}
										/>
									</td>
								</tr>
							))}
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

function NetworkDeviceEditor({
	devices,
	onSaved,
}: {
	devices: ConfigSection[];
	onSaved: (sections: ConfigSection[]) => void;
}) {
	const [rows, setRows] = useState(() => devices.map(networkDeviceValues));
	const [savedRows, setSavedRows] = useState(rows);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

	function updateRow(index: number, field: keyof NetworkDeviceConfig, value: string) {
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

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await saveNetworkDevices(rows);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextRows = result.devices.map(normalizeNetworkDevice);
		toast.success(result.message);
		setRows(nextRows);
		setSavedRows(nextRows);
		onSaved(result.sections);
	}

	return (
		<section className="grid gap-3">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h2 className="text-base font-semibold">Device configuration</h2>
					<p className="text-sm text-muted-foreground">Edit common UCI device fields while preserving advanced options.</p>
				</div>
				<span className="text-xs text-muted-foreground">{rows.length} devices</span>
			</div>
			<form className="grid gap-3" onSubmit={(event) => void submit(event)}>
				<div className="overflow-x-auto rounded-md border bg-card">
					<table className="w-full min-w-[58rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Name</th>
								<th className="px-3 py-2 font-medium">Type</th>
								<th className="px-3 py-2 font-medium">Ports</th>
								<th className="px-3 py-2 font-medium">MAC address</th>
								<th className="px-3 py-2 font-medium">MTU</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((row, index) => (
								<tr className="border-b align-top last:border-0" key={row.section}>
									<td className="px-3 py-3">
										<Input aria-label="Device name" onChange={(event) => updateRow(index, "name", event.target.value)} value={row.name} />
									</td>
									<td className="px-3 py-3">
										<Input aria-label="Device type" onChange={(event) => updateRow(index, "type", event.target.value)} value={row.type} />
									</td>
									<td className="px-3 py-3">
										<textarea
											aria-label="Ports"
											className="min-h-10 w-48 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
											onChange={(event) => updateRow(index, "ports", event.target.value)}
											spellCheck={false}
											value={row.ports}
										/>
									</td>
									<td className="px-3 py-3">
										<Input
											aria-label="MAC address"
											onChange={(event) => updateRow(index, "macaddr", event.target.value)}
											value={row.macaddr}
										/>
									</td>
									<td className="px-3 py-3">
										<Input
											aria-label="MTU"
											inputMode="numeric"
											onChange={(event) => updateRow(index, "mtu", event.target.value)}
											value={row.mtu}
										/>
									</td>
								</tr>
							))}
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

function StaticRouteEditor({
	onSaved,
	routes,
}: {
	onSaved: (routes: StaticRoute[], sections: ConfigSection[]) => void;
	routes: StaticRoute[];
}) {
	const [rows, setRows] = useState(() => routes.map(normalizeStaticRoute));
	const [savedRows, setSavedRows] = useState(rows);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

	function updateRow(index: number, field: keyof StaticRoute, value: string) {
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
			{
				section: "",
				family: "route",
				interface: "",
				type: "",
				target: "",
				netmask: "",
				gateway: "",
				metric: "",
				table: "",
				source: "",
				mtu: "",
				onlink: "0",
				disabled: "0",
			},
		]);
	}

	function removeRow(index: number) {
		setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
	}

	function duplicateRow(index: number) {
		setRows((current) => {
			const row = current[index];

			if (!row) {
				return current;
			}

			const duplicate = {
				...row,
				section: "",
			};

			const next = [...current];
			next.splice(index + 1, 0, duplicate);
			return next;
		});
	}

	function moveRow(index: number, direction: -1 | 1) {
		setRows((current) => {
			const nextIndex = index + direction;

			if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
				return current;
			}

			const next = [...current];
			const [row] = next.splice(index, 1);
			next.splice(nextIndex, 0, row);
			return next;
		});
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await saveNetworkRoutes(rows, rows.length === 0 && savedRows.length > 0);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextRows = result.routes.map(normalizeStaticRoute);
		toast.success(result.message);
		setRows(nextRows);
		setSavedRows(nextRows);
		onSaved(nextRows, result.sections);
	}

	return (
		<section className="grid gap-3">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-base font-semibold">Static routes</h2>
					<p className="text-sm text-muted-foreground">Configure IPv4 and IPv6 route entries managed by UCI.</p>
				</div>
				<Button onClick={addRow} type="button" variant="outline">
					<Plus className="mr-1 size-4" />
					Add route
				</Button>
			</div>
			<form className="grid gap-3" onSubmit={(event) => void submit(event)}>
				<div className="overflow-x-auto rounded-md border bg-card">
					<table className="w-full min-w-[100rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Family</th>
								<th className="px-3 py-2 font-medium">Interface</th>
								<th className="px-3 py-2 font-medium">Type</th>
								<th className="px-3 py-2 font-medium">Target</th>
								<th className="px-3 py-2 font-medium">Netmask</th>
								<th className="px-3 py-2 font-medium">Gateway</th>
								<th className="px-3 py-2 font-medium">Metric</th>
								<th className="px-3 py-2 font-medium">Table</th>
								<th className="px-3 py-2 font-medium">Source</th>
								<th className="px-3 py-2 font-medium">MTU</th>
								<th className="px-3 py-2 font-medium">On-link</th>
								<th className="px-3 py-2 font-medium">Disabled</th>
								<th className="px-3 py-2 text-right font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{rows.length ? (
								rows.map((route, index) => (
									<tr className="border-b align-top last:border-0" key={`${route.section || "new"}.${index}`}>
										<td className="px-3 py-3">
											<SelectField
												id={`static-route-family-${index}`}
												onChange={(value) => updateRow(index, "family", value)}
												options={[
													["route", "IPv4"],
													["route6", "IPv6"],
												]}
												value={route.family}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Interface"
												onChange={(event) => updateRow(index, "interface", event.target.value)}
												value={route.interface}
											/>
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`static-route-type-${index}`}
												onChange={(value) => updateRow(index, "type", value)}
												options={[
													["", "unicast"],
													["local", "local"],
													["broadcast", "broadcast"],
													["multicast", "multicast"],
													["unreachable", "unreachable"],
													["prohibit", "prohibit"],
													["blackhole", "blackhole"],
													["anycast", "anycast"],
													["throw", "throw"],
												]}
												value={route.type}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Target"
												onChange={(event) => updateRow(index, "target", event.target.value)}
												value={route.target}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Netmask"
												disabled={route.family === "route6"}
												onChange={(event) => updateRow(index, "netmask", event.target.value)}
												value={route.family === "route6" ? "" : route.netmask}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Gateway"
												onChange={(event) => updateRow(index, "gateway", event.target.value)}
												value={route.gateway}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Metric"
												inputMode="numeric"
												onChange={(event) => updateRow(index, "metric", event.target.value)}
												value={route.metric}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Table"
												onChange={(event) => updateRow(index, "table", event.target.value)}
												value={route.table}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Source"
												onChange={(event) => updateRow(index, "source", event.target.value)}
												value={route.source}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="MTU"
												inputMode="numeric"
												onChange={(event) => updateRow(index, "mtu", event.target.value)}
												value={route.mtu}
											/>
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`static-route-onlink-${index}`}
												onChange={(value) => updateRow(index, "onlink", value)}
												options={[
													["0", "No"],
													["1", "Yes"],
												]}
												value={route.onlink}
											/>
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`static-route-disabled-${index}`}
												onChange={(value) => updateRow(index, "disabled", value)}
												options={[
													["0", "No"],
													["1", "Yes"],
												]}
												value={route.disabled}
											/>
										</td>
										<td className="px-3 py-3 text-right">
											<div className="inline-flex gap-1">
												<Button
													aria-label="Move route up"
													disabled={index === 0}
													onClick={() => moveRow(index, -1)}
													size="icon"
													type="button"
													variant="ghost"
												>
													<ArrowUp className="size-4" />
												</Button>
												<Button
													aria-label="Move route down"
													disabled={index === rows.length - 1}
													onClick={() => moveRow(index, 1)}
													size="icon"
													type="button"
													variant="ghost"
												>
													<ArrowDown className="size-4" />
												</Button>
												<Button
													aria-label="Duplicate route"
													onClick={() => duplicateRow(index)}
													size="icon"
													type="button"
													variant="ghost"
												>
													<Copy className="size-4" />
												</Button>
												<Button
													aria-label="Remove route"
													onClick={() => removeRow(index)}
													size="icon"
													type="button"
													variant="ghost"
												>
													<Trash2 className="size-4" />
												</Button>
											</div>
										</td>
									</tr>
								))
							) : (
								<tr>
									<td className="px-3 py-6 text-muted-foreground" colSpan={13}>
										No static routes configured.
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

function PolicyRuleEditor({
	onSaved,
	rules,
}: {
	onSaved: (rules: PolicyRule[], sections: ConfigSection[]) => void;
	rules: PolicyRule[];
}) {
	const [rows, setRows] = useState(() => rules.map(normalizePolicyRule));
	const [savedRows, setSavedRows] = useState(rows);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

	function updateRow(index: number, field: keyof PolicyRule, value: string) {
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
			{
				section: "",
				family: "rule",
				in: "",
				out: "",
				src: "",
				dest: "",
				priority: "",
				lookup: "",
				fwmark: "",
				ipproto: "",
				goto: "",
				sport: "",
				dport: "",
				tos: "",
				uidrange: "",
				suppress_prefixlength: "",
				action: "",
				invert: "0",
				disabled: "0",
			},
		]);
	}

	function removeRow(index: number) {
		setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
	}

	function duplicateRow(index: number) {
		setRows((current) => {
			const row = current[index];

			if (!row) {
				return current;
			}

			const duplicate = {
				...row,
				section: "",
			};

			const next = [...current];
			next.splice(index + 1, 0, duplicate);
			return next;
		});
	}

	function moveRow(index: number, direction: -1 | 1) {
		setRows((current) => {
			const nextIndex = index + direction;

			if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
				return current;
			}

			const next = [...current];
			const [row] = next.splice(index, 1);
			next.splice(nextIndex, 0, row);
			return next;
		});
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await saveNetworkRules(rows, rows.length === 0 && savedRows.length > 0);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextRows = result.rules.map(normalizePolicyRule);
		toast.success(result.message);
		setRows(nextRows);
		setSavedRows(nextRows);
		onSaved(nextRows, result.sections);
	}

	return (
		<section className="grid gap-3">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-base font-semibold">Policy rules</h2>
					<p className="text-sm text-muted-foreground">Configure IPv4 and IPv6 routing policy rules managed by UCI.</p>
				</div>
				<Button onClick={addRow} type="button" variant="outline">
					<Plus className="mr-1 size-4" />
					Add rule
				</Button>
			</div>
			<form className="grid gap-3" onSubmit={(event) => void submit(event)}>
				<div className="overflow-x-auto rounded-md border bg-card">
					<table className="w-full min-w-[126rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Family</th>
								<th className="px-3 py-2 font-medium">In</th>
								<th className="px-3 py-2 font-medium">Out</th>
								<th className="px-3 py-2 font-medium">Source</th>
								<th className="px-3 py-2 font-medium">Destination</th>
								<th className="px-3 py-2 font-medium">Priority</th>
								<th className="px-3 py-2 font-medium">Lookup</th>
								<th className="px-3 py-2 font-medium">Protocol</th>
								<th className="px-3 py-2 font-medium">Jump</th>
								<th className="px-3 py-2 font-medium">Mark</th>
								<th className="px-3 py-2 font-medium">Source port</th>
								<th className="px-3 py-2 font-medium">Dest port</th>
								<th className="px-3 py-2 font-medium">TOS</th>
								<th className="px-3 py-2 font-medium">UID range</th>
								<th className="px-3 py-2 font-medium">Suppress prefix</th>
								<th className="px-3 py-2 font-medium">Action</th>
								<th className="px-3 py-2 font-medium">Invert</th>
								<th className="px-3 py-2 font-medium">Disabled</th>
								<th className="px-3 py-2 text-right font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{rows.length ? (
								rows.map((rule, index) => (
									<tr className="border-b align-top last:border-0" key={`${rule.section || "new"}.${index}`}>
										<td className="px-3 py-3">
											<SelectField
												id={`policy-rule-family-${index}`}
												onChange={(value) => updateRow(index, "family", value)}
												options={[
													["rule", "IPv4"],
													["rule6", "IPv6"],
												]}
												value={rule.family}
											/>
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Input interface" onChange={(event) => updateRow(index, "in", event.target.value)} value={rule.in} />
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Output interface"
												onChange={(event) => updateRow(index, "out", event.target.value)}
												value={rule.out}
											/>
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Source" onChange={(event) => updateRow(index, "src", event.target.value)} value={rule.src} />
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Destination"
												onChange={(event) => updateRow(index, "dest", event.target.value)}
												value={rule.dest}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Priority"
												inputMode="numeric"
												onChange={(event) => updateRow(index, "priority", event.target.value)}
												value={rule.priority}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Lookup table"
												onChange={(event) => updateRow(index, "lookup", event.target.value)}
												value={rule.lookup}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="IP protocol"
												inputMode="numeric"
												onChange={(event) => updateRow(index, "ipproto", event.target.value)}
												value={rule.ipproto}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Jump to rule"
												inputMode="numeric"
												onChange={(event) => updateRow(index, "goto", event.target.value)}
												value={rule.goto}
											/>
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Mark" onChange={(event) => updateRow(index, "fwmark", event.target.value)} value={rule.fwmark} />
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Source port"
												onChange={(event) => updateRow(index, "sport", event.target.value)}
												value={rule.sport}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Destination port"
												onChange={(event) => updateRow(index, "dport", event.target.value)}
												value={rule.dport}
											/>
										</td>
										<td className="px-3 py-3">
											<Input aria-label="TOS" onChange={(event) => updateRow(index, "tos", event.target.value)} value={rule.tos} />
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="UID range"
												onChange={(event) => updateRow(index, "uidrange", event.target.value)}
												value={rule.uidrange}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Suppress prefix"
												inputMode="numeric"
												onChange={(event) => updateRow(index, "suppress_prefixlength", event.target.value)}
												value={rule.suppress_prefixlength}
											/>
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`policy-rule-action-${index}`}
												onChange={(value) => updateRow(index, "action", value)}
												options={[
													["", "unicast"],
													["unreachable", "unreachable"],
													["prohibit", "prohibit"],
													["blackhole", "blackhole"],
													["throw", "throw"],
												]}
												value={rule.action}
											/>
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`policy-rule-invert-${index}`}
												onChange={(value) => updateRow(index, "invert", value)}
												options={[
													["0", "No"],
													["1", "Yes"],
												]}
												value={rule.invert}
											/>
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`policy-rule-disabled-${index}`}
												onChange={(value) => updateRow(index, "disabled", value)}
												options={[
													["0", "No"],
													["1", "Yes"],
												]}
												value={rule.disabled}
											/>
										</td>
										<td className="px-3 py-3 text-right">
											<div className="inline-flex gap-1">
												<Button
													aria-label="Move rule up"
													disabled={index === 0}
													onClick={() => moveRow(index, -1)}
													size="icon"
													type="button"
													variant="ghost"
												>
													<ArrowUp className="size-4" />
												</Button>
												<Button
													aria-label="Move rule down"
													disabled={index === rows.length - 1}
													onClick={() => moveRow(index, 1)}
													size="icon"
													type="button"
													variant="ghost"
												>
													<ArrowDown className="size-4" />
												</Button>
												<Button
													aria-label="Duplicate rule"
													onClick={() => duplicateRow(index)}
													size="icon"
													type="button"
													variant="ghost"
												>
													<Copy className="size-4" />
												</Button>
												<Button
													aria-label="Remove rule"
													onClick={() => removeRow(index)}
													size="icon"
													type="button"
													variant="ghost"
												>
													<Trash2 className="size-4" />
												</Button>
											</div>
										</td>
									</tr>
								))
							) : (
								<tr>
									<td className="px-3 py-6 text-muted-foreground" colSpan={19}>
										No policy rules configured.
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

function networkInterfaceValues(section: ConfigSection): NetworkInterfaceConfig {
	return normalizeNetworkInterface({
		section: section.name,
		proto: rawValue(section.values.proto),
		device: rawValue(section.values.device || section.values.ifname),
		ipaddr: rawListValue(section.values.ipaddr).join("\n"),
		netmask: rawValue(section.values.netmask),
		gateway: rawValue(section.values.gateway),
		ip6assign: rawValue(section.values.ip6assign),
		dns: rawListValue(section.values.dns).join("\n"),
		peerdns: isEnabledValue(section.values.peerdns) ? "1" : "0",
		delegate: isEnabledValue(section.values.delegate) ? "1" : "0",
	});
}

function normalizeNetworkInterface(row: NetworkInterfaceConfig): NetworkInterfaceConfig {
	return {
		section: row.section ?? "",
		proto: row.proto ?? "",
		device: row.device ?? "",
		ipaddr: row.ipaddr ?? "",
		netmask: row.netmask ?? "",
		gateway: row.gateway ?? "",
		ip6assign: row.ip6assign ?? "",
		dns: row.dns ?? "",
		peerdns: row.peerdns === "0" ? "0" : "1",
		delegate: row.delegate === "0" ? "0" : "1",
	};
}

function networkDeviceValues(section: ConfigSection): NetworkDeviceConfig {
	return normalizeNetworkDevice({
		section: section.name,
		name: rawValue(section.values.name),
		type: rawValue(section.values.type),
		ports: rawListValue(section.values.ports).join("\n"),
		macaddr: rawValue(section.values.macaddr),
		mtu: rawValue(section.values.mtu),
	});
}

function normalizeNetworkDevice(row: NetworkDeviceConfig): NetworkDeviceConfig {
	return {
		section: row.section ?? "",
		name: row.name ?? "",
		type: row.type ?? "",
		ports: row.ports ?? "",
		macaddr: row.macaddr ?? "",
		mtu: row.mtu ?? "",
	};
}

function normalizeStaticRoute(route: StaticRoute): StaticRoute {
	return {
		section: route.section ?? "",
		family: route.family === "route6" ? "route6" : "route",
		interface: route.interface ?? "",
		type: route.type ?? "",
		target: route.target ?? "",
		netmask: route.family === "route6" ? "" : (route.netmask ?? ""),
		gateway: route.gateway ?? "",
		metric: route.metric ?? "",
		table: route.table ?? "",
		source: route.source ?? "",
		mtu: route.mtu ?? "",
		onlink: route.onlink === "1" ? "1" : "0",
		disabled: route.disabled === "1" ? "1" : "0",
	};
}

function normalizePolicyRule(rule: PolicyRule): PolicyRule {
	return {
		section: rule.section ?? "",
		family: rule.family === "rule6" ? "rule6" : "rule",
		in: rule.in ?? "",
		out: rule.out ?? "",
		src: rule.src ?? "",
		dest: rule.dest ?? "",
		priority: rule.priority ?? "",
		lookup: rule.lookup ?? "",
		fwmark: rule.fwmark ?? "",
		ipproto: rule.ipproto ?? "",
		goto: rule.goto ?? "",
		sport: rule.sport ?? "",
		dport: rule.dport ?? "",
		tos: rule.tos ?? "",
		uidrange: rule.uidrange ?? "",
		suppress_prefixlength: rule.suppress_prefixlength ?? "",
		action: rule.action ?? "",
		invert: rule.invert === "1" ? "1" : "0",
		disabled: rule.disabled === "1" ? "1" : "0",
	};
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
