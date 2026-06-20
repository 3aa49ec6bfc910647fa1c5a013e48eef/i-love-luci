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
import { Activity, Cpu, MemoryStick, Network } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStatus, type DashboardStatus, type DeviceStatus, type NetworkInterfaceStatus } from "@/lib/rpc";

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

const emptyStatus: DashboardStatus = {
	board: {},
	system: {},
	devices: {},
};

const pollMs = 5000;
const maxSamples = 24;

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
			position: "bottom",
			labels: {
				boxWidth: 10,
				boxHeight: 10,
				usePointStyle: true,
			},
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

export function DashboardPage() {
	const [status, setStatus] = useState<DashboardStatus>(emptyStatus);
	const [samples, setSamples] = useState<BandwidthSample[]>([]);
	const [rates, setRates] = useState<DeviceRate[]>([]);
	const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
	const [loading, setLoading] = useState(true);
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
			const nextTrafficRates = selectTrafficRates(nextRates, nextStatus.interfaces);
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
		const timer = window.setInterval(() => void refresh(), pollMs);

		return () => {
			cancelled = true;
			window.clearInterval(timer);
		};
	}, []);

	const memory = memoryUsage(status);
	const root = storageUsage(status.system.root);
	const load1 = normaliseLoad(status.system.load?.[0]);
	const load5 = normaliseLoad(status.system.load?.[1]);
	const load15 = normaliseLoad(status.system.load?.[2]);
	const activeDevices = rates.filter((rate) => rate.carrier || rate.rxMbps > 0 || rate.txMbps > 0);
	const trafficRates = selectTrafficRates(rates, status.interfaces);
	const totalRx = trafficRates.reduce((sum, rate) => sum + rate.rxMbps, 0);
	const totalTx = trafficRates.reduce((sum, rate) => sum + rate.txMbps, 0);
	const trafficDetail = trafficRates.length
		? `WAN ${trafficRates.map((rate) => rate.name).join(", ")}`
		: "Live aggregate";

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
					<h1 className="text-2xl font-semibold">Dashboard</h1>
					<p className="break-words text-sm text-muted-foreground">
						{status.board.hostname ?? "Router"} · {status.board.model ?? "OpenWrt"}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Badge>{status.board.release?.version ?? "OpenWrt"}</Badge>
					<Badge>{updatedAt ? `Updated ${formatTime(updatedAt.getTime())}` : "Updating"}</Badge>
				</div>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<MetricCard icon={Network} label="Download" value={formatMbps(totalRx)} detail={trafficDetail} />
				<MetricCard icon={Activity} label="Upload" value={formatMbps(totalTx)} detail={trafficDetail} />
				<MetricCard icon={MemoryStick} label="Memory" value={`${memory.percent.toFixed(0)}%`} detail={formatBytes(memory.used)} />
				<MetricCard icon={Cpu} label="CPU load" value={load1.toFixed(2)} detail="1 minute average" />
			</div>

			<div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between gap-3">
						<CardTitle>Bandwidth</CardTitle>
						<span className="text-xs text-muted-foreground">Polls every {pollMs / 1000}s</span>
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
						<CardContent>
							<div className="relative h-56">
								<Doughnut data={memoryData} options={doughnutOptions} />
								<div className="pointer-events-none absolute inset-x-0 top-[42%] text-center">
									<div className="text-2xl font-semibold">{memory.percent.toFixed(0)}%</div>
									<div className="text-xs text-muted-foreground">used</div>
								</div>
							</div>
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
	icon: typeof Network;
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

function selectTrafficRates(rates: DeviceRate[], interfaces?: NetworkInterfaceStatus[]) {
	const deviceNames = defaultRouteDeviceNames(interfaces);
	const selectedRates = deviceNames
		.map((name) => rates.find((rate) => rate.name === name))
		.filter((rate): rate is DeviceRate => Boolean(rate));

	return selectedRates.length ? selectedRates : rates;
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

	return /^(wan|wwan|lte|cellular|modem)/i.test(iface.interface ?? "");
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

	return value > 1000 ? value / 65536 : value;
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

function formatTime(timestamp: number) {
	return new Intl.DateTimeFormat(undefined, {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	}).format(timestamp);
}
