import { ArrowDown, ArrowUp, Download, ExternalLink, Play, Plus, Power, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	applyFactoryReset,
	applyRestoreBackup,
	confirmReboot,
	createConfigBackup,
	deleteUpnpdActiveRule,
	downloadMtdBlock,
	flashFirmware,
	getNativePage,
	getServiceDetail,
	runAttendedSysupgradePlan,
	runCustomCommand,
	runPackageAction,
	saveAttendedSysupgradeConfig,
	saveAdblockFastConfig,
	saveBanipConfig,
	saveBanipFile,
	saveCustomCommands,
	saveDropbearConfigs,
	saveLedConfig,
	savePackageFeeds,
	saveSysupgradeConfig,
	saveUpnpdConfig,
	stagePackageFile,
	removeUhttpdCertificate,
	saveUhttpdCertificateFile,
	saveUhttpdConfigs,
	validateFirmwareImage,
	validateRestoreBackup,
	runServiceAction,
	runStartupAction,
	runDiagnostics,
	saveCrontab,
	saveRcLocal,
	saveSshKeys,
	searchPackages,
	setRouterPassword,
	type AdblockFastConfigInput,
	type AdblockFastFeed,
	type AttendedSysupgradeConfigInput,
	type AttendedSysupgradePlanAction,
	type AttendedSysupgradePlanResult,
	type BanipConfigInput,
	type CommandBlock,
	type ConfigSection,
	type CustomCommand,
	type CustomCommandResult,
	type DropbearConfigInput,
	type FirmwareFlashOptions,
	type FirmwareValidationResult,
	type InitAction,
	type LedConfigRow,
	type NativePageData,
	type NativeService,
	type PackageActionResult,
	type PackageActionOptions,
	type PackageFeedRow,
	type PackageFileStageResult,
	type PackageSearchResult,
	type RestoreBackupValidationResult,
	type ServiceFile,
	type UpnpdConfigInput,
	type UpnpdActiveRule,
	type UpnpdRule,
	type UhttpdCertificateFileStatus,
	type UhttpdConfigInput,
} from "@/lib/rpc";

type PageMeta = {
	title: string;
	description: string;
};

type PackageEntry = {
	name: string;
	version: string;
	description: string;
	line: string;
};

type PackageUpgradeEntry = {
	name: string;
	installed: string;
	available: string;
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

const nativeFirmwareUploadLimit = 64 * 1024 * 1024;
const packageUploadLimit = 16 * 1024 * 1024;

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

const LED_TRIGGERS = [
	{ value: "none", label: "Always off" },
	{ value: "default-on", label: "Always on" },
	{ value: "timer", label: "Custom flash interval" },
	{ value: "heartbeat", label: "Heartbeat interval" },
	{ value: "netdev", label: "Network device activity" },
];

const LED_NETDEV_MODES = [
	{ value: "link", label: "Link" },
	{ value: "link_10", label: "10M" },
	{ value: "link_100", label: "100M" },
	{ value: "link_1000", label: "1G" },
	{ value: "link_2500", label: "2.5G" },
	{ value: "link_5000", label: "5G" },
	{ value: "link_10000", label: "10G" },
	{ value: "half_duplex", label: "Half duplex" },
	{ value: "full_duplex", label: "Full duplex" },
	{ value: "tx", label: "Transmit" },
	{ value: "rx", label: "Receive" },
];

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
	},
	diagnostics: {
		title: "Diagnostics",
		description: "Run ping, traceroute, and DNS lookup without leaving the modern shell.",
	},
	attendedsysupgrade: {
		title: "Attended sysupgrade",
		description: "Firmware compatibility context and helper configuration. Image building and flashing remain guarded.",
	},
	"attendedsysupgrade-config": {
		title: "Attended sysupgrade configuration",
		description: "Native settings editor for the installed LuCI attended sysupgrade configuration form.",
	},
	packages: {
		title: "Software",
		description: "Installed package inventory. Package install and removal remain in legacy LuCI for now.",
	},
	startup: {
		title: "Startup",
		description: "Init scripts and current enabled/running state.",
	},
	crontab: {
		title: "Scheduled tasks",
		description: "Edit root scheduled tasks and reload cron from the modern shell.",
	},
	sshkeys: {
		title: "SSH keys",
		description: "Edit Dropbear authorized keys without leaving the modern shell.",
	},
	password: {
		title: "Router password",
		description: "Change the root password used for router administration.",
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
	},
	reboot: {
		title: "Reboot",
		description: "Guarded reboot surface with exact hostname confirmation.",
	},
	services: {
		title: "Services",
		description: "Installed service overview with modern status and configuration summaries.",
	},
};

export function NativePage() {
	const params = useParams();
	const page = params.page ?? "status-routes";
	const dataPage = page === "attendedsysupgrade-config" ? "attendedsysupgrade" : page;
	const meta = pageMeta[page] ?? { title: pageTitle(page), description: "Modern route surface." };
	const [data, setData] = useState<NativePageData | null>(null);

	useEffect(() => {
		let cancelled = false;

		void getNativePage(dataPage).then((nextData) => {
			if (!cancelled) {
				setData(nextData);
			}
		});

		return () => {
			cancelled = true;
		};
	}, [dataPage]);

	return (
		<div className="mx-auto grid w-full max-w-7xl gap-5">
			<PageHeader meta={meta} />

			{page === "status-routes" && data ? <RoutingSummary data={data} /> : null}
			{page === "firewall-status" && data ? <NftablesSummary data={data} /> : null}
			{page === "logs" && data ? <LogSummary data={data} /> : null}
			{page === "processes" && data ? <ProcessSummary data={data} /> : null}
			{page === "connections" && data ? <ConnectionSummary data={data} /> : null}
			{page === "wireless" && data ? <WirelessSummary data={data} /> : null}
			{page === "diagnostics" && data ? <DiagnosticsSummary data={data} /> : null}
			{page === "diagnostics" ? <DiagnosticsRunner /> : null}
			{page === "packages" && data ? <PackageInventory data={data} /> : null}
			{page === "attendedsysupgrade" && data ? <AttendedSysupgradeSummary data={data} /> : null}
			{page === "attendedsysupgrade-config" && data ? <AttendedSysupgradeConfigSummary data={data} /> : null}
			{page === "startup" ? <StartupTable services={data?.services ?? []} /> : null}
			{page === "startup" && data?.page === "startup" ? (
				<TextFileEditor
					helperText="Saving writes `/etc/rc.local`. Commands run once after system init reaches local startup."
					initialText={data.text || ""}
					onSave={saveRcLocal}
					title="Local startup"
				/>
			) : null}
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
			{page === "password" ? <PasswordPanel /> : null}
			{page === "services" ? <ServiceOverview services={data?.services ?? []} /> : null}
			{page === "reboot" ? <RebootPanel data={data} /> : null}
			{page === "flash" && data ? <FlashSummary data={data} /> : null}
			{page === "repokeys" && data ? <RepoKeySummary data={data} /> : null}
			{page === "leds" && data ? <LedSummary data={data} /> : null}
			{data?.sections?.length ? <ConfigTable sections={data.sections} /> : null}
		</div>
	);
}

export function NativeServicePage() {
	const params = useParams();
	const service = params.service ?? "";
	const focus = params.focus ?? "";
	const [detail, setDetail] = useState<NativeService | null>(null);
	const focusMeta = serviceFocusMeta(service, focus);

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
	const focusedFiles = focusMeta?.fileTitles
		? (detail?.files ?? []).filter((file) => focusMeta.fileTitles?.includes(file.title))
		: [];

	return (
		<div className="mx-auto grid w-full max-w-7xl gap-5">
			<PageHeader
				meta={{
					title: focusMeta ? `${detail?.title ?? pageTitle(service)} ${focusMeta.title}` : (detail?.title ?? pageTitle(service)),
					description: focusMeta?.description ?? "Modern service status and configuration summary. Advanced editing remains in legacy LuCI.",
				}}
			/>
			{detail?.init ? <ServiceStateCard service={detail} /> : null}
			{focusMeta?.fileTitles ? <ServiceFileTables files={focusedFiles} /> : null}
			{focusMeta?.policyOnly && detail ? <ServiceSpecificSummary service={detail} /> : null}
			{focusMeta?.logsOnly ? <ServiceLogTables logs={detail?.logs ?? {}} /> : null}
			{!focusMeta && detail?.id === "commands" ? <CustomCommandsPanel commands={detail.customCommands ?? []} /> : null}
			{!focusMeta && detail ? <ServiceSpecificSummary service={detail} /> : null}
			{!focusMeta ? <ServiceFileTables files={detail?.files ?? []} /> : null}
			{!focusMeta ? <ConfigTable sections={sections} /> : null}
			{!focusMeta ? <ServiceLogTables logs={detail?.logs ?? {}} /> : null}
		</div>
	);
}

function serviceFocusMeta(service: string, focus: string) {
	if (service !== "banip") {
		return null;
	}

	const focusMap: Record<string, { description: string; fileTitles?: string[]; logsOnly?: boolean; policyOnly?: boolean; title: string }> = {
		allowlist: {
			title: "allowlist",
			description: "Native editor for the banIP allowlist file with service reload on save.",
			fileTitles: ["Allowlist"],
		},
		blocklist: {
			title: "blocklist",
			description: "Native editor for the banIP blocklist file with service reload on save.",
			fileTitles: ["Blocklist"],
		},
		feeds: {
			title: "custom feeds",
			description: "Native editor for the banIP custom feed file with service reload on save.",
			fileTitles: ["Custom feeds"],
		},
		setreport: {
			title: "reporting",
			description: "banIP policy and reporting context from UCI. Report editing remains in LuCI compat until full parity is complete.",
			policyOnly: true,
		},
		firewall_log: {
			title: "firewall log",
			description: "banIP service activity from the router log. Full firewall log workflow remains in LuCI compat.",
			logsOnly: true,
		},
		processing_log: {
			title: "processing log",
			description: "banIP processing activity from the router log. Full processing log workflow remains in LuCI compat.",
			logsOnly: true,
		},
	};

	return focusMap[focus] ?? null;
}

function ServiceFileTables({ files }: { files: ServiceFile[] }) {
	if (!files.length) {
		return null;
	}

	return (
		<div className="grid gap-4">
			<Panel title="Service files" flush>
				<div className="overflow-x-auto">
					<table className="w-full min-w-[50rem] text-left text-sm">
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
									<td className="px-3 py-3">
										<Badge className={file.exists ? "text-primary" : "text-muted-foreground"}>
											{file.exists ? "present" : "missing"}
										</Badge>
									</td>
									<td className="px-3 py-3 font-mono text-xs">{file.lines}</td>
									<td className="px-3 py-3 font-mono text-xs">{formatBytes(file.size)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Panel>
			{files
				.filter((file) => !file.editable && file.preview.length)
				.map((file) => (
					<OutputLinesTable
						empty="No preview lines."
						key={file.path}
						lines={file.preview.map((line, index) => ({
							stream: file.title,
							number: index + 1,
							text: line,
						}))}
						title={`${file.title} preview`}
					/>
				))}
			{files
				.filter((file) => file.editable)
				.map((file) => (
					<ServiceFileEditor file={file} key={file.path} />
				))}
		</div>
	);
}

function ServiceFileEditor({ file }: { file: ServiceFile }) {
	const initial = file.content ?? file.preview.join("\n");
	const [text, setText] = useState(initial);
	const [savedText, setSavedText] = useState(initial);
	const [savedFile, setSavedFile] = useState(file);
	const [saving, setSaving] = useState(false);
	const dirty = text !== savedText;

	async function save() {
		setSaving(true);
		const result = await saveBanipFile(savedFile.path, text);
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
		<Panel
			title={`${savedFile.title} editor`}
			actions={
				<div className="flex gap-2">
					<Button disabled={!dirty || saving} onClick={() => setText(savedText)} size="sm" type="button" variant="outline">
						Cancel
					</Button>
					<Button disabled={!dirty || saving} onClick={() => void save()} size="sm" type="button">
						Save
					</Button>
				</div>
			}
		>
			<div className="grid gap-3">
				<p className="font-mono text-xs text-muted-foreground">{savedFile.path}</p>
				<textarea
					className="min-h-72 rounded-md border bg-card px-3 py-2 font-mono text-xs outline-none focus-visible:border-ring"
					onChange={(event) => setText(event.target.value)}
					spellCheck={false}
					value={text}
				/>
			</div>
		</Panel>
	);
}

function ServiceLogTables({ logs }: { logs: Record<string, string> }) {
	const entries = Object.entries(logs)
		.map(([name, text]) => ({ name, entries: parseSystemLogs(text) }))
		.filter((log) => log.entries.length);

	if (!entries.length) {
		return null;
	}

	return (
		<div className="grid gap-4">
			{entries.map((log) => (
				<LogTable entries={log.entries} key={log.name} title={`${pageTitle(log.name)} log`} />
			))}
		</div>
	);
}

function CustomCommandsPanel({ commands }: { commands: CustomCommand[] }) {
	const [rows, setRows] = useState(() => commands.map(normalizeCustomCommand));
	const [savedRows, setSavedRows] = useState(rows);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

	function updateRow(index: number, field: keyof CustomCommand, value: string | boolean) {
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
				id: "",
				name: "",
				command: "",
				param: false,
				public: false,
			},
		]);
	}

	function removeRow(index: number) {
		setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await saveCustomCommands(rows);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextRows = result.commands.map(normalizeCustomCommand);
		toast.success(result.message);
		setRows(nextRows);
		setSavedRows(nextRows);
	}

	return (
		<Panel title="Commands" flush>
			<div className="grid gap-3">
				<form className="grid gap-3 px-3 pt-3" onSubmit={(event) => void submit(event)}>
					<div className="overflow-x-auto">
						<table className="w-full min-w-[62rem] text-left text-sm">
							<thead className="border-b text-xs uppercase text-muted-foreground">
								<tr>
									<th className="px-3 py-2 font-medium">Name</th>
									<th className="px-3 py-2 font-medium">Command</th>
									<th className="px-3 py-2 font-medium">Arguments</th>
									<th className="px-3 py-2 font-medium">Public</th>
									<th className="px-3 py-2 text-right font-medium">Actions</th>
								</tr>
							</thead>
							<tbody>
								{rows.length ? (
									rows.map((row, index) => (
										<tr className="border-b align-top last:border-0" key={`${row.id || "new"}.${index}`}>
											<td className="px-3 py-3">
												<Input
													aria-label="Command name"
													onChange={(event) => updateRow(index, "name", event.target.value)}
													value={row.name}
												/>
											</td>
											<td className="px-3 py-3">
												<Input
													aria-label="Command"
													onChange={(event) => updateRow(index, "command", event.target.value)}
													value={row.command}
												/>
											</td>
											<td className="px-3 py-3">
												<input
													aria-label="Accept arguments"
													checked={row.param}
													className="size-4"
													onChange={(event) => updateRow(index, "param", event.target.checked)}
													type="checkbox"
												/>
											</td>
											<td className="px-3 py-3">
												<input
													aria-label="Public command"
													checked={row.public}
													className="size-4"
													onChange={(event) => updateRow(index, "public", event.target.checked)}
													type="checkbox"
												/>
											</td>
											<td className="px-3 py-3 text-right">
												<Button
													aria-label={`Remove ${row.name || "command"}`}
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
										<td className="px-3 py-6 text-muted-foreground" colSpan={5}>
											No custom commands are configured.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
					<div className="flex justify-between gap-2 pb-3">
						<Button onClick={addRow} type="button" variant="outline">
							<Plus className="size-4" />
							Add command
						</Button>
						<div className="flex gap-2">
							<Button disabled={!dirty || saving} onClick={() => setRows(savedRows)} type="button" variant="outline">
								Cancel
							</Button>
							<Button disabled={!dirty || saving} type="submit">
								Save
							</Button>
						</div>
					</div>
				</form>
				{savedRows.filter((command) => command.id && command.command).map((command) => (
					<CustomCommandRunner command={command} key={command.id} />
				))}
			</div>
		</Panel>
	);
}

function normalizeCustomCommand(command: CustomCommand): CustomCommand {
	return {
		id: command.id ?? "",
		name: command.name ?? "",
		command: command.command ?? "",
		param: Boolean(command.param),
		public: Boolean(command.public),
	};
}

function UpnpdActiveRulesTable({
	deleting,
	onDelete,
	rules,
}: {
	deleting: string | null;
	onDelete: (token: string) => void | Promise<void>;
	rules: UpnpdActiveRule[];
}) {
	return (
		<div className="overflow-x-auto rounded-md border">
			<table className="w-full min-w-[52rem] text-left text-sm">
				<thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
					<tr>
						<th className="px-3 py-2 font-medium">Client</th>
						<th className="px-3 py-2 font-medium">Address</th>
						<th className="px-3 py-2 font-medium">Ports</th>
						<th className="px-3 py-2 font-medium">Protocol</th>
						<th className="px-3 py-2 font-medium">Expires</th>
						<th className="px-3 py-2 font-medium">Description</th>
						<th className="w-12 px-3 py-2" />
					</tr>
				</thead>
				<tbody>
					{rules.length ? (
						rules.map((rule, index) => {
							const token = String(rule.num ?? "");
							return (
								<tr className="border-b last:border-0" key={`${token}.${index}`}>
									<td className="px-3 py-2">{rule.host_hint || "Unknown"}</td>
									<td className="px-3 py-2 font-mono text-xs text-muted-foreground">{rule.intaddr || "unknown"}</td>
									<td className="px-3 py-2">
										{String(rule.intport ?? "unknown")} → {String(rule.extport ?? "unknown")}
									</td>
									<td className="px-3 py-2">{rule.proto || "unknown"}</td>
									<td className="px-3 py-2">{formatDuration(Number(rule.expires ?? 0))}</td>
									<td className="px-3 py-2">{rule.descr || "none"}</td>
									<td className="px-3 py-2 text-right">
										<Button
											aria-label="Delete active port map"
											disabled={!token || deleting === token}
											onClick={() => void onDelete(token)}
											size="icon"
											type="button"
											variant="ghost"
										>
											<Trash2 className="size-4" />
										</Button>
									</td>
								</tr>
							);
						})
					) : (
						<tr>
							<td className="px-3 py-6 text-muted-foreground" colSpan={7}>
								No active UPnP port maps.
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}

function DefaultSelect({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
	return (
		<label className="grid gap-2 text-sm">
			<span className="font-medium">{label}</span>
			<select className="h-9 rounded-md border bg-card px-2 text-sm" onChange={(event) => onChange(event.target.value)} value={value}>
				<option value="">default</option>
				<option value="1">enabled</option>
				<option value="0">disabled</option>
			</select>
		</label>
	);
}

function formatDuration(seconds: number) {
	if (!Number.isFinite(seconds) || seconds <= 0) {
		return "none";
	}

	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const remainingSeconds = Math.floor(seconds % 60);

	if (hours) {
		return `${hours}h ${minutes.toString().padStart(2, "0")}m ${remainingSeconds.toString().padStart(2, "0")}s`;
	}

	if (minutes) {
		return `${minutes}m ${remainingSeconds.toString().padStart(2, "0")}s`;
	}

	return `${remainingSeconds}s`;
}

function CustomCommandRunner({ command }: { command: CustomCommand }) {
	const [args, setArgs] = useState("");
	const [running, setRunning] = useState(false);
	const [result, setResult] = useState<CustomCommandResult | null>(null);
	const publicLinks = command.public ? customCommandPublicLinks(command.id, args) : null;

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
			{publicLinks ? (
				<div className="flex flex-wrap gap-2 text-xs">
					<a className="inline-flex h-8 items-center gap-2 rounded-md border bg-card px-2.5 font-medium hover:bg-secondary" href={publicLinks.display} target="_blank" rel="noreferrer">
						<ExternalLink className="size-3.5" />
						Public display
					</a>
					<a className="inline-flex h-8 items-center gap-2 rounded-md border bg-card px-2.5 font-medium hover:bg-secondary" href={publicLinks.download} target="_blank" rel="noreferrer">
						<Download className="size-3.5" />
						Public download
					</a>
				</div>
			) : null}
			{result ? (
				<div className="grid gap-2">
					<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
						<Badge className={result.exitcode === 0 ? "text-primary" : ""}>exit {result.exitcode}</Badge>
						<span className="break-all font-mono">{result.command}</span>
						{!result.binary ? (
							<Button onClick={() => downloadCommandResult(command, result)} size="sm" type="button" variant="outline">
								<Download className="size-3.5" />
								Download
							</Button>
						) : null}
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

function customCommandPublicLinks(id: string, args: string) {
	const path = window.location.pathname.replace(/\/admin(?:\/.*)?$/, "") || "/cgi-bin/luci";
	const query = args ? `?args=${encodeURIComponent(args)}` : "";
	const encodedId = encodeURIComponent(id);

	return {
		download: `${window.location.origin}${path}/command/${encodedId}${query}`,
		display: `${window.location.origin}${path}/command/${encodedId}s${query}`,
	};
}

function downloadCommandResult(command: CustomCommand, result: CustomCommandResult) {
	const text = [
		`Command: ${result.command}`,
		`Exit: ${result.exitcode}`,
		"",
		"STDOUT",
		result.stdout || "",
		"",
		"STDERR",
		result.stderr || "",
	].join("\n");
	const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");

	anchor.href = url;
	anchor.download = `${safeDownloadName(command.name || command.id || "command")}.txt`;
	document.body.append(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}

function safeDownloadName(value: string) {
	return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "command";
}

function PageHeader({ meta }: { meta: PageMeta }) {
	return (
		<header className="min-w-0">
			<div className="min-w-0">
				<h1 className="text-2xl font-semibold">{meta.title}</h1>
				<p className="text-sm text-muted-foreground">{meta.description}</p>
			</div>
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

function ServiceSpecificSummary({ service }: { service: NativeService }) {
	const sections = service.sections ?? [];

	if (service.id === "adblock-fast") {
		const config = firstSection(sections, "adblock-fast");
		const feeds = sections.filter((section) => section.type === "file_url");
		const enabledFeeds = feeds.filter((section) => section.values.enabled !== "0").length;

		return (
			<div className="grid gap-4">
				<div className="grid gap-3 sm:grid-cols-3">
					<MetricBlock label="Configured feeds" value={feeds.length} />
					<MetricBlock label="Enabled feeds" value={enabledFeeds} />
					<MetricBlock label="DNS backend" value={configValue(config, "dns") || "unknown"} />
				</div>
				<AdblockFastPanel config={config} feeds={feeds} />
			</div>
		);
	}

	if (service.id === "banip") {
		const global = firstSection(sections, "banip");

		return (
			<div className="grid gap-4">
				<div className="grid gap-3 sm:grid-cols-3">
					<MetricBlock label="Feeds" value={joinConfigValue(global?.values.ban_feed) || "none"} />
					<MetricBlock label="Countries" value={joinConfigValue(global?.values.ban_country) || "none"} />
					<MetricBlock label="Block policy" value={configValue(global, "ban_blockpolicy") || "unknown"} />
				</div>
				<BanipPanel config={global} />
			</div>
		);
	}

	if (service.id === "upnpd") {
		const config = firstSection(sections, "upnpd");
		const rules = sections.filter((section) => section.type === "perm_rule");

		return (
			<div className="grid gap-4">
				<div className="grid gap-3 sm:grid-cols-3">
					<MetricBlock label="Enabled" value={enabledText(configValue(config, "enabled"))} />
					<MetricBlock label="Interface" value={configValue(config, "internal_iface") || "unknown"} />
					<MetricBlock label="Permission rules" value={rules.length} />
				</div>
				<UpnpdAccessPanel activeRules={service.upnpActiveRules ?? []} config={config} rules={rules} />
			</div>
		);
	}

	if (service.id === "dropbear") {
		const configs = sections.filter((section) => section.type === "dropbear");

		return <DropbearAccessPanel configs={configs} />;
	}

	if (service.id === "uhttpd") {
		const configs = sections.filter((section) => section.type === "uhttpd");
		const main = configs[0];
		const cert = firstSection(sections, "cert");

		return (
			<div className="grid gap-4">
				<div className="grid gap-3 sm:grid-cols-3">
					<MetricBlock label="HTTP" value={joinConfigValue(main?.values.listen_http) || "none"} />
					<MetricBlock label="HTTPS" value={joinConfigValue(main?.values.listen_https) || "none"} />
					<MetricBlock label="Redirect HTTPS" value={enabledText(configValue(main, "redirect_https"))} />
				</div>
				<UhttpdAccessPanel cert={cert} configs={configs} />
			</div>
		);
	}

	return null;
}

function BanipPanel({ config }: { config: ConfigSection | undefined }) {
	const initial = useMemo(() => banipConfigValues(config), [config]);
	const [values, setValues] = useState(initial);
	const [savedValues, setSavedValues] = useState(initial);
	const [section, setSection] = useState(config);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(values) !== JSON.stringify(savedValues);
	const current = section ?? config;

	function update<K extends keyof BanipConfigInput>(key: K, value: BanipConfigInput[K]) {
		setValues((currentValues) => ({ ...currentValues, [key]: value }));
	}

	async function save() {
		setSaving(true);
		const result = await saveBanipConfig(values);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextSection = result.section ?? current;
		const nextValues = banipConfigValues(nextSection);
		setSection(nextSection);
		setValues(nextValues);
		setSavedValues(nextValues);
		toast.success(result.message);
	}

	return (
		<Panel title="banIP policy">
			<div className="grid gap-5">
				<div className="grid gap-3 md:grid-cols-3">
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Enabled</span>
						<select
							className="h-9 rounded-md border bg-card px-2 text-sm"
							onChange={(event) => update("ban_enabled", event.target.value)}
							value={values.ban_enabled}
						>
							<option value="1">enabled</option>
							<option value="0">disabled</option>
						</select>
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Autodetect</span>
						<select
							className="h-9 rounded-md border bg-card px-2 text-sm"
							onChange={(event) => update("ban_autodetect", event.target.value)}
							value={values.ban_autodetect}
						>
							<option value="1">enabled</option>
							<option value="0">disabled</option>
						</select>
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Allowlist only</span>
						<select
							className="h-9 rounded-md border bg-card px-2 text-sm"
							onChange={(event) => update("ban_allowlistonly", event.target.value)}
							value={values.ban_allowlistonly}
						>
							<option value="0">disabled</option>
							<option value="1">enabled</option>
						</select>
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Auto allowlist</span>
						<select
							className="h-9 rounded-md border bg-card px-2 text-sm"
							onChange={(event) => update("ban_autoallowlist", event.target.value)}
							value={values.ban_autoallowlist}
						>
							<option value="1">enabled</option>
							<option value="0">disabled</option>
						</select>
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Auto blocklist</span>
						<select
							className="h-9 rounded-md border bg-card px-2 text-sm"
							onChange={(event) => update("ban_autoblocklist", event.target.value)}
							value={values.ban_autoblocklist}
						>
							<option value="1">enabled</option>
							<option value="0">disabled</option>
						</select>
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Block policy</span>
						<select
							className="h-9 rounded-md border bg-card px-2 text-sm"
							onChange={(event) => update("ban_blockpolicy", event.target.value)}
							value={values.ban_blockpolicy}
						>
							<option value="drop">drop</option>
							<option value="reject">reject</option>
						</select>
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">IPv4</span>
						<select
							className="h-9 rounded-md border bg-card px-2 text-sm"
							onChange={(event) => update("ban_protov4", event.target.value)}
							value={values.ban_protov4}
						>
							<option value="1">enabled</option>
							<option value="0">disabled</option>
						</select>
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">IPv6</span>
						<select
							className="h-9 rounded-md border bg-card px-2 text-sm"
							onChange={(event) => update("ban_protov6", event.target.value)}
							value={values.ban_protov6}
						>
							<option value="1">enabled</option>
							<option value="0">disabled</option>
						</select>
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">nft policy</span>
						<select
							className="h-9 rounded-md border bg-card px-2 text-sm"
							onChange={(event) => update("ban_nftpolicy", event.target.value)}
							value={values.ban_nftpolicy}
						>
							<option value="memory">memory</option>
							<option value="performance">performance</option>
						</select>
					</label>
				</div>

				<div className="grid gap-3 md:grid-cols-3">
					<label className="grid gap-2 text-sm">
						<span className="font-medium">nft priority</span>
						<Input inputMode="numeric" onChange={(event) => update("ban_nftpriority", event.target.value)} value={values.ban_nftpriority} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">nft log level</span>
						<Input onChange={(event) => update("ban_nftloglevel", event.target.value)} value={values.ban_nftloglevel} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Log limit</span>
						<Input inputMode="numeric" onChange={(event) => update("ban_loglimit", event.target.value)} value={values.ban_loglimit} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Fetch retries</span>
						<Input inputMode="numeric" onChange={(event) => update("ban_fetchretry", event.target.value)} value={values.ban_fetchretry} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">ICMP limit</span>
						<Input inputMode="numeric" onChange={(event) => update("ban_icmplimit", event.target.value)} value={values.ban_icmplimit} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">SYN limit</span>
						<Input inputMode="numeric" onChange={(event) => update("ban_synlimit", event.target.value)} value={values.ban_synlimit} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">UDP limit</span>
						<Input inputMode="numeric" onChange={(event) => update("ban_udplimit", event.target.value)} value={values.ban_udplimit} />
					</label>
				</div>

				<div className="grid gap-3 md:grid-cols-2">
					<BanipTextarea label="Feeds" onChange={(value) => update("ban_feed", value)} value={values.ban_feed} />
					<BanipTextarea label="Countries" onChange={(value) => update("ban_country", value)} value={values.ban_country} />
					<BanipTextarea label="Trigger interfaces" onChange={(value) => update("ban_trigger", value)} value={values.ban_trigger} />
					<BanipTextarea label="Devices" onChange={(value) => update("ban_dev", value)} value={values.ban_dev} />
					<BanipTextarea label="IPv4 interfaces" onChange={(value) => update("ban_ifv4", value)} value={values.ban_ifv4} />
					<BanipTextarea label="IPv6 interfaces" onChange={(value) => update("ban_ifv6", value)} value={values.ban_ifv6} />
					<BanipTextarea label="Log terms" onChange={(value) => update("ban_logterm", value)} value={values.ban_logterm} />
				</div>

				<div className="flex justify-end gap-2">
					<Button disabled={!dirty || saving} onClick={() => setValues(savedValues)} type="button" variant="outline">
						Cancel
					</Button>
					<Button disabled={!dirty || saving} onClick={() => void save()} type="button">
						Save
					</Button>
				</div>
			</div>
		</Panel>
	);
}

function BanipTextarea({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
	return (
		<label className="grid gap-2 text-sm">
			<span className="font-medium">{label}</span>
			<textarea
				className="min-h-24 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
				onChange={(event) => onChange(event.target.value)}
				spellCheck={false}
				value={value}
			/>
		</label>
	);
}

function AdblockFastPanel({ config, feeds }: { config: ConfigSection | undefined; feeds: ConfigSection[] }) {
	const initialConfig = useMemo(() => adblockFastConfigValues(config), [config]);
	const initialFeeds = useMemo(() => feeds.map(adblockFastFeedValues), [feeds]);
	const [values, setValues] = useState(initialConfig);
	const [savedValues, setSavedValues] = useState(initialConfig);
	const [feedRows, setFeedRows] = useState(initialFeeds);
	const [savedFeedRows, setSavedFeedRows] = useState(initialFeeds);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(values) !== JSON.stringify(savedValues) || JSON.stringify(feedRows) !== JSON.stringify(savedFeedRows);

	function update<K extends keyof AdblockFastConfigInput>(key: K, value: AdblockFastConfigInput[K]) {
		setValues((current) => ({ ...current, [key]: value }));
	}

	function updateFeed(index: number, field: keyof AdblockFastFeed, value: string) {
		setFeedRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
	}

	function addFeed() {
		setFeedRows((current) => [
			...current,
			{
				section: "",
				enabled: "1",
				action: "block",
				name: "",
				url: "",
				size: "",
			},
		]);
	}

	function removeFeed(index: number) {
		setFeedRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
	}

	function moveFeed(index: number, direction: -1 | 1) {
		setFeedRows((current) => {
			const nextIndex = index + direction;

			if (nextIndex < 0 || nextIndex >= current.length) {
				return current;
			}

			const next = [...current];
			const [row] = next.splice(index, 1);
			next.splice(nextIndex, 0, row);
			return next;
		});
	}

	function reset() {
		setValues(savedValues);
		setFeedRows(savedFeedRows);
	}

	async function save() {
		setSaving(true);
		const result = await saveAdblockFastConfig(values, feedRows.map(normalizeAdblockFastFeed));
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextValues = adblockFastConfigValues(result.config ?? config);
		const nextFeeds = result.feeds.map(normalizeAdblockFastFeed);
		setValues(nextValues);
		setSavedValues(nextValues);
		setFeedRows(nextFeeds);
		setSavedFeedRows(nextFeeds);
		toast.success(result.message);
	}

	return (
		<Panel title="AdBlock Fast settings">
			<div className="grid gap-5">
				<div className="grid gap-3 md:grid-cols-3">
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Enabled</span>
						<select
							className="h-9 rounded-md border bg-card px-2 text-sm"
							onChange={(event) => update("enabled", event.target.value)}
							value={values.enabled}
						>
							<option value="1">enabled</option>
							<option value="0">disabled</option>
						</select>
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">DNS backend</span>
						<Input onChange={(event) => update("dns", event.target.value)} value={values.dns} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Parallel downloads</span>
						<Input inputMode="numeric" onChange={(event) => update("parallel_downloads", event.target.value)} value={values.parallel_downloads} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Force DNS</span>
						<select
							className="h-9 rounded-md border bg-card px-2 text-sm"
							onChange={(event) => update("force_dns", event.target.value)}
							value={values.force_dns}
						>
							<option value="1">enabled</option>
							<option value="0">disabled</option>
						</select>
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Auto update</span>
						<select
							className="h-9 rounded-md border bg-card px-2 text-sm"
							onChange={(event) => update("auto_update_enabled", event.target.value)}
							value={values.auto_update_enabled}
						>
							<option value="0">disabled</option>
							<option value="1">enabled</option>
						</select>
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Verbosity</span>
						<select
							className="h-9 rounded-md border bg-card px-2 text-sm"
							onChange={(event) => update("verbosity", event.target.value)}
							value={values.verbosity}
						>
							<option value="0">quiet</option>
							<option value="1">normal</option>
							<option value="2">verbose</option>
						</select>
					</label>
				</div>

				<div className="grid gap-3 md:grid-cols-3">
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Config update</span>
						<select className="h-9 rounded-md border bg-card px-2 text-sm" onChange={(event) => update("config_update_enabled", event.target.value)} value={values.config_update_enabled}>
							<option value="0">disabled</option>
							<option value="1">enabled</option>
						</select>
					</label>
					<label className="grid gap-2 text-sm md:col-span-2">
						<span className="font-medium">Config update URL</span>
						<Input onChange={(event) => update("config_update_url", event.target.value)} value={values.config_update_url} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">IPv6 lists</span>
						<select className="h-9 rounded-md border bg-card px-2 text-sm" onChange={(event) => update("ipv6_enabled", event.target.value)} value={values.ipv6_enabled}>
							<option value="0">disabled</option>
							<option value="1">enabled</option>
						</select>
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Download timeout</span>
						<Input inputMode="numeric" onChange={(event) => update("download_timeout", event.target.value)} value={values.download_timeout} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Pause timeout</span>
						<Input inputMode="numeric" onChange={(event) => update("pause_timeout", event.target.value)} value={values.pause_timeout} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Curl retry</span>
						<Input inputMode="numeric" onChange={(event) => update("curl_retry", event.target.value)} value={values.curl_retry} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Curl max file size</span>
						<Input inputMode="numeric" onChange={(event) => update("curl_max_file_size", event.target.value)} value={values.curl_max_file_size} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Compressed cache</span>
						<select className="h-9 rounded-md border bg-card px-2 text-sm" onChange={(event) => update("compressed_cache", event.target.value)} value={values.compressed_cache}>
							<option value="0">disabled</option>
							<option value="1">enabled</option>
						</select>
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Cache directory</span>
						<Input onChange={(event) => update("compressed_cache_dir", event.target.value)} value={values.compressed_cache_dir} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">dnsmasq sanity check</span>
						<select className="h-9 rounded-md border bg-card px-2 text-sm" onChange={(event) => update("dnsmasq_sanity_check", event.target.value)} value={values.dnsmasq_sanity_check}>
							<option value="1">enabled</option>
							<option value="0">disabled</option>
						</select>
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">dnsmasq domain validation</span>
						<select className="h-9 rounded-md border bg-card px-2 text-sm" onChange={(event) => update("dnsmasq_validity_check", event.target.value)} value={values.dnsmasq_validity_check}>
							<option value="0">disabled</option>
							<option value="1">enabled</option>
						</select>
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Debug init script</span>
						<select className="h-9 rounded-md border bg-card px-2 text-sm" onChange={(event) => update("debug_init_script", event.target.value)} value={values.debug_init_script}>
							<option value="0">disabled</option>
							<option value="1">enabled</option>
						</select>
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Status LED</span>
						<Input onChange={(event) => update("led", event.target.value)} value={values.led} />
					</label>
					<label className="grid gap-2 text-sm md:col-span-2">
						<span className="font-medium">RPC token</span>
						<Input onChange={(event) => update("rpcd_token", event.target.value)} value={values.rpcd_token} />
					</label>
				</div>

				<div className="grid gap-3 md:grid-cols-2">
					<label className="grid gap-2 text-sm">
						<span className="font-medium">dnsmasq instances</span>
						<textarea
							className="min-h-24 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
							onChange={(event) => update("dnsmasq_instance", event.target.value)}
							spellCheck={false}
							value={values.dnsmasq_instance}
						/>
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Force DNS ports</span>
						<textarea
							className="min-h-24 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
							onChange={(event) => update("force_dns_port", event.target.value)}
							spellCheck={false}
							value={values.force_dns_port}
						/>
					</label>
					<label className="grid gap-2 text-sm md:col-span-2">
						<span className="font-medium">Dnsmasq config file URL</span>
						<Input onChange={(event) => update("dnsmasq_config_file_url", event.target.value)} value={values.dnsmasq_config_file_url} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Allowed domains</span>
						<textarea
							className="min-h-24 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
							onChange={(event) => update("allowed_domain", event.target.value)}
							spellCheck={false}
							value={values.allowed_domain}
						/>
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Blocked domains</span>
						<textarea
							className="min-h-24 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
							onChange={(event) => update("blocked_domain", event.target.value)}
							spellCheck={false}
							value={values.blocked_domain}
						/>
					</label>
				</div>

				<div className="grid gap-3">
					<div className="flex items-center justify-between gap-3">
						<h3 className="text-sm font-medium">Feed sources</h3>
						<Button onClick={addFeed} size="sm" type="button" variant="outline">
							<Plus className="mr-1.5 size-3.5" />
							Add feed
						</Button>
					</div>
					<div className="overflow-x-auto rounded-md border">
						<table className="w-full min-w-[56rem] text-left text-sm">
							<thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
								<tr>
									<th className="px-3 py-2 font-medium">Enabled</th>
									<th className="px-3 py-2 font-medium">Action</th>
									<th className="px-3 py-2 font-medium">Name</th>
									<th className="px-3 py-2 font-medium">URL</th>
									<th className="px-3 py-2 font-medium">Size</th>
									<th className="px-3 py-2 text-right font-medium">Order</th>
									<th className="w-12 px-3 py-2" />
								</tr>
							</thead>
							<tbody>
								{feedRows.length ? (
									feedRows.map((feed, index) => (
										<tr className="border-b last:border-0" key={`${feed.section || "new"}.${index}`}>
											<td className="px-3 py-2">
												<select
													className="h-9 w-full rounded-md border bg-card px-2 text-sm"
													onChange={(event) => updateFeed(index, "enabled", event.target.value)}
													value={feed.enabled}
												>
													<option value="1">enabled</option>
													<option value="0">disabled</option>
												</select>
											</td>
											<td className="px-3 py-2">
												<select
													className="h-9 w-full rounded-md border bg-card px-2 text-sm"
													onChange={(event) => updateFeed(index, "action", event.target.value)}
													value={feed.action}
												>
													<option value="block">block</option>
													<option value="allow">allow</option>
												</select>
											</td>
											<td className="px-3 py-2">
												<Input onChange={(event) => updateFeed(index, "name", event.target.value)} value={feed.name} />
											</td>
											<td className="px-3 py-2">
												<Input onChange={(event) => updateFeed(index, "url", event.target.value)} value={feed.url} />
											</td>
											<td className="px-3 py-2">
												<Input inputMode="numeric" onChange={(event) => updateFeed(index, "size", event.target.value)} value={feed.size} />
											</td>
											<td className="px-3 py-2 text-right">
												<div className="inline-flex gap-1">
													<Button
														aria-label="Move feed up"
														disabled={index === 0}
														onClick={() => moveFeed(index, -1)}
														size="icon"
														type="button"
														variant="ghost"
													>
														<ArrowUp className="size-4" />
													</Button>
													<Button
														aria-label="Move feed down"
														disabled={index === feedRows.length - 1}
														onClick={() => moveFeed(index, 1)}
														size="icon"
														type="button"
														variant="ghost"
													>
														<ArrowDown className="size-4" />
													</Button>
												</div>
											</td>
											<td className="px-3 py-2 text-right">
												<Button aria-label="Remove feed" onClick={() => removeFeed(index)} size="icon" type="button" variant="ghost">
													<Trash2 className="size-4" />
												</Button>
											</td>
										</tr>
									))
								) : (
									<tr>
										<td className="px-3 py-6 text-muted-foreground" colSpan={7}>
											No feed URLs configured.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>

				<div className="flex justify-end gap-2">
					<Button disabled={!dirty || saving} onClick={reset} type="button" variant="outline">
						Cancel
					</Button>
					<Button disabled={!dirty || saving} onClick={() => void save()} type="button">
						Save
					</Button>
				</div>
			</div>
		</Panel>
	);
}

function UpnpdAccessPanel({
	activeRules,
	config,
	rules,
}: {
	activeRules: UpnpdActiveRule[];
	config: ConfigSection | undefined;
	rules: ConfigSection[];
}) {
	const initialConfig = useMemo(() => upnpdConfigValues(config), [config]);
	const initialRules = useMemo(() => rules.map(upnpdRuleValues), [rules]);
	const [values, setValues] = useState(initialConfig);
	const [savedValues, setSavedValues] = useState(initialConfig);
	const [ruleRows, setRuleRows] = useState(initialRules);
	const [savedRuleRows, setSavedRuleRows] = useState(initialRules);
	const [activeRuleRows, setActiveRuleRows] = useState(activeRules);
	const [saving, setSaving] = useState(false);
	const [deletingRule, setDeletingRule] = useState<string | null>(null);
	const dirty = JSON.stringify(values) !== JSON.stringify(savedValues) || JSON.stringify(ruleRows) !== JSON.stringify(savedRuleRows);

	function update<K extends keyof UpnpdConfigInput>(key: K, value: UpnpdConfigInput[K]) {
		setValues((current) => ({ ...current, [key]: value }));
	}

	function updateRule(index: number, field: keyof UpnpdRule, value: string) {
		setRuleRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
	}

	function addRule() {
		setRuleRows((current) => [
			...current,
			{
				section: "",
				action: "allow",
				ext_ports: "1024-65535",
				int_addr: "0.0.0.0/0",
				int_ports: "1024-65535",
				comment: "",
			},
		]);
	}

	function removeRule(index: number) {
		setRuleRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
	}

	function moveRule(index: number, direction: -1 | 1) {
		setRuleRows((current) => {
			const nextIndex = index + direction;

			if (nextIndex < 0 || nextIndex >= current.length) {
				return current;
			}

			const next = [...current];
			const [row] = next.splice(index, 1);
			next.splice(nextIndex, 0, row);
			return next;
		});
	}

	function reset() {
		setValues(savedValues);
		setRuleRows(savedRuleRows);
	}

	async function save() {
		setSaving(true);
		const result = await saveUpnpdConfig(values, ruleRows.map(normalizeUpnpdRule));
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextValues = upnpdConfigValues(result.config ?? config);
		const nextRules = result.rules.map(normalizeUpnpdRule);
		setValues(nextValues);
		setSavedValues(nextValues);
		setRuleRows(nextRules);
		setSavedRuleRows(nextRules);
		setActiveRuleRows(result.activeRules ?? activeRuleRows);
		toast.success(result.message);
	}

	async function deleteActiveRule(token: string) {
		setDeletingRule(token);
		const result = await deleteUpnpdActiveRule(token);
		setDeletingRule(null);

		if (!result.ok) {
			toast.error(result.message);
			return;
		}

		setActiveRuleRows(result.activeRules);
		toast.success(result.message);
	}

	return (
		<Panel title="UPnP settings">
			<div className="grid gap-5">
				<UpnpdActiveRulesTable deleting={deletingRule} onDelete={deleteActiveRule} rules={activeRuleRows} />
				<div className="grid gap-3 md:grid-cols-3">
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Enabled</span>
						<select
							className="h-9 rounded-md border bg-card px-2 text-sm"
							onChange={(event) => update("enabled", event.target.value)}
							value={values.enabled}
						>
							<option value="0">disabled</option>
							<option value="1">enabled</option>
						</select>
					</label>
					<DefaultSelect label="UPnP IGD protocol" onChange={(value) => update("enable_upnp", value)} value={values.enable_upnp} />
					<DefaultSelect label="PCP/NAT-PMP protocols" onChange={(value) => update("enable_natpmp", value)} value={values.enable_natpmp} />
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Internal interface</span>
						<Input onChange={(event) => update("internal_iface", event.target.value)} value={values.internal_iface} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Port</span>
						<Input inputMode="numeric" onChange={(event) => update("port", event.target.value)} value={values.port} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Download kbit/s</span>
						<Input inputMode="numeric" onChange={(event) => update("download", event.target.value)} value={values.download} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Upload kbit/s</span>
						<Input inputMode="numeric" onChange={(event) => update("upload", event.target.value)} value={values.upload} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">IGDv1 compatibility</span>
						<select
							className="h-9 rounded-md border bg-card px-2 text-sm"
							onChange={(event) => update("igdv1", event.target.value)}
							value={values.igdv1}
						>
							<option value="1">enabled</option>
							<option value="0">disabled</option>
						</select>
					</label>
					<DefaultSelect label="Secure mode" onChange={(value) => update("secure_mode", value)} value={values.secure_mode} />
					<DefaultSelect label="System uptime" onChange={(value) => update("system_uptime", value)} value={values.system_uptime} />
					<DefaultSelect label="Extra logging" onChange={(value) => update("log_output", value)} value={values.log_output} />
					<DefaultSelect label="STUN" onChange={(value) => update("use_stun", value)} value={values.use_stun} />
					<label className="grid gap-2 text-sm">
						<span className="font-medium">STUN host</span>
						<Input onChange={(event) => update("stun_host", event.target.value)} value={values.stun_host} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">STUN port</span>
						<Input inputMode="numeric" onChange={(event) => update("stun_port", event.target.value)} value={values.stun_port} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Notify interval</span>
						<Input inputMode="numeric" onChange={(event) => update("notify_interval", event.target.value)} value={values.notify_interval} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Presentation URL</span>
						<Input onChange={(event) => update("presentation_url", event.target.value)} value={values.presentation_url} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Device UUID</span>
						<Input onChange={(event) => update("uuid", event.target.value)} value={values.uuid} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Model number</span>
						<Input onChange={(event) => update("model_number", event.target.value)} value={values.model_number} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Serial number</span>
						<Input onChange={(event) => update("serial_number", event.target.value)} value={values.serial_number} />
					</label>
					<label className="grid gap-2 text-sm">
						<span className="font-medium">Lease file</span>
						<Input onChange={(event) => update("upnp_lease_file", event.target.value)} value={values.upnp_lease_file} />
					</label>
				</div>

				<div className="grid gap-3">
					<div className="flex items-center justify-between gap-3">
						<h3 className="text-sm font-medium">Permission rules</h3>
						<Button onClick={addRule} size="sm" type="button" variant="outline">
							<Plus className="mr-1.5 size-3.5" />
							Add rule
						</Button>
					</div>
					<div className="overflow-x-auto rounded-md border">
						<table className="w-full min-w-[46rem] text-left text-sm">
							<thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
								<tr>
									<th className="px-3 py-2 font-medium">Action</th>
									<th className="px-3 py-2 font-medium">External ports</th>
									<th className="px-3 py-2 font-medium">Internal address</th>
									<th className="px-3 py-2 font-medium">Internal ports</th>
									<th className="px-3 py-2 font-medium">Comment</th>
									<th className="px-3 py-2 text-right font-medium">Order</th>
									<th className="w-12 px-3 py-2" />
								</tr>
							</thead>
							<tbody>
								{ruleRows.length ? (
									ruleRows.map((rule, index) => (
										<tr className="border-b last:border-0" key={`${rule.section || "new"}.${index}`}>
											<td className="px-3 py-2">
												<select
													className="h-9 w-full rounded-md border bg-card px-2 text-sm"
													onChange={(event) => updateRule(index, "action", event.target.value)}
													value={rule.action}
												>
													<option value="allow">allow</option>
													<option value="deny">deny</option>
												</select>
											</td>
											<td className="px-3 py-2">
												<Input onChange={(event) => updateRule(index, "ext_ports", event.target.value)} value={rule.ext_ports} />
											</td>
											<td className="px-3 py-2">
												<Input onChange={(event) => updateRule(index, "int_addr", event.target.value)} value={rule.int_addr} />
											</td>
											<td className="px-3 py-2">
												<Input onChange={(event) => updateRule(index, "int_ports", event.target.value)} value={rule.int_ports} />
											</td>
											<td className="px-3 py-2">
												<Input onChange={(event) => updateRule(index, "comment", event.target.value)} value={rule.comment} />
											</td>
											<td className="px-3 py-2 text-right">
												<div className="inline-flex gap-1">
													<Button
														aria-label="Move rule up"
														disabled={index === 0}
														onClick={() => moveRule(index, -1)}
														size="icon"
														type="button"
														variant="ghost"
													>
														<ArrowUp className="size-4" />
													</Button>
													<Button
														aria-label="Move rule down"
														disabled={index === ruleRows.length - 1}
														onClick={() => moveRule(index, 1)}
														size="icon"
														type="button"
														variant="ghost"
													>
														<ArrowDown className="size-4" />
													</Button>
												</div>
											</td>
											<td className="px-3 py-2 text-right">
												<Button aria-label="Remove rule" onClick={() => removeRule(index)} size="icon" type="button" variant="ghost">
													<Trash2 className="size-4" />
												</Button>
											</td>
										</tr>
									))
								) : (
									<tr>
										<td className="px-3 py-6 text-muted-foreground" colSpan={7}>
											No UPnP permission rules configured.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>

				<div className="flex justify-end gap-2">
					<Button disabled={!dirty || saving} onClick={reset} type="button" variant="outline">
						Cancel
					</Button>
					<Button disabled={!dirty || saving} onClick={() => void save()} type="button">
						Save
					</Button>
				</div>
			</div>
		</Panel>
	);
}

function DropbearAccessPanel({ configs }: { configs: ConfigSection[] }) {
	const initial = useMemo(() => {
		const rows = configs.length ? configs.map(dropbearFormValues) : [newDropbearRow()];
		return rows;
	}, [configs]);
	const [values, setValues] = useState(initial);
	const [savedValues, setSavedValues] = useState(initial);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(values) !== JSON.stringify(savedValues);

	function update<K extends keyof DropbearConfigInput>(index: number, key: K, value: DropbearConfigInput[K]) {
		setValues((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
	}

	function addInstance() {
		setValues((current) => [...current, newDropbearRow()]);
	}

	function removeInstance(index: number) {
		setValues((current) => current.filter((_, rowIndex) => rowIndex !== index));
	}

	async function save() {
		setSaving(true);
		const result = await saveDropbearConfigs(values);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const sections = result.sections?.length ? result.sections : result.section ? [result.section] : configs;
		const nextValues = sections.length ? sections.map(dropbearFormValues) : [newDropbearRow()];
		setValues(nextValues);
		setSavedValues(nextValues);
		toast.success(result.message);
	}

	return (
		<Panel title="SSH access">
			<div className="grid max-w-3xl gap-4">
				{values.map((row, index) => (
					<div className="grid gap-3 rounded-md border bg-card p-3" key={row.section || `new-${index}`}>
						<div className="flex items-center justify-between gap-3">
							<div>
								<div className="text-sm font-semibold">Instance {index + 1}</div>
								<div className="text-xs text-muted-foreground">{row.section || "new listener"}</div>
							</div>
							<Button
								aria-label="Remove SSH instance"
								disabled={values.length <= 1 || saving}
								onClick={() => removeInstance(index)}
								size="icon"
								type="button"
								variant="outline"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
						<div className="grid gap-3 sm:grid-cols-2">
							<label className="grid gap-2 text-sm">
								<span className="font-medium">Enabled</span>
								<select
									className="h-9 rounded-md border bg-card px-2 text-sm"
									onChange={(event) => update(index, "enable", event.target.value)}
									value={row.enable}
								>
									<option value="1">enabled</option>
									<option value="0">disabled</option>
								</select>
							</label>
							<label className="grid gap-2 text-sm">
								<span className="font-medium">Port</span>
								<Input
									inputMode="numeric"
									max={65535}
									min={1}
									onChange={(event) => update(index, "Port", event.target.value)}
									type="number"
									value={row.Port}
								/>
							</label>
							<label className="grid gap-2 text-sm">
								<span className="font-medium">Password authentication</span>
								<select
									className="h-9 rounded-md border bg-card px-2 text-sm"
									onChange={(event) => update(index, "PasswordAuth", event.target.value)}
									value={row.PasswordAuth}
								>
									<option value="on">enabled</option>
									<option value="off">disabled</option>
								</select>
							</label>
							<label className="grid gap-2 text-sm">
								<span className="font-medium">Root password login</span>
								<select
									className="h-9 rounded-md border bg-card px-2 text-sm"
									onChange={(event) => update(index, "RootPasswordAuth", event.target.value)}
									value={row.RootPasswordAuth}
								>
									<option value="on">enabled</option>
									<option value="off">disabled</option>
								</select>
							</label>
							<label className="grid gap-2 text-sm">
								<span className="font-medium">Gateway ports</span>
								<select
									className="h-9 rounded-md border bg-card px-2 text-sm"
									onChange={(event) => update(index, "GatewayPorts", event.target.value)}
									value={row.GatewayPorts}
								>
									<option value="off">disabled</option>
									<option value="on">enabled</option>
								</select>
							</label>
							<label className="grid gap-2 text-sm">
								<span className="font-medium">Bind mode</span>
								<select
									className="h-9 rounded-md border bg-card px-2 text-sm"
									onChange={(event) => update(index, "bindMode", event.target.value as DropbearConfigInput["bindMode"])}
									value={row.bindMode}
								>
									<option value="all">all interfaces</option>
									<option value="interface">interface</option>
									<option value="direct">direct interface</option>
								</select>
							</label>
							<label className="grid gap-2 text-sm sm:col-span-2">
								<span className="font-medium">Listen interface</span>
								<Input
									onChange={(event) => update(index, "Interface", event.target.value)}
									disabled={row.bindMode !== "interface"}
									placeholder="All interfaces"
									value={row.Interface}
								/>
							</label>
							<label className="grid gap-2 text-sm sm:col-span-2">
								<span className="font-medium">Direct interface</span>
								<Input
									disabled={row.bindMode !== "direct"}
									onChange={(event) => update(index, "DirectInterface", event.target.value)}
									placeholder="No direct interface"
									value={row.DirectInterface}
								/>
							</label>
						</div>
					</div>
				))}
				<div className="flex justify-end gap-2">
					<Button disabled={saving} onClick={addInstance} type="button" variant="outline">
						<Plus className="h-4 w-4" />
						Add instance
					</Button>
					<Button disabled={!dirty || saving} onClick={() => setValues(savedValues)} type="button" variant="outline">
						Cancel
					</Button>
					<Button disabled={!dirty || saving} onClick={() => void save()} type="button">
						Save
					</Button>
				</div>
			</div>
		</Panel>
	);
}

function UhttpdAccessPanel({ cert, configs }: { cert: ConfigSection | undefined; configs: ConfigSection[] }) {
	const initial = useMemo(() => (configs.length ? configs.map(uhttpdFormValues) : [newUhttpdRow()]), [configs]);
	const [values, setValues] = useState(initial);
	const [savedValues, setSavedValues] = useState(initial);
	const [certificateFiles, setCertificateFiles] = useState<UhttpdCertificateFileStatus[]>([]);
	const [certUpload, setCertUpload] = useState<UhttpdUploadState>({ encoding: "text", filename: "i-love-luci-uhttpd.crt", text: "" });
	const [keyUpload, setKeyUpload] = useState<UhttpdUploadState>({ encoding: "text", filename: "i-love-luci-uhttpd.key", text: "" });
	const [saving, setSaving] = useState(false);
	const [uploading, setUploading] = useState<"cert" | "key" | null>(null);
	const dirty = JSON.stringify(values) !== JSON.stringify(savedValues);
	const current = configs[0];

	function update<K extends keyof UhttpdConfigInput>(index: number, key: K, value: UhttpdConfigInput[K]) {
		setValues((currentValues) => currentValues.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
	}

	function addInstance() {
		setValues((currentValues) => [...currentValues, newUhttpdRow()]);
	}

	function removeInstance(index: number) {
		setValues((currentValues) => currentValues.filter((_, rowIndex) => rowIndex !== index));
	}

	function updateFromSections(sections: ConfigSection[] | undefined) {
		if (!sections?.length) {
			return;
		}

		const nextValues = sections.map(uhttpdFormValues);
		setValues(nextValues);
		setSavedValues(nextValues);
	}

	async function uploadCertificate(kind: "cert" | "key") {
		const upload = kind === "cert" ? certUpload : keyUpload;
		setUploading(kind);
		const result = await saveUhttpdCertificateFile(kind, upload.filename, upload.text, upload.encoding);
		setUploading(null);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		if (result.files) {
			setCertificateFiles(result.files);
		}

		if (result.path) {
			update(0, kind === "cert" ? "cert" : "key", result.path);
		}

		toast.success(result.message);
	}

	async function removeCertificate(action: "remove_files" | "remove_config") {
		const message =
			action === "remove_config"
				? "Remove configured certificate, key, and HTTPS listeners?"
				: "Remove the configured certificate and key files?";

		if (!window.confirm(message)) {
			return;
		}

		setUploading(action === "remove_config" ? "key" : "cert");
		const result = await removeUhttpdCertificate(action);
		setUploading(null);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		if (result.files) {
			setCertificateFiles(result.files);
		}

		updateFromSections(result.sections);
		toast.success(result.message);
	}

	async function save() {
		setSaving(true);
		const result = await saveUhttpdConfigs(values);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const sections = result.sections?.length ? result.sections : result.section ? [result.section] : configs;
		const nextValues = sections.length ? sections.map(uhttpdFormValues) : [newUhttpdRow()];
		setValues(nextValues);
		setSavedValues(nextValues);
		toast.success(result.message);
	}

	return (
		<div className="grid gap-4">
			<Panel title="HTTP(S) access">
				<div className="grid max-w-4xl gap-4">
					{values.map((row, index) => (
						<div className="grid gap-4 rounded-md border bg-card p-3" key={row.section || `new-uhttpd-${index}`}>
							<div className="flex items-center justify-between gap-3">
								<div>
									<div className="text-sm font-semibold">Instance {index + 1}</div>
									<div className="text-xs text-muted-foreground">{row.section || "new web server"}</div>
								</div>
								<Button
									aria-label="Remove web server instance"
									disabled={values.length <= 1 || saving}
									onClick={() => removeInstance(index)}
									size="icon"
									type="button"
									variant="outline"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
							<UhttpdInstanceFields index={index} row={row} update={update} />
						</div>
					))}
					<div className="flex justify-end gap-2">
						<Button disabled={saving} onClick={addInstance} type="button" variant="outline">
							<Plus className="h-4 w-4" />
							Add instance
						</Button>
						<Button disabled={!dirty || saving} onClick={() => setValues(savedValues)} type="button" variant="outline">
							Cancel
						</Button>
						<Button disabled={!dirty || saving} onClick={() => void save()} type="button">
							Save
						</Button>
					</div>
				</div>
			</Panel>
			<Panel title="Certificate files">
				<div className="grid gap-4">
					<div className="grid gap-3 md:grid-cols-2">
						<UhttpdUploadBox
							disabled={uploading !== null}
							kind="cert"
							onChange={setCertUpload}
							onUpload={() => void uploadCertificate("cert")}
							state={certUpload}
						/>
						<UhttpdUploadBox
							disabled={uploading !== null}
							kind="key"
							onChange={setKeyUpload}
							onUpload={() => void uploadCertificate("key")}
							state={keyUpload}
						/>
					</div>
					<UhttpdCertificateFileTable files={certificateFiles.length ? certificateFiles : currentCertificateFiles(values[0])} />
					<div className="flex flex-wrap justify-end gap-2">
						<Button disabled={uploading !== null} onClick={() => void removeCertificate("remove_files")} type="button" variant="outline">
							Remove certificate files
						</Button>
						<Button disabled={uploading !== null} onClick={() => void removeCertificate("remove_config")} type="button" variant="destructive">
							Remove certificate configuration
						</Button>
					</div>
				</div>
			</Panel>
			<SimpleValueTable
				columns={["Setting", "Value"]}
				empty="No uHTTPd configuration found."
				rows={[
					["Document root", configValue(current, "home") || "unknown"],
					["CGI prefix", configValue(current, "cgi_prefix") || "none"],
					["Ubus prefix", configValue(current, "ubus_prefix") || "none"],
					["Max requests", configValue(current, "max_requests") || "unknown"],
					["Max connections", configValue(current, "max_connections") || "unknown"],
					["Certificate", configValue(current, "cert") || "none"],
					["Certificate defaults", `${configValue(cert, "key_type") || "unknown"} / ${configValue(cert, "ec_curve") || configValue(cert, "bits") || "unknown"}`],
				]}
				title="Web server configuration"
			/>
		</div>
	);
}

type UhttpdUploadState = {
	encoding: "text" | "base64";
	filename: string;
	text: string;
};

function UhttpdUploadBox({
	disabled,
	kind,
	onChange,
	onUpload,
	state,
}: {
	disabled: boolean;
	kind: "cert" | "key";
	onChange: (state: UhttpdUploadState) => void;
	onUpload: () => void;
	state: UhttpdUploadState;
}) {
	const title = kind === "cert" ? "HTTPS certificate" : "HTTPS private key";

	async function selectFile(file: File | undefined) {
		if (!file) {
			return;
		}

		const bytes = new Uint8Array(await file.arrayBuffer());
		let binary = "";

		for (let offset = 0; offset < bytes.length; offset += 8192) {
			binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
		}

		onChange({
			encoding: "base64",
			filename: file.name,
			text: btoa(binary),
		});
	}

	return (
		<div className="grid gap-3 rounded-md border bg-card p-3">
			<div>
				<div className="text-sm font-semibold">{title}</div>
				<div className="text-xs text-muted-foreground">PEM or DER files are stored under /etc/luci-uploads.</div>
			</div>
			<label className="grid gap-2 text-sm">
				<span className="font-medium">File</span>
				<Input accept=".crt,.pem,.key" disabled={disabled} onChange={(event) => void selectFile(event.target.files?.[0])} type="file" />
			</label>
			<label className="grid gap-2 text-sm">
				<span className="font-medium">Saved filename</span>
				<Input disabled={disabled} onChange={(event) => onChange({ ...state, filename: event.target.value })} value={state.filename} />
			</label>
			<textarea
				className="min-h-28 rounded-md border bg-card px-3 py-2 font-mono text-xs outline-none focus-visible:border-ring"
				disabled={disabled}
				onChange={(event) => onChange({ ...state, encoding: "text", text: event.target.value })}
				placeholder={state.encoding === "base64" ? "Base64 file content selected" : kind === "cert" ? "-----BEGIN CERTIFICATE-----" : "-----BEGIN PRIVATE KEY-----"}
				spellCheck={false}
				value={state.text}
			/>
			<div className="text-xs text-muted-foreground">{state.encoding === "base64" ? "Selected file will upload as binary-safe base64." : "Pasted text will upload as PEM."}</div>
			<Button disabled={disabled || !state.text.trim()} onClick={onUpload} type="button" variant="outline">
				Upload {kind === "cert" ? "certificate" : "private key"}
			</Button>
		</div>
	);
}

function UhttpdCertificateFileTable({ files }: { files: UhttpdCertificateFileStatus[] }) {
	return (
		<div className="overflow-x-auto rounded-md border">
			<table className="w-full min-w-[28rem] text-left text-sm">
				<thead className="border-b text-xs uppercase text-muted-foreground">
					<tr>
						<th className="px-3 py-2 font-medium">File</th>
						<th className="px-3 py-2 font-medium">Status</th>
					</tr>
				</thead>
				<tbody>
					{files.map((file) => (
						<tr className="border-b last:border-0" key={`${file.title}.${file.path}`}>
							<td className="px-3 py-2">
								<div className="font-medium">{file.title}</div>
								<div className="font-mono text-xs text-muted-foreground">{file.path || "not configured"}</div>
							</td>
							<td className="px-3 py-2 text-muted-foreground">{file.exists ? `${file.size} bytes` : "not present"}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function currentCertificateFiles(row: UhttpdConfigInput | undefined): UhttpdCertificateFileStatus[] {
	return [
		{
			title: "HTTPS certificate",
			path: row?.cert || "",
			exists: false,
			size: 0,
		},
		{
			title: "HTTPS private key",
			path: row?.key || "",
			exists: false,
			size: 0,
		},
	];
}

function UhttpdInstanceFields({
	index,
	row,
	update,
}: {
	index: number;
	row: UhttpdConfigInput;
	update: <K extends keyof UhttpdConfigInput>(index: number, key: K, value: UhttpdConfigInput[K]) => void;
}) {
	return (
		<>
			<div className="grid gap-3 md:grid-cols-2">
				<label className="grid gap-2 text-sm">
					<span className="font-medium">HTTP listeners</span>
					<textarea
						className="min-h-20 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
						onChange={(event) => update(index, "listen_http", event.target.value)}
						spellCheck={false}
						value={row.listen_http}
					/>
				</label>
				<label className="grid gap-2 text-sm">
					<span className="font-medium">HTTPS listeners</span>
					<textarea
						className="min-h-20 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
						onChange={(event) => update(index, "listen_https", event.target.value)}
						spellCheck={false}
						value={row.listen_https}
					/>
				</label>
			</div>
			<div className="grid gap-3 md:grid-cols-3">
				<label className="grid gap-2 text-sm">
					<span className="font-medium">Document root</span>
					<Input onChange={(event) => update(index, "home", event.target.value)} value={row.home} />
				</label>
				<label className="grid gap-2 text-sm">
					<span className="font-medium">CGI prefix</span>
					<Input onChange={(event) => update(index, "cgi_prefix", event.target.value)} value={row.cgi_prefix} />
				</label>
				<label className="grid gap-2 text-sm">
					<span className="font-medium">Ubus prefix</span>
					<Input onChange={(event) => update(index, "ubus_prefix", event.target.value)} value={row.ubus_prefix} />
				</label>
				<label className="grid gap-2 text-sm">
					<span className="font-medium">Lua handler</span>
					<Input onChange={(event) => update(index, "lua_handler", event.target.value)} value={row.lua_handler} />
				</label>
				<label className="grid gap-2 text-sm">
					<span className="font-medium">Ubus socket</span>
					<Input onChange={(event) => update(index, "ubus_socket", event.target.value)} value={row.ubus_socket} />
				</label>
				<label className="grid gap-2 text-sm">
					<span className="font-medium">Error page</span>
					<Input onChange={(event) => update(index, "error_page", event.target.value)} value={row.error_page} />
				</label>
				<label className="grid gap-2 text-sm">
					<span className="font-medium">Auth realm</span>
					<Input onChange={(event) => update(index, "realm", event.target.value)} value={row.realm} />
				</label>
				<label className="grid gap-2 text-sm">
					<span className="font-medium">Auth config file</span>
					<Input onChange={(event) => update(index, "config", event.target.value)} value={row.config} />
				</label>
				<label className="grid gap-2 text-sm">
					<span className="font-medium">Certificate</span>
					<Input onChange={(event) => update(index, "cert", event.target.value)} value={row.cert} />
				</label>
				<label className="grid gap-2 text-sm">
					<span className="font-medium">Private key</span>
					<Input onChange={(event) => update(index, "key", event.target.value)} value={row.key} />
				</label>
				<label className="grid gap-2 text-sm">
					<span className="font-medium">RFC1918 filter</span>
					<select className="h-9 rounded-md border bg-card px-2 text-sm" onChange={(event) => update(index, "rfc1918_filter", event.target.value)} value={row.rfc1918_filter}>
						<option value="1">enabled</option>
						<option value="0">disabled</option>
					</select>
				</label>
				<label className="grid gap-2 text-sm">
					<span className="font-medium">Directory listings</span>
					<select className="h-9 rounded-md border bg-card px-2 text-sm" onChange={(event) => update(index, "no_dirlists", event.target.value)} value={row.no_dirlists}>
						<option value="0">enabled</option>
						<option value="1">disabled</option>
					</select>
				</label>
				<label className="grid gap-2 text-sm">
					<span className="font-medium">External symlinks</span>
					<select className="h-9 rounded-md border bg-card px-2 text-sm" onChange={(event) => update(index, "no_symlinks", event.target.value)} value={row.no_symlinks}>
						<option value="0">enabled</option>
						<option value="1">disabled</option>
					</select>
				</label>
				<label className="grid gap-2 text-sm">
					<span className="font-medium">Ubus CORS</span>
					<select className="h-9 rounded-md border bg-card px-2 text-sm" onChange={(event) => update(index, "ubus_cors", event.target.value)} value={row.ubus_cors}>
						<option value="0">disabled</option>
						<option value="1">enabled</option>
					</select>
				</label>
				<label className="grid gap-2 text-sm">
					<span className="font-medium">Ubus auth</span>
					<select className="h-9 rounded-md border bg-card px-2 text-sm" onChange={(event) => update(index, "no_ubusauth", event.target.value)} value={row.no_ubusauth}>
						<option value="0">enabled</option>
						<option value="1">disabled</option>
					</select>
				</label>
			</div>
			<div className="grid gap-3 md:grid-cols-2">
				<label className="grid gap-2 text-sm">
					<span className="font-medium">Index pages</span>
					<textarea
						className="min-h-20 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
						onChange={(event) => update(index, "index_page", event.target.value)}
						spellCheck={false}
						value={row.index_page}
					/>
				</label>
				<label className="grid gap-2 text-sm">
					<span className="font-medium">CGI filetype handlers</span>
					<textarea
						className="min-h-20 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
						onChange={(event) => update(index, "interpreter", event.target.value)}
						spellCheck={false}
						value={row.interpreter}
					/>
				</label>
				<label className="grid gap-2 text-sm">
					<span className="font-medium">Aliases</span>
					<textarea
						className="min-h-20 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
						onChange={(event) => update(index, "alias", event.target.value)}
						spellCheck={false}
						value={row.alias}
					/>
				</label>
				<label className="grid gap-2 text-sm">
					<span className="font-medium">Lua prefixes</span>
					<textarea
						className="min-h-20 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
						onChange={(event) => update(index, "lua_prefix", event.target.value)}
						spellCheck={false}
						value={row.lua_prefix}
					/>
				</label>
			</div>
			<div className="grid gap-3 md:grid-cols-3">
				<label className="grid gap-2 text-sm">
					<span className="font-medium">Max requests</span>
					<Input inputMode="numeric" onChange={(event) => update(index, "max_requests", event.target.value)} value={row.max_requests} />
				</label>
				<label className="grid gap-2 text-sm">
					<span className="font-medium">Max connections</span>
					<Input inputMode="numeric" onChange={(event) => update(index, "max_connections", event.target.value)} value={row.max_connections} />
				</label>
				<label className="grid gap-2 text-sm">
					<span className="font-medium">Script timeout</span>
					<Input inputMode="numeric" onChange={(event) => update(index, "script_timeout", event.target.value)} value={row.script_timeout} />
				</label>
				<label className="grid gap-2 text-sm">
					<span className="font-medium">Network timeout</span>
					<Input inputMode="numeric" onChange={(event) => update(index, "network_timeout", event.target.value)} value={row.network_timeout} />
				</label>
				<label className="grid gap-2 text-sm">
					<span className="font-medium">HTTP keepalive</span>
					<Input inputMode="numeric" onChange={(event) => update(index, "http_keepalive", event.target.value)} value={row.http_keepalive} />
				</label>
				<label className="grid gap-2 text-sm">
					<span className="font-medium">TCP keepalive</span>
					<select className="h-9 rounded-md border bg-card px-2 text-sm" onChange={(event) => update(index, "tcp_keepalive", event.target.value)} value={row.tcp_keepalive}>
						<option value="1">enabled</option>
						<option value="0">disabled</option>
					</select>
				</label>
			</div>
			<label className="grid max-w-xl gap-2 text-sm">
				<span className="font-medium">Redirect to HTTPS</span>
				<select className="h-9 rounded-md border bg-card px-2 text-sm" onChange={(event) => update(index, "redirect_https", event.target.value)} value={row.redirect_https}>
					<option value="0">disabled</option>
					<option value="1">enabled</option>
				</select>
			</label>
		</>
	);
}

function uhttpdFormValues(config: ConfigSection | undefined): UhttpdConfigInput {
	return {
		section: config?.name ?? "",
		redirect_https: enabledText(configValue(config, "redirect_https")) === "enabled" ? "1" : "0",
		listen_http: joinConfigValue(config?.values.listen_http),
		listen_https: joinConfigValue(config?.values.listen_https),
		home: configValue(config, "home"),
		rfc1918_filter: configValue(config, "rfc1918_filter") === "0" ? "0" : "1",
		no_symlinks: configValue(config, "no_symlinks") === "1" ? "1" : "0",
		no_dirlists: configValue(config, "no_dirlists") === "1" ? "1" : "0",
		max_requests: configValue(config, "max_requests"),
		max_connections: configValue(config, "max_connections"),
		cert: configValue(config, "cert"),
		key: configValue(config, "key"),
		cgi_prefix: configValue(config, "cgi_prefix"),
		index_page: joinConfigValue(config?.values.index_page),
		interpreter: joinConfigValue(config?.values.interpreter),
		alias: joinConfigValue(config?.values.alias),
		lua_prefix: joinConfigValue(config?.values.lua_prefix),
		lua_handler: configValue(config, "lua_handler"),
		realm: configValue(config, "realm"),
		config: configValue(config, "config"),
		error_page: configValue(config, "error_page"),
		script_timeout: configValue(config, "script_timeout"),
		network_timeout: configValue(config, "network_timeout"),
		http_keepalive: configValue(config, "http_keepalive"),
		tcp_keepalive: configValue(config, "tcp_keepalive") === "0" ? "0" : "1",
		ubus_prefix: configValue(config, "ubus_prefix"),
		ubus_socket: configValue(config, "ubus_socket"),
		ubus_cors: configValue(config, "ubus_cors") === "1" ? "1" : "0",
		no_ubusauth: configValue(config, "no_ubusauth") === "1" ? "1" : "0",
	};
}

function newUhttpdRow(): UhttpdConfigInput {
	return {
		section: "",
		redirect_https: "0",
		listen_http: "",
		listen_https: "",
		home: "/www",
		rfc1918_filter: "1",
		no_symlinks: "0",
		no_dirlists: "0",
		max_requests: "3",
		max_connections: "100",
		cert: "",
		key: "",
		cgi_prefix: "/cgi-bin",
		index_page: "",
		interpreter: "",
		alias: "",
		lua_prefix: "/cgi-bin/luci=/usr/lib/lua/luci/sgi/uhttpd.lua",
		lua_handler: "",
		realm: "",
		config: "",
		error_page: "",
		script_timeout: "60",
		network_timeout: "30",
		http_keepalive: "20",
		tcp_keepalive: "1",
		ubus_prefix: "",
		ubus_socket: "",
		ubus_cors: "0",
		no_ubusauth: "0",
	};
}

function banipConfigValues(config: ConfigSection | undefined): BanipConfigInput {
	return {
		ban_enabled: configValue(config, "ban_enabled") === "0" ? "0" : "1",
		ban_autodetect: configValue(config, "ban_autodetect") === "0" ? "0" : "1",
		ban_autoallowlist: configValue(config, "ban_autoallowlist") === "0" ? "0" : "1",
		ban_autoblocklist: configValue(config, "ban_autoblocklist") === "0" ? "0" : "1",
		ban_allowlistonly: configValue(config, "ban_allowlistonly") === "1" ? "1" : "0",
		ban_protov4: configValue(config, "ban_protov4") === "0" ? "0" : "1",
		ban_protov6: configValue(config, "ban_protov6") === "0" ? "0" : "1",
		ban_blockpolicy: configValue(config, "ban_blockpolicy") || "drop",
		ban_nftpolicy: configValue(config, "ban_nftpolicy") || "memory",
		ban_nftpriority: configValue(config, "ban_nftpriority") || "-100",
		ban_nftloglevel: configValue(config, "ban_nftloglevel") || "warn",
		ban_loglimit: configValue(config, "ban_loglimit") || "100",
		ban_fetchretry: configValue(config, "ban_fetchretry") || "5",
		ban_icmplimit: configValue(config, "ban_icmplimit") || "25",
		ban_synlimit: configValue(config, "ban_synlimit") || "10",
		ban_udplimit: configValue(config, "ban_udplimit") || "100",
		ban_feed: textareaConfigList(config?.values.ban_feed),
		ban_country: textareaConfigList(config?.values.ban_country),
		ban_trigger: textareaConfigList(config?.values.ban_trigger),
		ban_ifv4: textareaConfigList(config?.values.ban_ifv4),
		ban_ifv6: textareaConfigList(config?.values.ban_ifv6),
		ban_dev: textareaConfigList(config?.values.ban_dev),
		ban_logterm: textareaConfigList(config?.values.ban_logterm),
	};
}

function attendedSysupgradeConfigValues(server: ConfigSection | undefined, client: ConfigSection | undefined): AttendedSysupgradeConfigInput {
	return {
		server_url: configValue(server, "url") || "https://sysupgrade.openwrt.org",
		rebuilder: textareaConfigList(server?.values.rebuilder),
		upgrade_packages: configValue(client, "upgrade_packages") === "0" ? "0" : "1",
		auto_search: configValue(client, "auto_search") === "1" ? "1" : "0",
		advanced_mode: configValue(client, "advanced_mode") === "1" ? "1" : "0",
		login_check_for_upgrades: configValue(client, "login_check_for_upgrades") === "0" ? "0" : "1",
	};
}

function adblockFastConfigValues(config: ConfigSection | undefined): AdblockFastConfigInput {
	return {
		enabled: configValue(config, "enabled") === "0" ? "0" : "1",
		dns: configValue(config, "dns") || "dnsmasq.servers",
		dnsmasq_config_file_url: configValue(config, "dnsmasq_config_file_url"),
		dnsmasq_instance: textareaConfigList(config?.values.dnsmasq_instance),
		force_dns: configValue(config, "force_dns") === "0" ? "0" : "1",
		force_dns_port: textareaConfigList(config?.values.force_dns_port),
		parallel_downloads: configValue(config, "parallel_downloads") || "1",
		verbosity: configValue(config, "verbosity") || "2",
		auto_update_enabled: configValue(config, "auto_update_enabled") === "1" ? "1" : "0",
		config_update_enabled: configValue(config, "config_update_enabled") === "1" ? "1" : "0",
		config_update_url: configValue(config, "config_update_url"),
		ipv6_enabled: configValue(config, "ipv6_enabled") === "1" ? "1" : "0",
		download_timeout: configValue(config, "download_timeout") || "10",
		pause_timeout: configValue(config, "pause_timeout") || "20",
		curl_max_file_size: configValue(config, "curl_max_file_size"),
		curl_retry: configValue(config, "curl_retry") || "3",
		compressed_cache: configValue(config, "compressed_cache") === "1" ? "1" : "0",
		compressed_cache_dir: configValue(config, "compressed_cache_dir") || "/etc",
		dnsmasq_sanity_check: configValue(config, "dnsmasq_sanity_check") === "0" ? "0" : "1",
		dnsmasq_validity_check: configValue(config, "dnsmasq_validity_check") === "1" ? "1" : "0",
		debug_init_script: configValue(config, "debug_init_script") === "1" ? "1" : "0",
		rpcd_token: configValue(config, "rpcd_token"),
		led: configValue(config, "led"),
		allowed_domain: textareaConfigList(config?.values.allowed_domain),
		blocked_domain: textareaConfigList(config?.values.blocked_domain),
	};
}

function adblockFastFeedValues(feed: ConfigSection): AdblockFastFeed {
	return normalizeAdblockFastFeed({
		section: feed.name,
		enabled: configValue(feed, "enabled", "1"),
		action: configValue(feed, "action") || "block",
		name: configValue(feed, "name"),
		url: configValue(feed, "url"),
		size: configValue(feed, "size"),
	});
}

function normalizeAdblockFastFeed(feed: AdblockFastFeed): AdblockFastFeed {
	return {
		section: feed.section || "",
		enabled: feed.enabled === "0" ? "0" : "1",
		action: feed.action === "allow" ? "allow" : "block",
		name: feed.name || "",
		url: feed.url || "",
		size: feed.size || "",
	};
}

function upnpdConfigValues(config: ConfigSection | undefined): UpnpdConfigInput {
	return {
		enabled: configValue(config, "enabled") === "1" ? "1" : "0",
		enable_upnp: configValue(config, "enable_upnp"),
		enable_natpmp: configValue(config, "enable_natpmp"),
		download: configValue(config, "download") || "1024",
		upload: configValue(config, "upload") || "512",
		internal_iface: configValue(config, "internal_iface") || "lan",
		port: configValue(config, "port") || "5000",
		igdv1: configValue(config, "igdv1") === "0" ? "0" : "1",
		use_stun: configValue(config, "use_stun"),
		stun_host: configValue(config, "stun_host"),
		stun_port: configValue(config, "stun_port"),
		secure_mode: configValue(config, "secure_mode"),
		notify_interval: configValue(config, "notify_interval"),
		presentation_url: configValue(config, "presentation_url"),
		uuid: configValue(config, "uuid"),
		model_number: configValue(config, "model_number"),
		serial_number: configValue(config, "serial_number"),
		system_uptime: configValue(config, "system_uptime"),
		log_output: configValue(config, "log_output"),
		upnp_lease_file: configValue(config, "upnp_lease_file"),
	};
}

function upnpdRuleValues(rule: ConfigSection): UpnpdRule {
	return normalizeUpnpdRule({
		section: rule.name,
		action: configValue(rule, "action") || "allow",
		ext_ports: configValue(rule, "ext_ports"),
		int_addr: configValue(rule, "int_addr"),
		int_ports: configValue(rule, "int_ports"),
		comment: configValue(rule, "comment"),
	});
}

function normalizeUpnpdRule(rule: UpnpdRule): UpnpdRule {
	return {
		section: rule.section || "",
		action: rule.action === "deny" ? "deny" : "allow",
		ext_ports: rule.ext_ports || "",
		int_addr: rule.int_addr || "",
		int_ports: rule.int_ports || "",
		comment: rule.comment || "",
	};
}

function dropbearFormValues(config: ConfigSection | undefined): DropbearConfigInput {
	const iface = configValue(config, "Interface");
	const directInterface = configValue(config, "DirectInterface");

	return {
		section: config?.name ?? "",
		bindMode: directInterface ? "direct" : iface ? "interface" : "all",
		enable: configValue(config, "enable") === "0" ? "0" : "1",
		Port: configValue(config, "Port") || "22",
		PasswordAuth: dropbearOnOff(configValue(config, "PasswordAuth") || "on"),
		RootPasswordAuth: dropbearOnOff(configValue(config, "RootPasswordAuth") || "on"),
		GatewayPorts: dropbearOnOff(configValue(config, "GatewayPorts") || "off"),
		Interface: iface,
		DirectInterface: directInterface,
	};
}

function newDropbearRow(): DropbearConfigInput {
	return {
		section: "",
		bindMode: "all",
		enable: "1",
		Port: "22",
		PasswordAuth: "on",
		RootPasswordAuth: "on",
		GatewayPorts: "off",
		Interface: "",
		DirectInterface: "",
	};
}

function dropbearOnOff(value: string) {
	return value === "0" || value === "false" || value === "off" || value === "no" ? "off" : "on";
}

function SimpleValueTable({
	columns,
	empty,
	rows,
	title,
}: {
	columns: string[];
	empty: string;
	rows: Array<Array<ReactNode>>;
	title: string;
}) {
	return (
		<Panel title={title} flush>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[36rem] text-left text-sm">
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
							rows.map((row, rowIndex) => (
								<tr className="border-b align-top last:border-0" key={`${title}.${rowIndex}`}>
									{row.map((cell, cellIndex) => (
										<td className={cellIndex === 0 ? "px-3 py-3 font-medium" : "px-3 py-3"} key={cellIndex}>
											{cell || "none"}
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

function PackageInventory({ data }: { data: NativePageData }) {
	const [query, setQuery] = useState("");
	const [installedTranslationMode, setInstalledTranslationMode] = useState<"all" | "hide" | "only">("all");
	const [removeAutoremove, setRemoveAutoremove] = useState(false);
	const [actionResult, setActionResult] = useState<PackageActionResult | null>(null);
	const [actionBusy, setActionBusy] = useState<string | null>(null);
	const packages = useMemo(() => data.lines.map(parsePackageLine), [data.lines]);
	const upgrades = useMemo(() => parsePackageUpgrades(commandOutput(data.commands, "Available upgrades")), [data.commands]);
	const filtered = useMemo(() => {
		const needle = query.trim().toLowerCase();

		return packages.filter((pkg) => {
			const isTranslation = pkg.name.startsWith("luci-i18n-");

			if (installedTranslationMode === "hide" && isTranslation) {
				return false;
			}

			if (installedTranslationMode === "only" && !isTranslation) {
				return false;
			}

			return (
				!needle ||
				pkg.name.toLowerCase().includes(needle) ||
				pkg.version.toLowerCase().includes(needle) ||
				pkg.description.toLowerCase().includes(needle)
			);
		});
	}, [packages, query, installedTranslationMode]);
	const luciCount = packages.filter((pkg) => pkg.name.startsWith("luci-")).length;
	const kernelCount = packages.filter((pkg) => pkg.name.startsWith("kmod-")).length;

	async function runAction(action: "install" | "remove" | "update" | "upgrade", name = "", simulate = true, options: PackageActionOptions = {}) {
		if (!simulate && action !== "update" && !window.confirm(`${action === "install" ? "Install" : action === "remove" ? "Remove" : "Upgrade"} ${name}?`)) {
			return;
		}

		const key = `${action}:${name}:${simulate ? "plan" : "apply"}`;
		setActionBusy(key);
		const result = await runPackageAction(action, name, simulate, options);
		setActionResult(result);
		setActionBusy(null);

		if (result.ok) {
			toast.success(result.message);
		}
		else {
			toast.error(result.message);
		}
	}

	return (
		<div className="grid gap-4">
			<div className="grid gap-3 sm:grid-cols-3">
				<MetricBlock label="Installed packages" value={packages.length} />
				<MetricBlock label="LuCI packages" value={luciCount} />
				<MetricBlock label="Kernel modules" value={kernelCount} />
			</div>
			<PackageUpgradeTable actionBusy={actionBusy} entries={upgrades} onRunAction={runAction} />
			<PackageActionOutput result={actionResult} />
			<ManualPackagePlanner busy={actionBusy} onRunAction={runAction} />
			<Panel title="Package action options">
				<label className="inline-flex items-center gap-2 text-sm">
					<input checked={removeAutoremove} onChange={(event) => setRemoveAutoremove(event.target.checked)} type="checkbox" />
					Automatically remove unused dependencies when removing packages
				</label>
			</Panel>
			<AvailablePackageTable busy={actionBusy} lines={data.packageAvailable ?? []} onRunAction={runAction} />
			<AvailablePackageSearch busy={actionBusy} onRunAction={runAction} />
			<PackageFeedsEditor feeds={data.packageFeeds ?? []} />
			<Panel
				title={
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-2">
							<span>Installed packages</span>
							<Button disabled={actionBusy === "update::apply"} onClick={() => void runAction("update", "", false)} size="sm" type="button" variant="outline">
								Update index
							</Button>
						</div>
						<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
							<select
								className="h-10 rounded-md border bg-card px-3 text-sm outline-none focus-visible:border-ring"
								onChange={(event) => setInstalledTranslationMode(event.target.value as "all" | "hide" | "only")}
								value={installedTranslationMode}
							>
								<option value="all">All packages</option>
								<option value="hide">Hide translations</option>
								<option value="only">Only translations</option>
							</select>
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
								<th className="px-3 py-2 font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{filtered.length ? (
								filtered.map((pkg) => (
									<tr className="border-b align-top last:border-0" key={pkg.line}>
										<td className="px-3 py-3 font-medium">{pkg.name}</td>
										<td className="px-3 py-3 font-mono text-xs text-muted-foreground">{pkg.version}</td>
										<td className="px-3 py-3">{pkg.description || "none"}</td>
										<td className="px-3 py-3">
											<div className="flex flex-wrap gap-1.5">
												<Button
													disabled={actionBusy === `remove:${pkg.name}:plan`}
													onClick={() => void runAction("remove", pkg.name, true, { autoremove: removeAutoremove })}
													size="sm"
													type="button"
													variant="outline"
												>
													Plan remove
												</Button>
												<Button
													disabled={actionBusy === `remove:${pkg.name}:apply`}
													onClick={() => void runAction("remove", pkg.name, false, { autoremove: removeAutoremove })}
													size="sm"
													type="button"
													variant="outline"
												>
													Remove
												</Button>
											</div>
										</td>
									</tr>
								))
							) : (
								<tr>
									<td className="px-3 py-6 text-muted-foreground" colSpan={4}>
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

function PackageActionOutput({ result }: { result: PackageActionResult | null }) {
	if (!result) {
		return null;
	}

	const lines = result.output
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line, index) => ({
			stream: result.simulate ? "plan" : "apply",
			number: index + 1,
			text: line,
		}));

	return (
		<div className="grid gap-3">
			<SimpleValueTable
				columns={["Setting", "Value"]}
				empty="No package action context."
				rows={[
					["Action", `${pageTitle(result.action)} ${result.simulate ? "plan" : "result"}`],
					["Manager", result.manager],
					["Package", result.name || "package index"],
					["Command", result.command || "none"],
					["Status", result.message],
				]}
				title="Package action context"
			/>
			<OutputLinesTable empty="No package manager output." lines={lines} title="Package manager output" />
		</div>
	);
}

function ManualPackagePlanner({
	busy,
	onRunAction,
}: {
	busy: string | null;
	onRunAction: (action: "install", name: string, simulate: boolean, options?: PackageActionOptions) => void | Promise<void>;
}) {
	const [name, setName] = useState("");
	const [overwrite, setOverwrite] = useState(false);
	const [staging, setStaging] = useState(false);
	const [stagedFile, setStagedFile] = useState<PackageFileStageResult | null>(null);

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const value = name.trim();

		if (!value) {
			toast.error("Package name is required.");
			return;
		}

		void onRunAction("install", value, true, { overwrite });
	}

	async function selectFile(file: File | undefined) {
		if (!file) {
			return;
		}

		if (!/\.(apk|ipk)$/i.test(file.name)) {
			toast.error("Package upload must be an .apk or .ipk file.");
			return;
		}

		if (file.size > packageUploadLimit) {
			toast.error(`Package file exceeds the native upload limit of ${formatBytes(packageUploadLimit)}.`);
			return;
		}

		setStaging(true);
		const result = await stagePackageFile(file.name, await fileToBase64(file));
		setStaging(false);
		setStagedFile(result);

		if (!result.ok) {
			toast.error(result.message);
			return;
		}

		setName(result.path);
		toast.success(result.message);
	}

	return (
		<Panel
			title={
				<div className="flex flex-col gap-1">
					<div>Manual package install</div>
					<div className="text-xs font-normal text-muted-foreground">
						Plan package-name, URL, uploaded `.apk`, or uploaded `.ipk` installs without changing the router. Apply stays in LuCI compat.
					</div>
				</div>
			}
		>
			<form className="grid gap-3" onSubmit={submit}>
				<div className="flex flex-col gap-2 sm:flex-row">
					<Input onChange={(event) => setName(event.target.value)} placeholder="Package name, URL, or /tmp/package.apk" value={name} />
					<Button disabled={busy === `install:${name.trim()}:plan`} type="submit" variant="outline">
						Plan install
					</Button>
				</div>
				<div className="grid gap-2 text-sm">
					<div className="font-medium">Package file</div>
					<Input accept=".apk,.ipk" disabled={staging} onChange={(event) => void selectFile(event.target.files?.[0])} type="file" />
					<div className="text-xs text-muted-foreground">
						File is staged under `/tmp` for install planning only. Native upload limit is {formatBytes(packageUploadLimit)}.
					</div>
				</div>
				{stagedFile?.ok ? (
					<div className="overflow-x-auto rounded-md border">
						<table className="w-full min-w-[32rem] text-left text-sm">
							<tbody>
								{[
									["File", stagedFile.filename],
									["Path", stagedFile.path],
									["Size", formatBytes(stagedFile.size)],
									["SHA256", stagedFile.sha256sum || "unknown"],
								].map(([field, value]) => (
									<tr className="border-b last:border-0" key={field}>
										<td className="px-3 py-2 font-medium">{field}</td>
										<td className="px-3 py-2 font-mono text-xs">{value}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : null}
				<label className="inline-flex items-center gap-2 text-sm">
					<input checked={overwrite} onChange={(event) => setOverwrite(event.target.checked)} type="checkbox" />
					Allow overwriting conflicting package files
				</label>
			</form>
		</Panel>
	);
}

function AvailablePackageTable({
	busy,
	lines,
	onRunAction,
}: {
	busy: string | null;
	lines: string[];
	onRunAction: (action: "install", name: string, simulate: boolean, options?: PackageActionOptions) => void | Promise<void>;
}) {
	const [query, setQuery] = useState("");
	const [translationMode, setTranslationMode] = useState<"all" | "hide" | "only">("all");
	const packages = useMemo(() => lines.map(parsePackageLine), [lines]);
	const filtered = useMemo(() => {
		const needle = query.trim().toLowerCase();

		return packages
			.filter((pkg) => {
				const isTranslation = pkg.name.startsWith("luci-i18n-");

				if (translationMode === "hide" && isTranslation) {
					return false;
				}

				if (translationMode === "only" && !isTranslation) {
					return false;
				}

				return !needle || pkg.name.toLowerCase().includes(needle) || pkg.description.toLowerCase().includes(needle);
			})
			.slice(0, 80);
	}, [packages, query, translationMode]);

	return (
		<Panel
			title={
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<div>Available packages</div>
						<div className="mt-1 text-xs font-normal text-muted-foreground">First 300 packages from configured feeds. Actions are plan-only.</div>
					</div>
					<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
						<select
							className="h-10 rounded-md border bg-card px-3 text-sm outline-none focus-visible:border-ring"
							onChange={(event) => setTranslationMode(event.target.value as "all" | "hide" | "only")}
							value={translationMode}
						>
							<option value="all">All packages</option>
							<option value="hide">Hide translations</option>
							<option value="only">Only translations</option>
						</select>
						<div className="relative w-full sm:w-72">
							<Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
							<Input className="pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Filter available packages" value={query} />
						</div>
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
							<th className="px-3 py-2 font-medium">Actions</th>
						</tr>
					</thead>
					<tbody>
						{filtered.length ? (
							filtered.map((pkg) => (
								<tr className="border-b align-top last:border-0" key={pkg.line}>
									<td className="px-3 py-3 font-medium">{pkg.name}</td>
									<td className="px-3 py-3 font-mono text-xs text-muted-foreground">{pkg.version}</td>
									<td className="px-3 py-3">{pkg.description || "none"}</td>
									<td className="px-3 py-3">
										<Button
											disabled={busy === `install:${pkg.name}:plan`}
											onClick={() => void onRunAction("install", pkg.name, true)}
											size="sm"
											type="button"
											variant="outline"
										>
											Plan install
										</Button>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td className="px-3 py-6 text-muted-foreground" colSpan={4}>
									No available packages to show.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}

function PackageFeedsEditor({ feeds }: { feeds: PackageFeedRow[] }) {
	const [rows, setRows] = useState(() => feeds.map(normalizePackageFeed));
	const [savedRows, setSavedRows] = useState(rows);
	const [saving, setSaving] = useState(false);
	const files = useMemo(() => Array.from(new Set(rows.map((row) => row.file))).sort(), [rows]);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

	function updateRow(index: number, field: keyof PackageFeedRow, value: string | boolean) {
		setRows((current) =>
			current.map((row, rowIndex) =>
				rowIndex === index
					? {
							...row,
							[field]: value,
							raw: field === "value" || field === "enabled" ? undefined : row.raw,
						}
					: row,
			),
		);
	}

	function addRow() {
		const file = files.find((path) => path.includes("customfeeds")) ?? files[0] ?? "/etc/apk/repositories.d/customfeeds.list";

		setRows((current) => [
			...current,
			{
				id: "",
				file,
				index: current.length,
				type: "repository",
				enabled: true,
				value: "",
			},
		]);
	}

	function removeRow(index: number) {
		setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		const result = await savePackageFeeds(rows);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextRows = result.feeds.map(normalizePackageFeed);
		toast.success(result.message);
		setRows(nextRows);
		setSavedRows(nextRows);
	}

	return (
		<Panel
			title={
				<div className="flex items-center justify-between gap-3">
					<span>Package feeds</span>
					<Button onClick={addRow} size="sm" type="button" variant="outline">
						<Plus className="size-3.5" />
						Add feed
					</Button>
				</div>
			}
			flush
		>
			<form onSubmit={(event) => void submit(event)}>
				<div className="overflow-x-auto">
					<table className="w-full min-w-[56rem] text-left text-sm">
						<thead className="border-b text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">File</th>
								<th className="px-3 py-2 font-medium">Status</th>
								<th className="px-3 py-2 font-medium">Repository</th>
								<th className="px-3 py-2 text-right font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{rows.length ? (
								rows.map((row, index) =>
									row.type === "repository" ? (
										<tr className="border-b align-top last:border-0" key={`${row.file}.${row.index}.${index}`}>
											<td className="px-3 py-3">
												<select
													className="h-9 w-full rounded-md border bg-background px-2 text-sm"
													onChange={(event) => updateRow(index, "file", event.target.value)}
													value={row.file}
												>
													{files.map((file) => (
														<option key={file} value={file}>
															{file}
														</option>
													))}
												</select>
											</td>
											<td className="px-3 py-3">
												<label className="inline-flex items-center gap-2 text-sm">
													<input
														checked={row.enabled}
														className="size-4"
														onChange={(event) => updateRow(index, "enabled", event.target.checked)}
														type="checkbox"
													/>
													Enabled
												</label>
											</td>
											<td className="px-3 py-3">
												<Input aria-label="Repository URL" onChange={(event) => updateRow(index, "value", event.target.value)} value={row.value} />
											</td>
											<td className="px-3 py-3 text-right">
												<Button aria-label="Remove feed" onClick={() => removeRow(index)} size="icon" type="button" variant="ghost">
													<Trash2 className="size-4" />
												</Button>
											</td>
										</tr>
									) : row.type === "comment" ? (
										<tr className="border-b bg-muted/20 align-top last:border-0" key={`${row.file}.${row.index}.${index}`}>
											<td className="px-3 py-3 text-muted-foreground">{row.file}</td>
											<td className="px-3 py-3 text-muted-foreground">Comment</td>
											<td className="px-3 py-3 text-muted-foreground">{row.value || "#"}</td>
											<td className="px-3 py-3" />
										</tr>
									) : null,
								)
							) : (
								<tr>
									<td className="px-3 py-6 text-muted-foreground" colSpan={4}>
										No package feeds found.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
				<div className="flex justify-end gap-2 border-t p-3">
					<Button disabled={!dirty || saving} onClick={() => setRows(savedRows)} type="button" variant="outline">
						Cancel
					</Button>
					<Button disabled={!dirty || saving} type="submit">
						Save feeds
					</Button>
				</div>
			</form>
		</Panel>
	);
}

function normalizePackageFeed(row: PackageFeedRow): PackageFeedRow {
	return {
		id: row.id ?? "",
		file: row.file ?? "",
		index: Number(row.index ?? 0),
		type: row.type === "comment" || row.type === "blank" ? row.type : "repository",
		enabled: row.enabled !== false,
		value: row.value ?? "",
		raw: row.raw,
	};
}

function AvailablePackageSearch({
	busy,
	onRunAction,
}: {
	busy: string | null;
	onRunAction: (action: "install" | "remove" | "update", name?: string, simulate?: boolean, options?: PackageActionOptions) => void | Promise<void>;
}) {
	const [query, setQuery] = useState("");
	const [result, setResult] = useState<PackageSearchResult | null>(null);
	const [loading, setLoading] = useState(false);
	const rows = useMemo(() => (result?.lines ?? []).map(parsePackageLine), [result?.lines]);

	async function submit(event?: FormEvent<HTMLFormElement>) {
		event?.preventDefault();

		const needle = query.trim();

		if (!needle) {
			setResult({
				query: "",
				manager: "unknown",
				lines: [],
				warnings: [],
				message: "Enter a package name or description to search.",
			});
			return;
		}

		setLoading(true);
		const nextResult = await searchPackages(needle);
		setResult(nextResult);
		setLoading(false);
	}

	return (
		<Panel
			title={
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<div>Available package search</div>
						<div className="mt-1 text-xs font-normal text-muted-foreground">
							Read-only package index search. Install and remove actions stay in LuCI compat until rollback parity is complete.
						</div>
					</div>
					<form className="flex w-full gap-2 sm:w-[26rem]" onSubmit={(event) => void submit(event)}>
						<div className="relative min-w-0 flex-1">
							<Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
							<Input
								className="pl-9"
								placeholder="Search package index"
								value={query}
								onChange={(event) => setQuery(event.target.value)}
							/>
						</div>
						<Button disabled={loading} type="submit">
							{loading ? "Searching" : "Search"}
						</Button>
					</form>
				</div>
			}
			flush
		>
			<div className="border-b px-3 py-2 text-xs text-muted-foreground">
				{result ? `${result.message} ${result.manager !== "unknown" ? `Manager: ${result.manager}.` : ""}` : "Search the configured package feeds."}
			</div>
			{result?.warnings.length ? (
				<div className="border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
					{result.warnings.slice(0, 2).join(" ")}
				</div>
			) : null}
			<div className="overflow-x-auto">
				<table className="w-full min-w-[58rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Package</th>
							<th className="px-3 py-2 font-medium">Version</th>
							<th className="px-3 py-2 font-medium">Description</th>
							<th className="px-3 py-2 font-medium">Actions</th>
						</tr>
					</thead>
					<tbody>
						{rows.length ? (
							rows.map((pkg) => (
								<tr className="border-b align-top last:border-0" key={pkg.line}>
									<td className="px-3 py-3 font-medium">{pkg.name}</td>
									<td className="px-3 py-3 font-mono text-xs text-muted-foreground">{pkg.version}</td>
									<td className="px-3 py-3">{pkg.description || "none"}</td>
									<td className="px-3 py-3">
										<div className="flex flex-wrap gap-1.5">
											<Button
												disabled={busy === `install:${pkg.name}:plan`}
												onClick={() => void onRunAction("install", pkg.name, true)}
												size="sm"
												type="button"
												variant="outline"
											>
												Plan install
											</Button>
											<Button
												disabled={busy === `install:${pkg.name}:apply`}
												onClick={() => void onRunAction("install", pkg.name, false)}
												size="sm"
												type="button"
												variant="outline"
											>
												Install
											</Button>
										</div>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td className="px-3 py-6 text-muted-foreground" colSpan={4}>
									{result ? "No available packages to show." : "No search run yet."}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}

function PackageUpgradeTable({
	actionBusy,
	entries,
	onRunAction,
}: {
	actionBusy: string | null;
	entries: PackageUpgradeEntry[];
	onRunAction: (action: "upgrade", name: string, simulate: boolean) => void | Promise<void>;
}) {
	return (
		<Panel
			title={
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<span>Available upgrades</span>
					<Button disabled={!entries.length || actionBusy === "upgrade::plan"} onClick={() => void onRunAction("upgrade", "", true)} size="sm" type="button" variant="outline">
						Plan all
					</Button>
				</div>
			}
			flush
		>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[42rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Package</th>
							<th className="px-3 py-2 font-medium">Installed</th>
							<th className="px-3 py-2 font-medium">Available</th>
							<th className="px-3 py-2 font-medium">Actions</th>
						</tr>
					</thead>
					<tbody>
						{entries.length ? (
							entries.map((entry) => (
								<tr className="border-b last:border-0" key={`${entry.name}.${entry.installed}.${entry.available}`}>
									<td className="px-3 py-3 font-medium">{entry.name}</td>
									<td className="px-3 py-3 font-mono text-xs text-muted-foreground">{entry.installed}</td>
									<td className="px-3 py-3 font-mono text-xs">{entry.available}</td>
									<td className="px-3 py-3">
										<Button
											disabled={actionBusy === `upgrade:${entry.name}:plan`}
											onClick={() => void onRunAction("upgrade", entry.name, true)}
											size="sm"
											type="button"
											variant="outline"
										>
											Plan upgrade
										</Button>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td className="px-3 py-6 text-muted-foreground" colSpan={4}>
									No package upgrades reported by the package manager.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</Panel>
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
	const networkDevices = parseSimpleLines(commandOutput(data.commands, "Network devices"));
	const triggers = countBy(leds.map((led) => led.trigger || "none"));

	return (
		<div className="grid gap-4">
			<div className="grid gap-3 sm:grid-cols-3">
				<MetricBlock label="LEDs" value={leds.length} />
				<MetricBlock label="Netdev triggers" value={triggers.netdev ?? 0} />
				<MetricBlock label="On" value={leds.filter((led) => Number(led.brightness) > 0).length} />
			</div>
			<LedConfigEditor ledNames={leds.map((led) => led.name)} networkDevices={networkDevices} sections={data.sections ?? []} />
			<LedSysfsTable entries={leds} />
		</div>
	);
}

function LedConfigEditor({ ledNames, networkDevices, sections }: { ledNames: string[]; networkDevices: string[]; sections: ConfigSection[] }) {
	const initial = useMemo(() => ledRowsFromSections(sections), [sections]);
	const [rows, setRows] = useState(initial);
	const [savedRows, setSavedRows] = useState(initial);
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

	function update(section: string, key: keyof LedConfigRow, value: string) {
		setRows((current) => current.map((row) => (row.section === section ? { ...row, [key]: value } : row)));
	}

	function addRow() {
		const sysfs = ledNames[0] ?? "";
		setRows((current) => [
			...current,
			{
				section: `new-${Date.now()}`,
				name: "New LED action",
				sysfs,
				trigger: "none",
				default: "0",
				dev: "",
				mode: "",
				interval: "",
				delayon: "",
				delayoff: "",
				inverted: "0",
			},
		]);
	}

	function removeRow(section: string) {
		setRows((current) => current.filter((row) => row.section !== section));
	}

	function moveRow(section: string, direction: -1 | 1) {
		setRows((current) => {
			const index = current.findIndex((row) => row.section === section);
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

	function updateMode(section: string, mode: string, enabled: boolean) {
		setRows((current) =>
			current.map((row) => {
				if (row.section !== section) {
					return row;
				}

				const modes = new Set(row.mode.split(/\s+/).filter(Boolean));
				if (enabled) {
					modes.add(mode);
				} else {
					modes.delete(mode);
				}

				return { ...row, mode: LED_NETDEV_MODES.map((entry) => entry.value).filter((value) => modes.has(value)).join(" ") };
			}),
		);
	}

	async function save() {
		setSaving(true);
		const result = await saveLedConfig(rows, rows.length === 0 && savedRows.length > 0);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextRows = ledRowsFromSections(result.sections.length ? result.sections : sections);
		setRows(nextRows);
		setSavedRows(nextRows);
		toast.success(result.message);
	}

	return (
		<Panel
			flush
			title={
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<span>LED actions</span>
					<Button disabled={saving} onClick={addRow} size="sm" type="button" variant="outline">
						<Plus className="size-4" />
						Add action
					</Button>
				</div>
			}
		>
				<div className="overflow-x-auto">
				<table className="w-full min-w-[84rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Name</th>
							<th className="px-3 py-2 font-medium">LED</th>
							<th className="px-3 py-2 font-medium">Trigger</th>
							<th className="px-3 py-2 font-medium">Default</th>
							<th className="px-3 py-2 font-medium">Invert</th>
							<th className="px-3 py-2 font-medium">Device</th>
							<th className="px-3 py-2 font-medium">Mode</th>
							<th className="px-3 py-2 font-medium">Interval</th>
							<th className="px-3 py-2 font-medium">Delay on</th>
							<th className="px-3 py-2 font-medium">Delay off</th>
							<th className="px-3 py-2 text-right font-medium">Order</th>
							<th className="px-3 py-2 text-right font-medium">Actions</th>
						</tr>
					</thead>
					<tbody>
						{rows.length ? (
							rows.map((row, index) => (
								<tr className="border-b align-top last:border-0" key={row.section}>
									<td className="px-3 py-2">
										<Input onChange={(event) => update(row.section, "name", event.target.value)} value={row.name} />
									</td>
									<td className="px-3 py-2">
										<select
											className="h-9 w-full rounded-md border bg-card px-2 text-sm"
											onChange={(event) => update(row.section, "sysfs", event.target.value)}
											value={row.sysfs}
										>
											{row.sysfs && !ledNames.includes(row.sysfs) ? <option value={row.sysfs}>{row.sysfs}</option> : null}
											{ledNames.map((name) => (
												<option key={name} value={name}>
													{name}
												</option>
											))}
										</select>
									</td>
									<td className="px-3 py-2">
										<select
											className="h-9 w-full rounded-md border bg-card px-2 text-sm"
											onChange={(event) => update(row.section, "trigger", event.target.value)}
											value={row.trigger}
										>
											{row.trigger && !LED_TRIGGERS.some((trigger) => trigger.value === row.trigger) ? (
												<option value={row.trigger}>{row.trigger}</option>
											) : null}
											{LED_TRIGGERS.map((trigger) => (
												<option key={trigger.value} value={trigger.value}>
													{trigger.label}
												</option>
											))}
										</select>
									</td>
									<td className="px-3 py-2">
										<select
											className="h-9 w-full rounded-md border bg-card px-2 text-sm"
											onChange={(event) => update(row.section, "default", event.target.value)}
											value={row.default}
										>
											<option value="0">off</option>
											<option value="1">on</option>
										</select>
									</td>
									<td className="px-3 py-2">
										<input
											checked={row.inverted === "1"}
											className="mt-2 size-4 accent-primary"
											disabled={row.trigger !== "heartbeat"}
											onChange={(event) => update(row.section, "inverted", event.target.checked ? "1" : "0")}
											type="checkbox"
										/>
									</td>
									<td className="px-3 py-2">
										{row.trigger === "netdev" ? (
											<select
												className="h-9 w-full rounded-md border bg-card px-2 text-sm"
												onChange={(event) => update(row.section, "dev", event.target.value)}
												value={row.dev}
											>
												<option value="">Select device</option>
												{row.dev && !networkDevices.includes(row.dev) ? <option value={row.dev}>{row.dev}</option> : null}
												{networkDevices.map((device) => (
													<option key={device} value={device}>
														{device}
													</option>
												))}
											</select>
										) : (
											<Input disabled onChange={(event) => update(row.section, "dev", event.target.value)} value={row.dev} />
										)}
									</td>
									<td className="px-3 py-2">
										{row.trigger === "netdev" ? (
											<div className="grid min-w-56 grid-cols-2 gap-2">
												{LED_NETDEV_MODES.map((mode) => (
													<label className="flex items-center gap-2 text-xs text-foreground" key={mode.value}>
														<input
															checked={row.mode.split(/\s+/).includes(mode.value)}
															className="size-3.5 accent-primary"
															onChange={(event) => updateMode(row.section, mode.value, event.target.checked)}
															type="checkbox"
														/>
														{mode.label}
													</label>
												))}
											</div>
										) : (
											<Input disabled onChange={(event) => update(row.section, "mode", event.target.value)} value={row.mode} />
										)}
									</td>
									<td className="px-3 py-2">
										<Input inputMode="numeric" onChange={(event) => update(row.section, "interval", event.target.value)} value={row.interval} />
									</td>
									<td className="px-3 py-2">
										<Input inputMode="numeric" onChange={(event) => update(row.section, "delayon", event.target.value)} value={row.delayon} />
									</td>
									<td className="px-3 py-2">
										<Input inputMode="numeric" onChange={(event) => update(row.section, "delayoff", event.target.value)} value={row.delayoff} />
									</td>
									<td className="px-3 py-2 text-right">
										<div className="inline-flex gap-1">
											<Button
												aria-label={`Move ${row.name} up`}
												disabled={index === 0}
												onClick={() => moveRow(row.section, -1)}
												size="icon"
												type="button"
												variant="ghost"
											>
												<ArrowUp className="size-4" />
											</Button>
											<Button
												aria-label={`Move ${row.name} down`}
												disabled={index === rows.length - 1}
												onClick={() => moveRow(row.section, 1)}
												size="icon"
												type="button"
												variant="ghost"
											>
												<ArrowDown className="size-4" />
											</Button>
										</div>
									</td>
									<td className="px-3 py-2 text-right">
										<Button aria-label={`Remove ${row.name}`} onClick={() => removeRow(row.section)} size="icon" type="button" variant="ghost">
											<Trash2 className="size-4" />
										</Button>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td className="px-3 py-6 text-muted-foreground" colSpan={12}>
									No LED actions configured.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
			<div className="mt-3 flex justify-end gap-2">
				<Button disabled={!dirty || saving} onClick={() => setRows(savedRows)} type="button" variant="outline">
					Cancel
				</Button>
				<Button disabled={!dirty || saving} onClick={() => void save()} type="button">
					Save
				</Button>
			</div>
		</Panel>
	);
}

function ledRowsFromSections(sections: ConfigSection[]): LedConfigRow[] {
	return sections
		.filter((section) => section.type === "led")
		.map((section) => ({
			section: section.name,
			name: configValue(section, "name") || section.name,
			sysfs: configValue(section, "sysfs"),
			trigger: configValue(section, "trigger") || "none",
			default: configValue(section, "default") === "1" ? "1" : "0",
			dev: configValue(section, "dev"),
			mode: configValue(section, "mode"),
			interval: configValue(section, "interval"),
			delayon: configValue(section, "delayon"),
			delayoff: configValue(section, "delayoff"),
			inverted: configValue(section, "inverted") === "1" ? "1" : "0",
		}));
}

function WirelessSummary({ data }: { data: NativePageData }) {
	const iwOutput = commandOutput(data.commands, "Wireless devices");
	const iwinfoOutput = commandOutput(data.commands, "Wireless status");
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
	const client = data.sections.find((section) => section.type === "client");

	return (
		<div className="grid gap-4">
			<div className="grid gap-3 sm:grid-cols-3">
				<MetricBlock label="Firmware" value={firmware.DISTRIB_DESCRIPTION ?? data.board.release?.description ?? "unknown"} />
				<MetricBlock label="Target" value={firmware.DISTRIB_TARGET ?? data.board.release?.target ?? "unknown"} />
				<MetricBlock label="Upgrade helper" value={helper || "unknown"} />
			</div>
			<AttendedSysupgradePlanPanel />
			<AttendedSysupgradeConfigPanel client={client} helper={helper} server={server} />
			<Panel title="Guardrails">
				<p className="text-sm text-muted-foreground">
					Image requests, package retention, build progress, and flash handoff remain in LuCI compat until the native flow
					has rollback-safe confirmation and progress RPCs.
				</p>
			</Panel>
		</div>
	);
}

function AttendedSysupgradeConfigSummary({ data }: { data: NativePageData }) {
	const helper = commandOutput(data.commands, "Upgrade helper").trim();
	const server = data.sections.find((section) => section.type === "server");
	const client = data.sections.find((section) => section.type === "client");

	return <AttendedSysupgradeConfigPanel client={client} helper={helper} server={server} />;
}

const attendedPlanActions: Array<{ action: AttendedSysupgradePlanAction; label: string; description: string }> = [
	{ action: "check", label: "Check", description: "Compare current firmware against the ASU server." },
	{ action: "list", label: "Package list", description: "Show packages that would be retained in a build request." },
	{ action: "blob", label: "Build request", description: "Render the capped ASU build request payload." },
];

function AttendedSysupgradePlanPanel() {
	const [result, setResult] = useState<AttendedSysupgradePlanResult | null>(null);
	const [running, setRunning] = useState<AttendedSysupgradePlanAction | null>(null);

	async function run(action: AttendedSysupgradePlanAction) {
		setRunning(action);
		const next = await runAttendedSysupgradePlan(action);
		setRunning(null);
		setResult(next);

		if (next.ok) {
			toast.success(next.message);
		}
		else {
			toast.warning(next.message);
		}
	}

	return (
		<Panel title="Upgrade planning">
			<div className="grid gap-4">
				<div className="grid gap-3 md:grid-cols-3">
					{attendedPlanActions.map((item) => (
						<div className="grid gap-2 rounded-md border bg-card p-3" key={item.action}>
							<div>
								<div className="text-sm font-medium">{item.label}</div>
								<div className="text-xs text-muted-foreground">{item.description}</div>
							</div>
							<Button disabled={running != null} onClick={() => void run(item.action)} type="button" variant="outline">
								{running === item.action ? "Running" : item.label}
							</Button>
						</div>
					))}
				</div>
				{result ? <AttendedSysupgradePlanOutput result={result} /> : null}
			</div>
		</Panel>
	);
}

function AttendedSysupgradePlanOutput({ result }: { result: AttendedSysupgradePlanResult }) {
	const lines = parseOutputLines([
		{
			stream: result.ok ? "stdout" : "stderr",
			text: result.output || result.message,
		},
	]);

	return (
		<div className="grid gap-3">
			<SimpleValueTable
				empty="No attended sysupgrade planning context."
				columns={["Field", "Value"]}
				rows={[
					["Helper", result.helper || "unknown"],
					["Action", result.action || "unknown"],
					["Command", result.command || "not run"],
					["Result", result.message || (result.ok ? "ok" : "blocked")],
				]}
				title="Planning result"
			/>
			{result.warnings.length ? (
				<OutputLinesTable
					empty="No warnings."
					lines={parseOutputLines([{ stream: "warning", text: result.warnings.join("\n") }])}
					title="Planning warnings"
				/>
			) : null}
			<OutputLinesTable empty="No planning output." lines={lines} title="Planning output" />
		</div>
	);
}

function AttendedSysupgradeConfigPanel({
	client,
	helper,
	server,
}: {
	client: ConfigSection | undefined;
	helper: string;
	server: ConfigSection | undefined;
}) {
	const initial = useMemo(() => attendedSysupgradeConfigValues(server, client), [server, client]);
	const [values, setValues] = useState(initial);
	const [savedValues, setSavedValues] = useState(initial);
	const [sections, setSections] = useState({ server, client });
	const [saving, setSaving] = useState(false);
	const dirty = JSON.stringify(values) !== JSON.stringify(savedValues);

	function update<K extends keyof AttendedSysupgradeConfigInput>(key: K, value: AttendedSysupgradeConfigInput[K]) {
		setValues((current) => ({ ...current, [key]: value }));
	}

	async function save() {
		setSaving(true);
		const result = await saveAttendedSysupgradeConfig(values);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		const nextServer = firstSection(result.sections, "server") ?? sections.server;
		const nextClient = firstSection(result.sections, "client") ?? sections.client;
		const nextValues = attendedSysupgradeConfigValues(nextServer, nextClient);
		setSections({ server: nextServer, client: nextClient });
		setValues(nextValues);
		setSavedValues(nextValues);
		toast.success(result.message);
	}

	return (
		<Panel
			title="Attended sysupgrade settings"
			actions={
				<Badge className={helper.includes("not installed") ? "" : "text-primary"}>
					{helper.includes("not installed") ? "manual / LuCI compat" : "helper available"}
				</Badge>
			}
		>
			<div className="grid gap-4">
				<div className="grid gap-3 md:grid-cols-2">
					<label className="grid gap-2 text-sm md:col-span-2">
						<span className="font-medium">Build server URL</span>
						<Input onChange={(event) => update("server_url", event.target.value)} value={values.server_url} />
					</label>
					<label className="grid gap-2 text-sm md:col-span-2">
						<span className="font-medium">Rebuilders</span>
						<textarea
							className="min-h-24 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
							onChange={(event) => update("rebuilder", event.target.value)}
							placeholder="One URL per line"
							spellCheck={false}
							value={values.rebuilder}
						/>
					</label>
					<AttendedSelect label="Retain installed packages" onChange={(value) => update("upgrade_packages", value)} value={values.upgrade_packages} />
					<AttendedSelect label="Auto search upgrades" onChange={(value) => update("auto_search", value)} value={values.auto_search} />
					<AttendedSelect label="Advanced mode" onChange={(value) => update("advanced_mode", value)} value={values.advanced_mode} />
					<AttendedSelect label="Login upgrade check" onChange={(value) => update("login_check_for_upgrades", value)} value={values.login_check_for_upgrades} />
				</div>
				<div className="flex justify-end gap-2">
					<Button disabled={!dirty || saving} onClick={() => setValues(savedValues)} type="button" variant="outline">
						Cancel
					</Button>
					<Button disabled={!dirty || saving} onClick={() => void save()} type="button">
						Save
					</Button>
				</div>
			</div>
		</Panel>
	);
}

function AttendedSelect({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
	return (
		<label className="grid gap-2 text-sm">
			<span className="font-medium">{label}</span>
			<select className="h-9 rounded-md border bg-card px-2 text-sm" onChange={(event) => onChange(event.target.value)} value={value}>
				<option value="1">enabled</option>
				<option value="0">disabled</option>
			</select>
		</label>
	);
}

function FlashSummary({ data }: { data: NativePageData }) {
	const filesystems = parseFilesystems(commandOutput(data.commands, "Mounted filesystems"));
	const partitions = parseFlashPartitions(commandOutput(data.commands, "Flash partitions"));
	const backup = data.flashBackup;
	const [checkingBackup, setCheckingBackup] = useState(false);
	const [creatingBackup, setCreatingBackup] = useState(false);
	const [restoreValidation, setRestoreValidation] = useState<RestoreBackupValidationResult | null>(null);
	const [restoreConfirm, setRestoreConfirm] = useState("");
	const [restoreChecking, setRestoreChecking] = useState(false);
	const [restoreApplying, setRestoreApplying] = useState(false);
	const [resetConfirm, setResetConfirm] = useState("");
	const [resetting, setResetting] = useState(false);
	const [selectedMtd, setSelectedMtd] = useState(backup?.mtdBlocks?.[0]?.id ?? "");
	const [downloadingMtd, setDownloadingMtd] = useState(false);
	const [firmwareValidation, setFirmwareValidation] = useState<FirmwareValidationResult | null>(null);
	const [firmwareConfirm, setFirmwareConfirm] = useState("");
	const [firmwareChecking, setFirmwareChecking] = useState(false);
	const [firmwareFlashing, setFirmwareFlashing] = useState(false);
	const [flashKeep, setFlashKeep] = useState(true);
	const [flashForce, setFlashForce] = useState(false);
	const [flashSkipOriginal, setFlashSkipOriginal] = useState(false);
	const [flashBackupPackages, setFlashBackupPackages] = useState(true);

	const hasRootfsData = Boolean(backup?.hasRootfsData);
	const mtdBlocks = backup?.mtdBlocks ?? [];

	async function checkBackup() {
		setCheckingBackup(true);
		const result = await createConfigBackup(true);
		setCheckingBackup(false);

		if (!result.ok) {
			toast.error(result.message);
			return;
		}

		toast.success(result.message);
	}

	async function createBackup() {
		setCreatingBackup(true);
		const result = await createConfigBackup();
		setCreatingBackup(false);

		if (!result.ok || !result.data) {
			toast.error(result.message);
			return;
		}

		downloadBase64File(result.filename || "openwrt-config-backup.tar.gz", result.mime || "application/gzip", result.data);
		toast.success(`${result.message} ${formatBytes(result.size)}`);
	}

	async function selectRestoreArchive(file: File | undefined) {
		if (!file) {
			return;
		}

		setRestoreChecking(true);
		setRestoreConfirm("");
		const result = await validateRestoreBackup(file.name, await fileToBase64(file));
		setRestoreChecking(false);
		setRestoreValidation(result);

		if (result.ok) {
			toast.success(result.message);
			return;
		}

		toast.error(result.message);
	}

	async function restoreBackup() {
		setRestoreApplying(true);
		const result = await applyRestoreBackup();
		setRestoreApplying(false);

		if (result.accepted) {
			toast.success(result.message);
			return;
		}

		toast.error(result.message);
	}

	async function factoryReset() {
		setResetting(true);
		const result = await applyFactoryReset();
		setResetting(false);

		if (result.accepted) {
			toast.success(result.message);
			return;
		}

		toast.error(result.message);
	}

	async function downloadSelectedMtd() {
		if (!selectedMtd) {
			toast.error("Select an MTD block first.");
			return;
		}

		setDownloadingMtd(true);
		const result = await downloadMtdBlock(selectedMtd);
		setDownloadingMtd(false);

		if (!result.ok || !result.data) {
			toast.error(result.message);
			return;
		}

		downloadBase64File(result.filename || "mtdblock.bin", result.mime || "application/octet-stream", result.data);
		toast.success(`${result.message} ${formatBytes(result.size)}`);
	}

	async function selectFirmwareImage(file: File | undefined) {
		if (!file) {
			return;
		}

		if (file.size > nativeFirmwareUploadLimit) {
			toast.error("Firmware image is too large for native ubus upload. Use LuCI compat for this image.");
			return;
		}

		setFirmwareChecking(true);
		setFirmwareConfirm("");
		setFlashForce(false);
		const result = await validateFirmwareImage(file.name, await fileToBase64(file));
		setFirmwareChecking(false);
		setFirmwareValidation(result);

		if (result.ok) {
			toast.success(result.message);
			return;
		}

		toast.error(result.message);
	}

	async function startFirmwareFlash() {
		const options: FirmwareFlashOptions = {
			confirm: "flash-firmware",
			keep: flashKeep,
			force: flashForce,
			skipOriginal: flashSkipOriginal,
			backupPackages: flashBackupPackages,
		};

		setFirmwareFlashing(true);
		const result = await flashFirmware(options);
		setFirmwareFlashing(false);

		if (result.accepted) {
			toast.success(result.message);
			return;
		}

		toast.error(result.message);
	}

	return (
		<div className="grid gap-4">
			<div className="grid gap-3 sm:grid-cols-3">
				<MetricBlock label="Firmware" value={data.board.release?.description ?? "unknown"} />
				<MetricBlock label="Root used" value={storagePercent(data.system.root)} />
				<MetricBlock label="Overlay free" value={formatStorageKiB(data.system.root?.free ?? data.system.root?.avail)} />
			</div>
			<Panel
				title="Configuration backup"
				actions={
					<div className="flex items-center gap-2">
						<Button disabled={checkingBackup || creatingBackup} onClick={() => void checkBackup()} size="sm" type="button" variant="outline">
							Check
						</Button>
						<Button disabled={creatingBackup} onClick={() => void createBackup()} size="sm" type="button" variant="outline">
							<Download className="size-4" />
							Download
						</Button>
					</div>
				}
			>
				<p className="text-sm text-muted-foreground">
					Create an authenticated sysupgrade configuration archive for this router.
				</p>
			</Panel>
			<Panel title="Restore and reset">
				<div className="grid gap-4 md:grid-cols-2">
					<div className="grid gap-2 text-sm">
						<div className="font-medium">Restore backup archive</div>
						<Input accept=".gz,.tgz,.tar.gz" disabled={restoreChecking || restoreApplying} onChange={(event) => void selectRestoreArchive(event.target.files?.[0])} type="file" />
						<div className="text-xs text-muted-foreground">Archive is validated before restore. Restore reboots the router.</div>
					</div>
					<div className="grid gap-2 text-sm">
						<div className="font-medium">Factory reset</div>
						<Input
							disabled={!hasRootfsData || resetting}
							onChange={(event) => setResetConfirm(event.target.value)}
							placeholder="type erase-settings"
							value={resetConfirm}
						/>
						<Button
							disabled={!hasRootfsData || resetConfirm !== "erase-settings" || resetting}
							onClick={() => void factoryReset()}
							type="button"
							variant="destructive"
						>
							Factory reset
						</Button>
						<div className="text-xs text-muted-foreground">
							{hasRootfsData ? "Erases configuration and reboots." : "Factory reset is unavailable on this target."}
						</div>
					</div>
				</div>
			</Panel>
			<Panel title="Firmware image">
				<div className="grid gap-2 text-sm">
					<Input accept=".bin,.img,.itb,.trx,.tar,.gz" disabled={!backup?.available || firmwareChecking || firmwareFlashing} onChange={(event) => void selectFirmwareImage(event.target.files?.[0])} type="file" />
					<div className="text-xs text-muted-foreground">
						Image is staged under /tmp and checked with sysupgrade before flashing. Native upload limit is {formatBytes(nativeFirmwareUploadLimit)}; use LuCI compat for larger images.
					</div>
				</div>
			</Panel>
			{mtdBlocks.length ? (
				<Panel
					title="MTD block download"
					actions={
						<Button disabled={!selectedMtd || downloadingMtd} onClick={() => void downloadSelectedMtd()} size="sm" type="button" variant="outline">
							<Download className="size-4" />
							Download
						</Button>
					}
				>
					<div className="grid gap-2 text-sm">
						<select className="h-9 rounded-md border bg-card px-2 text-sm" onChange={(event) => setSelectedMtd(event.target.value)} value={selectedMtd}>
							{mtdBlocks.map((block) => (
								<option key={block.id} value={block.id}>
									mtd{block.id}: {block.name} ({formatBytes(block.size)})
								</option>
							))}
						</select>
						<div className="text-xs text-muted-foreground">Raw MTD downloads are intended for recovery/debug workflows.</div>
					</div>
				</Panel>
			) : null}
			{backup ? (
				<BackupFileListTable available={backup.available} entries={backup.list} />
			) : null}
			{backup ? (
				<TextFileEditor
					helperText="Edit shell glob patterns included in sysupgrade configuration backups. Modified files in /etc/config and essential base files are still detected by sysupgrade."
					initialText={backup.config}
					onSave={saveSysupgradeConfig}
					title="Backup configuration list"
				/>
			) : null}
			<FilesystemTable entries={filesystems} />
			<FlashPartitionTable entries={partitions} />
			<Dialog className="max-w-2xl" onOpenChange={(open) => !open && setRestoreValidation(null)} open={Boolean(restoreValidation)} title="Restore backup archive">
				{restoreValidation ? (
					<div className="grid gap-4">
						<div className="grid gap-1 text-sm">
							<div className="font-medium">{restoreValidation.filename}</div>
							<div className={restoreValidation.ok ? "text-muted-foreground" : "text-destructive"}>{restoreValidation.message}</div>
						</div>
						<div className="max-h-72 overflow-auto rounded-md border">
							<table className="w-full text-left text-xs">
								<tbody>
									{restoreValidation.entries.length ? (
										restoreValidation.entries.map((entry) => (
											<tr className="border-b last:border-0" key={entry}>
												<td className="px-3 py-2 font-mono">{entry}</td>
											</tr>
										))
									) : (
										<tr>
											<td className="px-3 py-6 text-muted-foreground">No archive entries reported.</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
						<Input disabled={!restoreValidation.ok || restoreApplying} onChange={(event) => setRestoreConfirm(event.target.value)} placeholder="type restore-backup" value={restoreConfirm} />
						<div className="flex justify-end gap-2">
							<Button onClick={() => setRestoreValidation(null)} type="button" variant="outline">
								Cancel
							</Button>
							<Button disabled={!restoreValidation.ok || restoreConfirm !== "restore-backup" || restoreApplying} onClick={() => void restoreBackup()} type="button" variant="destructive">
								Restore and reboot
							</Button>
						</div>
					</div>
				) : null}
			</Dialog>
			<Dialog className="max-w-2xl" onOpenChange={(open) => !open && setFirmwareValidation(null)} open={Boolean(firmwareValidation)} title="Flash firmware image">
				{firmwareValidation ? (
					<div className="grid gap-4">
						<div className="grid gap-1 text-sm">
							<div className="font-medium">{firmwareValidation.filename}</div>
							<div className={firmwareValidation.valid && !firmwareValidation.tooBig ? "text-muted-foreground" : "text-destructive"}>{firmwareValidation.message}</div>
						</div>
						<SimpleValueTable
							columns={["Field", "Value"]}
							empty="No validation details."
							rows={[
								["Size", formatBytes(firmwareValidation.size)],
								["MD5", firmwareValidation.checksum || "unknown"],
								["SHA256", firmwareValidation.sha256sum || "unknown"],
								["Valid image", firmwareValidation.valid ? "yes" : "no"],
								["Allows backup", firmwareValidation.allowBackup ? "yes" : "no"],
								["Too large", firmwareValidation.tooBig ? "yes" : "no"],
							]}
							title="Validation"
						/>
						{firmwareValidation.output ? (
							<div className="max-h-40 overflow-auto rounded-md border bg-secondary/30 p-3 text-xs">
								{firmwareValidation.output.split("\n").map((line, index) => (
									<div className="font-mono" key={`${index}.${line}`}>
										{line || " "}
									</div>
								))}
							</div>
						) : null}
						<div className="grid gap-2 text-sm">
							<label className="flex items-center gap-2">
								<input checked={flashKeep} disabled={!firmwareValidation.allowBackup} onChange={(event) => setFlashKeep(event.target.checked)} type="checkbox" />
								Keep current configuration
							</label>
							<label className="flex items-center gap-2">
								<input checked={flashBackupPackages} disabled={!flashKeep} onChange={(event) => setFlashBackupPackages(event.target.checked)} type="checkbox" />
								Include installed package list in backup
							</label>
							<label className="flex items-center gap-2">
								<input checked={flashSkipOriginal} disabled={!flashKeep} onChange={(event) => setFlashSkipOriginal(event.target.checked)} type="checkbox" />
								Skip backup files identical to /rom
							</label>
							{(!firmwareValidation.valid || firmwareValidation.tooBig) && firmwareValidation.forceable ? (
								<label className="flex items-center gap-2 text-destructive">
									<input checked={flashForce} onChange={(event) => setFlashForce(event.target.checked)} type="checkbox" />
									Force upgrade
								</label>
							) : null}
						</div>
						<Input disabled={firmwareFlashing} onChange={(event) => setFirmwareConfirm(event.target.value)} placeholder="type flash-firmware" value={firmwareConfirm} />
						<div className="flex justify-end gap-2">
							<Button onClick={() => setFirmwareValidation(null)} type="button" variant="outline">
								Cancel
							</Button>
							<Button
								disabled={firmwareConfirm !== "flash-firmware" || firmwareFlashing || firmwareValidation.tooBig || (!firmwareValidation.valid && !flashForce)}
								onClick={() => void startFirmwareFlash()}
								type="button"
								variant="destructive"
							>
								Flash and reboot
							</Button>
						</div>
					</div>
				) : null}
			</Dialog>
		</div>
	);
}

function BackupFileListTable({ available, entries }: { available: boolean; entries: string[] }) {
	return (
		<Panel title="Current backup file list" flush>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[34rem] text-left text-sm">
					<thead className="border-b text-xs uppercase text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Path</th>
						</tr>
					</thead>
					<tbody>
						{available && entries.length ? (
							entries.map((entry) => (
								<tr className="border-b last:border-0" key={entry}>
									<td className="px-3 py-2 font-mono text-xs">{entry}</td>
								</tr>
							))
						) : (
							<tr>
								<td className="px-3 py-6 text-muted-foreground">
									{available ? "No backup file entries reported by sysupgrade." : "sysupgrade helper is not installed."}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}

function downloadBase64File(filename: string, mime: string, data: string) {
	const binary = atob(data);
	const bytes = new Uint8Array(binary.length);

	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}

	const blob = new Blob([bytes], { type: mime });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.append(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}

async function fileToBase64(file: File) {
	const bytes = new Uint8Array(await file.arrayBuffer());
	let binary = "";

	for (let offset = 0; offset < bytes.length; offset += 8192) {
		binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
	}

	return btoa(binary);
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

function formatBytes(value?: number) {
	if (!value || value <= 0) {
		return "0 B";
	}

	const units = ["B", "KB", "MB", "GB"];
	let size = value;
	let unit = 0;

	while (size >= 1024 && unit < units.length - 1) {
		size /= 1024;
		unit += 1;
	}

	return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
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

function parsePackageUpgrades(output: string): PackageUpgradeEntry[] {
	return output
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line && !line.startsWith("WARNING:") && !line.startsWith("Installed:"))
		.map((line) => {
			const apkMatch = /^(.+?)-([0-9][^\s]*)\s+<\s+(.+)$/.exec(line);
			const opkgMatch = /^(.+?)\s+-\s+(.+?)\s+-\s+(.+)$/.exec(line);

			if (apkMatch) {
				return {
					name: apkMatch[1],
					installed: apkMatch[2],
					available: apkMatch[3].trim(),
				};
			}

			if (opkgMatch) {
				return {
					name: opkgMatch[1],
					installed: opkgMatch[2],
					available: opkgMatch[3],
				};
			}

			return null;
		})
		.filter((entry): entry is PackageUpgradeEntry => entry != null);
}

function commandOutput(commands: CommandBlock[], title: string) {
	return commands.find((command) => command.title === title)?.output ?? "";
}

function parseSimpleLines(output: string) {
	return output
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
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

function firstSection(sections: ConfigSection[], type: string) {
	return sections.find((section) => section.type === type);
}

function configValue(section: ConfigSection | undefined, key: string, fallback = "") {
	return joinConfigValue(section?.values[key]) || fallback;
}

function joinConfigValue(value: ConfigSection["values"][string] | undefined) {
	if (Array.isArray(value)) {
		return value.map((item) => String(item)).join(", ");
	}

	if (value == null || value === "") {
		return "";
	}

	return String(value);
}

function textareaConfigList(value: ConfigSection["values"][string] | undefined) {
	if (Array.isArray(value)) {
		return value.map((item) => String(item)).join("\n");
	}

	return joinConfigValue(value);
}

function enabledText(value: ConfigSection["values"][string] | undefined) {
	const text = joinConfigValue(value);

	if (!text) {
		return "default";
	}

	return text === "1" || text === "true" || text === "on" || text === "yes" ? "enabled" : "disabled";
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

function PasswordPanel() {
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [saving, setSaving] = useState(false);
	const dirty = password.length > 0 || confirm.length > 0;
	const mismatch = confirm.length > 0 && password !== confirm;
	const strength = passwordStrength(password);
	const canSave = password.length >= 6 && confirm.length > 0 && !mismatch && !saving;

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (mismatch) {
			toast.error("Password confirmation does not match.");
			return;
		}

		setSaving(true);
		const result = await setRouterPassword("root", password, confirm);
		setSaving(false);

		if (!result.saved) {
			toast.error(result.message);
			return;
		}

		toast.success(result.message);
		setPassword("");
		setConfirm("");
	}

	return (
		<Panel title="Root password">
			<form className="grid max-w-xl gap-4" onSubmit={(event) => void submit(event)}>
				<div className="grid gap-2">
					<label className="text-sm font-medium" htmlFor="router-password">
						New password
					</label>
					<Input
						autoComplete="new-password"
						id="router-password"
						onChange={(event) => setPassword(event.target.value)}
						type="password"
						value={password}
					/>
					<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
						<span>Password strength</span>
						<Badge className={strength.className}>{strength.label}</Badge>
					</div>
				</div>
				<div className="grid gap-2">
					<label className="text-sm font-medium" htmlFor="router-password-confirm">
						Confirm password
					</label>
					<Input
						autoComplete="new-password"
						id="router-password-confirm"
						onChange={(event) => setConfirm(event.target.value)}
						type="password"
						value={confirm}
					/>
					{mismatch ? <p className="text-xs text-destructive">Password confirmation does not match.</p> : null}
				</div>
				<div className="flex justify-end gap-2">
					<Button
						disabled={!dirty || saving}
						onClick={() => {
							setPassword("");
							setConfirm("");
						}}
						type="button"
						variant="outline"
					>
						Cancel
					</Button>
					<Button disabled={!canSave} type="submit">
						Save
					</Button>
				</div>
			</form>
		</Panel>
	);
}

function passwordStrength(value: string) {
	if (!value) {
		return { label: "empty", className: "" };
	}

	let score = 0;
	if (value.length >= 8) score += 1;
	if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
	if (/[0-9]/.test(value)) score += 1;
	if (/[^A-Za-z0-9]/.test(value)) score += 1;

	if (score >= 4) {
		return { label: "strong", className: "text-primary" };
	}

	if (score >= 2) {
		return { label: "medium", className: "text-foreground" };
	}

	return { label: "weak", className: "text-destructive" };
}

function RebootPanel({ data }: { data: NativePageData | null }) {
	const uptime = commandOutput(data?.commands ?? [], "System uptime").trim();
	const hostname = data?.board?.hostname ?? "";
	const [confirm, setConfirm] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const canSubmit = Boolean(hostname) && confirm === hostname && !submitting;

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!canSubmit) {
			return;
		}

		setSubmitting(true);
		const result = await confirmReboot(confirm);
		setSubmitting(false);

		if (!result.accepted) {
			toast.error(result.message);
			return;
		}

		toast.success(result.message);
	}

	return (
		<div className="grid gap-4">
			<SimpleValueTable
				columns={["Signal", "Value"]}
				empty="No reboot context available."
				rows={[
					["Uptime", uptime || "unknown"],
					["Confirmation", hostname ? `type ${hostname}` : "hostname unavailable"],
				]}
				title="Reboot context"
			/>
			<Panel title="Reboot guard">
				<form className="grid gap-3" onSubmit={(event) => void submit(event)}>
					<p className="text-sm text-muted-foreground">
						Type the router hostname exactly to reboot. The request is sent through a dedicated confirm RPC.
					</p>
					<div className="grid gap-2 sm:max-w-md">
						<label className="text-sm font-medium" htmlFor="reboot-confirm">
							Router hostname
						</label>
						<Input
							autoComplete="off"
							id="reboot-confirm"
							onChange={(event) => setConfirm(event.target.value)}
							placeholder={hostname || "router hostname"}
							value={confirm}
						/>
					</div>
					<div className="flex justify-end gap-2">
						<Button disabled={!confirm || submitting} onClick={() => setConfirm("")} type="button" variant="outline">
							Cancel
						</Button>
						<Button disabled={!canSubmit} type="submit" variant="destructive">
							<Power className="mr-1 size-4" />
							Reboot
						</Button>
					</div>
				</form>
			</Panel>
		</div>
	);
}

function Panel({
	actions,
	title,
	children,
	flush = false,
}: {
	actions?: ReactNode;
	title: ReactNode;
	children: ReactNode;
	flush?: boolean;
}) {
	return (
		<section className="grid min-w-0 gap-3 border-t pt-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 className="text-base font-semibold">{title}</h2>
				{actions}
			</div>
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
