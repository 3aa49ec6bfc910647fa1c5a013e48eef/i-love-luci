import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
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
	saveFirewallIpSets,
	saveFirewallNats,
	saveFirewallRedirects,
	saveFirewallRules,
	saveFirewallZones,
	saveDhcpBoot6s,
	saveDhcpBoots,
	saveDhcpDomains,
	saveDhcpHosts,
	saveDhcpMatches,
	saveDhcpPools,
	saveDhcpRelays,
	saveDhcpTags,
	saveDhcpUserClasses,
	saveDhcpVendorClasses,
	saveDnsmasqConfig,
	saveOdhcpdConfig,
	saveLuciUiSettings,
	saveNetworkDevices,
	saveNetworkInterfaces,
	saveNetworkRules,
	saveNetworkRoutes,
	saveSystemSettings,
	saveUhttpdCertDefaults,
	syncSystemTime,
	type ConfigSection,
	type CoreSettings,
	type DashboardStatus,
	type DhcpBoot,
	type DhcpBoot6,
	type DhcpDomain,
	type DhcpHost,
	type DhcpLease,
	type DhcpMatch,
	type DhcpPool,
	type DhcpRelay,
	type DhcpTag,
	type DhcpUserClass,
	type DhcpVendorClass,
	type DnsmasqConfigInput,
	type FirewallDefaultsInput,
	type FirewallForwarding,
	type FirewallInclude,
	type FirewallIpSet,
	type FirewallNat,
	type FirewallRedirect,
	type FirewallRuleRow,
	type FirewallZone,
	type LuciUiSettingsInput,
	type NetworkDeviceConfig,
	type NetworkInterfaceConfig,
	type NetworkInterfaceStatus,
	type OdhcpdConfigInput,
	type PolicyRule,
	type ServiceFile,
	type ServiceState,
	type StaticRoute,
	type SystemSettingsInput,
	type UhttpdCertDefaultsInput,
} from "@/lib/rpc";

type CorePage = "network" | "dhcp" | "firewall" | "system";

type PendingStaticHost = {
	host: DhcpHost;
	id: number;
};

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
	const relays = settings.dhcpRelays ?? [];
	const boots = settings.dhcpBoots ?? [];
	const boot6s = settings.dhcpBoot6s ?? [];
	const tags = settings.dhcpTags ?? [];
	const matches = settings.dhcpMatches ?? [];
	const vendorClasses = settings.dhcpVendorClasses ?? [];
	const userClasses = settings.dhcpUserClasses ?? [];
	const dnsmasq = settings.dhcp.find((section) => section.type === "dnsmasq") ?? null;
	const odhcpd = settings.dhcp.find((section) => section.type === "odhcpd") ?? null;
	const [pendingStaticHost, setPendingStaticHost] = useState<PendingStaticHost | null>(null);

	function addStaticHostFromLease(lease: DhcpLease) {
		setPendingStaticHost({
			host: {
				section: "",
				name: lease.hostname === "unknown" ? "" : lease.hostname,
				ip: lease.ip,
				mac: lease.mac,
				leasetime: "",
				duid: "",
				hostid: "",
				tag: "",
				match_tag: "",
				instance: "",
				broadcast: "",
				dns: lease.hostname && lease.hostname !== "unknown" ? "1" : "",
			},
			id: Date.now(),
		});
	}

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
			{odhcpd ? (
				<OdhcpdSettingsEditor
					onSaved={(sections) =>
						onSettingsChange({
							...settings,
							dhcp: sections,
						})
					}
					section={odhcpd}
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
			<DhcpRelayEditor
				onSaved={(nextRelays, sections) =>
					onSettingsChange({
						...settings,
						dhcp: sections,
						dhcpRelays: nextRelays,
					})
				}
				relays={relays}
			/>
			<DhcpBootEditor
				boots={boots}
				onSaved={(nextBoots, sections) =>
					onSettingsChange({
						...settings,
						dhcp: sections,
						dhcpBoots: nextBoots,
					})
				}
			/>
			<DhcpBoot6Editor
				boots={boot6s}
				onSaved={(nextBoots, sections) =>
					onSettingsChange({
						...settings,
						dhcp: sections,
						dhcpBoot6s: nextBoots,
					})
				}
			/>
			<DhcpTagEditor
				onSaved={(nextTags, sections) =>
					onSettingsChange({
						...settings,
						dhcp: sections,
						dhcpTags: nextTags,
					})
				}
				tags={tags}
			/>
			<DhcpMatchEditor
				matches={matches}
				onSaved={(nextMatches, sections) =>
					onSettingsChange({
						...settings,
						dhcp: sections,
						dhcpMatches: nextMatches,
					})
				}
			/>
			<DhcpClassEditor
				classes={vendorClasses}
				kind="vendor"
				onSaved={(nextClasses, sections) =>
					onSettingsChange({
						...settings,
						dhcp: sections,
						dhcpVendorClasses: nextClasses as DhcpVendorClass[],
					})
				}
			/>
			<DhcpClassEditor
				classes={userClasses}
				kind="user"
				onSaved={(nextClasses, sections) =>
					onSettingsChange({
						...settings,
						dhcp: sections,
						dhcpUserClasses: nextClasses as DhcpUserClass[],
					})
				}
			/>
			<LeaseTable leases={leases} onAddStaticHost={addStaticHostFromLease} />
			<StaticHostEditor
				hosts={staticHosts}
				onSaved={(hosts, sections) =>
					onSettingsChange({
						...settings,
						dhcp: sections,
						dhcpHosts: hosts,
					})
				}
				pendingHost={pendingStaticHost}
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

function OdhcpdSettingsEditor({ onSaved, section }: { onSaved: (sections: ConfigSection[]) => void; section: ConfigSection }) {
	const [values, setValues] = useState(() => odhcpdSettingsValues(section));
	const [savedValues, setSavedValues] = useState(values);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(values) !== JSON.stringify(savedValues);

	function updateField(field: keyof OdhcpdConfigInput, value: string) {
		setValues((current) => ({
			...current,
			[field]: value,
		}));
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await saveOdhcpdConfig(values);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextValues = result.section ? odhcpdSettingsValues(result.section) : values;
		toast.success(result.message);
		setValues(nextValues);
		setSavedValues(nextValues);
		onSaved(result.sections);
	}

	return (
		<section className="grid gap-3">
			<div>
				<h2 className="text-base font-semibold">odhcpd settings</h2>
				<p className="text-sm text-muted-foreground">Configure global DHCPv4 handoff, lease storage, and daemon logging.</p>
			</div>
			<form className="grid gap-4 rounded-md border bg-card p-4" onSubmit={(event) => void submit(event)}>
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					<BooleanField
						id="odhcpd-maindhcp"
						label="Use odhcpd for DHCPv4"
						onChange={(value) => updateField("maindhcp", value)}
						value={values.maindhcp}
					/>
					<Field label="Lease file" target="odhcpd-leasefile">
						<Input id="odhcpd-leasefile" onChange={(event) => updateField("leasefile", event.target.value)} value={values.leasefile} />
					</Field>
					<Field label="Lease trigger" target="odhcpd-leasetrigger">
						<Input
							id="odhcpd-leasetrigger"
							onChange={(event) => updateField("leasetrigger", event.target.value)}
							value={values.leasetrigger}
						/>
					</Field>
					<Field label="Hosts directory" target="odhcpd-hostsdir">
						<Input id="odhcpd-hostsdir" onChange={(event) => updateField("hostsdir", event.target.value)} value={values.hostsdir} />
					</Field>
					<Field label="PIO directory" target="odhcpd-piodir">
						<Input id="odhcpd-piodir" onChange={(event) => updateField("piodir", event.target.value)} value={values.piodir} />
					</Field>
					<Field label="Log level" target="odhcpd-loglevel">
						<SelectField
							id="odhcpd-loglevel"
							onChange={(value) => updateField("loglevel", value)}
							options={[
								["", "Default"],
								["0", "Emergency"],
								["1", "Alert"],
								["2", "Critical"],
								["3", "Error"],
								["4", "Warning"],
								["5", "Notice"],
								["6", "Info"],
								["7", "Debug"],
							]}
							value={values.loglevel}
						/>
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
					<OptionalBooleanField
						id="dns-address-as-local"
						label="Resolve addresses locally"
						onChange={(value) => updateField("address_as_local", value)}
						value={values.address_as_local}
					/>
					<Field label="Local domain" target="dns-local">
						<Input id="dns-local" onChange={(event) => updateField("local", event.target.value)} value={values.local} />
					</Field>
					<Field label="Search domain" target="dns-domain">
						<Input id="dns-domain" onChange={(event) => updateField("domain", event.target.value)} value={values.domain} />
					</Field>
					<Field label="Max DHCP leases" target="dns-dhcpleasemax">
						<Input
							id="dns-dhcpleasemax"
							inputMode="numeric"
							onChange={(event) => updateField("dhcpleasemax", event.target.value)}
							value={values.dhcpleasemax}
						/>
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
					<Field label="Log facility" target="dns-logfacility">
						<Input id="dns-logfacility" onChange={(event) => updateField("logfacility", event.target.value)} value={values.logfacility} />
					</Field>
				</div>
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					<OptionalBooleanField
						id="dns-nonwildcard"
						label="Non-wildcard bind"
						onChange={(value) => updateField("nonwildcard", value)}
						value={values.nonwildcard}
					/>
					<OptionalBooleanField
						id="dns-logdhcp"
						label="Extra DHCP logging"
						onChange={(value) => updateField("logdhcp", value)}
						value={values.logdhcp}
					/>
					<OptionalBooleanField
						id="dns-quietdhcp"
						label="Suppress DHCP logging"
						onChange={(value) => updateField("quietdhcp", value)}
						value={values.quietdhcp}
					/>
					<OptionalBooleanField
						id="dns-enable-tftp"
						label="TFTP server"
						onChange={(value) => updateField("enable_tftp", value)}
						value={values.enable_tftp}
					/>
					<OptionalBooleanField
						id="dns-allservers"
						label="Query all servers"
						onChange={(value) => updateField("allservers", value)}
						value={values.allservers}
					/>
					<OptionalBooleanField
						id="dns-boguspriv"
						label="Filter private reverse lookups"
						onChange={(value) => updateField("boguspriv", value)}
						value={values.boguspriv}
					/>
					<OptionalBooleanField
						id="dns-filterwin2k"
						label="Filter useless Windows queries"
						onChange={(value) => updateField("filterwin2k", value)}
						value={values.filterwin2k}
					/>
					<OptionalBooleanField
						id="dns-filter-aaaa"
						label="Filter AAAA"
						onChange={(value) => updateField("filter_aaaa", value)}
						value={values.filter_aaaa}
					/>
					<OptionalBooleanField
						id="dns-filter-a"
						label="Filter A"
						onChange={(value) => updateField("filter_a", value)}
						value={values.filter_a}
					/>
					<OptionalBooleanField
						id="dns-nonegcache"
						label="Disable negative cache"
						onChange={(value) => updateField("nonegcache", value)}
						value={values.nonegcache}
					/>
					<OptionalBooleanField
						id="dns-noresolv"
						label="Ignore resolver file"
						onChange={(value) => updateField("noresolv", value)}
						value={values.noresolv}
					/>
					<OptionalBooleanField
						id="dns-strictorder"
						label="Strict resolver order"
						onChange={(value) => updateField("strictorder", value)}
						value={values.strictorder}
					/>
					<OptionalBooleanField
						id="dns-ignore-hosts-dir"
						label="Ignore hosts directory"
						onChange={(value) => updateField("ignore_hosts_dir", value)}
						value={values.ignore_hosts_dir}
					/>
					<OptionalBooleanField
						id="dns-nohosts"
						label="Ignore hosts files"
						onChange={(value) => updateField("nohosts", value)}
						value={values.nohosts}
					/>
					<OptionalBooleanField
						id="dns-logqueries"
						label="Log DNS queries"
						onChange={(value) => updateField("logqueries", value)}
						value={values.logqueries}
					/>
					<OptionalBooleanField
						id="dns-stripmac"
						label="Strip MAC upstream"
						onChange={(value) => updateField("stripmac", value)}
						value={values.stripmac}
					/>
					<OptionalBooleanField
						id="dns-stripsubnet"
						label="Strip subnet upstream"
						onChange={(value) => updateField("stripsubnet", value)}
						value={values.stripsubnet}
					/>
					<Field label="TFTP root" target="dns-tftp-root">
						<Input id="dns-tftp-root" onChange={(event) => updateField("tftp_root", event.target.value)} value={values.tftp_root} />
					</Field>
					<Field label="Network boot image" target="dns-dhcp-boot">
						<Input id="dns-dhcp-boot" onChange={(event) => updateField("dhcp_boot", event.target.value)} value={values.dhcp_boot} />
					</Field>
					<Field label="DNS server port" target="dns-port">
						<Input id="dns-port" inputMode="numeric" onChange={(event) => updateField("port", event.target.value)} value={values.port} />
					</Field>
					<Field label="DNS query port" target="dns-queryport">
						<Input
							id="dns-queryport"
							inputMode="numeric"
							onChange={(event) => updateField("queryport", event.target.value)}
							value={values.queryport}
						/>
					</Field>
					<Field label="Min source port" target="dns-minport">
						<Input
							id="dns-minport"
							inputMode="numeric"
							onChange={(event) => updateField("minport", event.target.value)}
							value={values.minport}
						/>
					</Field>
					<Field label="Max source port" target="dns-maxport">
						<Input
							id="dns-maxport"
							inputMode="numeric"
							onChange={(event) => updateField("maxport", event.target.value)}
							value={values.maxport}
						/>
					</Field>
					<Field label="Max concurrent queries" target="dns-forwardmax">
						<Input
							id="dns-forwardmax"
							inputMode="numeric"
							onChange={(event) => updateField("dnsforwardmax", event.target.value)}
							value={values.dnsforwardmax}
						/>
					</Field>
					<Field label="Min cache TTL" target="dns-min-cache-ttl">
						<Input
							id="dns-min-cache-ttl"
							inputMode="numeric"
							onChange={(event) => updateField("min_cache_ttl", event.target.value)}
							value={values.min_cache_ttl}
						/>
					</Field>
					<Field label="Max cache TTL" target="dns-max-cache-ttl">
						<Input
							id="dns-max-cache-ttl"
							inputMode="numeric"
							onChange={(event) => updateField("max_cache_ttl", event.target.value)}
							value={values.max_cache_ttl}
						/>
					</Field>
					<Field label="MAC forwarding" target="dns-addmac">
						<Input id="dns-addmac" onChange={(event) => updateField("addmac", event.target.value)} value={values.addmac} />
					</Field>
					<Field label="Subnet forwarding" target="dns-addsubnet">
						<Input id="dns-addsubnet" onChange={(event) => updateField("addsubnet", event.target.value)} value={values.addsubnet} />
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
				<Field label="Resolved addresses" target="dns-addresses">
					<textarea
						className="min-h-24 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
						id="dns-addresses"
						onChange={(event) => updateField("address", event.target.value)}
						placeholder="/example.com/192.0.2.10"
						spellCheck={false}
						value={values.address}
					/>
				</Field>
				<div className="grid gap-4 md:grid-cols-3">
					<Field label="Rebind whitelist" target="dns-rebind-domain">
						<textarea
							className="min-h-24 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
							id="dns-rebind-domain"
							onChange={(event) => updateField("rebind_domain", event.target.value)}
							spellCheck={false}
							value={values.rebind_domain}
						/>
					</Field>
					<Field label="Bogus NXDOMAIN" target="dns-bogusnxdomain">
						<textarea
							className="min-h-24 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
							id="dns-bogusnxdomain"
							onChange={(event) => updateField("bogusnxdomain", event.target.value)}
							spellCheck={false}
							value={values.bogusnxdomain}
						/>
					</Field>
					<Field label="Additional hosts files" target="dns-addnhosts">
						<textarea
							className="min-h-24 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
							id="dns-addnhosts"
							onChange={(event) => updateField("addnhosts", event.target.value)}
							spellCheck={false}
							value={values.addnhosts}
						/>
					</Field>
				</div>
				<div className="grid gap-4 md:grid-cols-3">
					<Field label="Listen interfaces" target="dns-interface">
						<textarea
							className="min-h-24 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
							id="dns-interface"
							onChange={(event) => updateField("interface", event.target.value)}
							spellCheck={false}
							value={values.interface}
						/>
					</Field>
					<Field label="Listen addresses" target="dns-listen-address">
						<textarea
							className="min-h-24 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
							id="dns-listen-address"
							onChange={(event) => updateField("listen_address", event.target.value)}
							spellCheck={false}
							value={values.listen_address}
						/>
					</Field>
					<Field label="Excluded interfaces" target="dns-notinterface">
						<textarea
							className="min-h-24 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
							id="dns-notinterface"
							onChange={(event) => updateField("notinterface", event.target.value)}
							spellCheck={false}
							value={values.notinterface}
						/>
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

function OptionalBooleanField({
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
					["", "Default"],
					["1", "Enabled"],
					["0", "Disabled"],
				]}
				value={value}
			/>
		</Field>
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
		address_as_local: optionalBooleanValue(section.values.address_as_local),
		nonwildcard: optionalBooleanValue(section.values.nonwildcard),
		logdhcp: optionalBooleanValue(section.values.logdhcp),
		quietdhcp: optionalBooleanValue(section.values.quietdhcp),
		enable_tftp: optionalBooleanValue(section.values.enable_tftp),
		allservers: optionalBooleanValue(section.values.allservers),
		boguspriv: optionalBooleanValue(section.values.boguspriv),
		filterwin2k: optionalBooleanValue(section.values.filterwin2k),
		filter_aaaa: optionalBooleanValue(section.values.filter_aaaa),
		filter_a: optionalBooleanValue(section.values.filter_a),
		nonegcache: optionalBooleanValue(section.values.nonegcache),
		noresolv: optionalBooleanValue(section.values.noresolv),
		strictorder: optionalBooleanValue(section.values.strictorder),
		ignore_hosts_dir: optionalBooleanValue(section.values.ignore_hosts_dir),
		nohosts: optionalBooleanValue(section.values.nohosts),
		logqueries: optionalBooleanValue(section.values.logqueries),
		stripmac: optionalBooleanValue(section.values.stripmac),
		stripsubnet: optionalBooleanValue(section.values.stripsubnet),
		local: rawValue(section.values.local),
		domain: rawValue(section.values.domain),
		cachesize: rawValue(section.values.cachesize),
		dhcpleasemax: rawValue(section.values.dhcpleasemax),
		dnsforwardmax: rawValue(section.values.dnsforwardmax),
		min_cache_ttl: rawValue(section.values.min_cache_ttl),
		max_cache_ttl: rawValue(section.values.max_cache_ttl),
		ednspacket_max: rawValue(section.values.ednspacket_max),
		port: rawValue(section.values.port),
		queryport: rawValue(section.values.queryport),
		minport: rawValue(section.values.minport),
		maxport: rawValue(section.values.maxport),
		leasefile: rawValue(section.values.leasefile),
		resolvfile: rawValue(section.values.resolvfile),
		serversfile: rawValue(section.values.serversfile),
		logfacility: rawValue(section.values.logfacility),
		addmac: rawValue(section.values.addmac),
		addsubnet: rawValue(section.values.addsubnet),
		tftp_root: rawValue(section.values.tftp_root),
		dhcp_boot: rawValue(section.values.dhcp_boot),
		server: rawListValue(section.values.server).join("\n"),
		address: rawListValue(section.values.address).join("\n"),
		rebind_domain: rawListValue(section.values.rebind_domain).join("\n"),
		bogusnxdomain: rawListValue(section.values.bogusnxdomain).join("\n"),
		addnhosts: rawListValue(section.values.addnhosts).join("\n"),
		interface: rawListValue(section.values.interface).join("\n"),
		listen_address: rawListValue(section.values.listen_address).join("\n"),
		notinterface: rawListValue(section.values.notinterface).join("\n"),
	};
}

function booleanValue(value: unknown) {
	return rawValue(value) === "1" ? "1" : "0";
}

function optionalBooleanValue(value: unknown) {
	const raw = rawValue(value);
	return raw === "1" || raw === "0" ? raw : "";
}

function odhcpdSettingsValues(section: ConfigSection): OdhcpdConfigInput {
	return {
		maindhcp: booleanValue(section.values.maindhcp),
		leasefile: rawValue(section.values.leasefile),
		leasetrigger: rawValue(section.values.leasetrigger),
		hostsdir: rawValue(section.values.hostsdir),
		piodir: rawValue(section.values.piodir),
		loglevel: rawValue(section.values.loglevel),
	};
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
									<td className="px-3 py-6 text-muted-foreground" colSpan={21}>
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

function DhcpRelayEditor({
	onSaved,
	relays,
}: {
	onSaved: (relays: DhcpRelay[], sections: ConfigSection[]) => void;
	relays: DhcpRelay[];
}) {
	const [rows, setRows] = useState(() => relays.map(normalizeDhcpRelay));
	const [savedRows, setSavedRows] = useState(rows);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

	function updateRow(index: number, field: keyof DhcpRelay, value: string) {
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
		setRows((current) => [...current, { section: "", local_addr: "", server_addr: "", interface: "" }]);
	}

	function removeRow(index: number) {
		setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await saveDhcpRelays(rows);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextRows = result.relays.map(normalizeDhcpRelay);
		toast.success(result.message);
		setRows(nextRows);
		setSavedRows(nextRows);
		onSaved(nextRows, result.sections);
	}

	return (
		<section className="grid gap-3">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-base font-semibold">DHCP relay</h2>
					<p className="text-sm text-muted-foreground">Relay DHCP requests between matching address families.</p>
				</div>
				<Button onClick={addRow} type="button" variant="outline">
					<Plus className="mr-1 size-4" />
					Add relay
				</Button>
			</div>
			<form className="grid gap-3" onSubmit={(event) => void submit(event)}>
				<div className="overflow-x-auto rounded-md border bg-card">
					<table className="w-full min-w-[54rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Relay from</th>
								<th className="px-3 py-2 font-medium">Relay to address</th>
								<th className="px-3 py-2 font-medium">Reply interface</th>
								<th className="px-3 py-2 text-right font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{rows.length ? (
								rows.map((relay, index) => (
									<tr className="border-b align-top last:border-0" key={`${relay.section || "new"}.${index}`}>
										<td className="px-3 py-3">
											<Input
												aria-label="Relay from address"
												onChange={(event) => updateRow(index, "local_addr", event.target.value)}
												value={relay.local_addr}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Relay to address"
												onChange={(event) => updateRow(index, "server_addr", event.target.value)}
												value={relay.server_addr}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Only accept replies via"
												onChange={(event) => updateRow(index, "interface", event.target.value)}
												value={relay.interface}
											/>
										</td>
										<td className="px-3 py-3 text-right">
											<Button
												aria-label="Remove relay"
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
										No DHCP relay entries configured.
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

function normalizeDhcpRelay(relay: DhcpRelay): DhcpRelay {
	return {
		section: relay.section ?? "",
		local_addr: relay.local_addr ?? "",
		server_addr: relay.server_addr ?? "",
		interface: relay.interface ?? "",
	};
}

function DhcpBootEditor({
	boots,
	onSaved,
}: {
	boots: DhcpBoot[];
	onSaved: (boots: DhcpBoot[], sections: ConfigSection[]) => void;
}) {
	const [rows, setRows] = useState(() => boots.map(normalizeDhcpBoot));
	const [savedRows, setSavedRows] = useState(rows);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

	function updateRow(index: number, field: keyof DhcpBoot, value: string) {
		setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
	}

	function addRow() {
		setRows((current) => [
			...current,
			{ section: "", filename: "", servername: "", serveraddress: "", dhcp_option: "", networkid: "", force: "", instance: "" },
		]);
	}

	function removeRow(index: number) {
		setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await saveDhcpBoots(rows);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextRows = result.boots.map(normalizeDhcpBoot);
		toast.success(result.message);
		setRows(nextRows);
		setSavedRows(nextRows);
		onSaved(nextRows, result.sections);
	}

	return (
		<section className="grid gap-3">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-base font-semibold">PXE/TFTP boot options</h2>
					<p className="text-sm text-muted-foreground">Configure dnsmasq boot files, DHCP options, tags, and instance binding.</p>
				</div>
				<Button onClick={addRow} type="button" variant="outline">
					<Plus className="mr-1 size-4" />
					Add boot
				</Button>
			</div>
			<form className="grid gap-3" onSubmit={(event) => void submit(event)}>
				<div className="overflow-x-auto rounded-md border bg-card">
					<table className="w-full min-w-[88rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Filename</th>
								<th className="px-3 py-2 font-medium">Server name</th>
								<th className="px-3 py-2 font-medium">Server address</th>
								<th className="px-3 py-2 font-medium">DHCP options</th>
								<th className="px-3 py-2 font-medium">Match tag</th>
								<th className="px-3 py-2 font-medium">Force</th>
								<th className="px-3 py-2 font-medium">Instance</th>
								<th className="px-3 py-2 text-right font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{rows.length ? (
								rows.map((boot, index) => (
									<tr className="border-b align-top last:border-0" key={`${boot.section || "new"}.${index}`}>
										<td className="px-3 py-3">
											<Input
												aria-label="Boot filename"
												onChange={(event) => updateRow(index, "filename", event.target.value)}
												value={boot.filename}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Boot server name"
												onChange={(event) => updateRow(index, "servername", event.target.value)}
												value={boot.servername}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Boot server address"
												onChange={(event) => updateRow(index, "serveraddress", event.target.value)}
												value={boot.serveraddress}
											/>
										</td>
										<td className="px-3 py-3">
											<textarea
												aria-label="DHCP boot options"
												className="min-h-20 w-72 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "dhcp_option", event.target.value)}
												value={boot.dhcp_option}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Boot match tag"
												onChange={(event) => updateRow(index, "networkid", event.target.value)}
												value={boot.networkid}
											/>
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`dhcp-boot-force-${index}`}
												onChange={(value) => updateRow(index, "force", value)}
												options={[
													["", "Default"],
													["1", "Yes"],
													["0", "No"],
												]}
												value={boot.force}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Boot dnsmasq instance"
												onChange={(event) => updateRow(index, "instance", event.target.value)}
												value={boot.instance}
											/>
										</td>
										<td className="px-3 py-3 text-right">
											<Button
												aria-label={`Remove ${boot.filename || "boot option"}`}
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
									<td className="px-3 py-6 text-muted-foreground" colSpan={8}>
										No PXE/TFTP boot options configured.
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

function normalizeDhcpBoot(boot: DhcpBoot): DhcpBoot {
	return {
		section: boot.section ?? "",
		filename: boot.filename ?? "",
		servername: boot.servername ?? "",
		serveraddress: boot.serveraddress ?? "",
		dhcp_option: boot.dhcp_option ?? "",
		networkid: boot.networkid ?? "",
		force: boot.force === "1" || boot.force === "0" ? boot.force : "",
		instance: boot.instance ?? "",
	};
}

function DhcpBoot6Editor({
	boots,
	onSaved,
}: {
	boots: DhcpBoot6[];
	onSaved: (boots: DhcpBoot6[], sections: ConfigSection[]) => void;
}) {
	const [rows, setRows] = useState(() => boots.map(normalizeDhcpBoot6));
	const [savedRows, setSavedRows] = useState(rows);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

	function updateRow(index: number, field: keyof DhcpBoot6, value: string) {
		setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
	}

	function addRow() {
		setRows((current) => [...current, { section: "", url: "", arch: "" }]);
	}

	function removeRow(index: number) {
		setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await saveDhcpBoot6s(rows);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextRows = result.boots.map(normalizeDhcpBoot6);
		toast.success(result.message);
		setRows(nextRows);
		setSavedRows(nextRows);
		onSaved(nextRows, result.sections);
	}

	return (
		<section className="grid gap-3">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-base font-semibold">PXE over IPv6</h2>
					<p className="text-sm text-muted-foreground">Configure odhcpd boot URLs and optional client architecture selectors.</p>
				</div>
				<Button onClick={addRow} type="button" variant="outline">
					<Plus className="mr-1 size-4" />
					Add IPv6 boot
				</Button>
			</div>
			<form className="grid gap-3" onSubmit={(event) => void submit(event)}>
				<div className="overflow-x-auto rounded-md border bg-card">
					<table className="w-full min-w-[42rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">URL</th>
								<th className="px-3 py-2 font-medium">Architecture</th>
								<th className="px-3 py-2 text-right font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{rows.length ? (
								rows.map((boot, index) => (
									<tr className="border-b align-top last:border-0" key={`${boot.section || "new"}.${index}`}>
										<td className="px-3 py-3">
											<Input
												aria-label="IPv6 boot URL"
												onChange={(event) => updateRow(index, "url", event.target.value)}
												value={boot.url}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Client architecture"
												inputMode="numeric"
												onChange={(event) => updateRow(index, "arch", event.target.value)}
												value={boot.arch}
											/>
										</td>
										<td className="px-3 py-3 text-right">
											<Button
												aria-label={`Remove ${boot.url || "IPv6 boot option"}`}
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
										No IPv6 PXE boot options configured.
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

function normalizeDhcpBoot6(boot: DhcpBoot6): DhcpBoot6 {
	return {
		section: boot.section ?? "",
		url: boot.url ?? "",
		arch: boot.arch ?? "",
	};
}

function DhcpTagEditor({
	onSaved,
	tags,
}: {
	onSaved: (tags: DhcpTag[], sections: ConfigSection[]) => void;
	tags: DhcpTag[];
}) {
	const [rows, setRows] = useState(() => tags.map(normalizeDhcpTag));
	const [savedRows, setSavedRows] = useState(rows);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

	function updateRow(index: number, field: keyof DhcpTag, value: string) {
		setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
	}

	function addRow() {
		setRows((current) => [...current, { section: "", dhcp_option: "", force: "" }]);
	}

	function removeRow(index: number) {
		setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await saveDhcpTags(rows);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextRows = result.tags.map(normalizeDhcpTag);
		toast.success(result.message);
		setRows(nextRows);
		setSavedRows(nextRows);
		onSaved(nextRows, result.sections);
	}

	return (
		<section className="grid gap-3">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-base font-semibold">DHCP tags</h2>
					<p className="text-sm text-muted-foreground">Apply DHCP options when matching clients receive a tag.</p>
				</div>
				<Button onClick={addRow} type="button" variant="outline">
					<Plus className="mr-1 size-4" />
					Add tag
				</Button>
			</div>
			<form className="grid gap-3" onSubmit={(event) => void submit(event)}>
				<div className="overflow-x-auto rounded-md border bg-card">
					<table className="w-full min-w-[56rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Tag</th>
								<th className="px-3 py-2 font-medium">DHCP options</th>
								<th className="px-3 py-2 font-medium">Force</th>
								<th className="px-3 py-2 text-right font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{rows.length ? (
								rows.map((row, index) => (
									<tr className="border-b align-top last:border-0" key={`${row.section || "new"}.${index}`}>
										<td className="px-3 py-3">
											<Input
												aria-label="Tag name"
												onChange={(event) => updateRow(index, "section", event.target.value)}
												value={row.section}
											/>
										</td>
										<td className="px-3 py-3">
											<textarea
												aria-label="DHCP options"
												className="min-h-20 w-96 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "dhcp_option", event.target.value)}
												value={row.dhcp_option}
											/>
										</td>
										<td className="px-3 py-3">
											<ForceSelect id={`dhcp-tag-force-${index}`} onChange={(value) => updateRow(index, "force", value)} value={row.force} />
										</td>
										<td className="px-3 py-3 text-right">
											<RowRemoveButton label={row.section || "tag"} onClick={() => removeRow(index)} />
										</td>
									</tr>
								))
							) : (
								<tr>
									<td className="px-3 py-6 text-muted-foreground" colSpan={4}>
										No DHCP tags configured.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
				<FormActions dirty={dirty} onCancel={() => setRows(savedRows)} saving={saving} />
			</form>
		</section>
	);
}

function normalizeDhcpTag(row: DhcpTag): DhcpTag {
	return {
		section: row.section ?? "",
		dhcp_option: row.dhcp_option ?? "",
		force: row.force === "1" || row.force === "0" ? row.force : "",
	};
}

function DhcpMatchEditor({
	matches,
	onSaved,
}: {
	matches: DhcpMatch[];
	onSaved: (matches: DhcpMatch[], sections: ConfigSection[]) => void;
}) {
	const [rows, setRows] = useState(() => matches.map(normalizeDhcpMatch));
	const [savedRows, setSavedRows] = useState(rows);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

	function updateRow(index: number, field: keyof DhcpMatch, value: string) {
		setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
	}

	function addRow() {
		setRows((current) => [...current, { section: "", match: "", networkid: "", force: "" }]);
	}

	function removeRow(index: number) {
		setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await saveDhcpMatches(rows);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextRows = result.matches.map(normalizeDhcpMatch);
		toast.success(result.message);
		setRows(nextRows);
		setSavedRows(nextRows);
		onSaved(nextRows, result.sections);
	}

	return (
		<section className="grid gap-3">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-base font-semibold">DHCP option matches</h2>
					<p className="text-sm text-muted-foreground">Set tags when clients present matching DHCP options.</p>
				</div>
				<Button onClick={addRow} type="button" variant="outline">
					<Plus className="mr-1 size-4" />
					Add match
				</Button>
			</div>
			<form className="grid gap-3" onSubmit={(event) => void submit(event)}>
				<DhcpConditionTable
					emptyText="No DHCP option matches configured."
					forcePrefix="dhcp-match"
					labelField="match"
					labelTitle="Match"
					onRemove={removeRow}
					onUpdate={updateRow}
					rows={rows}
					tagTitle="Set tag"
				/>
				<FormActions dirty={dirty} onCancel={() => setRows(savedRows)} saving={saving} />
			</form>
		</section>
	);
}

function normalizeDhcpMatch(row: DhcpMatch): DhcpMatch {
	return {
		section: row.section ?? "",
		match: row.match ?? "",
		networkid: row.networkid ?? "",
		force: row.force === "1" || row.force === "0" ? row.force : "",
	};
}

type DhcpClassKind = "vendor" | "user";
type DhcpClassRow = {
	section: string;
	networkid: string;
	force: string;
	vendorclass?: string;
	userclass?: string;
};

function DhcpClassEditor({
	classes,
	kind,
	onSaved,
}: {
	classes: DhcpClassRow[];
	kind: DhcpClassKind;
	onSaved: (classes: DhcpClassRow[], sections: ConfigSection[]) => void;
}) {
	const normalize = kind === "vendor" ? normalizeDhcpVendorClass : normalizeDhcpUserClass;
	const [rows, setRows] = useState<DhcpClassRow[]>(() => classes.map((row) => normalize(row as never)));
	const [savedRows, setSavedRows] = useState(rows);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);
	const labelField = kind === "vendor" ? "vendorclass" : "userclass";
	const title = kind === "vendor" ? "Vendor class matches" : "User class matches";
	const description =
		kind === "vendor" ? "Set tags when clients present a vendor class." : "Set tags when clients present a user class.";

	function updateRow(index: number, field: keyof (DhcpVendorClass & DhcpUserClass), value: string) {
		setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
	}

	function addRow() {
		setRows((current) => [
			...current,
			kind === "vendor"
				? { section: "", vendorclass: "", networkid: "", force: "" }
				: { section: "", userclass: "", networkid: "", force: "" },
		]);
	}

	function removeRow(index: number) {
		setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = kind === "vendor" ? await saveDhcpVendorClasses(rows as DhcpVendorClass[]) : await saveDhcpUserClasses(rows as DhcpUserClass[]);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextRows: DhcpClassRow[] = result.classes.map((row) => normalize(row as never));
		toast.success(result.message);
		setRows(nextRows);
		setSavedRows(nextRows);
		onSaved(nextRows, result.sections);
	}

	return (
		<section className="grid gap-3">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-base font-semibold">{title}</h2>
					<p className="text-sm text-muted-foreground">{description}</p>
				</div>
				<Button onClick={addRow} type="button" variant="outline">
					<Plus className="mr-1 size-4" />
					Add {kind === "vendor" ? "vendor" : "user"} class
				</Button>
			</div>
			<form className="grid gap-3" onSubmit={(event) => void submit(event)}>
				<DhcpConditionTable
					emptyText={`No DHCP ${kind} class matches configured.`}
					forcePrefix={`dhcp-${kind}-class`}
					labelField={labelField}
					labelTitle={kind === "vendor" ? "Vendor class" : "User class"}
					onRemove={removeRow}
					onUpdate={updateRow}
					rows={rows}
					tagTitle="Set tag"
				/>
				<FormActions dirty={dirty} onCancel={() => setRows(savedRows)} saving={saving} />
			</form>
		</section>
	);
}

function normalizeDhcpVendorClass(row: DhcpVendorClass): DhcpVendorClass {
	return {
		section: row.section ?? "",
		vendorclass: row.vendorclass ?? "",
		networkid: row.networkid ?? "",
		force: row.force === "1" || row.force === "0" ? row.force : "",
	};
}

function normalizeDhcpUserClass(row: DhcpUserClass): DhcpUserClass {
	return {
		section: row.section ?? "",
		userclass: row.userclass ?? "",
		networkid: row.networkid ?? "",
		force: row.force === "1" || row.force === "0" ? row.force : "",
	};
}

function DhcpConditionTable({
	emptyText,
	forcePrefix,
	labelField,
	labelTitle,
	onRemove,
	onUpdate,
	rows,
	tagTitle,
}: {
	emptyText: string;
	forcePrefix: string;
	labelField: string;
	labelTitle: string;
	onRemove: (index: number) => void;
	onUpdate: (index: number, field: never, value: string) => void;
	rows: Array<Record<string, string>>;
	tagTitle: string;
}) {
	return (
		<div className="overflow-x-auto rounded-md border bg-card">
			<table className="w-full min-w-[52rem] text-left text-sm">
				<thead className="border-b text-xs uppercase text-muted-foreground">
					<tr>
						<th className="px-3 py-2 font-medium">{labelTitle}</th>
						<th className="px-3 py-2 font-medium">{tagTitle}</th>
						<th className="px-3 py-2 font-medium">Force</th>
						<th className="px-3 py-2 text-right font-medium">Actions</th>
					</tr>
				</thead>
				<tbody>
					{rows.length ? (
						rows.map((row, index) => (
							<tr className="border-b align-top last:border-0" key={`${row.section || "new"}.${index}`}>
								<td className="px-3 py-3">
									<Input
										aria-label={labelTitle}
										onChange={(event) => onUpdate(index, labelField as never, event.target.value)}
										value={row[labelField] ?? ""}
									/>
								</td>
								<td className="px-3 py-3">
									<Input
										aria-label={tagTitle}
										onChange={(event) => onUpdate(index, "networkid" as never, event.target.value)}
										value={row.networkid ?? ""}
									/>
								</td>
								<td className="px-3 py-3">
									<ForceSelect
										id={`${forcePrefix}-${index}`}
										onChange={(value) => onUpdate(index, "force" as never, value)}
										value={row.force ?? ""}
									/>
								</td>
								<td className="px-3 py-3 text-right">
									<RowRemoveButton label={row[labelField] || "row"} onClick={() => onRemove(index)} />
								</td>
							</tr>
						))
					) : (
						<tr>
							<td className="px-3 py-6 text-muted-foreground" colSpan={4}>
								{emptyText}
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}

function ForceSelect({ id, onChange, value }: { id: string; onChange: (value: string) => void; value: string }) {
	return (
		<SelectField
			id={id}
			onChange={onChange}
			options={[
				["", "Default"],
				["1", "Yes"],
				["0", "No"],
			]}
			value={value}
		/>
	);
}

function RowRemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
	return (
		<Button aria-label={`Remove ${label}`} onClick={onClick} size="icon" type="button" variant="ghost">
			<Trash2 className="size-4" />
		</Button>
	);
}

function FormActions({ dirty, onCancel, saving }: { dirty: boolean; onCancel: () => void; saving: boolean }) {
	return (
		<div className="flex justify-end gap-2">
			<Button disabled={!dirty || saving} onClick={onCancel} type="button" variant="outline">
				Cancel
			</Button>
			<Button disabled={!dirty || saving} type="submit">
				Save
			</Button>
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

function LeaseTable({ leases, onAddStaticHost }: { leases: DhcpLease[]; onAddStaticHost: (lease: DhcpLease) => void }) {
	return (
		<section className="grid gap-3">
			<div className="flex items-center justify-between gap-3">
				<h2 className="text-base font-semibold">Active DHCP leases</h2>
				<span className="text-xs text-muted-foreground">{leases.length} leases</span>
			</div>
			<div className="overflow-x-auto rounded-md border bg-card">
				<table className="w-full min-w-[52rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Host</th>
							<th className="px-3 py-2 font-medium">IP</th>
							<th className="px-3 py-2 font-medium">MAC</th>
							<th className="px-3 py-2 font-medium">Expires</th>
							<th className="hidden px-3 py-2 font-medium md:table-cell">Client ID</th>
							<th className="px-3 py-2 text-right font-medium">Actions</th>
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
									<td className="px-3 py-3 text-right">
										<Button onClick={() => onAddStaticHost(lease)} size="sm" type="button" variant="outline">
											Add static
										</Button>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td className="px-3 py-6 text-muted-foreground" colSpan={6}>
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
	pendingHost,
}: {
	hosts: DhcpHost[];
	onSaved: (hosts: DhcpHost[], sections: ConfigSection[]) => void;
	pendingHost: PendingStaticHost | null;
}) {
	const [rows, setRows] = useState(() => hosts.map(normalizeDhcpHost));
	const [savedRows, setSavedRows] = useState(rows);
	const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
	const [saving, setSaving] = useState(false);
	const rowRefs = useRef<Array<HTMLTableRowElement | null>>([]);
	const nameInputRefs = useRef<Array<HTMLInputElement | null>>([]);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

	useEffect(() => {
		if (!pendingHost)
			return;

		const nextHost = normalizeDhcpHost(pendingHost.host);
		const timeout = window.setTimeout(() => {
			let targetIndex = 0;

			setRows((current) => {
				const existingIndex = current.findIndex((row) => {
					const sameMac = row.mac && nextHost.mac && row.mac.toLowerCase() === nextHost.mac.toLowerCase();
					const sameIp = row.ip && nextHost.ip && row.ip === nextHost.ip;
					return sameMac || sameIp;
				});

				if (existingIndex >= 0) {
					targetIndex = existingIndex;
					return current.map((row, index) =>
						index === existingIndex
							? {
									...row,
									name: row.name || nextHost.name,
									ip: row.ip || nextHost.ip,
									mac: row.mac || nextHost.mac,
								}
							: row,
					);
				}

				targetIndex = current.length;
				return [...current, nextHost];
			});
			setHighlightedIndex(targetIndex);
		}, 0);

		return () => window.clearTimeout(timeout);
	}, [pendingHost]);

	useEffect(() => {
		if (highlightedIndex === null)
			return;

		const frame = window.requestAnimationFrame(() => {
			rowRefs.current[highlightedIndex]?.scrollIntoView({ behavior: "smooth", block: "center" });
			nameInputRefs.current[highlightedIndex]?.focus({ preventScroll: true });
		});
		const timeout = window.setTimeout(() => setHighlightedIndex(null), 3500);

		return () => {
			window.cancelAnimationFrame(frame);
			window.clearTimeout(timeout);
		};
	}, [highlightedIndex, rows.length]);

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
		setRows((current) => [
			...current,
			{
				section: "",
				name: "",
				ip: "",
				mac: "",
				leasetime: "",
				duid: "",
				hostid: "",
				tag: "",
				match_tag: "",
				instance: "",
				broadcast: "",
				dns: "",
			},
		]);
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
					<table className="w-full min-w-[112rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Name</th>
								<th className="px-3 py-2 font-medium">IPv4</th>
								<th className="px-3 py-2 font-medium">MACs</th>
								<th className="px-3 py-2 font-medium">Lease</th>
								<th className="px-3 py-2 font-medium">DUID/IAID</th>
								<th className="px-3 py-2 font-medium">IPv6 token</th>
								<th className="px-3 py-2 font-medium">Set tags</th>
								<th className="px-3 py-2 font-medium">Match tags</th>
								<th className="px-3 py-2 font-medium">Instance</th>
								<th className="px-3 py-2 font-medium">Broadcast</th>
								<th className="px-3 py-2 font-medium">DNS</th>
								<th className="px-3 py-2 text-right font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{rows.length ? (
								rows.map((host, index) => (
									<tr
										className={`border-b align-top transition-colors last:border-0 ${
											highlightedIndex === index ? "bg-primary/10 ring-2 ring-primary/40" : ""
										}`}
										key={`${host.section || "new"}.${index}`}
										ref={(element) => {
											rowRefs.current[index] = element;
										}}
									>
										<td className="px-3 py-3">
											<Input
												aria-label="Host name"
												onChange={(event) => updateRow(index, "name", event.target.value)}
												ref={(element) => {
													nameInputRefs.current[index] = element;
												}}
												value={host.name}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Reserved IPv4 or ignore"
												inputMode="numeric"
												onChange={(event) => updateRow(index, "ip", event.target.value)}
												value={host.ip}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="MAC addresses"
												onChange={(event) => updateRow(index, "mac", event.target.value)}
												value={host.mac}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Lease time"
												onChange={(event) => updateRow(index, "leasetime", event.target.value)}
												placeholder="12h"
												value={host.leasetime}
											/>
										</td>
										<td className="px-3 py-3">
											<textarea
												aria-label="DUID or IAID values"
												className="min-h-20 w-56 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "duid", event.target.value)}
												value={host.duid}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="IPv6 token"
												onChange={(event) => updateRow(index, "hostid", event.target.value)}
												value={host.hostid}
											/>
										</td>
										<td className="px-3 py-3">
											<textarea
												aria-label="Set tags"
												className="min-h-20 w-44 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "tag", event.target.value)}
												value={host.tag}
											/>
										</td>
										<td className="px-3 py-3">
											<textarea
												aria-label="Match tags"
												className="min-h-20 w-44 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "match_tag", event.target.value)}
												value={host.match_tag}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Dnsmasq instance"
												onChange={(event) => updateRow(index, "instance", event.target.value)}
												value={host.instance}
											/>
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`dhcp-host-broadcast-${index}`}
												onChange={(value) => updateRow(index, "broadcast", value)}
												options={[
													["", "Default"],
													["0", "No"],
													["1", "Yes"],
												]}
												value={host.broadcast}
											/>
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`dhcp-host-dns-${index}`}
												onChange={(value) => updateRow(index, "dns", value)}
												options={[
													["", "Default"],
													["1", "Yes"],
													["0", "No"],
												]}
												value={host.dns}
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
									<td className="px-3 py-6 text-muted-foreground" colSpan={12}>
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
		leasetime: host.leasetime ?? "",
		duid: host.duid ?? "",
		hostid: host.hostid ?? "",
		tag: host.tag ?? "",
		match_tag: host.match_tag ?? "",
		instance: host.instance ?? "",
		broadcast: host.broadcast === "1" || host.broadcast === "0" ? host.broadcast : "",
		dns: host.dns === "1" || host.dns === "0" ? host.dns : "",
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

function FirewallIpSetEditor({
	ipsets,
	onSaved,
}: {
	ipsets: ConfigSection[];
	onSaved: (sections: ConfigSection[]) => void;
}) {
	const [rows, setRows] = useState(() => ipsets.map(firewallIpSetValues));
	const [savedRows, setSavedRows] = useState(rows);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

	function updateRow(index: number, field: keyof FirewallIpSet, value: string) {
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
				comment: "",
				family: "ipv4",
				match: "src_ip",
				entry: "",
				maxelem: "",
				external: "",
				storage: "",
				iprange: "",
				portrange: "",
				netmask: "",
				hashsize: "",
				loadfile: "",
				timeout: "",
				counters: "0",
				enabled: "1",
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

			const next = [...current];
			next.splice(index + 1, 0, { ...row, section: "", name: `${row.name || "ipset"}_copy` });
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
		const result = await saveFirewallIpSets(rows, rows.length === 0 && savedRows.length > 0);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextRows = result.ipsets.map(normalizeFirewallIpSet);
		toast.success(result.message);
		setRows(nextRows);
		setSavedRows(nextRows);
		onSaved(result.sections);
	}

	return (
		<section className="grid gap-3">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-base font-semibold">IP sets</h2>
					<p className="text-sm text-muted-foreground">Manage firewall4 IP set definitions used by firewall rules.</p>
				</div>
				<Button onClick={addRow} type="button" variant="outline">
					<Plus className="mr-1 size-4" />
					Add IP set
				</Button>
			</div>
			<form className="grid gap-3" onSubmit={(event) => void submit(event)}>
				<div className="overflow-x-auto rounded-md border bg-card">
					<table className="w-full min-w-[142rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Name</th>
								<th className="px-3 py-2 font-medium">Family</th>
								<th className="px-3 py-2 font-medium">Match</th>
								<th className="px-3 py-2 font-medium">Entries</th>
								<th className="px-3 py-2 font-medium">Comment</th>
								<th className="px-3 py-2 font-medium">External</th>
								<th className="px-3 py-2 font-medium">Storage</th>
								<th className="px-3 py-2 font-medium">IP range</th>
								<th className="px-3 py-2 font-medium">Port range</th>
								<th className="px-3 py-2 font-medium">Netmask</th>
								<th className="px-3 py-2 font-medium">Max entries</th>
								<th className="px-3 py-2 font-medium">Hash size</th>
								<th className="px-3 py-2 font-medium">Load file</th>
								<th className="px-3 py-2 font-medium">Timeout</th>
								<th className="px-3 py-2 font-medium">Counters</th>
								<th className="px-3 py-2 font-medium">Enabled</th>
								<th className="px-3 py-2 text-right font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{rows.length ? (
								rows.map((ipset, index) => (
									<tr className="border-b align-top last:border-0" key={`${ipset.section || "new"}.${index}`}>
										<td className="px-3 py-3">
											<Input aria-label="IP set name" onChange={(event) => updateRow(index, "name", event.target.value)} value={ipset.name} />
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`firewall-ipset-family-${index}`}
												onChange={(value) => updateRow(index, "family", value)}
												options={[
													["any", "IPv4 and IPv6"],
													["ipv4", "IPv4"],
													["ipv6", "IPv6"],
												]}
												value={ipset.family}
											/>
										</td>
										<td className="px-3 py-3">
											<textarea
												aria-label="Packet field match"
												className="h-24 min-w-40 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "match", event.target.value)}
												value={ipset.match}
											/>
										</td>
										<td className="px-3 py-3">
											<textarea
												aria-label="IP set entries"
												className="h-24 min-w-48 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "entry", event.target.value)}
												value={ipset.entry}
											/>
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Comment" onChange={(event) => updateRow(index, "comment", event.target.value)} value={ipset.comment} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="External set" onChange={(event) => updateRow(index, "external", event.target.value)} value={ipset.external} />
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`firewall-ipset-storage-${index}`}
												onChange={(value) => updateRow(index, "storage", value)}
												options={[
													["", "auto"],
													["bitmap", "bitmap"],
													["hash", "hash"],
													["list", "list"],
												]}
												value={ipset.storage}
											/>
										</td>
										<td className="px-3 py-3">
											<Input aria-label="IP range" onChange={(event) => updateRow(index, "iprange", event.target.value)} value={ipset.iprange} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Port range" onChange={(event) => updateRow(index, "portrange", event.target.value)} value={ipset.portrange} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Netmask" onChange={(event) => updateRow(index, "netmask", event.target.value)} value={ipset.netmask} />
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Max entries"
												inputMode="numeric"
												onChange={(event) => updateRow(index, "maxelem", event.target.value)}
												value={ipset.maxelem}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Hash size"
												inputMode="numeric"
												onChange={(event) => updateRow(index, "hashsize", event.target.value)}
												value={ipset.hashsize}
											/>
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Load file" onChange={(event) => updateRow(index, "loadfile", event.target.value)} value={ipset.loadfile} />
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Timeout"
												inputMode="numeric"
												onChange={(event) => updateRow(index, "timeout", event.target.value)}
												value={ipset.timeout}
											/>
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`firewall-ipset-counters-${index}`}
												onChange={(value) => updateRow(index, "counters", value)}
												options={[
													["0", "No"],
													["1", "Yes"],
												]}
												value={ipset.counters}
											/>
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`firewall-ipset-enabled-${index}`}
												onChange={(value) => updateRow(index, "enabled", value)}
												options={[
													["1", "Yes"],
													["0", "No"],
												]}
												value={ipset.enabled}
											/>
										</td>
										<td className="px-3 py-3 text-right">
											<div className="inline-flex gap-1">
												<Button aria-label="Move IP set up" disabled={index === 0} onClick={() => moveRow(index, -1)} size="icon" type="button" variant="ghost">
													<ArrowUp className="size-4" />
												</Button>
												<Button
													aria-label="Move IP set down"
													disabled={index === rows.length - 1}
													onClick={() => moveRow(index, 1)}
													size="icon"
													type="button"
													variant="ghost"
												>
													<ArrowDown className="size-4" />
												</Button>
												<Button aria-label="Duplicate IP set" onClick={() => duplicateRow(index)} size="icon" type="button" variant="ghost">
													<Copy className="size-4" />
												</Button>
												<Button aria-label="Remove IP set" onClick={() => removeRow(index)} size="icon" type="button" variant="ghost">
													<Trash2 className="size-4" />
												</Button>
											</div>
										</td>
									</tr>
								))
							) : (
								<tr>
									<td className="px-3 py-6 text-muted-foreground" colSpan={17}>
										No firewall IP sets configured.
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

function firewallIpSetValues(section: ConfigSection): FirewallIpSet {
	return normalizeFirewallIpSet({
		section: section.name,
		name: rawValue(section.values.name),
		comment: rawValue(section.values.comment),
		family: rawValue(section.values.family),
		match: rawListValue(section.values.match).join("\n"),
		entry: rawListValue(section.values.entry).join("\n"),
		maxelem: rawValue(section.values.maxelem),
		external: rawValue(section.values.external),
		storage: rawValue(section.values.storage),
		iprange: rawValue(section.values.iprange),
		portrange: rawValue(section.values.portrange),
		netmask: rawValue(section.values.netmask),
		hashsize: rawValue(section.values.hashsize),
		loadfile: rawValue(section.values.loadfile),
		timeout: rawValue(section.values.timeout),
		counters: booleanValue(section.values.counters),
		enabled: rawValue(section.values.enabled) === "0" ? "0" : "1",
	});
}

function normalizeFirewallIpSet(ipset: FirewallIpSet): FirewallIpSet {
	return {
		section: ipset.section ?? "",
		name: ipset.name ?? "",
		comment: ipset.comment ?? "",
		family: ["any", "ipv4", "ipv6"].includes(ipset.family) ? ipset.family : "ipv4",
		match: ipset.match ?? "",
		entry: ipset.entry ?? "",
		maxelem: ipset.maxelem ?? "",
		external: ipset.external ?? "",
		storage: ["", "bitmap", "hash", "list"].includes(ipset.storage) ? ipset.storage : "",
		iprange: ipset.iprange ?? "",
		portrange: ipset.portrange ?? "",
		netmask: ipset.netmask ?? "",
		hashsize: ipset.hashsize ?? "",
		loadfile: ipset.loadfile ?? "",
		timeout: ipset.timeout ?? "",
		counters: ipset.counters === "1" ? "1" : "0",
		enabled: ipset.enabled === "0" ? "0" : "1",
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
	const nats = settings.firewall.filter((section) => section.type === "nat");
	const ipsets = settings.firewall.filter((section) => section.type === "ipset");
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

			<FirewallNatEditor
				nats={nats}
				onSaved={(sections) =>
					onSettingsChange({
						...settings,
						firewall: sections,
					})
				}
			/>

			<FirewallIpSetEditor
				ipsets={ipsets}
				onSaved={(sections) =>
					onSettingsChange({
						...settings,
						firewall: sections,
					})
				}
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

function FirewallRuleTargetSelect({ id, onChange, value }: { id: string; onChange: (value: string) => void; value: string }) {
	return (
		<SelectField
			id={id}
			onChange={onChange}
			options={[
				["ACCEPT", "Accept"],
				["REJECT", "Reject"],
				["DROP", "Drop"],
				["NOTRACK", "Do not track"],
				["HELPER", "Helper"],
				["MARK", "Mark"],
				["DSCP", "DSCP"],
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
				subnet: "",
				family: "",
				masq6: "0",
				masq_src: "",
				masq_dest: "",
				masq_allow_invalid: "0",
				auto_helper: "1",
				helper: "",
				log: "",
				log_limit: "",
				extra_src: "",
				extra_dest: "",
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
					<table className="w-full min-w-[172rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Name</th>
								<th className="px-3 py-2 font-medium">Networks</th>
								<th className="px-3 py-2 font-medium">Devices</th>
								<th className="px-3 py-2 font-medium">Subnets</th>
								<th className="px-3 py-2 font-medium">Input</th>
								<th className="px-3 py-2 font-medium">Output</th>
								<th className="px-3 py-2 font-medium">Forward</th>
								<th className="px-3 py-2 font-medium">Family</th>
								<th className="px-3 py-2 font-medium">NAT</th>
								<th className="px-3 py-2 font-medium">NAT6</th>
								<th className="px-3 py-2 font-medium">NAT source</th>
								<th className="px-3 py-2 font-medium">NAT destination</th>
								<th className="px-3 py-2 font-medium">MTU fix</th>
								<th className="px-3 py-2 font-medium">Allow invalid</th>
								<th className="px-3 py-2 font-medium">Auto helper</th>
								<th className="px-3 py-2 font-medium">Helpers</th>
								<th className="px-3 py-2 font-medium">Log tables</th>
								<th className="px-3 py-2 font-medium">Log limit</th>
								<th className="px-3 py-2 font-medium">Extra source</th>
								<th className="px-3 py-2 font-medium">Extra destination</th>
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
											<textarea
												aria-label="Subnets"
												className="min-h-10 w-48 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "subnet", event.target.value)}
												spellCheck={false}
												value={zone.subnet}
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
												id={`firewall-zone-family-${index}`}
												onChange={(value) => updateRow(index, "family", value)}
												options={[
													["", "Any"],
													["ipv4", "IPv4"],
													["ipv6", "IPv6"],
												]}
												value={zone.family}
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
												id={`firewall-zone-masq6-${index}`}
												onChange={(value) => updateRow(index, "masq6", value)}
												options={[
													["0", "No"],
													["1", "Yes"],
												]}
												value={zone.masq6}
											/>
										</td>
										<td className="px-3 py-3">
											<textarea
												aria-label="Masquerading source restrictions"
												className="min-h-10 w-48 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "masq_src", event.target.value)}
												spellCheck={false}
												value={zone.masq_src}
											/>
										</td>
										<td className="px-3 py-3">
											<textarea
												aria-label="Masquerading destination restrictions"
												className="min-h-10 w-48 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "masq_dest", event.target.value)}
												spellCheck={false}
												value={zone.masq_dest}
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
										<td className="px-3 py-3">
											<SelectField
												id={`firewall-zone-invalid-${index}`}
												onChange={(value) => updateRow(index, "masq_allow_invalid", value)}
												options={[
													["0", "No"],
													["1", "Yes"],
												]}
												value={zone.masq_allow_invalid}
											/>
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`firewall-zone-auto-helper-${index}`}
												onChange={(value) => updateRow(index, "auto_helper", value)}
												options={[
													["1", "Yes"],
													["0", "No"],
												]}
												value={zone.auto_helper}
											/>
										</td>
										<td className="px-3 py-3">
											<textarea
												aria-label="Conntrack helpers"
												className="min-h-10 w-44 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "helper", event.target.value)}
												spellCheck={false}
												value={zone.helper}
											/>
										</td>
										<td className="px-3 py-3">
											<textarea
												aria-label="Log tables"
												className="min-h-10 w-44 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "log", event.target.value)}
												spellCheck={false}
												value={zone.log}
											/>
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Log limit" onChange={(event) => updateRow(index, "log_limit", event.target.value)} value={zone.log_limit} />
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Extra source arguments"
												onChange={(event) => updateRow(index, "extra_src", event.target.value)}
												value={zone.extra_src}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Extra destination arguments"
												onChange={(event) => updateRow(index, "extra_dest", event.target.value)}
												value={zone.extra_dest}
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
		subnet: rawListValue(section.values.subnet).join("\n"),
		family: firewallFamilyText(section.values.family),
		masq6: booleanValue(section.values.masq6),
		masq_src: rawListValue(section.values.masq_src).join("\n"),
		masq_dest: rawListValue(section.values.masq_dest).join("\n"),
		masq_allow_invalid: booleanValue(section.values.masq_allow_invalid),
		auto_helper: isEnabledValue(section.values.auto_helper) ? "1" : "0",
		helper: rawListValue(section.values.helper).join("\n"),
		log: rawListValue(section.values.log).join("\n"),
		log_limit: rawValue(section.values.log_limit),
		extra_src: rawValue(section.values.extra_src),
		extra_dest: rawValue(section.values.extra_dest),
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
		subnet: zone.subnet ?? "",
		family: firewallFamilyText(zone.family),
		masq6: zone.masq6 === "1" ? "1" : "0",
		masq_src: zone.masq_src ?? "",
		masq_dest: zone.masq_dest ?? "",
		masq_allow_invalid: zone.masq_allow_invalid === "1" ? "1" : "0",
		auto_helper: zone.auto_helper === "0" ? "0" : "1",
		helper: zone.helper ?? "",
		log: zone.log ?? "",
		log_limit: zone.log_limit ?? "",
		extra_src: zone.extra_src ?? "",
		extra_dest: zone.extra_dest ?? "",
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
				direction: "",
				device: "",
				ipset: "",
				src_mac: "",
				set_mark: "",
				set_xmark: "",
				set_dscp: "",
				set_helper: "",
				helper: "",
				mark: "",
				dscp: "",
				limit: "",
				limit_burst: "",
				log: "0",
				log_limit: "",
				extra: "",
				weekdays: "",
				monthdays: "",
				start_time: "",
				stop_time: "",
				start_date: "",
				stop_date: "",
				utc_time: "0",
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
					<table className="w-full min-w-[260rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Name</th>
								<th className="px-3 py-2 font-medium">Status</th>
								<th className="px-3 py-2 font-medium">Source</th>
								<th className="px-3 py-2 font-medium">Destination</th>
								<th className="px-3 py-2 font-medium">Direction</th>
								<th className="px-3 py-2 font-medium">Device</th>
								<th className="px-3 py-2 font-medium">Protocols</th>
								<th className="px-3 py-2 font-medium">IP set</th>
								<th className="px-3 py-2 font-medium">Source IP</th>
								<th className="px-3 py-2 font-medium">Source MAC</th>
								<th className="px-3 py-2 font-medium">Destination IP</th>
								<th className="px-3 py-2 font-medium">Source port</th>
								<th className="px-3 py-2 font-medium">Destination port</th>
								<th className="px-3 py-2 font-medium">ICMP types</th>
								<th className="px-3 py-2 font-medium">Family</th>
								<th className="px-3 py-2 font-medium">Set mark</th>
								<th className="px-3 py-2 font-medium">Set xmark</th>
								<th className="px-3 py-2 font-medium">Set DSCP</th>
								<th className="px-3 py-2 font-medium">Set helper</th>
								<th className="px-3 py-2 font-medium">Match helper</th>
								<th className="px-3 py-2 font-medium">Match mark</th>
								<th className="px-3 py-2 font-medium">Match DSCP</th>
								<th className="px-3 py-2 font-medium">Limit</th>
								<th className="px-3 py-2 font-medium">Burst</th>
								<th className="px-3 py-2 font-medium">Log</th>
								<th className="px-3 py-2 font-medium">Log limit</th>
								<th className="px-3 py-2 font-medium">Extra</th>
								<th className="px-3 py-2 font-medium">Week days</th>
								<th className="px-3 py-2 font-medium">Month days</th>
								<th className="px-3 py-2 font-medium">Start time</th>
								<th className="px-3 py-2 font-medium">Stop time</th>
								<th className="px-3 py-2 font-medium">Start date</th>
								<th className="px-3 py-2 font-medium">Stop date</th>
								<th className="px-3 py-2 font-medium">UTC</th>
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
											<SelectField
												id={`firewall-rule-direction-${index}`}
												onChange={(value) => updateRow(index, "direction", value)}
												options={[
													["", "Any"],
													["in", "In"],
													["out", "Out"],
												]}
												value={rule.direction}
											/>
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Device" onChange={(event) => updateRow(index, "device", event.target.value)} value={rule.device} />
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
											<Input aria-label="IP set" onChange={(event) => updateRow(index, "ipset", event.target.value)} value={rule.ipset} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Source IP" onChange={(event) => updateRow(index, "src_ip", event.target.value)} value={rule.src_ip} />
										</td>
										<td className="px-3 py-3">
											<textarea
												aria-label="Source MAC"
												className="min-h-10 w-44 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "src_mac", event.target.value)}
												spellCheck={false}
												value={rule.src_mac}
											/>
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
											<Input aria-label="Set mark" onChange={(event) => updateRow(index, "set_mark", event.target.value)} value={rule.set_mark} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Set xmark" onChange={(event) => updateRow(index, "set_xmark", event.target.value)} value={rule.set_xmark} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Set DSCP" onChange={(event) => updateRow(index, "set_dscp", event.target.value)} value={rule.set_dscp} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Set helper" onChange={(event) => updateRow(index, "set_helper", event.target.value)} value={rule.set_helper} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Match helper" onChange={(event) => updateRow(index, "helper", event.target.value)} value={rule.helper} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Match mark" onChange={(event) => updateRow(index, "mark", event.target.value)} value={rule.mark} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Match DSCP" onChange={(event) => updateRow(index, "dscp", event.target.value)} value={rule.dscp} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Limit" onChange={(event) => updateRow(index, "limit", event.target.value)} value={rule.limit} />
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Limit burst"
												inputMode="numeric"
												onChange={(event) => updateRow(index, "limit_burst", event.target.value)}
												value={rule.limit_burst}
											/>
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`firewall-rule-log-${index}`}
												onChange={(value) => updateRow(index, "log", value)}
												options={[
													["0", "No"],
													["1", "Yes"],
												]}
												value={rule.log}
											/>
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Log limit" onChange={(event) => updateRow(index, "log_limit", event.target.value)} value={rule.log_limit} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Extra arguments" onChange={(event) => updateRow(index, "extra", event.target.value)} value={rule.extra} />
										</td>
										<td className="px-3 py-3">
											<textarea
												aria-label="Week days"
												className="min-h-10 w-40 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "weekdays", event.target.value)}
												spellCheck={false}
												value={rule.weekdays}
											/>
										</td>
										<td className="px-3 py-3">
											<textarea
												aria-label="Month days"
												className="min-h-10 w-40 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "monthdays", event.target.value)}
												spellCheck={false}
												value={rule.monthdays}
											/>
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Start time" onChange={(event) => updateRow(index, "start_time", event.target.value)} value={rule.start_time} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Stop time" onChange={(event) => updateRow(index, "stop_time", event.target.value)} value={rule.stop_time} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Start date" onChange={(event) => updateRow(index, "start_date", event.target.value)} value={rule.start_date} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Stop date" onChange={(event) => updateRow(index, "stop_date", event.target.value)} value={rule.stop_date} />
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`firewall-rule-utc-${index}`}
												onChange={(value) => updateRow(index, "utc_time", value)}
												options={[
													["0", "No"],
													["1", "Yes"],
												]}
												value={rule.utc_time}
											/>
										</td>
										<td className="px-3 py-3">
											<FirewallRuleTargetSelect
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
									<td className="px-3 py-6 text-muted-foreground" colSpan={36}>
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
		direction: rawValue(section.values.direction),
		device: rawValue(section.values.device),
		ipset: rawValue(section.values.ipset),
		src_mac: rawListValue(section.values.src_mac).join("\n"),
		set_mark: rawValue(section.values.set_mark),
		set_xmark: rawValue(section.values.set_xmark),
		set_dscp: rawValue(section.values.set_dscp),
		set_helper: rawValue(section.values.set_helper),
		helper: rawValue(section.values.helper),
		mark: rawValue(section.values.mark),
		dscp: rawValue(section.values.dscp),
		limit: rawValue(section.values.limit),
		limit_burst: rawValue(section.values.limit_burst),
		log: booleanValue(section.values.log),
		log_limit: rawValue(section.values.log_limit),
		extra: rawValue(section.values.extra),
		weekdays: rawListValue(section.values.weekdays).join("\n"),
		monthdays: rawListValue(section.values.monthdays).join("\n"),
		start_time: rawValue(section.values.start_time),
		stop_time: rawValue(section.values.stop_time),
		start_date: rawValue(section.values.start_date),
		stop_date: rawValue(section.values.stop_date),
		utc_time: booleanValue(section.values.utc_time),
		target: firewallRuleTargetText(section.values.target),
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
		direction: ["", "in", "out"].includes(rule.direction) ? rule.direction : "",
		device: rule.device ?? "",
		ipset: rule.ipset ?? "",
		src_mac: rule.src_mac ?? "",
		set_mark: rule.set_mark ?? "",
		set_xmark: rule.set_xmark ?? "",
		set_dscp: rule.set_dscp ?? "",
		set_helper: rule.set_helper ?? "",
		helper: rule.helper ?? "",
		mark: rule.mark ?? "",
		dscp: rule.dscp ?? "",
		limit: rule.limit ?? "",
		limit_burst: rule.limit_burst ?? "",
		log: rule.log === "1" ? "1" : "0",
		log_limit: rule.log_limit ?? "",
		extra: rule.extra ?? "",
		weekdays: rule.weekdays ?? "",
		monthdays: rule.monthdays ?? "",
		start_time: rule.start_time ?? "",
		stop_time: rule.stop_time ?? "",
		start_date: rule.start_date ?? "",
		stop_date: rule.stop_date ?? "",
		utc_time: rule.utc_time === "1" ? "1" : "0",
		target: firewallRuleTargetText(rule.target),
	};
}

function firewallFamilyText(value: unknown) {
	const text = rawValue(value);
	return text === "ipv4" || text === "ipv6" ? text : "";
}

function firewallRuleTargetText(value: unknown) {
	const text = rawValue(value).toUpperCase();
	return ["ACCEPT", "REJECT", "DROP", "NOTRACK", "HELPER", "MARK", "DSCP"].includes(text) ? text : "ACCEPT";
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
				src_ip: "",
				src_mac: "",
				src_port: "",
				src_dip: "",
				src_dport: "",
				dest: "lan",
				dest_ip: "",
				dest_port: "",
				proto: "tcp",
				family: "",
				target: "DNAT",
				ipset: "",
				reflection: "1",
				reflection_src: "",
				reflection_zone: "",
				helper: "",
				mark: "",
				limit: "",
				limit_burst: "",
				log: "0",
				log_limit: "",
				extra: "",
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
					<table className="w-full min-w-[180rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Name</th>
								<th className="px-3 py-2 font-medium">Status</th>
								<th className="px-3 py-2 font-medium">Source</th>
								<th className="px-3 py-2 font-medium">Source IP</th>
								<th className="px-3 py-2 font-medium">Source MAC</th>
								<th className="px-3 py-2 font-medium">Source port</th>
								<th className="px-3 py-2 font-medium">External IP</th>
								<th className="px-3 py-2 font-medium">External port</th>
								<th className="px-3 py-2 font-medium">Destination</th>
								<th className="px-3 py-2 font-medium">Internal IP</th>
								<th className="px-3 py-2 font-medium">Internal port</th>
								<th className="px-3 py-2 font-medium">Protocols</th>
								<th className="px-3 py-2 font-medium">Family</th>
								<th className="px-3 py-2 font-medium">Target</th>
								<th className="px-3 py-2 font-medium">IP set</th>
								<th className="px-3 py-2 font-medium">NAT loopback</th>
								<th className="px-3 py-2 font-medium">Loopback source</th>
								<th className="px-3 py-2 font-medium">Reflection zones</th>
								<th className="px-3 py-2 font-medium">Helper</th>
								<th className="px-3 py-2 font-medium">Mark</th>
								<th className="px-3 py-2 font-medium">Limit</th>
								<th className="px-3 py-2 font-medium">Burst</th>
								<th className="px-3 py-2 font-medium">Log</th>
								<th className="px-3 py-2 font-medium">Log limit</th>
								<th className="px-3 py-2 font-medium">Extra</th>
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
												aria-label="Source IP"
												onChange={(event) => updateRow(index, "src_ip", event.target.value)}
												value={redirect.src_ip}
											/>
										</td>
										<td className="px-3 py-3">
											<textarea
												aria-label="Source MAC"
												className="min-h-10 w-44 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "src_mac", event.target.value)}
												spellCheck={false}
												value={redirect.src_mac}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Source port"
												onChange={(event) => updateRow(index, "src_port", event.target.value)}
												value={redirect.src_port}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="External IP"
												onChange={(event) => updateRow(index, "src_dip", event.target.value)}
												value={redirect.src_dip}
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
										<td className="px-3 py-3">
											<Input aria-label="IP set" onChange={(event) => updateRow(index, "ipset", event.target.value)} value={redirect.ipset} />
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`firewall-redirect-reflection-${index}`}
												onChange={(value) => updateRow(index, "reflection", value)}
												options={[
													["1", "Enabled"],
													["0", "Disabled"],
												]}
												value={redirect.reflection}
											/>
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`firewall-redirect-reflection-src-${index}`}
												onChange={(value) => updateRow(index, "reflection_src", value)}
												options={[
													["", "default"],
													["internal", "internal"],
													["external", "external"],
												]}
												value={redirect.reflection_src}
											/>
										</td>
										<td className="px-3 py-3">
											<textarea
												aria-label="Reflection zones"
												className="min-h-10 w-44 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "reflection_zone", event.target.value)}
												spellCheck={false}
												value={redirect.reflection_zone}
											/>
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Helper" onChange={(event) => updateRow(index, "helper", event.target.value)} value={redirect.helper} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Mark" onChange={(event) => updateRow(index, "mark", event.target.value)} value={redirect.mark} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Limit" onChange={(event) => updateRow(index, "limit", event.target.value)} value={redirect.limit} />
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Limit burst"
												inputMode="numeric"
												onChange={(event) => updateRow(index, "limit_burst", event.target.value)}
												value={redirect.limit_burst}
											/>
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`firewall-redirect-log-${index}`}
												onChange={(value) => updateRow(index, "log", value)}
												options={[
													["0", "No"],
													["1", "Yes"],
												]}
												value={redirect.log}
											/>
										</td>
										<td className="px-3 py-3">
											<Input
												aria-label="Log limit"
												onChange={(event) => updateRow(index, "log_limit", event.target.value)}
												value={redirect.log_limit}
											/>
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Extra arguments" onChange={(event) => updateRow(index, "extra", event.target.value)} value={redirect.extra} />
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
									<td className="px-3 py-6 text-muted-foreground" colSpan={26}>
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
		src_ip: rawValue(section.values.src_ip),
		src_mac: rawListValue(section.values.src_mac).join("\n"),
		src_port: rawValue(section.values.src_port),
		src_dip: rawValue(section.values.src_dip),
		src_dport: rawValue(section.values.src_dport),
		dest: rawValue(section.values.dest),
		dest_ip: rawValue(section.values.dest_ip),
		dest_port: rawValue(section.values.dest_port),
		proto: rawListValue(section.values.proto).join("\n"),
		family: firewallFamilyText(section.values.family),
		target: firewallRedirectTargetText(section.values.target),
		ipset: rawValue(section.values.ipset),
		reflection: isEnabledValue(section.values.reflection) ? "1" : "0",
		reflection_src: rawValue(section.values.reflection_src),
		reflection_zone: rawListValue(section.values.reflection_zone).join("\n"),
		helper: rawValue(section.values.helper),
		mark: rawValue(section.values.mark),
		limit: rawValue(section.values.limit),
		limit_burst: rawValue(section.values.limit_burst),
		log: booleanValue(section.values.log),
		log_limit: rawValue(section.values.log_limit),
		extra: rawValue(section.values.extra),
	});
}

function normalizeFirewallRedirect(redirect: FirewallRedirect): FirewallRedirect {
	return {
		section: redirect.section ?? "",
		name: redirect.name ?? "",
		enabled: redirect.enabled === "0" ? "0" : "1",
		src: redirect.src ?? "",
		src_ip: redirect.src_ip ?? "",
		src_mac: redirect.src_mac ?? "",
		src_port: redirect.src_port ?? "",
		src_dip: redirect.src_dip ?? "",
		src_dport: redirect.src_dport ?? "",
		dest: redirect.dest ?? "",
		dest_ip: redirect.dest_ip ?? "",
		dest_port: redirect.dest_port ?? "",
		proto: redirect.proto ?? "",
		family: firewallFamilyText(redirect.family),
		target: firewallRedirectTargetText(redirect.target),
		ipset: redirect.ipset ?? "",
		reflection: redirect.reflection === "0" ? "0" : "1",
		reflection_src: ["", "internal", "external"].includes(redirect.reflection_src) ? redirect.reflection_src : "",
		reflection_zone: redirect.reflection_zone ?? "",
		helper: redirect.helper ?? "",
		mark: redirect.mark ?? "",
		limit: redirect.limit ?? "",
		limit_burst: redirect.limit_burst ?? "",
		log: redirect.log === "1" ? "1" : "0",
		log_limit: redirect.log_limit ?? "",
		extra: redirect.extra ?? "",
	};
}

function firewallRedirectTargetText(value: unknown) {
	const text = rawValue(value).toUpperCase();
	return text === "SNAT" ? "SNAT" : "DNAT";
}

function FirewallNatEditor({
	nats,
	onSaved,
}: {
	nats: ConfigSection[];
	onSaved: (sections: ConfigSection[]) => void;
}) {
	const [rows, setRows] = useState(() => nats.map(firewallNatValues));
	const [savedRows, setSavedRows] = useState(rows);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

	function updateRow(index: number, field: keyof FirewallNat, value: string) {
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
				family: "",
				proto: "all",
				src: "lan",
				src_ip: "",
				src_port: "",
				dest_ip: "",
				dest_port: "",
				target: "SNAT",
				snat_ip: "",
				snat_port: "",
				ipset: "",
				device: "",
				mark: "",
				limit: "",
				limit_burst: "",
				log: "0",
				extra: "",
				weekdays: "",
				monthdays: "",
				start_time: "",
				stop_time: "",
				start_date: "",
				stop_date: "",
				utc_time: "0",
			},
		]);
	}

	function removeRow(index: number) {
		setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await saveFirewallNats(rows);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextRows = result.nats.map(normalizeFirewallNat);
		toast.success(result.message);
		setRows(nextRows);
		setSavedRows(nextRows);
		onSaved(result.sections);
	}

	return (
		<section className="grid gap-3">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-base font-semibold">NAT rules</h2>
					<p className="text-sm text-muted-foreground">Configure source NAT, masquerade, and NAT bypass rules.</p>
				</div>
				<Button onClick={addRow} type="button" variant="outline">
					<Plus className="mr-1 size-4" />
					Add NAT rule
				</Button>
			</div>
			<form className="grid gap-3" onSubmit={(event) => void submit(event)}>
				<div className="overflow-x-auto rounded-md border bg-card">
					<table className="w-full min-w-[220rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Name</th>
								<th className="px-3 py-2 font-medium">Status</th>
								<th className="px-3 py-2 font-medium">Family</th>
								<th className="px-3 py-2 font-medium">Protocols</th>
								<th className="px-3 py-2 font-medium">Outbound zone</th>
								<th className="px-3 py-2 font-medium">Source IP</th>
								<th className="px-3 py-2 font-medium">Source port</th>
								<th className="px-3 py-2 font-medium">Destination IP</th>
								<th className="px-3 py-2 font-medium">Destination port</th>
								<th className="px-3 py-2 font-medium">Action</th>
								<th className="px-3 py-2 font-medium">Rewrite IP</th>
								<th className="px-3 py-2 font-medium">Rewrite port</th>
								<th className="px-3 py-2 font-medium">IP set</th>
								<th className="px-3 py-2 font-medium">Outbound device</th>
								<th className="px-3 py-2 font-medium">Mark</th>
								<th className="px-3 py-2 font-medium">Limit</th>
								<th className="px-3 py-2 font-medium">Burst</th>
								<th className="px-3 py-2 font-medium">Log</th>
								<th className="px-3 py-2 font-medium">Weekdays</th>
								<th className="px-3 py-2 font-medium">Month days</th>
								<th className="px-3 py-2 font-medium">Start time</th>
								<th className="px-3 py-2 font-medium">Stop time</th>
								<th className="px-3 py-2 font-medium">Start date</th>
								<th className="px-3 py-2 font-medium">Stop date</th>
								<th className="px-3 py-2 font-medium">UTC</th>
								<th className="px-3 py-2 font-medium">Extra</th>
								<th className="px-3 py-2 text-right font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{rows.length ? (
								rows.map((nat, index) => (
									<tr className="border-b align-top last:border-0" key={`${nat.section || "new"}.${index}`}>
										<td className="px-3 py-3">
											<Input aria-label="NAT rule name" onChange={(event) => updateRow(index, "name", event.target.value)} value={nat.name} />
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`firewall-nat-enabled-${index}`}
												onChange={(value) => updateRow(index, "enabled", value)}
												options={[
													["1", "Enabled"],
													["0", "Disabled"],
												]}
												value={nat.enabled}
											/>
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`firewall-nat-family-${index}`}
												onChange={(value) => updateRow(index, "family", value)}
												options={[
													["", "Automatic"],
													["any", "IPv4 and IPv6"],
													["ipv4", "IPv4"],
													["ipv6", "IPv6"],
												]}
												value={nat.family}
											/>
										</td>
										<td className="px-3 py-3">
											<textarea
												aria-label="NAT protocols"
												className="min-h-10 w-40 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "proto", event.target.value)}
												spellCheck={false}
												value={nat.proto}
											/>
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Outbound zone" onChange={(event) => updateRow(index, "src", event.target.value)} value={nat.src} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Source IP" onChange={(event) => updateRow(index, "src_ip", event.target.value)} value={nat.src_ip} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Source port" onChange={(event) => updateRow(index, "src_port", event.target.value)} value={nat.src_port} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Destination IP" onChange={(event) => updateRow(index, "dest_ip", event.target.value)} value={nat.dest_ip} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Destination port" onChange={(event) => updateRow(index, "dest_port", event.target.value)} value={nat.dest_port} />
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`firewall-nat-target-${index}`}
												onChange={(value) => updateRow(index, "target", value)}
												options={[
													["SNAT", "SNAT"],
													["MASQUERADE", "Masquerade"],
													["ACCEPT", "Bypass"],
												]}
												value={nat.target}
											/>
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Rewrite IP" onChange={(event) => updateRow(index, "snat_ip", event.target.value)} value={nat.snat_ip} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Rewrite port" onChange={(event) => updateRow(index, "snat_port", event.target.value)} value={nat.snat_port} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="IP set" onChange={(event) => updateRow(index, "ipset", event.target.value)} value={nat.ipset} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Outbound device" onChange={(event) => updateRow(index, "device", event.target.value)} value={nat.device} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Mark" onChange={(event) => updateRow(index, "mark", event.target.value)} value={nat.mark} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Limit" onChange={(event) => updateRow(index, "limit", event.target.value)} value={nat.limit} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Limit burst" inputMode="numeric" onChange={(event) => updateRow(index, "limit_burst", event.target.value)} value={nat.limit_burst} />
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`firewall-nat-log-${index}`}
												onChange={(value) => updateRow(index, "log", value)}
												options={[
													["0", "No"],
													["1", "Yes"],
												]}
												value={nat.log}
											/>
										</td>
										<td className="px-3 py-3">
											<textarea
												aria-label="Weekdays"
												className="min-h-10 w-44 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "weekdays", event.target.value)}
												spellCheck={false}
												value={nat.weekdays}
											/>
										</td>
										<td className="px-3 py-3">
											<textarea
												aria-label="Month days"
												className="min-h-10 w-44 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
												onChange={(event) => updateRow(index, "monthdays", event.target.value)}
												spellCheck={false}
												value={nat.monthdays}
											/>
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Start time" onChange={(event) => updateRow(index, "start_time", event.target.value)} value={nat.start_time} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Stop time" onChange={(event) => updateRow(index, "stop_time", event.target.value)} value={nat.stop_time} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Start date" onChange={(event) => updateRow(index, "start_date", event.target.value)} value={nat.start_date} />
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Stop date" onChange={(event) => updateRow(index, "stop_date", event.target.value)} value={nat.stop_date} />
										</td>
										<td className="px-3 py-3">
											<SelectField
												id={`firewall-nat-utc-${index}`}
												onChange={(value) => updateRow(index, "utc_time", value)}
												options={[
													["0", "No"],
													["1", "Yes"],
												]}
												value={nat.utc_time}
											/>
										</td>
										<td className="px-3 py-3">
											<Input aria-label="Extra arguments" onChange={(event) => updateRow(index, "extra", event.target.value)} value={nat.extra} />
										</td>
										<td className="px-3 py-3 text-right">
											<Button
												aria-label={`Remove ${nat.name || "NAT rule"}`}
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
									<td className="px-3 py-6 text-muted-foreground" colSpan={27}>
										No NAT rules configured.
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

function firewallNatValues(section: ConfigSection): FirewallNat {
	return normalizeFirewallNat({
		section: section.name,
		name: rawValue(section.values.name || section.name),
		enabled: isEnabledValue(section.values.enabled) ? "1" : "0",
		family: firewallNatFamilyText(section.values.family),
		proto: rawListValue(section.values.proto).join("\n"),
		src: rawValue(section.values.src),
		src_ip: rawValue(section.values.src_ip),
		src_port: rawValue(section.values.src_port),
		dest_ip: rawValue(section.values.dest_ip),
		dest_port: rawValue(section.values.dest_port),
		target: firewallNatTargetText(section.values.target),
		snat_ip: rawValue(section.values.snat_ip),
		snat_port: rawValue(section.values.snat_port),
		ipset: rawValue(section.values.ipset),
		device: rawValue(section.values.device),
		mark: rawValue(section.values.mark),
		limit: rawValue(section.values.limit),
		limit_burst: rawValue(section.values.limit_burst),
		log: booleanValue(section.values.log),
		extra: rawValue(section.values.extra),
		weekdays: rawListValue(section.values.weekdays).join("\n"),
		monthdays: rawListValue(section.values.monthdays).join("\n"),
		start_time: rawValue(section.values.start_time),
		stop_time: rawValue(section.values.stop_time),
		start_date: rawValue(section.values.start_date),
		stop_date: rawValue(section.values.stop_date),
		utc_time: booleanValue(section.values.utc_time),
	});
}

function normalizeFirewallNat(nat: FirewallNat): FirewallNat {
	return {
		section: nat.section ?? "",
		name: nat.name ?? "",
		enabled: nat.enabled === "0" ? "0" : "1",
		family: firewallNatFamilyText(nat.family),
		proto: nat.proto ?? "",
		src: nat.src ?? "",
		src_ip: nat.src_ip ?? "",
		src_port: nat.src_port ?? "",
		dest_ip: nat.dest_ip ?? "",
		dest_port: nat.dest_port ?? "",
		target: firewallNatTargetText(nat.target),
		snat_ip: nat.snat_ip ?? "",
		snat_port: nat.snat_port ?? "",
		ipset: nat.ipset ?? "",
		device: nat.device ?? "",
		mark: nat.mark ?? "",
		limit: nat.limit ?? "",
		limit_burst: nat.limit_burst ?? "",
		log: nat.log === "1" ? "1" : "0",
		extra: nat.extra ?? "",
		weekdays: nat.weekdays ?? "",
		monthdays: nat.monthdays ?? "",
		start_time: nat.start_time ?? "",
		stop_time: nat.stop_time ?? "",
		start_date: nat.start_date ?? "",
		stop_date: nat.stop_date ?? "",
		utc_time: nat.utc_time === "1" ? "1" : "0",
	};
}

function firewallNatFamilyText(value: unknown) {
	const text = rawValue(value);
	if (text === "any" || text === "all" || text === "*")
		return "any";
	return text === "ipv4" || text === "ipv6" ? text : "";
}

function firewallNatTargetText(value: unknown) {
	const text = rawValue(value).toUpperCase();
	return ["SNAT", "MASQUERADE", "ACCEPT"].includes(text) ? text : "SNAT";
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
			<SystemSettingsEditor
				dashboard={dashboard}
				onSaved={setSystemSections}
				sections={systemSections}
				timezones={settings.timezones ?? {}}
			/>

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
					<Field label="Table filters" target="luci-tablefilters">
						<SelectField
							id="luci-tablefilters"
							onChange={(value) => updateField("tablefilters", value)}
							options={[
								["0", "Disabled"],
								["1", "Enabled"],
							]}
							value={values.tablefilters}
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
		tablefilters: rawValue(main.values.tablefilters) === "1" ? "1" : "0",
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
	timezones,
}: {
	dashboard: DashboardStatus | null;
	onSaved: (sections: ConfigSection[]) => void;
	sections: ConfigSection[];
	timezones: Record<string, { tzstring?: string }>;
}) {
	const [values, setValues] = useState(() => systemSettingsValues(sections, dashboard));
	const [savedValues, setSavedValues] = useState(values);
	const [saving, setSaving] = useState(false);
	const [syncing, setSyncing] = useState<"browser" | "ntp" | null>(null);
	const timezoneNames = useMemo(() => ["UTC", ...Object.keys(timezones).filter((name) => name !== "UTC").sort()], [timezones]);
	const dirty = JSON.stringify(values) !== JSON.stringify(savedValues);

	function updateField(field: keyof SystemSettingsInput, value: string) {
		setValues((current) => ({
			...current,
			[field]: value,
		}));
	}

	function updateTimezone(zonename: string) {
		setValues((current) => ({
			...current,
			zonename,
			timezone: timezones[zonename]?.tzstring ?? (zonename === "UTC" ? "UTC0" : current.timezone),
		}));
	}

	async function syncTime(action: "browser" | "ntp") {
		setSyncing(action);
		const result = await syncSystemTime(action, Math.floor(Date.now() / 1000));
		setSyncing(null);

		if (!result.ok) {
			toast.error(result.message);
			return;
		}

		toast.success(result.message);
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
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-secondary/40 px-3 py-2 text-sm">
					<div>
						<p className="font-medium">Local time</p>
						<p className="text-muted-foreground">{formatLocalTime(dashboard?.system.localtime)}</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button disabled={syncing != null} onClick={() => void syncTime("browser")} size="sm" type="button" variant="outline">
							{syncing === "browser" ? "Syncing" : "Sync with browser"}
						</Button>
						<Button disabled={syncing != null} onClick={() => void syncTime("ntp")} size="sm" type="button" variant="outline">
							{syncing === "ntp" ? "Restarting" : "Sync with NTP"}
						</Button>
					</div>
				</div>
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
					<Field label="Full timezone name" target="system-clock-style">
						<SelectField
							id="system-clock-style"
							onChange={(value) => updateField("clock_timestyle", value)}
							options={[
								["0", "Offset"],
								["1", "Full name"],
							]}
							value={values.clock_timestyle}
						/>
					</Field>
					<Field label="Time format" target="system-clock-hourcycle">
						<SelectField
							id="system-clock-hourcycle"
							onChange={(value) => updateField("clock_hourcycle", value)}
							options={[
								["", "Default"],
								["h12", "12-hour"],
								["h23", "24-hour"],
							]}
							value={values.clock_hourcycle}
						/>
					</Field>
					<Field label="Timezone name" target="system-zonename">
						<select
							className="h-10 rounded-md border bg-card px-3 text-sm outline-none focus-visible:border-ring"
							id="system-zonename"
							onChange={(event) => updateTimezone(event.target.value)}
							value={values.zonename}
						>
							{values.zonename && !timezoneNames.includes(values.zonename) ? <option value={values.zonename}>{values.zonename}</option> : null}
							{timezoneNames.map((name) => (
								<option key={name} value={name}>
									{name}
								</option>
							))}
						</select>
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
					<Field label="External log server" target="system-log-ip">
						<Input id="system-log-ip" onChange={(event) => updateField("log_ip", event.target.value)} value={values.log_ip} />
					</Field>
					<Field label="External log port" target="system-log-port">
						<Input
							id="system-log-port"
							inputMode="numeric"
							onChange={(event) => updateField("log_port", event.target.value)}
							value={values.log_port}
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
					<Field label="Log file" target="system-log-file">
						<Input id="system-log-file" onChange={(event) => updateField("log_file", event.target.value)} value={values.log_file} />
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
					<Field label="Provide NTP server" target="system-ntp-server">
						<SelectField
							id="system-ntp-server"
							onChange={(value) => updateField("ntp_enable_server", value)}
							options={[
								["0", "Disabled"],
								["1", "Enabled"],
							]}
							value={values.ntp_enable_server}
						/>
					</Field>
					<Field label="Bind NTP server" target="system-ntp-interface">
						<Input
							id="system-ntp-interface"
							onChange={(event) => updateField("ntp_interface", event.target.value)}
							placeholder="All interfaces"
							value={values.ntp_interface}
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
				<Field label="Notes" target="system-notes">
					<textarea
						className="min-h-28 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
						id="system-notes"
						onChange={(event) => updateField("notes", event.target.value)}
						spellCheck={false}
						value={values.notes}
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

const DEFAULT_FLAG_OPTIONS: [string, string][] = [
	["", "Default"],
	["1", "Yes"],
	["0", "No"],
];

const NETWORK_PROTOCOL_OPTIONS: [string, string][] = [
	["none", "Unmanaged"],
	["static", "Static address"],
	["dhcp", "DHCP client"],
	["dhcpv6", "DHCPv6 client"],
	["pppoe", "PPPoE"],
	["ppp", "PPP"],
	["pptp", "PPTP"],
	["l2tp", "L2TP"],
	["6in4", "IPv6-in-IPv4"],
	["6rd", "IPv6 rapid deployment"],
	["6to4", "IPv6-to-IPv4"],
	["dslite", "DS-Lite"],
	["map", "MAP"],
	["464xlat", "464XLAT"],
	["qmi", "QMI cellular"],
	["ncm", "NCM cellular"],
	["mbim", "MBIM cellular"],
	["wwan", "WWAN"],
];

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

function NetworkProtocolField({ id, onChange, value }: { id: string; onChange: (value: string) => void; value: string }) {
	const selectedValue = isKnownNetworkProtocol(value) ? value : "__custom";
	const customValue = isKnownNetworkProtocol(value) ? "" : value;

	return (
		<div className="grid min-w-48 gap-2">
			<SelectField
				id={id}
				onChange={(nextValue) => {
					if (nextValue === "__custom") {
						onChange(isKnownNetworkProtocol(value) ? "" : value);
						return;
					}

					onChange(nextValue);
				}}
				options={[...NETWORK_PROTOCOL_OPTIONS, ["__custom", "Custom"]]}
				value={selectedValue}
			/>
			{selectedValue === "__custom" ? (
				<Input aria-label="Custom protocol" onChange={(event) => onChange(event.target.value)} placeholder="custom protocol" value={customValue} />
			) : null}
		</div>
	);
}

function isKnownNetworkProtocol(value: string) {
	return NETWORK_PROTOCOL_OPTIONS.some(([optionValue]) => optionValue === value);
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
		notes: rawValue(system?.values.notes),
		zonename: rawValue(system?.values.zonename),
		timezone: rawValue(system?.values.timezone),
		clock_timestyle: rawValue(system?.values.clock_timestyle) === "1" ? "1" : "0",
		clock_hourcycle: rawValue(system?.values.clock_hourcycle),
		log_size: rawValue(system?.values.log_size),
		log_ip: rawValue(system?.values.log_ip),
		log_port: rawValue(system?.values.log_port),
		log_proto: rawValue(system?.values.log_proto || "udp"),
		log_file: rawValue(system?.values.log_file),
		conloglevel: rawValue(system?.values.conloglevel),
		cronloglevel: rawValue(system?.values.cronloglevel),
		ntp_enabled: rawValue(ntp?.values.enabled || "1") === "0" ? "0" : "1",
		ntp_enable_server: rawValue(ntp?.values.enable_server) === "1" ? "1" : "0",
		ntp_interface: rawValue(ntp?.values.interface),
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
	const dhcpPools = settings.dhcpPools ?? [];
	const configInterfaces = settings.network.filter((section) => section.type === "interface");
	const configDevices = settings.network.filter((section) => section.type === "device");
	const firewallZones = settings.firewall.filter((section) => section.type === "zone");

	if (!interfaces.length && !devices.length && !settings.network.length) {
		return null;
	}

	return (
		<div className="grid gap-5">
			{configInterfaces.length ? (
				<NetworkInterfaceEditor
					firewallZones={firewallZones}
					interfaces={configInterfaces}
					onSaved={(sections, nextFirewallZones) =>
						onSettingsChange({
							...settings,
							network: sections,
							firewall: nextFirewallZones ?? settings.firewall,
						})
					}
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
				pools={dhcpPools}
			/>
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
	firewallZones,
	interfaces,
	onSaved,
}: {
	firewallZones: ConfigSection[];
	interfaces: ConfigSection[];
	onSaved: (sections: ConfigSection[], firewallSections?: ConfigSection[]) => void;
}) {
	const [rows, setRows] = useState(() => interfaces.map((section) => networkInterfaceValues(section, firewallZones)));
	const [savedRows, setSavedRows] = useState(rows);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);
	const visibleRows = rows
		.map((row, index) => ({ row, index }))
		.filter(({ row }) => row.remove !== "1");
	const firewallZoneOptions = useMemo<[string, string][]>(
		() => [
			["", "Unspecified"],
			...firewallZones.map((zone) => {
				const name = rawValue(zone.values.name || zone.name);
				return [name, name] as [string, string];
			}),
			["__custom", "Create new..."],
		],
		[firewallZones],
	);

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

	function addRow() {
		setRows((current) => [...current, newNetworkInterfaceRow(uniqueNetworkInterfaceName(current))]);
	}

	function removeRow(index: number) {
		setRows((current) => {
			const row = current[index];

			if (!row || row.isNew === "1") {
				return current.filter((_, rowIndex) => rowIndex !== index);
			}

			return current.map((item, rowIndex) => (rowIndex === index ? { ...item, remove: "1" } : item));
		});
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
		onSaved(result.sections, result.firewallSections);
	}

	return (
		<section className="grid gap-3">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h2 className="text-base font-semibold">Interface configuration</h2>
					<p className="text-sm text-muted-foreground">Edit common UCI interface fields while preserving advanced options.</p>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-xs text-muted-foreground">{visibleRows.length} interfaces</span>
					<Button onClick={addRow} size="sm" type="button" variant="outline">
						<Plus className="size-4" />
						Add interface
					</Button>
				</div>
			</div>
			<form className="grid gap-3" onSubmit={(event) => void submit(event)}>
				<div className="overflow-x-auto rounded-md border bg-card">
					<table className="w-full min-w-[180rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Interface</th>
								<th className="px-3 py-2 font-medium">Firewall zone</th>
								<th className="px-3 py-2 font-medium">Protocol</th>
								<th className="px-3 py-2 font-medium">Device</th>
								<th className="px-3 py-2 font-medium">Disabled</th>
								<th className="px-3 py-2 font-medium">Boot</th>
								<th className="px-3 py-2 font-medium">Force link</th>
								<th className="px-3 py-2 font-medium">Default route</th>
								<th className="px-3 py-2 font-medium">IPv4 address</th>
								<th className="px-3 py-2 font-medium">Netmask</th>
								<th className="px-3 py-2 font-medium">Gateway</th>
								<th className="px-3 py-2 font-medium">Broadcast</th>
								<th className="px-3 py-2 font-medium">IPv6 assign</th>
								<th className="px-3 py-2 font-medium">IPv6 hint</th>
								<th className="px-3 py-2 font-medium">IPv6 suffix</th>
								<th className="px-3 py-2 font-medium">IPv6 classes</th>
								<th className="px-3 py-2 font-medium">IPv6 prefixes</th>
								<th className="px-3 py-2 font-medium">DNS</th>
								<th className="px-3 py-2 font-medium">DNS weight</th>
								<th className="px-3 py-2 font-medium">Metric</th>
								<th className="px-3 py-2 font-medium">Peer DNS</th>
								<th className="px-3 py-2 font-medium">Delegate</th>
								<th className="px-3 py-2 font-medium">Hostname</th>
								<th className="px-3 py-2 font-medium">Client ID</th>
								<th className="px-3 py-2 font-medium">Vendor</th>
								<th className="px-3 py-2 font-medium">No release</th>
								<th className="px-3 py-2 font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{visibleRows.map(({ row, index }) => (
								<tr className="border-b align-top last:border-0" key={`network-interface-${index}`}>
									<td className="px-3 py-3 font-medium">
										{row.isNew === "1" ? (
											<Input aria-label="Interface name" onChange={(event) => updateRow(index, "section", event.target.value)} value={row.section} />
										) : (
											row.section
										)}
									</td>
									<td className="px-3 py-3">
										<div className="grid gap-2">
											<SelectField
												id={`network-interface-zone-${index}`}
												onChange={(value) => updateRow(index, "zone", value)}
												options={firewallZoneOptions}
												value={row.zone ?? ""}
											/>
											{row.zone === "__custom" ? (
												<Input
													aria-label="New firewall zone name"
													onChange={(event) => updateRow(index, "zoneName", event.target.value)}
													placeholder="zone name"
													value={row.zoneName ?? ""}
												/>
											) : null}
										</div>
									</td>
									<td className="px-3 py-3">
										<NetworkProtocolField
											id={`network-interface-proto-${index}`}
											onChange={(value) => updateRow(index, "proto", value)}
											value={row.proto}
										/>
									</td>
									<td className="px-3 py-3">
										<Input aria-label="Device" onChange={(event) => updateRow(index, "device", event.target.value)} value={row.device} />
									</td>
									<td className="px-3 py-3">
										<SelectField
											id={`network-interface-disabled-${index}`}
											onChange={(value) => updateRow(index, "disabled", value)}
											options={DEFAULT_FLAG_OPTIONS}
											value={row.disabled}
										/>
									</td>
									<td className="px-3 py-3">
										<SelectField
											id={`network-interface-auto-${index}`}
											onChange={(value) => updateRow(index, "auto", value)}
											options={DEFAULT_FLAG_OPTIONS}
											value={row.auto}
										/>
									</td>
									<td className="px-3 py-3">
										<SelectField
											id={`network-interface-force-link-${index}`}
											onChange={(value) => updateRow(index, "force_link", value)}
											options={DEFAULT_FLAG_OPTIONS}
											value={row.force_link}
										/>
									</td>
									<td className="px-3 py-3">
										<SelectField
											id={`network-interface-defaultroute-${index}`}
											onChange={(value) => updateRow(index, "defaultroute", value)}
											options={DEFAULT_FLAG_OPTIONS}
											value={row.defaultroute}
										/>
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
										<Input aria-label="Broadcast" onChange={(event) => updateRow(index, "broadcast", event.target.value)} value={row.broadcast} />
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
										<Input aria-label="IPv6 assignment hint" onChange={(event) => updateRow(index, "ip6hint", event.target.value)} value={row.ip6hint} />
									</td>
									<td className="px-3 py-3">
										<Input aria-label="IPv6 suffix" onChange={(event) => updateRow(index, "ip6ifaceid", event.target.value)} value={row.ip6ifaceid} />
									</td>
									<td className="px-3 py-3">
										<textarea
											aria-label="IPv6 prefix classes"
											className="min-h-10 w-48 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
											onChange={(event) => updateRow(index, "ip6class", event.target.value)}
											spellCheck={false}
											value={row.ip6class}
										/>
									</td>
									<td className="px-3 py-3">
										<textarea
											aria-label="IPv6 routed prefixes"
											className="min-h-10 w-48 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
											onChange={(event) => updateRow(index, "ip6prefix", event.target.value)}
											spellCheck={false}
											value={row.ip6prefix}
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
										<Input
											aria-label="DNS weight"
											inputMode="numeric"
											onChange={(event) => updateRow(index, "dns_metric", event.target.value)}
											value={row.dns_metric}
										/>
									</td>
									<td className="px-3 py-3">
										<Input
											aria-label="Gateway metric"
											inputMode="numeric"
											onChange={(event) => updateRow(index, "metric", event.target.value)}
											value={row.metric}
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
									<td className="px-3 py-3">
										<Input aria-label="DHCP hostname" onChange={(event) => updateRow(index, "hostname", event.target.value)} value={row.hostname} />
									</td>
									<td className="px-3 py-3">
										<Input aria-label="DHCP client ID" onChange={(event) => updateRow(index, "clientid", event.target.value)} value={row.clientid} />
									</td>
									<td className="px-3 py-3">
										<Input aria-label="DHCP vendor class" onChange={(event) => updateRow(index, "vendorid", event.target.value)} value={row.vendorid} />
									</td>
									<td className="px-3 py-3">
										<SelectField
											id={`network-interface-norelease-${index}`}
											onChange={(value) => updateRow(index, "norelease", value)}
											options={DEFAULT_FLAG_OPTIONS}
											value={row.norelease}
										/>
									</td>
									<td className="px-3 py-3">
										<Button
											aria-label={`Remove ${row.section}`}
											disabled={row.section === "loopback"}
											onClick={() => removeRow(index)}
											size="icon"
											type="button"
											variant="ghost"
										>
											<Trash2 className="size-4" />
										</Button>
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

function networkInterfaceValues(section: ConfigSection, firewallZones: ConfigSection[] = []): NetworkInterfaceConfig {
	return normalizeNetworkInterface({
		section: section.name,
		zone: firewallZoneForInterface(section.name, firewallZones),
		zoneName: "",
		proto: rawValue(section.values.proto),
		device: rawValue(section.values.device || section.values.ifname),
		disabled: rawValue(section.values.disabled),
		auto: rawValue(section.values.auto),
		force_link: rawValue(section.values.force_link),
		defaultroute: rawValue(section.values.defaultroute),
		ipaddr: rawListValue(section.values.ipaddr).join("\n"),
		netmask: rawValue(section.values.netmask),
		gateway: rawValue(section.values.gateway),
		broadcast: rawValue(section.values.broadcast),
		ip6assign: rawValue(section.values.ip6assign),
		ip6hint: rawValue(section.values.ip6hint),
		ip6ifaceid: rawValue(section.values.ip6ifaceid),
		ip6class: rawListValue(section.values.ip6class).join("\n"),
		ip6prefix: rawListValue(section.values.ip6prefix).join("\n"),
		dns: rawListValue(section.values.dns).join("\n"),
		dns_metric: rawValue(section.values.dns_metric),
		metric: rawValue(section.values.metric),
		peerdns: isEnabledValue(section.values.peerdns) ? "1" : "0",
		delegate: isEnabledValue(section.values.delegate) ? "1" : "0",
		hostname: rawValue(section.values.hostname),
		clientid: rawValue(section.values.clientid),
		vendorid: rawValue(section.values.vendorid),
		norelease: rawValue(section.values.norelease),
	});
}

function normalizeNetworkInterface(row: NetworkInterfaceConfig): NetworkInterfaceConfig {
	return {
		section: row.section ?? "",
		remove: row.remove === "1" ? "1" : "",
		isNew: row.isNew === "1" ? "1" : "",
		zone: row.zone ?? "",
		zoneName: row.zoneName ?? "",
		proto: row.proto ?? "",
		device: row.device ?? "",
		disabled: row.disabled === "1" || row.disabled === "0" ? row.disabled : "",
		auto: row.auto === "1" || row.auto === "0" ? row.auto : "",
		force_link: row.force_link === "1" || row.force_link === "0" ? row.force_link : "",
		defaultroute: row.defaultroute === "1" || row.defaultroute === "0" ? row.defaultroute : "",
		ipaddr: row.ipaddr ?? "",
		netmask: row.netmask ?? "",
		gateway: row.gateway ?? "",
		broadcast: row.broadcast ?? "",
		ip6assign: row.ip6assign ?? "",
		ip6hint: row.ip6hint ?? "",
		ip6ifaceid: row.ip6ifaceid ?? "",
		ip6class: row.ip6class ?? "",
		ip6prefix: row.ip6prefix ?? "",
		dns: row.dns ?? "",
		dns_metric: row.dns_metric ?? "",
		metric: row.metric ?? "",
		peerdns: row.peerdns === "0" ? "0" : "1",
		delegate: row.delegate === "0" ? "0" : "1",
		hostname: row.hostname ?? "",
		clientid: row.clientid ?? "",
		vendorid: row.vendorid ?? "",
		norelease: row.norelease === "1" || row.norelease === "0" ? row.norelease : "",
	};
}

function newNetworkInterfaceRow(section: string): NetworkInterfaceConfig {
	return normalizeNetworkInterface({
		section,
		remove: "",
		isNew: "1",
		zone: "",
		zoneName: "",
		proto: "none",
		device: "",
		disabled: "1",
		auto: "0",
		force_link: "",
		defaultroute: "",
		ipaddr: "",
		netmask: "",
		gateway: "",
		broadcast: "",
		ip6assign: "",
		ip6hint: "",
		ip6ifaceid: "",
		ip6class: "",
		ip6prefix: "",
		dns: "",
		dns_metric: "",
		metric: "",
		peerdns: "1",
		delegate: "1",
		hostname: "",
		clientid: "",
		vendorid: "",
		norelease: "",
	});
}

function uniqueNetworkInterfaceName(rows: NetworkInterfaceConfig[]) {
	const names = new Set(rows.map((row) => row.section));
	let index = 1;

	while (names.has(`new_interface_${index}`)) {
		index += 1;
	}

	return `new_interface_${index}`;
}

function firewallZoneForInterface(interfaceName: string, firewallZones: ConfigSection[]) {
	for (const zone of firewallZones) {
		const networks = rawListValue(zone.values.network);

		if (networks.includes(interfaceName)) {
			return rawValue(zone.values.name || zone.name);
		}
	}

	return "";
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
