import { FileText, Play, Power, Search } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	getNativePage,
	getServiceDetail,
	runCustomCommand,
	runServiceAction,
	runStartupAction,
	runDiagnostics,
	saveCrontab,
	saveSshKeys,
	type CommandBlock,
	type ConfigSection,
	type CustomCommand,
	type CustomCommandResult,
	type InitAction,
	type NativePageData,
	type NativeService,
} from "@/lib/rpc";

type PageMeta = {
	title: string;
	description: string;
	badge?: string;
};

type PackageEntry = {
	name: string;
	version: string;
	description: string;
	line: string;
};

type FilesystemEntry = {
	filesystem: string;
	size: string;
	used: string;
	available: string;
	usePercent: string;
	mountedOn: string;
};

type FlashPartitionEntry = {
	device: string;
	size: string;
	eraseSize: string;
	name: string;
};

type RouteEntry = {
	target: string;
	via: string;
	device: string;
	table: string;
	source: string;
	scope: string;
	metric: string;
};

type RuleEntry = {
	priority: string;
	rule: string;
};

type NeighborEntry = {
	address: string;
	device: string;
	mac: string;
	state: string;
};

type NftChain = {
	name: string;
	hook: string;
	policy: string;
	rules: number;
};

type NftRule = {
	chain: string;
	action: string;
	packets: string;
	bytes: string;
	comment: string;
	expression: string;
};

type ProcessEntry = {
	pid: string;
	user: string;
	vsz: string;
	state: string;
	command: string;
};

type SocketEntry = {
	protocol: string;
	state: string;
	receiveQueue: string;
	sendQueue: string;
	local: string;
	peer: string;
	process: string;
};

type LogEntry = {
	time: string;
	facility: string;
	level: string;
	process: string;
	message: string;
};

type DnsServerEntry = {
	source: string;
	server: string;
};

type RepoKeyEntry = {
	path: string;
	mode: string;
	owner: string;
	group: string;
	size: string;
	comment: string;
	fingerprint: string;
};

type LedSysfsEntry = {
	name: string;
	trigger: string;
	brightness: string;
};

type DiagnosticTool = "ping" | "traceroute" | "nslookup";

type DiagnosticRunResult = {
	tool: DiagnosticTool;
	output: string;
};

type PingReply = {
	host: string;
	seq: string;
	ttl: string;
	time: string;
};

type PingSummary = {
	transmitted: string;
	received: string;
	loss: string;
};

type TraceHop = {
	hop: string;
	result: string;
};

type NslookupEntry = {
	field: string;
	value: string;
};

type OutputLine = {
	stream: string;
	number: number;
	text: string;
};

const pageMeta: Record<string, PageMeta> = {
	"status-routes": {
		title: "Routing",
		description: "Modern read-only view of route tables, rules, and neighbour entries.",
	},
	"firewall-status": {
		title: "Firewall status",
		description: "Modern read-only view of active nftables firewall state.",
	},
	logs: {
		title: "System logs",
		description: "System and kernel logs from the router.",
	},
	processes: {
		title: "Processes",
		description: "Current process list from the router.",
	},
	connections: {
		title: "Connections",
		description: "Current TCP and UDP sockets.",
	},
	wireless: {
		title: "Wireless",
		description: "Wireless device, interface, and scan helper status. This router can validate the empty/no-radio case.",
		badge: "partial modern",
	},
	diagnostics: {
		title: "Diagnostics",
		description: "Run ping, traceroute, and DNS lookup without leaving the modern shell.",
	},
	attendedsysupgrade: {
		title: "Attended sysupgrade",
		description: "Firmware compatibility context and helper configuration. Image building and flashing remain guarded.",
		badge: "guarded",
	},
	packages: {
		title: "Software",
		description: "Installed package inventory. Package install and removal remain in legacy LuCI for now.",
		badge: "read-only",
	},
	startup: {
		title: "Startup",
		description: "Init scripts and current enabled/running state.",
		badge: "read-only",
	},
	crontab: {
		title: "Scheduled tasks",
		description: "Edit root scheduled tasks and reload cron from the modern shell.",
	},
	sshkeys: {
		title: "SSH keys",
		description: "Edit Dropbear authorized keys without leaving the modern shell.",
	},
	repokeys: {
		title: "Repository keys",
		description: "Installed package repository public keys.",
	},
	leds: {
		title: "LED configuration",
		description: "LED trigger configuration and current sysfs LED state.",
	},
	flash: {
		title: "Backup / flash firmware",
		description: "Storage and flash partition overview. Firmware write actions remain in legacy LuCI.",
		badge: "guarded",
	},
	reboot: {
		title: "Reboot",
		description: "Reboot guard surface. The destructive action remains disabled until a confirmation RPC is added.",
		badge: "guarded",
	},
	services: {
		title: "Services",
		description: "Installed service overview with modern status and configuration summaries.",
	},
};

export function NativePage() {
	const params = useParams();
	const page = params.page ?? "status-routes";
	const meta = pageMeta[page] ?? { title: pageTitle(page), description: "Modern route surface." };
	const [data, setData] = useState<NativePageData | null>(null);
	const loading = !data || data.page !== page;
	const structuredCommands =
		page === "status-routes" ||
		page === "firewall-status" ||
		page === "logs" ||
		page === "processes" ||
		page === "connections" ||
		page === "wireless" ||
		page === "diagnostics" ||
		page === "repokeys" ||
		page === "leds";

	useEffect(() => {
		let cancelled = false;

		void getNativePage(page).then((nextData) => {
			if (!cancelled) {
				setData(nextData);
			}
		});

		return () => {
			cancelled = true;
		};
	}, [page]);

	return (
		<div className="mx-auto grid w-full max-w-7xl gap-5">
			<PageHeader meta={meta} loading={loading} />

			{page === "status-routes" && data ? <RoutingSummary data={data} /> : null}
			{page === "firewall-status" && data ? <NftablesSummary data={data} /> : null}
			{page === "logs" && data ? <LogSummary data={data} /> : null}
			{page === "processes" && data ? <ProcessSummary data={data} /> : null}
			{page === "connections" && data ? <ConnectionSummary data={data} /> : null}
			{page === "wireless" && data ? <WirelessSummary data={data} /> : null}
			{page === "diagnostics" && data ? <DiagnosticsSummary data={data} /> : null}
			{page === "diagnostics" ? <DiagnosticsRunner /> : null}
			{page === "packages" ? <PackageInventory lines={data?.lines ?? []} /> : null}
			{page === "attendedsysupgrade" && data ? <AttendedSysupgradeSummary data={data} /> : null}
			{page === "startup" ? <StartupTable services={data?.services ?? []} /> : null}
			{page === "crontab" && data?.page === "crontab" ? (
				<TextFileEditor
					helperText="Saving writes `/etc/crontabs/root` and reloads cron."
					initialText={data.text || ""}
					onSave={saveCrontab}
					title="Root crontab"
				/>
			) : null}
			{page === "sshkeys" && data?.page === "sshkeys" ? (
				<TextFileEditor
					helperText="Saving writes `/etc/dropbear/authorized_keys`. Existing SSH sessions are not interrupted."
					initialText={data.text || ""}
					onSave={saveSshKeys}
					title="Authorized keys"
				/>
			) : null}
			{page === "services" ? <ServiceOverview services={data?.services ?? []} /> : null}
			{page === "reboot" ? <RebootPanel /> : null}
			{page === "flash" && data ? <FlashSummary data={data} /> : null}
			{page === "repokeys" && data ? <RepoKeySummary data={data} /> : null}
			{page === "leds" && data ? <LedSummary data={data} /> : null}
			{data?.sections?.length ? <ConfigTable sections={data.sections} /> : null}

			<CommandPanels commands={structuredCommands ? [] : (data?.commands ?? [])} />
		</div>
	);
}

export function NativeServicePage() {
	const params = useParams();
	const service = params.service ?? "";
	const [detail, setDetail] = useState<NativeService | null>(null);

	useEffect(() => {
		let cancelled = false;

		void getServiceDetail(service).then((nextDetail) => {
			if (!cancelled) {
				setDetail(nextDetail);
			}
		});

		return () => {
			cancelled = true;
		};
	}, [service]);

	const sections = detail?.sections ?? [];
	const logs = Object.entries(detail?.logs ?? {}).filter(([, value]) => value);

	return (
		<div className="mx-auto grid w-full max-w-7xl gap-5">
			<PageHeader
				meta={{
					title: detail?.title ?? pageTitle(service),
					description: "Modern service status and configuration summary. Advanced editing remains in legacy LuCI.",
					badge: "partial modern",
				}}
				loading={!detail}
			/>
			{detail?.init ? <ServiceStateCard service={detail} /> : null}
			{detail?.id === "commands" ? <CustomCommandsPanel commands={detail.customCommands ?? []} /> : null}
			<ConfigTable sections={sections} />
			{logs.map(([name, text]) => (
				<TextPanel key={name} title={pageTitle(name)} text={text} />
			))}
		</div>
	);
}

function CustomCommandsPanel({ commands }: { commands: CustomCommand[] }) {
	if (!commands.length) {
		return (
			<Panel title="Commands">
				<p className="text-sm text-muted-foreground">No custom commands are configured.</p>
			</Panel>
		);
	}

	return (
		<Panel title="Commands">
			<div className="grid gap-3">
				{commands.map((command) => (
					<CustomCommandRunner command={command} key={command.id} />
				))}
			</div>
		</Panel>
	);
}

function CustomCommandRunner({ command }: { command: CustomCommand }) {
	const [args, setArgs] = useState("");
	const [running, setRunning] = useState(false);
	const [result, setResult] = useState<CustomCommandResult | null>(null);

	async function run() {
		setRunning(true);
		const nextResult = await runCustomCommand(command.id, args);
		setRunning(false);
		setResult(nextResult);

		if (nextResult.ok && nextResult.exitcode === 0) {
			toast.success(nextResult.message);
		}
		else {
			toast.error(nextResult.message);
		}
	}

	return (
		<div className="grid gap-3 rounded-md border bg-card p-3">
			<div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
					<h3 className="text-sm font-semibold">{command.name}</h3>
					<code className="mt-1 block break-words rounded bg-secondary px-2 py-1 text-xs text-muted-foreground">
						{command.command}
					</code>
				</div>
				<div className="flex shrink-0 flex-wrap items-center gap-2">
					{command.public ? <Badge>public</Badge> : null}
					{command.param ? <Badge>args</Badge> : null}
				</div>
			</div>
			<div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
				{command.param ? (
					<Input
						placeholder="Arguments"
						value={args}
						onChange={(event) => setArgs(event.target.value)}
					/>
				) : (
					<div />
				)}
				<Button disabled={running} onClick={() => void run()} type="button">
					<Play className="size-4" />
					Run
				</Button>
			</div>
			{result ? (
				<div className="grid gap-2">
					<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
						<Badge className={result.exitcode === 0 ? "text-primary" : ""}>exit {result.exitcode}</Badge>
						<span className="break-all font-mono">{result.command}</span>
					</div>
					{result.binary ? <p className="text-sm text-muted-foreground">Binary output hidden.</p> : null}
					<OutputLinesTable
						empty="Command produced no text output."
						lines={parseOutputLines([
							{ stream: "stdout", text: result.stdout },
							{ stream: "stderr", text: result.stderr },
						])}
						title="Command output"
					/>
				</div>
			) : null}
		</div>
	);
}

function PageHeader({ meta, loading }: { meta: PageMeta; loading: boolean }) {
	return (
		<header className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
			<div className="min-w-0">
				<h1 className="text-2xl font-semibold">{meta.title}</h1>
				<p className="text-sm text-muted-foreground">{meta.description}</p>
			</div>
			<Badge className="shrink-0 text-primary">{loading ? "loading" : meta.badge ?? "modern"}</Badge>
		</header>
	);
}

function DiagnosticsRunner() {
	const [tool, setTool] = useState<DiagnosticTool>("ping");
	const [target, setTarget] = useState("openwrt.org");
	const [result, setResult] = useState<DiagnosticRunResult | null>(null);
	const [running, setRunning] = useState(false);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setRunning(true);
		const output = await runDiagnostics(tool, target);
		setResult({ tool, output });
		setRunning(false);
		toast.success("Diagnostic complete");
	}

	return (
		<Panel title="Run diagnostic">
			<div className="grid gap-4">
				<form className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)_auto]" onSubmit={(event) => void submit(event)}>
					<select
						className="h-9 rounded-md border bg-card px-3 text-sm"
						value={tool}
						onChange={(event) => setTool(event.target.value as DiagnosticTool)}
					>
						<option value="ping">Ping</option>
						<option value="traceroute">Traceroute</option>
						<option value="nslookup">DNS lookup</option>
					</select>
					<Input value={target} onChange={(event) => setTarget(event.target.value)} />
					<Button disabled={running} type="submit">
						<Play className="mr-1 size-4" />
						Run
					</Button>
				</form>
				{result ? <DiagnosticResultView result={result} /> : null}
			</div>
		</Panel>
	);
}

function DiagnosticResultView({ result }: { result: DiagnosticRunResult }) {
	if (result.tool === "ping") {
		const replies = parsePingReplies(result.output);
		const summary = parsePingSummary(result.output);

		if (replies.length) {
			return <PingResultTable replies={replies} summary={summary} />;
		}
	}

	if (result.tool === "traceroute") {
		const hops = parseTraceHops(result.output);

		if (hops.length) {
			return <TraceResultTable hops={hops} />;
		}
	}

	if (result.tool === "nslookup") {
		const entries = parseNslookupEntries(result.output);

		if (entries.length) {
			return <NslookupResultTable entries={entries} />;
		}
	}

	return (
		<OutputLinesTable
			empty="Diagnostic produced no output."
			lines={parseOutputLines([{ stream: result.tool, text: result.output }])}
			title="Diagnostic output"
		/>
	);
}

function CommandPanels({ commands }: { commands: CommandBlock[] }) {
	if (!commands.length) {
		return null;
	}

	return (
		<div className="grid gap-4">
			{commands.map((command) => (
				<TextPanel key={command.title} title={command.title} text={command.output || "No output."} />
			))}
		</div>
	);
}

function StartupTable({ services }: { services: NativeService[] }) {
	const [overrides, setOverrides] = useState<Record<string, Partial<NativeService>>>({});
	const [pending, setPending] = useState<string | null>(null);
	const rows = services.map((service) => {
		const key = service.name ?? "";
		return key && overrides[key] ? { ...service, ...overrides[key] } : service;
	});

	async function run(name: string, action: InitAction) {
		setPending(`${name}:${action}`);
		const result = await runStartupAction(name, action);
		setPending(null);

		if (!result.ok) {
			toast.error(result.message);
			return;
		}

		if (result.state) {
			setOverrides((current) => ({ ...current, [name]: result.state ?? {} }));
		}

		toast.success(result.message);
	}

	return (
		<Panel title="Init scripts" flush>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[44rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Service</th>
							<th className="px-3 py-2 font-medium">Enabled</th>
							<th className="px-3 py-2 font-medium">Running</th>
							<th className="px-3 py-2 text-right font-medium">Actions</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((service) => (
							<tr className="border-b last:border-0" key={service.name ?? service.title}>
								<td className="px-3 py-2 font-medium">{service.name ?? service.title}</td>
								<td className="px-3 py-2">{stateBadge(service.enabled)}</td>
								<td className="px-3 py-2">{stateBadge(service.running)}</td>
								<td className="px-3 py-2">
									{service.name ? (
										<ServiceActionButtons
											disabledPrefix={pending}
											enabled={service.enabled}
											name={service.name}
											onRun={run}
											running={service.running}
										/>
									) : null}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}

function ServiceOverview({ services }: { services: NativeService[] }) {
	return (
		<div className="grid gap-4">
			{services.map((service) => (
				<ServiceStateCard key={service.id ?? service.title} service={service} />
			))}
		</div>
	);
}

function ServiceStateCard({ service }: { service: NativeService }) {
	const [override, setOverride] = useState(service.init ?? null);
	const [pending, setPending] = useState<string | null>(null);
	const state = override ?? service.init ?? null;

	async function run(action: InitAction) {
		if (!service.id || !state) {
			return;
		}

		setPending(`${state.name}:${action}`);
		const result = await runServiceAction(service.id, action);
		setPending(null);

		if (!result.ok) {
			toast.error(result.message);
			return;
		}

		if (result.state) {
			setOverride(result.state);
		}

		toast.success(result.message);
	}

	return (
		<Panel
			title={
				service.id ? (
					<Link className="hover:underline" to={`/native/service/${service.id}`}>
						{service.title}
					</Link>
				) : (
					service.title
				)
			}
		>
			<div className="grid gap-3 text-sm">
				<div className="flex flex-wrap items-center gap-2">
					<Badge>{service.package}</Badge>
					{state ? stateBadge(state.enabled, "enabled", "disabled") : null}
					{state ? stateBadge(state.running, "running", "stopped") : null}
				</div>
				<p className="text-muted-foreground">{service.sections?.length ?? 0} UCI sections detected.</p>
				{state ? (
					<ServiceActionButtons
						disabledPrefix={pending}
						enabled={state.enabled}
						name={state.name}
						onRun={(_, action) => run(action)}
						running={state.running}
					/>
				) : null}
			</div>
		</Panel>
	);
}

function ServiceActionButtons({
	disabledPrefix,
	enabled,
	name,
	onRun,
	running,
}: {
	disabledPrefix: string | null;
	enabled?: boolean;
	name: string;
	onRun: (name: string, action: InitAction) => void | Promise<void>;
	running?: boolean;
}) {
	const busy = disabledPrefix?.startsWith(`${name}:`) ?? false;
	const primaryAction: InitAction = running ? "stop" : "start";
	const enabledAction: InitAction = enabled ? "disable" : "enable";

	return (
		<div className="flex flex-wrap justify-end gap-1.5">
			<Button disabled={busy} onClick={() => void onRun(name, primaryAction)} size="sm" variant="outline">
				{running ? "Stop" : "Start"}
			</Button>
			<Button disabled={busy} onClick={() => void onRun(name, "restart")} size="sm" variant="outline">
				Restart
			</Button>
			<Button disabled={busy} onClick={() => void onRun(name, enabledAction)} size="sm" variant="outline">
				{enabled ? "Disable" : "Enable"}
			</Button>
		</div>
	);
}

function ConfigTable({ sections }: { sections: ConfigSection[] }) {
	return (
		<Panel title="Configuration" flush>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[42rem] text-left text-sm">
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
										<dl className="grid gap-1">
											{Object.entries(section.values).map(([key, value]) => (
												<div className="grid gap-1 sm:grid-cols-[10rem_minmax(0,1fr)]" key={key}>
													<dt className="text-xs font-medium uppercase text-muted-foreground">{key}</dt>
													<dd className="min-w-0 break-words">{Array.isArray(value) ? value.join(", ") : String(value)}</dd>
												</div>
											))}
										</dl>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td className="px-3 py-6 text-muted-foreground" colSpan={3}>
									No configuration sections found.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}

function PackageInventory({ lines }: { lines: string[] }) {
	const [query, setQuery] = useState("");
	const packages = useMemo(() => lines.map(parsePackageLine), [lines]);
	const filtered = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return packages.filter(
			(pkg) =>
				!needle ||
				pkg.name.toLowerCase().includes(needle) ||
				pkg.version.toLowerCase().includes(needle) ||
				pkg.description.toLowerCase().includes(needle),
		);
	}, [packages, query]);
	const luciCount = packages.filter((pkg) => pkg.name.startsWith("luci-")).length;
	const kernelCount = packages.filter((pkg) => pkg.name.startsWith("kmod-")).length;

	return (
		<div className="grid gap-4">
			<div className="grid gap-3 sm:grid-cols-3">
				<MetricBlock label="Installed packages" value={packages.length} />
				<MetricBlock label="LuCI packages" value={luciCount} />
				<MetricBlock label="Kernel modules" value={kernelCount} />
			</div>
			<Panel
				title={
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<span>Installed packages</span>
						<div className="relative w-full sm:w-72">
							<Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
							<Input
								className="pl-9"
								placeholder="Filter packages"
								value={query}
								onChange={(event) => setQuery(event.target.value)}
							/>
						</div>
					</div>
				}
				flush
			>
				<div className="overflow-x-auto">
					<table className="w-full min-w-[58rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Package</th>
								<th className="px-3 py-2 font-medium">Version</th>
								<th className="px-3 py-2 font-medium">Description</th>
							</tr>
						</thead>
						<tbody>
							{filtered.length ? (
								filtered.map((pkg) => (
									<tr className="border-b align-top last:border-0" key={pkg.line}>
										<td className="px-3 py-3 font-medium">{pkg.name}</td>
										<td className="px-3 py-3 font-mono text-xs text-muted-foreground">{pkg.version}</td>
										<td className="px-3 py-3">{pkg.description || "none"}</td>
									</tr>
								))
							) : (
								<tr>
									<td className="px-3 py-6 text-muted-foreground" colSpan={3}>
										No packages match the filter.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</Panel>
		</div>
	);
}

function RoutingSummary({ data }: { data: NativePageData }) {
	const ipv4Routes = parseRoutes(commandOutput(data.commands, "IPv4 routes"));
	const ipv6Routes = parseRoutes(commandOutput(data.commands, "IPv6 routes"));
	const ipv4Rules = parseRules(commandOutput(data.commands, "IPv4 rules"));
	const ipv6Rules = parseRules(commandOutput(data.commands, "IPv6 rules"));
	const ipv4Neighbors = parseNeighbors(commandOutput(data.commands, "IPv4 neighbours"));
	const ipv6Neighbors = parseNeighbors(commandOutput(data.commands, "IPv6 neighbours"));

	return (
		<div className="grid gap-4">
			<div className="grid gap-3 sm:grid-cols-3">
				<MetricBlock label="Routes" value={ipv4Routes.length + ipv6Routes.length} />
				<MetricBlock label="Policy rules" value={ipv4Rules.length + ipv6Rules.length} />
				<MetricBlock label="Neighbours" value={ipv4Neighbors.length + ipv6Neighbors.length} />
			</div>
			<RouteTable entries={ipv4Routes} title="IPv4 routes" />
			<RouteTable entries={ipv6Routes} title="IPv6 routes" />
			<RuleTable entries={ipv4Rules} title="IPv4 rules" />
			<RuleTable entries={ipv6Rules} title="IPv6 rules" />
			<NeighborTable entries={ipv4Neighbors} title="IPv4 neighbours" />
			<NeighborTable entries={ipv6Neighbors} title="IPv6 neighbours" />
		</div>
	);
}

function NftablesSummary({ data }: { data: NativePageData }) {
	const ruleset = commandOutput(data.commands, "nftables ruleset");
	const chains = parseNftChains(ruleset);
	const rules = parseNftRules(ruleset);
	const policyCounts = countBy(chains.map((chain) => chain.policy).filter(Boolean));

	return (
		<div className="grid gap-4">
			<div className="grid gap-3 sm:grid-cols-3">
				<MetricBlock label="Chains" value={chains.length} />
				<MetricBlock label="Rules" value={rules.length} />
				<MetricBlock label="Drop policies" value={policyCounts.drop ?? 0} />
			</div>
			<NftChainTable entries={chains} />
			<NftRuleTable entries={rules} />
		</div>
	);
}

function ProcessSummary({ data }: { data: NativePageData }) {
	const processes = parseProcesses(commandOutput(data.commands, "Processes"));
	const stateCounts = countBy(processes.map((process) => process.state.charAt(0)).filter(Boolean));

	return (
		<div className="grid gap-4">
			<div className="grid gap-3 sm:grid-cols-3">
				<MetricBlock label="Processes" value={processes.length} />
				<MetricBlock label="Sleeping" value={stateCounts.S ?? 0} />
				<MetricBlock label="Running" value={stateCounts.R ?? 0} />
			</div>
			<ProcessTable entries={processes} />
		</div>
	);
}

function ConnectionSummary({ data }: { data: NativePageData }) {
	const sockets = parseSockets(commandOutput(data.commands, "Active sockets"));
	const protocolCounts = countBy(sockets.map((socket) => socket.protocol).filter(Boolean));

	return (
		<div className="grid gap-4">
			<div className="grid gap-3 sm:grid-cols-3">
				<MetricBlock label="Sockets" value={sockets.length} />
				<MetricBlock label="TCP" value={protocolCounts.tcp ?? 0} />
				<MetricBlock label="UDP" value={protocolCounts.udp ?? 0} />
			</div>
			<SocketTable entries={sockets} />
		</div>
	);
}

function LogSummary({ data }: { data: NativePageData }) {
	const systemLogs = parseSystemLogs(commandOutput(data.commands, "System log"));
	const kernelLogs = parseKernelLogs(commandOutput(data.commands, "Kernel log"));
	const levels = countBy([...systemLogs, ...kernelLogs].map((entry) => entry.level));

	return (
		<div className="grid gap-4">
			<div className="grid gap-3 sm:grid-cols-3">
				<MetricBlock label="Entries" value={systemLogs.length + kernelLogs.length} />
				<MetricBlock label="Errors" value={(levels.err ?? 0) + (levels.error ?? 0)} />
				<MetricBlock label="Warnings" value={(levels.warn ?? 0) + (levels.warning ?? 0)} />
			</div>
			<LogTable entries={systemLogs} title="System log" />
			<LogTable entries={kernelLogs} title="Kernel log" />
		</div>
	);
}

function DiagnosticsSummary({ data }: { data: NativePageData }) {
	const routes = parseRoutes(commandOutput(data.commands, "Routing table"));
	const dnsServers = parseDnsServers(commandOutput(data.commands, "DNS servers"));

	return (
		<div className="grid gap-4">
			<div className="grid gap-3 sm:grid-cols-3">
				<MetricBlock label="Routes" value={routes.length} />
				<MetricBlock label="DNS servers" value={dnsServers.length} />
				<MetricBlock label="Diagnostics" value="ping / trace / DNS" />
			</div>
			<RouteTable entries={routes} title="Routing table" />
			<DnsServerTable entries={dnsServers} />
		</div>
	);
}

function RepoKeySummary({ data }: { data: NativePageData }) {
	const keys = parseRepoKeys(commandOutput(data.commands, "Repository public keys"));
	const apkKeys = keys.filter((key) => key.path.includes("/apk/")).length;
	const opkgKeys = keys.filter((key) => key.path.includes("/opkg/")).length;

	return (
		<div className="grid gap-4">
			<div className="grid gap-3 sm:grid-cols-3">
				<MetricBlock label="Keys" value={keys.length} />
				<MetricBlock label="APK keys" value={apkKeys} />
				<MetricBlock label="OPKG keys" value={opkgKeys} />
			</div>
			<RepoKeyTable entries={keys} />
		</div>
	);
}

function LedSummary({ data }: { data: NativePageData }) {
	const leds = parseLeds(commandOutput(data.commands, "LED sysfs state"));
	const triggers = countBy(leds.map((led) => led.trigger || "none"));

	return (
		<div className="grid gap-4">
			<div className="grid gap-3 sm:grid-cols-3">
				<MetricBlock label="LEDs" value={leds.length} />
				<MetricBlock label="Netdev triggers" value={triggers.netdev ?? 0} />
				<MetricBlock label="On" value={leds.filter((led) => Number(led.brightness) > 0).length} />
			</div>
			<LedSysfsTable entries={leds} />
		</div>
	);
}

function WirelessSummary({ data }: { data: NativePageData }) {
	const iwOutput = commandOutput(data.commands, "Wireless devices");
	const iwinfoOutput = commandOutput(data.commands, "Wireless interfaces");
	const helpers = [
		{ name: "iw", status: iwOutput.includes("not installed") ? "not installed" : iwOutput.trim() ? "available" : "no devices" },
		{
			name: "iwinfo",
			status: iwinfoOutput.includes("not installed") ? "not installed" : iwinfoOutput.trim() ? "available" : "no interfaces",
		},
	];

	return (
		<div className="grid gap-4">
			<div className="grid gap-3 sm:grid-cols-3">
				<MetricBlock label="Wireless config" value={data.sections.length} />
				<MetricBlock label="iw" value={helpers[0].status} />
				<MetricBlock label="iwinfo" value={helpers[1].status} />
			</div>
			<HelperStatusTable entries={helpers} />
		</div>
	);
}

function LogTable({ entries, title }: { entries: LogEntry[]; title: string }) {
	return (
		<Panel title={title} flush>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[68rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Time</th>
							<th className="px-3 py-2 font-medium">Level</th>
							<th className="px-3 py-2 font-medium">Facility</th>
							<th className="px-3 py-2 font-medium">Process</th>
							<th className="px-3 py-2 font-medium">Message</th>
						</tr>
					</thead>
					<tbody>
						{entries.length ? (
							entries.slice(0, 250).map((entry, index) => (
								<tr className="border-b align-top last:border-0" key={`${title}.${index}.${entry.time}.${entry.message}`}>
									<td className="px-3 py-3 font-mono text-xs">{entry.time}</td>
									<td className="px-3 py-3">
										<Badge className={entry.level === "err" || entry.level === "error" ? "text-destructive" : ""}>
											{entry.level || "info"}
										</Badge>
									</td>
									<td className="px-3 py-3">{entry.facility || "system"}</td>
									<td className="px-3 py-3 font-mono text-xs">{entry.process || "none"}</td>
									<td className="px-3 py-3">{entry.message}</td>
								</tr>
							))
						) : (
							<tr>
								<td className="px-3 py-6 text-muted-foreground" colSpan={5}>
									No log entries found.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}

function DnsServerTable({ entries }: { entries: DnsServerEntry[] }) {
	return (
		<Panel title="DNS servers" flush>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[30rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Source</th>
							<th className="px-3 py-2 font-medium">Server</th>
						</tr>
					</thead>
					<tbody>
						{entries.length ? (
							entries.map((entry) => (
								<tr className="border-b last:border-0" key={`${entry.source}.${entry.server}`}>
									<td className="px-3 py-3 font-medium">{entry.source}</td>
									<td className="px-3 py-3 font-mono text-xs">{entry.server}</td>
								</tr>
							))
						) : (
							<tr>
								<td className="px-3 py-6 text-muted-foreground" colSpan={2}>
									No DNS servers found.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}

function RepoKeyTable({ entries }: { entries: RepoKeyEntry[] }) {
	return (
		<Panel title="Repository public keys" flush>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[58rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Path</th>
							<th className="px-3 py-2 font-medium">Mode</th>
							<th className="px-3 py-2 font-medium">Owner</th>
							<th className="px-3 py-2 font-medium">Size</th>
							<th className="px-3 py-2 font-medium">Comment</th>
							<th className="px-3 py-2 font-medium">Fingerprint</th>
						</tr>
					</thead>
					<tbody>
						{entries.length ? (
							entries.map((entry) => (
								<tr className="border-b align-top last:border-0" key={entry.path}>
									<td className="px-3 py-3 font-mono text-xs">{entry.path}</td>
									<td className="px-3 py-3">{entry.mode}</td>
									<td className="px-3 py-3">{entry.owner}:{entry.group}</td>
									<td className="px-3 py-3">{entry.size}</td>
									<td className="px-3 py-3">{entry.comment || "none"}</td>
									<td className="px-3 py-3 font-mono text-xs">{entry.fingerprint || "not available"}</td>
								</tr>
							))
						) : (
							<tr>
								<td className="px-3 py-6 text-muted-foreground" colSpan={6}>
									No repository keys found.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}

function LedSysfsTable({ entries }: { entries: LedSysfsEntry[] }) {
	return (
		<Panel title="LED sysfs state" flush>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[34rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">LED</th>
							<th className="px-3 py-2 font-medium">Trigger</th>
							<th className="px-3 py-2 font-medium">Brightness</th>
						</tr>
					</thead>
					<tbody>
						{entries.length ? (
							entries.map((entry) => (
								<tr className="border-b last:border-0" key={entry.name}>
									<td className="px-3 py-3 font-medium">{entry.name}</td>
									<td className="px-3 py-3">{entry.trigger}</td>
									<td className="px-3 py-3">{entry.brightness}</td>
								</tr>
							))
						) : (
							<tr>
								<td className="px-3 py-6 text-muted-foreground" colSpan={3}>
									No sysfs LEDs found.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}

function HelperStatusTable({ entries }: { entries: Array<{ name: string; status: string }> }) {
	return (
		<Panel title="Wireless helpers" flush>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[26rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Helper</th>
							<th className="px-3 py-2 font-medium">Status</th>
						</tr>
					</thead>
					<tbody>
						{entries.map((entry) => (
							<tr className="border-b last:border-0" key={entry.name}>
								<td className="px-3 py-3 font-medium">{entry.name}</td>
								<td className="px-3 py-3">
									<Badge className={entry.status === "available" ? "text-primary" : ""}>{entry.status}</Badge>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}

function PingResultTable({ replies, summary }: { replies: PingReply[]; summary: PingSummary | null }) {
	return (
		<div className="grid gap-3">
			{summary ? (
				<div className="grid gap-3 sm:grid-cols-3">
					<MetricBlock label="Transmitted" value={summary.transmitted} />
					<MetricBlock label="Received" value={summary.received} />
					<MetricBlock label="Packet loss" value={summary.loss} />
				</div>
			) : null}
			<Panel title="Ping replies" flush>
				<div className="overflow-x-auto">
					<table className="w-full min-w-[34rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Host</th>
								<th className="px-3 py-2 font-medium">Seq</th>
								<th className="px-3 py-2 font-medium">TTL</th>
								<th className="px-3 py-2 font-medium">Time</th>
							</tr>
						</thead>
						<tbody>
							{replies.map((reply) => (
								<tr className="border-b last:border-0" key={`${reply.host}.${reply.seq}.${reply.time}`}>
									<td className="px-3 py-3 font-mono text-xs">{reply.host}</td>
									<td className="px-3 py-3">{reply.seq}</td>
									<td className="px-3 py-3">{reply.ttl}</td>
									<td className="px-3 py-3">{reply.time} ms</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Panel>
		</div>
	);
}

function TraceResultTable({ hops }: { hops: TraceHop[] }) {
	return (
		<Panel title="Traceroute hops" flush>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[40rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Hop</th>
							<th className="px-3 py-2 font-medium">Result</th>
						</tr>
					</thead>
					<tbody>
						{hops.map((hop) => (
							<tr className="border-b last:border-0" key={`${hop.hop}.${hop.result}`}>
								<td className="px-3 py-3 font-medium">{hop.hop}</td>
								<td className="px-3 py-3 font-mono text-xs">{hop.result}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}

function NslookupResultTable({ entries }: { entries: NslookupEntry[] }) {
	return (
		<Panel title="DNS lookup result" flush>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[34rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Field</th>
							<th className="px-3 py-2 font-medium">Value</th>
						</tr>
					</thead>
					<tbody>
						{entries.map((entry, index) => (
							<tr className="border-b last:border-0" key={`${index}.${entry.field}.${entry.value}`}>
								<td className="px-3 py-3 font-medium">{entry.field}</td>
								<td className="px-3 py-3 font-mono text-xs">{entry.value}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}

function OutputLinesTable({ empty, lines, title }: { empty: string; lines: OutputLine[]; title: string }) {
	return (
		<Panel title={title} flush>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[42rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Stream</th>
							<th className="px-3 py-2 font-medium">Line</th>
							<th className="px-3 py-2 font-medium">Text</th>
						</tr>
					</thead>
					<tbody>
						{lines.length ? (
							lines.slice(0, 300).map((line) => (
								<tr className="border-b align-top last:border-0" key={`${line.stream}.${line.number}.${line.text}`}>
									<td className="px-3 py-3">
										<Badge className={line.stream === "stderr" ? "text-destructive" : ""}>{line.stream}</Badge>
									</td>
									<td className="px-3 py-3 font-mono text-xs text-muted-foreground">{line.number}</td>
									<td className="px-3 py-3 font-mono text-xs">{line.text}</td>
								</tr>
							))
						) : (
							<tr>
								<td className="px-3 py-6 text-muted-foreground" colSpan={3}>
									{empty}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}

function RouteTable({ entries, title }: { entries: RouteEntry[]; title: string }) {
	return (
		<Panel title={title} flush>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[56rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Target</th>
							<th className="px-3 py-2 font-medium">Via</th>
							<th className="px-3 py-2 font-medium">Device</th>
							<th className="px-3 py-2 font-medium">Table</th>
							<th className="px-3 py-2 font-medium">Source</th>
							<th className="px-3 py-2 font-medium">Scope</th>
							<th className="px-3 py-2 font-medium">Metric</th>
						</tr>
					</thead>
					<tbody>
						{entries.length ? (
							entries.map((entry, index) => (
								<tr className="border-b last:border-0" key={`${title}.${index}.${entry.target}.${entry.device}`}>
									<td className="px-3 py-3 font-mono text-xs">{entry.target}</td>
									<td className="px-3 py-3 font-mono text-xs">{entry.via}</td>
									<td className="px-3 py-3">{entry.device}</td>
									<td className="px-3 py-3">{entry.table}</td>
									<td className="px-3 py-3 font-mono text-xs">{entry.source}</td>
									<td className="px-3 py-3">{entry.scope}</td>
									<td className="px-3 py-3">{entry.metric}</td>
								</tr>
							))
						) : (
							<tr>
								<td className="px-3 py-6 text-muted-foreground" colSpan={7}>
									No entries found.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}

function RuleTable({ entries, title }: { entries: RuleEntry[]; title: string }) {
	return (
		<Panel title={title} flush>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[38rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Priority</th>
							<th className="px-3 py-2 font-medium">Rule</th>
						</tr>
					</thead>
					<tbody>
						{entries.length ? (
							entries.map((entry) => (
								<tr className="border-b last:border-0" key={`${title}.${entry.priority}.${entry.rule}`}>
									<td className="px-3 py-3 font-medium">{entry.priority}</td>
									<td className="px-3 py-3">{entry.rule}</td>
								</tr>
							))
						) : (
							<tr>
								<td className="px-3 py-6 text-muted-foreground" colSpan={2}>
									No rules found.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}

function NeighborTable({ entries, title }: { entries: NeighborEntry[]; title: string }) {
	return (
		<Panel title={title} flush>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[44rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Address</th>
							<th className="px-3 py-2 font-medium">Device</th>
							<th className="px-3 py-2 font-medium">MAC</th>
							<th className="px-3 py-2 font-medium">State</th>
						</tr>
					</thead>
					<tbody>
						{entries.length ? (
							entries.map((entry, index) => (
								<tr className="border-b last:border-0" key={`${title}.${index}.${entry.address}.${entry.device}`}>
									<td className="px-3 py-3 font-mono text-xs">{entry.address}</td>
									<td className="px-3 py-3">{entry.device}</td>
									<td className="px-3 py-3 font-mono text-xs">{entry.mac}</td>
									<td className="px-3 py-3">
										<Badge className={entry.state === "REACHABLE" ? "text-primary" : ""}>{entry.state}</Badge>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td className="px-3 py-6 text-muted-foreground" colSpan={4}>
									No neighbours found.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}

function NftChainTable({ entries }: { entries: NftChain[] }) {
	return (
		<Panel title="Chains" flush>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[42rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Chain</th>
							<th className="px-3 py-2 font-medium">Hook</th>
							<th className="px-3 py-2 font-medium">Policy</th>
							<th className="px-3 py-2 font-medium">Rules</th>
						</tr>
					</thead>
					<tbody>
						{entries.map((entry) => (
							<tr className="border-b last:border-0" key={entry.name}>
								<td className="px-3 py-3 font-medium">{entry.name}</td>
								<td className="px-3 py-3">{entry.hook || "none"}</td>
								<td className="px-3 py-3">{entry.policy || "none"}</td>
								<td className="px-3 py-3">{entry.rules}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}

function NftRuleTable({ entries }: { entries: NftRule[] }) {
	return (
		<Panel title="Rules" flush>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[64rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Chain</th>
							<th className="px-3 py-2 font-medium">Action</th>
							<th className="px-3 py-2 font-medium">Packets</th>
							<th className="px-3 py-2 font-medium">Bytes</th>
							<th className="px-3 py-2 font-medium">Comment</th>
							<th className="px-3 py-2 font-medium">Expression</th>
						</tr>
					</thead>
					<tbody>
						{entries.length ? (
							entries.map((entry, index) => (
								<tr className="border-b align-top last:border-0" key={`${entry.chain}.${index}.${entry.expression}`}>
									<td className="px-3 py-3 font-medium">{entry.chain}</td>
									<td className="px-3 py-3">{entry.action}</td>
									<td className="px-3 py-3">{entry.packets}</td>
									<td className="px-3 py-3">{entry.bytes}</td>
									<td className="px-3 py-3">{entry.comment || "none"}</td>
									<td className="px-3 py-3 font-mono text-xs">{entry.expression}</td>
								</tr>
							))
						) : (
							<tr>
								<td className="px-3 py-6 text-muted-foreground" colSpan={6}>
									No nftables rules found.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}

function ProcessTable({ entries }: { entries: ProcessEntry[] }) {
	return (
		<Panel title="Processes" flush>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[54rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">PID</th>
							<th className="px-3 py-2 font-medium">User</th>
							<th className="px-3 py-2 font-medium">VSZ</th>
							<th className="px-3 py-2 font-medium">State</th>
							<th className="px-3 py-2 font-medium">Command</th>
						</tr>
					</thead>
					<tbody>
						{entries.length ? (
							entries.map((entry) => (
								<tr className="border-b align-top last:border-0" key={`${entry.pid}.${entry.command}`}>
									<td className="px-3 py-3 font-mono text-xs">{entry.pid}</td>
									<td className="px-3 py-3">{entry.user}</td>
									<td className="px-3 py-3">{entry.vsz}</td>
									<td className="px-3 py-3">
										<Badge className={entry.state.startsWith("R") ? "text-primary" : ""}>{entry.state}</Badge>
									</td>
									<td className="px-3 py-3 font-mono text-xs">{entry.command}</td>
								</tr>
							))
						) : (
							<tr>
								<td className="px-3 py-6 text-muted-foreground" colSpan={5}>
									No processes found.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}

function SocketTable({ entries }: { entries: SocketEntry[] }) {
	return (
		<Panel title="Active sockets" flush>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[64rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Protocol</th>
							<th className="px-3 py-2 font-medium">State</th>
							<th className="px-3 py-2 font-medium">Recv-Q</th>
							<th className="px-3 py-2 font-medium">Send-Q</th>
							<th className="px-3 py-2 font-medium">Local</th>
							<th className="px-3 py-2 font-medium">Peer</th>
							<th className="px-3 py-2 font-medium">Process</th>
						</tr>
					</thead>
					<tbody>
						{entries.length ? (
							entries.map((entry, index) => (
								<tr className="border-b align-top last:border-0" key={`${index}.${entry.local}.${entry.peer}`}>
									<td className="px-3 py-3">{entry.protocol}</td>
									<td className="px-3 py-3">{entry.state}</td>
									<td className="px-3 py-3">{entry.receiveQueue}</td>
									<td className="px-3 py-3">{entry.sendQueue}</td>
									<td className="px-3 py-3 font-mono text-xs">{entry.local}</td>
									<td className="px-3 py-3 font-mono text-xs">{entry.peer}</td>
									<td className="px-3 py-3 font-mono text-xs">{entry.process}</td>
								</tr>
							))
						) : (
							<tr>
								<td className="px-3 py-6 text-muted-foreground" colSpan={7}>
									No active sockets found.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}

function AttendedSysupgradeSummary({ data }: { data: NativePageData }) {
	const firmware = parseKeyValueLines(commandOutput(data.commands, "Current firmware"));
	const helper = commandOutput(data.commands, "Upgrade helper").trim();
	const server = data.sections.find((section) => section.type === "server");

	return (
		<div className="grid gap-4">
			<div className="grid gap-3 sm:grid-cols-3">
				<MetricBlock label="Firmware" value={firmware.DISTRIB_DESCRIPTION ?? data.board.release?.description ?? "unknown"} />
				<MetricBlock label="Target" value={firmware.DISTRIB_TARGET ?? data.board.release?.target ?? "unknown"} />
				<MetricBlock label="Upgrade helper" value={helper || "unknown"} />
			</div>
			<Panel title="Build server" flush>
				<div className="overflow-x-auto">
					<table className="w-full min-w-[36rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Section</th>
								<th className="px-3 py-2 font-medium">URL</th>
								<th className="px-3 py-2 font-medium">Status</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td className="px-3 py-3 font-medium">{server?.name ?? "server"}</td>
								<td className="px-3 py-3 font-mono text-xs">{server?.values.url ?? "none"}</td>
								<td className="px-3 py-3">
									<Badge className={helper.includes("not installed") ? "" : "text-primary"}>
										{helper.includes("not installed") ? "manual / LuCI compat" : "helper available"}
									</Badge>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</Panel>
			<Panel title="Guardrails">
				<p className="text-sm text-muted-foreground">
					Image requests, package retention, build progress, and flash handoff remain in LuCI compat until the native flow
					has rollback-safe confirmation and progress RPCs.
				</p>
			</Panel>
		</div>
	);
}

function FlashSummary({ data }: { data: NativePageData }) {
	const filesystems = parseFilesystems(commandOutput(data.commands, "Mounted filesystems"));
	const partitions = parseFlashPartitions(commandOutput(data.commands, "Flash partitions"));

	return (
		<div className="grid gap-4">
			<div className="grid gap-3 sm:grid-cols-3">
				<MetricBlock label="Firmware" value={data.board.release?.description ?? "unknown"} />
				<MetricBlock label="Root used" value={storagePercent(data.system.root)} />
				<MetricBlock label="Overlay free" value={formatStorageKiB(data.system.root?.free ?? data.system.root?.avail)} />
			</div>
			<FilesystemTable entries={filesystems} />
			<FlashPartitionTable entries={partitions} />
		</div>
	);
}

function FilesystemTable({ entries }: { entries: FilesystemEntry[] }) {
	return (
		<Panel title="Mounted filesystems" flush>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[44rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Filesystem</th>
							<th className="px-3 py-2 font-medium">Size</th>
							<th className="px-3 py-2 font-medium">Used</th>
							<th className="px-3 py-2 font-medium">Available</th>
							<th className="px-3 py-2 font-medium">Use</th>
							<th className="px-3 py-2 font-medium">Mounted on</th>
						</tr>
					</thead>
					<tbody>
						{entries.length ? (
							entries.map((entry) => (
								<tr className="border-b last:border-0" key={`${entry.filesystem}.${entry.mountedOn}`}>
									<td className="px-3 py-3 font-medium">{entry.filesystem}</td>
									<td className="px-3 py-3">{entry.size}</td>
									<td className="px-3 py-3">{entry.used}</td>
									<td className="px-3 py-3">{entry.available}</td>
									<td className="px-3 py-3">{entry.usePercent}</td>
									<td className="px-3 py-3 font-mono text-xs">{entry.mountedOn}</td>
								</tr>
							))
						) : (
							<tr>
								<td className="px-3 py-6 text-muted-foreground" colSpan={6}>
									No mounted filesystems found.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}

function FlashPartitionTable({ entries }: { entries: FlashPartitionEntry[] }) {
	return (
		<Panel title="Flash partitions" flush>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[36rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Device</th>
							<th className="px-3 py-2 font-medium">Size</th>
							<th className="px-3 py-2 font-medium">Erase size</th>
							<th className="px-3 py-2 font-medium">Name</th>
						</tr>
					</thead>
					<tbody>
						{entries.length ? (
							entries.map((entry) => (
								<tr className="border-b last:border-0" key={entry.device}>
									<td className="px-3 py-3 font-medium">{entry.device}</td>
									<td className="px-3 py-3 font-mono text-xs">{entry.size}</td>
									<td className="px-3 py-3 font-mono text-xs">{entry.eraseSize}</td>
									<td className="px-3 py-3">{entry.name}</td>
								</tr>
							))
						) : (
							<tr>
								<td className="px-3 py-6 text-muted-foreground" colSpan={4}>
									No MTD flash partitions exposed by this target.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}

function MetricBlock({ label, value }: { label: string; value: ReactNode }) {
	return (
		<div className="rounded-md border bg-card p-3 text-sm">
			<div className="text-xs uppercase text-muted-foreground">{label}</div>
			<div className="mt-1 break-words text-2xl font-semibold">{value}</div>
		</div>
	);
}

function parsePackageLine(line: string): PackageEntry {
	const match = /^(.+)-([0-9][^ ]*) - (.*)$/.exec(line);

	if (!match) {
		return {
			name: line,
			version: "unknown",
			description: "",
			line,
		};
	}

	return {
		name: match[1],
		version: match[2],
		description: match[3],
		line,
	};
}

function commandOutput(commands: CommandBlock[], title: string) {
	return commands.find((command) => command.title === title)?.output ?? "";
}

function parseRoutes(output: string): RouteEntry[] {
	return output
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const parts = line.split(/\s+/);
			return {
				target: parts[0] ?? "unknown",
				via: tokenAfter(parts, "via"),
				device: tokenAfter(parts, "dev"),
				table: tokenAfter(parts, "table") || "main",
				source: tokenAfter(parts, "src"),
				scope: tokenAfter(parts, "scope"),
				metric: tokenAfter(parts, "metric"),
			};
		});
}

function parseRules(output: string): RuleEntry[] {
	return output
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const [priority = "", ...rest] = line.split(/\s+/);
			return {
				priority: priority.replace(":", ""),
				rule: rest.join(" "),
			};
		});
}

function parseNeighbors(output: string): NeighborEntry[] {
	return output
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const parts = line.split(/\s+/);
			return {
				address: parts[0] ?? "unknown",
				device: tokenAfter(parts, "dev"),
				mac: tokenAfter(parts, "lladdr"),
				state: parts[parts.length - 1] ?? "unknown",
			};
		});
}

function parseNftChains(output: string): NftChain[] {
	const chains: NftChain[] = [];
	let current: NftChain | null = null;

	for (const line of output.split("\n")) {
		const trimmed = line.trim();
		const chain = /^chain\s+([A-Za-z0-9_.-]+)\s+\{/.exec(trimmed);

		if (chain) {
			current = { name: chain[1], hook: "", policy: "", rules: 0 };
			chains.push(current);
			continue;
		}

		if (!current) {
			continue;
		}

		if (trimmed === "}") {
			current = null;
			continue;
		}

		const hook = /hook\s+([A-Za-z0-9_.-]+)/.exec(trimmed);
		const policy = /policy\s+([A-Za-z0-9_.-]+)/.exec(trimmed);

		if (hook) {
			current.hook = hook[1];
		}

		if (policy) {
			current.policy = policy[1].replace(";", "");
		}

		if (trimmed && !trimmed.startsWith("type ")) {
			current.rules += 1;
		}
	}

	return chains;
}

function parseNftRules(output: string): NftRule[] {
	const rules: NftRule[] = [];
	let chain = "";

	for (const line of output.split("\n")) {
		const trimmed = line.trim();
		const chainMatch = /^chain\s+([A-Za-z0-9_.-]+)\s+\{/.exec(trimmed);

		if (chainMatch) {
			chain = chainMatch[1];
			continue;
		}

		if (trimmed === "}") {
			chain = "";
			continue;
		}

		if (!chain || !trimmed || trimmed.startsWith("type ")) {
			continue;
		}

		const counter = /counter packets\s+(\d+)\s+bytes\s+(\d+)/.exec(trimmed);
		const comment = /comment\s+"([^"]+)"/.exec(trimmed);
		const action = nftAction(trimmed);

		rules.push({
			chain,
			action,
			packets: counter?.[1] ?? "0",
			bytes: counter?.[2] ?? "0",
			comment: comment?.[1] ?? "",
			expression: trimmed.replace(/\s+comment\s+"[^"]+"/, ""),
		});
	}

	return rules;
}

function parseProcesses(output: string): ProcessEntry[] {
	return output
		.split("\n")
		.slice(1)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const parts = line.split(/\s+/);
			return {
				pid: parts[0] ?? "unknown",
				user: parts[1] ?? "unknown",
				vsz: parts[2] ?? "unknown",
				state: parts[3] ?? "unknown",
				command: parts.slice(4).join(" ") || "unknown",
			};
		});
}

function parseSockets(output: string): SocketEntry[] {
	return output
		.split("\n")
		.slice(1)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const parts = line.split(/\s+/);
			return {
				protocol: parts[0] ?? "unknown",
				state: parts[1] ?? "unknown",
				receiveQueue: parts[2] ?? "0",
				sendQueue: parts[3] ?? "0",
				local: parts[4] ?? "unknown",
				peer: parts[5] ?? "unknown",
				process: parts.slice(6).join(" ") || "none",
			};
		});
}

function parseSystemLogs(output: string): LogEntry[] {
	return output
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const match = /^(\w{3}\s+\w{3}\s+\d+\s+\d\d:\d\d:\d\d\s+\d{4})\s+([^.:\s]+)\.([^\s]+)\s+([^:]+):\s*(.*)$/.exec(
				line,
			);

			if (!match) {
				return {
					time: "unknown",
					facility: "system",
					level: inferLogLevel(line),
					process: "logread",
					message: line,
				};
			}

			return {
				time: match[1],
				facility: match[2],
				level: match[3],
				process: match[4],
				message: match[5],
			};
		});
}

function parseKernelLogs(output: string): LogEntry[] {
	return output
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const match = /^\[\s*([^\]]+)\]\s*(.*)$/.exec(line);
			const message = match?.[2] ?? line;

			return {
				time: match ? `[${match[1]}]` : "unknown",
				facility: "kernel",
				level: inferLogLevel(message),
				process: "kernel",
				message,
			};
		});
}

function parseDnsServers(output: string): DnsServerEntry[] {
	const entries: DnsServerEntry[] = [];
	let source = "system";

	for (const rawLine of output.split("\n")) {
		const line = rawLine.trim();

		if (!line) {
			continue;
		}

		const interfaceMatch = /^#\s+Interface\s+(.+)$/.exec(line);
		if (interfaceMatch) {
			source = interfaceMatch[1];
			continue;
		}

		const serverMatch = /^nameserver\s+(.+)$/.exec(line);
		if (serverMatch) {
			entries.push({ source, server: serverMatch[1] });
		}
	}

	return entries;
}

function parseRepoKeys(output: string): RepoKeyEntry[] {
	const entries: RepoKeyEntry[] = [];
	let current: RepoKeyEntry | null = null;

	for (const rawLine of output.split("\n")) {
		const line = rawLine.trim();
		const pathMatch = /^===\s+(.+?)\s+===$/.exec(line);

		if (pathMatch) {
			current = {
				path: pathMatch[1],
				mode: "unknown",
				owner: "unknown",
				group: "unknown",
				size: "unknown",
				comment: "",
				fingerprint: "",
			};
			entries.push(current);
			continue;
		}

		if (!current || !line) {
			continue;
		}

		const fileMatch = /^(\S+)\s+\d+\s+(\S+)\s+(\S+)\s+(\S+)\s+/.exec(line);
		if (fileMatch) {
			current.mode = fileMatch[1];
			current.owner = fileMatch[2];
			current.group = fileMatch[3];
			current.size = fileMatch[4];
			continue;
		}

		if (line.startsWith("untrusted comment:")) {
			current.comment = line.replace(/^untrusted comment:\s*/, "");
			continue;
		}

		if (!line.startsWith("-----")) {
			current.fingerprint = shortFingerprint(line);
		}
	}

	return entries;
}

function parseLeds(output: string): LedSysfsEntry[] {
	const entries: LedSysfsEntry[] = [];
	let current: LedSysfsEntry | null = null;

	for (const rawLine of output.split("\n")) {
		const line = rawLine.trim();
		const ledMatch = /^===\s+(.+?)\s+===$/.exec(line);

		if (ledMatch) {
			current = { name: ledMatch[1], trigger: "unknown", brightness: "unknown" };
			entries.push(current);
			continue;
		}

		if (!current || !line) {
			continue;
		}

		if (line.startsWith("brightness:")) {
			current.brightness = line.replace(/^brightness:\s*/, "");
			continue;
		}

		const triggerMatch = /\[([^\]]+)\]/.exec(line);
		if (triggerMatch) {
			current.trigger = triggerMatch[1];
		}
	}

	return entries;
}

function inferLogLevel(message: string) {
	const lower = message.toLowerCase();

	if (lower.includes("error") || lower.includes("failed") || lower.includes("fail")) {
		return "error";
	}

	if (lower.includes("warn")) {
		return "warn";
	}

	if (lower.includes("debug")) {
		return "debug";
	}

	return "info";
}

function shortFingerprint(value: string) {
	if (!value) {
		return "";
	}

	return value.length > 28 ? `${value.slice(0, 28)}...` : value;
}

function parsePingReplies(output: string): PingReply[] {
	return output
		.split("\n")
		.map((line) => line.trim())
		.map((line) => {
			const match = /bytes from\s+(.+):\s+seq=(\d+)\s+ttl=(\d+)\s+time=([0-9.]+)/.exec(line);

			if (!match) {
				return null;
			}

			return {
				host: match[1],
				seq: match[2],
				ttl: match[3],
				time: match[4],
			};
		})
		.filter((entry): entry is PingReply => entry != null);
}

function parsePingSummary(output: string): PingSummary | null {
	for (const line of output.split("\n")) {
		const match = /(\d+)\s+packets transmitted,\s+(\d+)\s+packets received,\s+([0-9.]+%)\s+packet loss/.exec(line);

		if (match) {
			return {
				transmitted: match[1],
				received: match[2],
				loss: match[3],
			};
		}
	}

	return null;
}

function parseTraceHops(output: string): TraceHop[] {
	return output
		.split("\n")
		.map((line) => line.trim())
		.map((line) => {
			const match = /^(\d+)\s+(.+)$/.exec(line);

			if (!match) {
				return null;
			}

			return {
				hop: match[1],
				result: match[2],
			};
		})
		.filter((entry): entry is TraceHop => entry != null);
}

function parseNslookupEntries(output: string): NslookupEntry[] {
	return output
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const match = /^([^:]+):\s*(.+)$/.exec(line);

			if (!match) {
				return {
					field: "message",
					value: line,
				};
			}

			return {
				field: match[1],
				value: match[2],
			};
		});
}

function parseOutputLines(streams: Array<{ stream: string; text: string }>): OutputLine[] {
	const lines: OutputLine[] = [];

	for (const stream of streams) {
		stream.text
			.split("\n")
			.map((line) => line.trimEnd())
			.filter(Boolean)
			.forEach((text, index) => {
				lines.push({
					stream: stream.stream,
					number: index + 1,
					text,
				});
			});
	}

	return lines;
}

function tokenAfter(parts: string[], token: string) {
	const index = parts.indexOf(token);
	return index >= 0 ? (parts[index + 1] ?? "none") : "none";
}

function nftAction(line: string) {
	for (const action of ["accept", "drop", "reject", "masquerade", "return"]) {
		if (new RegExp(`\\b${action}\\b`).test(line)) {
			return action;
		}
	}

	const jump = /\bjump\s+([A-Za-z0-9_.-]+)/.exec(line);
	return jump ? `jump ${jump[1]}` : "rule";
}

function countBy(values: string[]) {
	return values.reduce<Record<string, number>>((counts, value) => {
		counts[value] = (counts[value] ?? 0) + 1;
		return counts;
	}, {});
}

function parseKeyValueLines(output: string) {
	const result: Record<string, string> = {};

	for (const line of output.split("\n")) {
		const match = /^([A-Z0-9_]+)='?(.*?)'?$/.exec(line.trim());
		if (match) {
			result[match[1]] = match[2];
		}
	}

	return result;
}

function parseFilesystems(output: string): FilesystemEntry[] {
	return output
		.split("\n")
		.slice(1)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const [filesystem = "", size = "", used = "", available = "", usePercent = "", ...mountParts] = line.split(/\s+/);
			return {
				filesystem,
				size,
				used,
				available,
				usePercent,
				mountedOn: mountParts.join(" ") || "unknown",
			};
		});
}

function parseFlashPartitions(output: string): FlashPartitionEntry[] {
	return output
		.split("\n")
		.slice(1)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const match = /^(mtd\d+):\s+([0-9a-fA-F]+)\s+([0-9a-fA-F]+)\s+"?([^"]*)"?/.exec(line);
			return {
				device: match?.[1] ?? line,
				size: match?.[2] ?? "unknown",
				eraseSize: match?.[3] ?? "unknown",
				name: match?.[4] ?? "unknown",
			};
		});
}

function storagePercent(storage?: { total?: number; used?: number; free?: number; avail?: number }) {
	const total = storage?.total ?? 0;
	const used = storage?.used ?? Math.max(0, total - (storage?.avail ?? storage?.free ?? 0));

	if (!total) {
		return "unknown";
	}

	return `${Math.round((used / total) * 100)}%`;
}

function formatStorageKiB(value?: number) {
	if (typeof value !== "number") {
		return "unknown";
	}

	const bytes = value * 1024;
	const units = ["B", "KB", "MB", "GB", "TB"];
	const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	const scaled = bytes / 1024 ** index;

	return `${scaled >= 10 || index === 0 ? scaled.toFixed(0) : scaled.toFixed(1)} ${units[index]}`;
}

function TextFileEditor({
	helperText,
	initialText,
	onSave,
	title,
}: {
	helperText: string;
	initialText: string;
	onSave: (text: string) => Promise<{ saved: boolean; message: string }>;
	title: string;
}) {
	const [text, setText] = useState(initialText);
	const [savedText, setSavedText] = useState(initialText);
	const [saving, setSaving] = useState(false);
	const dirty = text !== savedText;

	async function save() {
		setSaving(true);
		const result = await onSave(text);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		toast.success(result.message);
		setSavedText(text);
	}

	return (
		<Panel
			title={
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<span>{title}</span>
					<div className="flex gap-2">
						<Button disabled={!dirty || saving} onClick={() => setText(savedText)} type="button" variant="outline">
							Cancel
						</Button>
						<Button disabled={!dirty || saving} onClick={() => void save()} type="button">
							Save
						</Button>
					</div>
				</div>
			}
		>
			<textarea
				className="min-h-[24rem] w-full rounded-md border bg-card p-3 font-mono text-xs leading-relaxed outline-none focus-visible:border-ring"
				onChange={(event) => setText(event.target.value)}
				spellCheck={false}
				value={text}
			/>
			<p className="mt-2 text-xs text-muted-foreground">{helperText}</p>
		</Panel>
	);
}

function RebootPanel() {
	return (
		<Panel title="Reboot guard">
			<div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
				<p className="text-muted-foreground">
					Reboot will be enabled after a dedicated confirm/apply RPC is added and tested. Use legacy LuCI for now.
				</p>
				<Button disabled variant="outline">
					<Power className="mr-1 size-4" />
					Reboot disabled
				</Button>
			</div>
		</Panel>
	);
}

function TextPanel({ title, text }: { title: string; text: string }) {
	return (
		<Panel
			title={
				<span className="flex items-center gap-2">
					<FileText className="size-4" />
					{title}
				</span>
			}
		>
			<OutputLinesTable
				empty="No output."
				lines={parseOutputLines([{ stream: "output", text }])}
				title="Output"
			/>
		</Panel>
	);
}

function Panel({
	title,
	children,
	flush = false,
}: {
	title: ReactNode;
	children: ReactNode;
	flush?: boolean;
}) {
	return (
		<section className="grid min-w-0 gap-3 border-t pt-4">
			<h2 className="text-base font-semibold">{title}</h2>
			<div className={flush ? "min-w-0" : "min-w-0"}>{children}</div>
		</section>
	);
}

function stateBadge(value?: boolean, yes = "yes", no = "no") {
	return <Badge className={value ? "text-primary" : ""}>{value ? yes : no}</Badge>;
}

function pageTitle(value: string) {
	return value
		.split(/[-_]/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}
