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
	runServiceAction,
	runStartupAction,
	runDiagnostics,
	saveCrontab,
	saveSshKeys,
	type CommandBlock,
	type ConfigSection,
	type InitAction,
	type NativePageData,
	type NativeService,
} from "@/lib/rpc";

type PageMeta = {
	title: string;
	description: string;
	badge?: string;
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
		badge: "partial modern",
	},
};

export function NativePage() {
	const params = useParams();
	const page = params.page ?? "status-routes";
	const meta = pageMeta[page] ?? { title: pageTitle(page), description: "Modern route surface." };
	const [data, setData] = useState<NativePageData | null>(null);
	const loading = !data || data.page !== page;

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

			{page === "diagnostics" ? <DiagnosticsRunner /> : null}
			{page === "packages" ? <LineList title="Installed packages" lines={data?.lines ?? []} /> : null}
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
			{data?.sections?.length ? <ConfigTable sections={data.sections} /> : null}

			<CommandPanels commands={data?.commands ?? []} />
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
			<ConfigTable sections={sections} />
			{logs.map(([name, text]) => (
				<TextPanel key={name} title={pageTitle(name)} text={text} />
			))}
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
	const [tool, setTool] = useState("ping");
	const [target, setTarget] = useState("openwrt.org");
	const [output, setOutput] = useState("");
	const [running, setRunning] = useState(false);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setRunning(true);
		const result = await runDiagnostics(tool, target);
		setOutput(result);
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
						onChange={(event) => setTool(event.target.value)}
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
				{output ? <Preformatted text={output} /> : null}
			</div>
		</Panel>
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

function LineList({ title, lines }: { title: string; lines: string[] }) {
	const [query, setQuery] = useState("");
	const filtered = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return lines.filter((line) => !needle || line.toLowerCase().includes(needle));
	}, [lines, query]);

	return (
		<Panel
			title={
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<span>{title}</span>
					<div className="relative w-full sm:w-72">
						<Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
						<Input className="pl-9" placeholder="Filter" value={query} onChange={(event) => setQuery(event.target.value)} />
					</div>
				</div>
			}
		>
			<div>
				<div className="grid max-h-[28rem] gap-1 overflow-y-auto text-sm">
					{filtered.map((line) => (
						<div className="rounded-md bg-secondary px-3 py-2 font-mono text-xs" key={line}>
							{line}
						</div>
					))}
				</div>
			</div>
		</Panel>
	);
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
			<div>
				<Preformatted text={text} />
			</div>
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

function Preformatted({ text }: { text: string }) {
	return (
		<pre className="max-h-[32rem] overflow-auto rounded-md bg-secondary p-3 text-xs leading-relaxed text-foreground">
			{text}
		</pre>
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
