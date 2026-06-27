import {
	ArcElement,
	BarElement,
	CategoryScale,
	Chart as ChartJS,
	Filler,
	Legend,
	LinearScale,
	LineElement,
	PointElement,
	Tooltip,
} from "chart.js";
import type { ChartData, ChartOptions } from "chart.js";
import { Activity, Cpu, HardDrive, MemoryStick, Network, Wifi } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	getDashboardStatus,
	type DashboardStatus,
	type DeviceStatus,
	type DhcpLease,
	type NetworkInterfaceStatus,
	type WirelessAssociation,
} from "@/lib/rpc";

ChartJS.register(
	ArcElement,
	BarElement,
	CategoryScale,
	Filler,
	Legend,
	LinearScale,
	LineElement,
	PointElement,
	Tooltip,
);

type BandwidthSample = {
	label: string;
	rxMbps: number;
	txMbps: number;
	load: number;
	memory: number;
};

type DeviceRate = {
	name: string;
	rxMbps: number;
	txMbps: number;
	rxBytes: number;
	txBytes: number;
	up: boolean;
	carrier: boolean;
	speed: string;
};

type TrafficSourceOption = {
	id: string;
	label: string;
	detail: string;
	deviceNames: string[];
	default?: boolean;
};

const emptyStatus: DashboardStatus = {
	board: {},
	system: {},
	devices: {},
	dhcpLeases: [],
	wirelessAssociations: [],
};

const maxSamples = 24;
const pollOptions = [1000, 2000, 5000] as const;
const trafficSourceStorageKey = "i-love-luci.dashboard.trafficSource";

function defaultPollIntervalMs() {
	if (typeof window === "undefined") {
		return 5000;
	}

	const host = window.location.hostname.toLowerCase();
	const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);

	if (host === "localhost" || host.endsWith(".lan") || host.endsWith(".local")) {
		return 1000;
	}

	if (!ipv4) {
		return 5000;
	}

	const [, aText, bText] = ipv4;
	const a = Number(aText);
	const b = Number(bText);

	if (a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)) {
		return 1000;
	}

	return 5000;
}

const lineOptions: ChartOptions<"line"> = {
	responsive: true,
	maintainAspectRatio: false,
	interaction: {
		intersect: false,
		mode: "index",
	},
	plugins: {
		legend: {
			position: "bottom",
			labels: {
				boxWidth: 10,
				boxHeight: 10,
				usePointStyle: true,
			},
		},
		tooltip: {
			callbacks: {
				label: (item) => `${item.dataset.label}: ${formatMbps(Number(item.raw))}`,
			},
		},
	},
	scales: {
		x: {
			grid: {
				display: false,
			},
		},
		y: {
			beginAtZero: true,
			ticks: {
				callback: (value) => formatMbps(Number(value)),
			},
		},
	},
};

const doughnutOptions: ChartOptions<"doughnut"> = {
	responsive: true,
	maintainAspectRatio: false,
	cutout: "70%",
	plugins: {
		legend: {
			display: false,
		},
		tooltip: {
			callbacks: {
				label: (item) => `${item.label}: ${formatBytes(Number(item.raw))}`,
			},
		},
	},
};

const barOptions: ChartOptions<"bar"> = {
	responsive: true,
	maintainAspectRatio: false,
	plugins: {
		legend: {
			display: false,
		},
		tooltip: {
			callbacks: {
				label: (item) => `Load: ${Number(item.raw).toFixed(2)}`,
			},
		},
	},
	scales: {
		x: {
			grid: {
				display: false,
			},
		},
		y: {
			beginAtZero: true,
		},
	},
};

export function DashboardPage({ description, title = "Dashboard" }: { description?: string; title?: string }) {
	const [status, setStatus] = useState<DashboardStatus>(emptyStatus);
	const [samples, setSamples] = useState<BandwidthSample[]>([]);
	const [rates, setRates] = useState<DeviceRate[]>([]);
	const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
	const [loading, setLoading] = useState(true);
	const [pollIntervalMs, setPollIntervalMs] = useState(defaultPollIntervalMs);
	const [trafficSourceId, setTrafficSourceId] = useState(readTrafficSourcePreference);
	const previousStatus = useRef<DashboardStatus | null>(null);
	const previousTime = useRef<number | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function refresh() {
			const nextStatus = await getDashboardStatus();
			const now = Date.now();

			if (cancelled) {
				return;
			}

			const nextRates = computeRates(nextStatus, previousStatus.current, now, previousTime.current);
			const nextTrafficRates = selectTrafficRates(nextRates, nextStatus.interfaces, trafficSourceId);
			const totals = nextTrafficRates.reduce(
				(total, rate) => ({
					rxMbps: total.rxMbps + rate.rxMbps,
					txMbps: total.txMbps + rate.txMbps,
				}),
				{ rxMbps: 0, txMbps: 0 },
			);

			setStatus(nextStatus);
			setRates(nextRates);
			setUpdatedAt(new Date(now));
			setLoading(false);
			setSamples((current) => [
				...current.slice(Math.max(0, current.length - maxSamples + 1)),
				{
					label: formatTime(now),
					rxMbps: totals.rxMbps,
					txMbps: totals.txMbps,
					load: normaliseLoad(nextStatus.system.load?.[0]),
					memory: memoryUsage(nextStatus).percent,
				},
			]);

			previousStatus.current = nextStatus;
			previousTime.current = now;
		}

		void refresh();
		const timer = window.setInterval(() => void refresh(), pollIntervalMs);

		return () => {
			cancelled = true;
			window.clearInterval(timer);
		};
	}, [pollIntervalMs, trafficSourceId]);

	const memory = memoryUsage(status);
	const root = storageUsage(status.system.root);
	const tmp = storageUsage(status.system.tmp);
	const load1 = normaliseLoad(status.system.load?.[0]);
	const load5 = normaliseLoad(status.system.load?.[1]);
	const load15 = normaliseLoad(status.system.load?.[2]);
	const activeDevices = rates.filter((rate) => rate.carrier || rate.rxMbps > 0 || rate.txMbps > 0);
	const trafficSourceOptions = trafficSourceOptionsFor(status.interfaces);
	const selectedTrafficSource = trafficSourceOptions.find((option) => option.id === trafficSourceId) ?? trafficSourceOptions[0];
	const trafficRates = selectTrafficRates(rates, status.interfaces, trafficSourceId);
	const totalRx = trafficRates.reduce((sum, rate) => sum + rate.rxMbps, 0);
	const totalTx = trafficRates.reduce((sum, rate) => sum + rate.txMbps, 0);
	const trafficDetail = trafficRates.length
		? `${selectedTrafficSource.label}: ${trafficRates.map((rate) => rate.name).join(", ")}`
		: "Live aggregate";

	function changeTrafficSource(value: string) {
		writeTrafficSourcePreference(value);
		setTrafficSourceId(value);
		setSamples([]);
	}

	const bandwidthData = useMemo<ChartData<"line">>(
		() => ({
			labels: samples.map((sample) => sample.label),
			datasets: [
				{
					label: "Download",
					data: samples.map((sample) => sample.rxMbps),
					borderColor: "#0f766e",
					backgroundColor: "rgb(15 118 110 / 0.12)",
					fill: true,
					tension: 0.35,
					pointRadius: 0,
					pointHoverRadius: 3,
				},
				{
					label: "Upload",
					data: samples.map((sample) => sample.txMbps),
					borderColor: "#2563eb",
					backgroundColor: "rgb(37 99 235 / 0.08)",
					fill: true,
					tension: 0.35,
					pointRadius: 0,
					pointHoverRadius: 3,
				},
			],
		}),
		[samples],
	);

	const memoryData = useMemo<ChartData<"doughnut">>(
		() => ({
			labels: ["Used", "Available"],
			datasets: [
				{
					data: [memory.used, memory.available],
					backgroundColor: ["#0f766e", "#e4e4e7"],
					borderWidth: 0,
				},
			],
		}),
		[memory.available, memory.used],
	);

	const loadData = useMemo<ChartData<"bar">>(
		() => ({
			labels: ["1 min", "5 min", "15 min"],
			datasets: [
				{
					data: [load1, load5, load15],
					backgroundColor: ["#0f766e", "#2563eb", "#71717a"],
					borderRadius: 6,
				},
			],
		}),
		[load1, load15, load5],
	);

	return (
		<div className="mx-auto grid w-full max-w-7xl min-w-0 gap-5">
			<div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div className="min-w-0">
					<h1 className="text-2xl font-semibold">{title}</h1>
					<p className="break-words text-sm text-muted-foreground">
						{description ?? `${status.board.hostname ?? "Router"} · ${status.board.model ?? "OpenWrt"}`}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<div className="inline-flex rounded-md border bg-card p-0.5">
						{pollOptions.map((option) => (
							<Button
								aria-pressed={pollIntervalMs === option}
								key={option}
								onClick={() => setPollIntervalMs(option)}
								size="sm"
								type="button"
								variant={pollIntervalMs === option ? "secondary" : "ghost"}
							>
								{option / 1000}s
							</Button>
						))}
					</div>
					<Badge>{status.board.release?.version ?? "OpenWrt"}</Badge>
					<Badge>{updatedAt ? `Updated ${formatTime(updatedAt.getTime())}` : "Updating"}</Badge>
				</div>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
				<MetricCard icon={Network} label="Download" value={formatMbps(totalRx)} detail={trafficDetail} />
				<MetricCard icon={Activity} label="Upload" value={formatMbps(totalTx)} detail={trafficDetail} />
				<MetricCard icon={MemoryStick} label="Memory" value={`${memory.percent.toFixed(0)}%`} detail={formatBytes(memory.used)} />
				<MetricCard icon={HardDrive} label="Disk" value={`${root.percent.toFixed(0)}%`} detail="root filesystem used" />
				<MetricCard icon={Cpu} label="CPU load" value={load1.toFixed(2)} detail="1 minute average" />
			</div>

			<div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]">
				<Card>
					<CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<CardTitle>Bandwidth</CardTitle>
						<div className="flex flex-wrap items-center gap-2">
							<label className="text-xs text-muted-foreground" htmlFor="dashboard-traffic-source">
								Source
							</label>
							<select
								className="h-8 max-w-full rounded-md border bg-card px-2 text-sm"
								id="dashboard-traffic-source"
								onChange={(event) => changeTrafficSource(event.target.value)}
								value={selectedTrafficSource.id}
							>
								{trafficSourceOptions.map((option) => (
									<option key={option.id} value={option.id}>
										{option.label}
									</option>
								))}
							</select>
							<span className="text-xs text-muted-foreground">Polls every {pollIntervalMs / 1000}s</span>
						</div>
					</CardHeader>
					<CardContent>
						<div className="h-72">
							{loading ? <EmptyChartLabel label="Loading bandwidth" /> : <Line data={bandwidthData} options={lineOptions} />}
						</div>
					</CardContent>
				</Card>

				<div className="grid gap-5">
					<Card>
						<CardHeader>
							<CardTitle>Memory</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-4">
							<div className="grid justify-center gap-3">
								<div className="relative h-44 w-44">
									<Doughnut data={memoryData} options={doughnutOptions} />
									<div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
										<div>
											<div className="text-2xl font-semibold">{memory.percent.toFixed(0)}%</div>
											<div className="text-xs text-muted-foreground">used</div>
										</div>
									</div>
								</div>
								<ChartLegend
									items={[
										{ color: "#0f766e", label: `Used ${formatBytes(memory.used)}` },
										{ color: "#e4e4e7", label: `Available ${formatBytes(memory.available)}` },
									]}
								/>
							</div>
							<ResourceDetails
								rows={[
									["Total", formatBytes(memory.total)],
									["Available", formatBytes(memory.available)],
									["Free", formatBytes(status.system.memory?.free ?? 0)],
									["Cached", formatBytes(status.system.memory?.cached ?? 0)],
									["Buffered", formatBytes(status.system.memory?.buffered ?? 0)],
									["Shared", formatBytes(status.system.memory?.shared ?? 0)],
								]}
								summary="Memory details"
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Disk Space</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-4 text-sm">
							<StorageMeter label="Root filesystem" usage={root} />
							<StorageMeter label="Temporary filesystem" usage={tmp} />
							<ResourceDetails
								rows={[
									["Root total", formatBytes(root.total)],
									["Root used", formatBytes(root.used)],
									["Root free", formatBytes(Math.max(0, root.total - root.used))],
									["Temp total", formatBytes(tmp.total)],
									["Temp used", formatBytes(tmp.used)],
									["Temp free", formatBytes(Math.max(0, tmp.total - tmp.used))],
								]}
								summary="Disk details"
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>CPU load</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="h-48">
								<Bar data={loadData} options={barOptions} />
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			<div className="grid gap-5 xl:grid-cols-2">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between gap-3">
						<CardTitle>Associated Devices</CardTitle>
						<Badge>{status.wirelessAssociations?.length ?? 0} devices</Badge>
					</CardHeader>
					<CardContent className="p-0">
						<AssociationTable associations={status.wirelessAssociations ?? []} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between gap-3">
						<CardTitle>Active DHCP Leases</CardTitle>
						<Badge>{status.dhcpLeases?.length ?? 0} leases</Badge>
					</CardHeader>
					<CardContent className="p-0">
						<LeaseTable leases={status.dhcpLeases ?? []} />
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]">
				<Card>
					<CardHeader>
						<CardTitle>Interfaces</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<div className="overflow-x-auto">
							<table className="w-full min-w-[42rem] text-left text-sm">
								<thead className="border-b text-xs uppercase text-muted-foreground">
									<tr>
										<th className="px-4 py-3 font-medium">Device</th>
										<th className="px-4 py-3 font-medium">State</th>
										<th className="px-4 py-3 font-medium">Speed</th>
										<th className="px-4 py-3 text-right font-medium">Download</th>
										<th className="px-4 py-3 text-right font-medium">Upload</th>
										<th className="px-4 py-3 text-right font-medium">Transferred</th>
									</tr>
								</thead>
								<tbody>
									{activeDevices.length ? (
										activeDevices.map((device) => (
											<tr className="border-b last:border-0" key={device.name}>
												<td className="px-4 py-3 font-medium">{device.name}</td>
												<td className="px-4 py-3">
													<Badge className={device.carrier ? "text-primary" : ""}>
														{device.carrier ? "Connected" : device.up ? "Up" : "Down"}
													</Badge>
												</td>
												<td className="px-4 py-3 text-muted-foreground">{device.speed}</td>
												<td className="px-4 py-3 text-right">{formatMbps(device.rxMbps)}</td>
												<td className="px-4 py-3 text-right">{formatMbps(device.txMbps)}</td>
												<td className="px-4 py-3 text-right text-muted-foreground">
													{formatBytes(device.rxBytes + device.txBytes)}
												</td>
											</tr>
										))
									) : (
										<tr>
											<td className="px-4 py-6 text-muted-foreground" colSpan={6}>
												No active network devices reported by LuCI.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>System</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4 text-sm">
						<InfoRow label="Uptime" value={formatDuration(status.system.uptime ?? 0)} />
						<InfoRow label="Memory available" value={formatBytes(memory.available)} />
						<InfoRow label="Root filesystem" value={`${root.percent.toFixed(0)}% used`} />
						<InfoRow label="Temp filesystem" value={`${tmp.percent.toFixed(0)}% used`} />
						<InfoRow label="Kernel" value={status.board.release?.description ?? status.board.system ?? "Unavailable"} />
						<InfoRow label="Target" value={status.board.release?.target ?? "Unavailable"} />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function MetricCard({
	detail,
	icon: Icon,
	label,
	value,
}: {
	detail: string;
	icon: LucideIcon;
	label: string;
	value: string;
}) {
	return (
		<Card>
			<CardContent className="flex items-center justify-between gap-3 p-4">
				<div className="min-w-0">
					<p className="text-sm text-muted-foreground">{label}</p>
					<p className="mt-1 truncate text-2xl font-semibold">{value}</p>
					<p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
				</div>
				<div className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary text-primary">
					<Icon className="size-5" />
				</div>
			</CardContent>
		</Card>
	);
}

function ChartLegend({ items }: { items: Array<{ color: string; label: string }> }) {
	return (
		<div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
			{items.map((item) => (
				<span className="inline-flex items-center gap-1.5" key={item.label}>
					<span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
					{item.label}
				</span>
			))}
		</div>
	);
}

function ResourceDetails({ rows, summary }: { rows: Array<[string, string]>; summary: string }) {
	return (
		<details className="rounded-md border px-3 py-2 text-sm">
			<summary className="cursor-pointer font-medium">{summary}</summary>
			<div className="mt-3 grid gap-2">
				{rows.map(([label, value]) => (
					<InfoRow key={label} label={label} value={value} />
				))}
			</div>
		</details>
	);
}

function StorageMeter({ label, usage }: { label: string; usage: ReturnType<typeof storageUsage> }) {
	return (
		<div className="grid gap-2">
			<div className="flex items-center justify-between gap-3">
				<span className="font-medium">{label}</span>
				<span className="text-muted-foreground">
					{formatBytes(usage.used)} / {formatBytes(usage.total)}
				</span>
			</div>
			<div className="h-2 overflow-hidden rounded-full bg-secondary">
				<div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, usage.percent)}%` }} />
			</div>
		</div>
	);
}

function AssociationTable({ associations }: { associations: WirelessAssociation[] }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-[44rem] text-left text-sm">
				<thead className="border-b text-xs uppercase text-muted-foreground">
					<tr>
						<th className="px-4 py-3 font-medium">Station</th>
						<th className="px-4 py-3 font-medium">Interface</th>
						<th className="px-4 py-3 font-medium">SSID</th>
						<th className="px-4 py-3 text-right font-medium">Signal</th>
						<th className="px-4 py-3 text-right font-medium">Rate</th>
						<th className="px-4 py-3 text-right font-medium">Connected</th>
					</tr>
				</thead>
				<tbody>
					{associations.length ? (
						associations.map((device) => (
							<tr className="border-b last:border-0" key={`${device.interface}.${device.mac}`}>
								<td className="px-4 py-3 font-mono text-xs">{device.mac}</td>
								<td className="px-4 py-3">
									<span className="inline-flex items-center gap-2 font-medium">
										<Wifi className="size-4 text-muted-foreground" />
										{device.interface}
									</span>
								</td>
								<td className="px-4 py-3 text-muted-foreground">{device.ssid || "unknown"}</td>
								<td className="px-4 py-3 text-right">{formatSignal(device.signal, device.noise)}</td>
								<td className="px-4 py-3 text-right">{formatWirelessRate(device.rxRate, device.txRate)}</td>
								<td className="px-4 py-3 text-right text-muted-foreground">
									{formatDuration(device.connectedTime ?? 0)}
								</td>
							</tr>
						))
					) : (
						<tr>
							<td className="px-4 py-6 text-muted-foreground" colSpan={6}>
								No associated Wi-Fi devices reported.
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}

function LeaseTable({ leases }: { leases: DhcpLease[] }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-[44rem] text-left text-sm">
				<thead className="border-b text-xs uppercase text-muted-foreground">
					<tr>
						<th className="px-4 py-3 font-medium">Host</th>
						<th className="px-4 py-3 font-medium">IP</th>
						<th className="px-4 py-3 font-medium">MAC</th>
						<th className="px-4 py-3 text-right font-medium">Expires</th>
					</tr>
				</thead>
				<tbody>
					{leases.length ? (
						leases.map((lease) => (
							<tr className="border-b last:border-0" key={`${lease.mac}.${lease.ip}.${lease.clientId}`}>
								<td className="px-4 py-3 font-medium">{lease.hostname || "unknown"}</td>
								<td className="px-4 py-3 font-mono text-xs">{lease.ip}</td>
								<td className="px-4 py-3 font-mono text-xs">{lease.mac}</td>
								<td className="px-4 py-3 text-right">{formatDuration(lease.remaining)}</td>
							</tr>
						))
					) : (
						<tr>
							<td className="px-4 py-6 text-muted-foreground" colSpan={4}>
								No active DHCP leases found.
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
			<span className="text-muted-foreground">{label}</span>
			<span className="max-w-64 text-right font-medium">{value}</span>
		</div>
	);
}

function EmptyChartLabel({ label }: { label: string }) {
	return <div className="grid h-full place-items-center text-sm text-muted-foreground">{label}</div>;
}

function computeRates(
	status: DashboardStatus,
	previous: DashboardStatus | null,
	now: number,
	previousTimestamp: number | null,
): DeviceRate[] {
	const devices = Object.entries(status.devices)
		.filter(([name, device]) => isDashboardDevice(name, device))
		.sort(([left], [right]) => left.localeCompare(right));
	const elapsedSeconds = previousTimestamp ? Math.max(1, (now - previousTimestamp) / 1000) : 0;

	return devices.map(([name, device]) => {
		const stats = device.statistics ?? {};
		const previousStats = previous?.devices[name]?.statistics;
		const rxBytes = stats.rx_bytes ?? 0;
		const txBytes = stats.tx_bytes ?? 0;
		const rxDelta = previousStats ? Math.max(0, rxBytes - (previousStats.rx_bytes ?? 0)) : 0;
		const txDelta = previousStats ? Math.max(0, txBytes - (previousStats.tx_bytes ?? 0)) : 0;

		return {
			name,
			rxMbps: elapsedSeconds ? bytesToMbps(rxDelta, elapsedSeconds) : 0,
			txMbps: elapsedSeconds ? bytesToMbps(txDelta, elapsedSeconds) : 0,
			rxBytes,
			txBytes,
			up: Boolean(device.up),
			carrier: Boolean(device.carrier),
			speed: formatSpeed(device.speed),
		};
	});
}

function isDashboardDevice(name: string, device: DeviceStatus) {
	if (name === "lo" || !device.present) {
		return false;
	}

	if (device.devtype === "ethernet") {
		return true;
	}

	return Boolean(device.statistics && !device["bridge-members"]?.length);
}

function selectTrafficRates(rates: DeviceRate[], interfaces?: NetworkInterfaceStatus[], trafficSourceId = "all") {
	const source = trafficSourceOptionsFor(interfaces).find((option) => option.id === trafficSourceId);
	const deviceNames = source && !source.default ? source.deviceNames : defaultRouteDeviceNames(interfaces);
	const selectedRates = deviceNames
		.map((name) => rates.find((rate) => rate.name === name))
		.filter((rate): rate is DeviceRate => Boolean(rate));

	if (source && !source.default) {
		return selectedRates;
	}

	return selectedRates.length ? selectedRates : rates;
}

function trafficSourceOptionsFor(interfaces?: NetworkInterfaceStatus[]): TrafficSourceOption[] {
	const options: TrafficSourceOption[] = [
		{
			id: "all",
			label: "All WAN",
			detail: "Default WAN-like interfaces",
			deviceNames: defaultRouteDeviceNames(interfaces),
			default: true,
		},
	];
	const seen = new Set<string>();

	for (const iface of interfaces ?? []) {
		if (!iface.up || !isInternetFacingInterface(iface)) {
			continue;
		}

		const deviceName = iface.l3_device || iface.device;

		if (!deviceName || deviceName === "lo" || seen.has(deviceName)) {
			continue;
		}

		seen.add(deviceName);
		options.push({
			id: deviceName,
			label: iface.interface && iface.interface !== deviceName ? `${deviceName} via ${iface.interface}` : deviceName,
			detail: iface.proto ? `${iface.proto} interface` : "WAN-like interface",
			deviceNames: [deviceName],
		});
	}

	return options;
}

function defaultRouteDeviceNames(interfaces?: NetworkInterfaceStatus[]) {
	const names = new Set<string>();

	for (const iface of interfaces ?? []) {
		if (!iface.up || !isInternetFacingInterface(iface)) {
			continue;
		}

		const deviceName = iface.l3_device || iface.device;

		if (deviceName && deviceName !== "lo") {
			names.add(deviceName);
		}
	}

	return [...names];
}

function isInternetFacingInterface(iface: NetworkInterfaceStatus) {
	if (iface.route?.some((route) => route.mask === 0 && (route.target === "0.0.0.0" || route.target === "::"))) {
		return true;
	}

	const interfaceName = iface.interface ?? "";
	const deviceName = iface.l3_device || iface.device || "";

	return (
		/^(wan|wwan|lte|cellular|modem|wg|vpn|tun)/i.test(interfaceName) ||
		/^(pppoe-|wg|tun|wwan|lte|cellular|modem)/i.test(deviceName) ||
		/^(pppoe|wireguard|qmi|ncm|wwan|3g|lte|modemmanager|pptp|l2tp)$/i.test(iface.proto ?? "")
	);
}

function readTrafficSourcePreference() {
	if (typeof window === "undefined") {
		return "all";
	}

	return window.localStorage.getItem(trafficSourceStorageKey) || "all";
}

function writeTrafficSourcePreference(value: string) {
	if (typeof window === "undefined") {
		return;
	}

	window.localStorage.setItem(trafficSourceStorageKey, value);
}

function memoryUsage(status: DashboardStatus) {
	const total = status.system.memory?.total ?? 0;
	const available = status.system.memory?.available ?? status.system.memory?.free ?? 0;
	const used = Math.max(0, total - available);

	return {
		total,
		available,
		used,
		percent: total ? (used / total) * 100 : 0,
	};
}

function storageUsage(storage?: { total?: number; used?: number; free?: number; avail?: number }) {
	const total = storage?.total ?? 0;
	const used = storage?.used ?? Math.max(0, total - (storage?.avail ?? storage?.free ?? 0));

	return {
		total,
		used,
		percent: total ? (used / total) * 100 : 0,
	};
}

function normaliseLoad(value?: number) {
	if (!value) {
		return 0;
	}

	return value > 32 ? value / 65536 : value;
}

function bytesToMbps(bytes: number, elapsedSeconds: number) {
	return (bytes * 8) / elapsedSeconds / 1_000_000;
}

function formatMbps(value: number) {
	if (value >= 1000) {
		return `${(value / 1000).toFixed(2)} Gbps`;
	}

	if (value >= 10) {
		return `${value.toFixed(1)} Mbps`;
	}

	return `${value.toFixed(2)} Mbps`;
}

function formatBytes(value: number) {
	if (!value) {
		return "0 B";
	}

	const units = ["B", "KB", "MB", "GB", "TB"];
	const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
	const scaled = value / 1024 ** index;

	return `${scaled >= 10 || index === 0 ? scaled.toFixed(0) : scaled.toFixed(1)} ${units[index]}`;
}

function formatDuration(seconds: number) {
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	if (days) {
		return `${days}d ${hours}h`;
	}

	if (hours) {
		return `${hours}h ${minutes}m`;
	}

	return `${minutes}m`;
}

function formatSpeed(speed?: string | number) {
	if (!speed) {
		return "Unknown";
	}

	return typeof speed === "number" ? `${speed} Mbps` : String(speed);
}

function formatSignal(signal?: number | null, noise?: number | null) {
	if (signal == null) {
		return "Unknown";
	}

	return noise == null ? `${signal} dBm` : `${signal} dBm / ${noise} dBm`;
}

function formatWirelessRate(rxRate?: number | null, txRate?: number | null) {
	if (rxRate == null && txRate == null) {
		return "Unknown";
	}

	const rx = rxRate == null ? "?" : `${rxRate} Mbps`;
	const tx = txRate == null ? "?" : `${txRate} Mbps`;

	return `${rx} down / ${tx} up`;
}

function formatTime(timestamp: number) {
	return new Intl.DateTimeFormat(undefined, {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	}).format(timestamp);
}
