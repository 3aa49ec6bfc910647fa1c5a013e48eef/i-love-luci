import { ExternalLink, SquareTerminal } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { buildConsoleEmbeddedUrl, buildConsoleFallbackUrl } from "@/lib/console-url";
import { getConsoleLaunch, getConsoleStatus, type ConsoleLaunch, type ConsoleStatus } from "@/lib/rpc";

type ConsoleState = "idle" | "loading" | "ready" | "unavailable" | "error";

export function ConsolePage() {
	const [searchParams] = useSearchParams();
	const autoLaunch = searchParams.get("launch") === "1";
	const [status, setStatus] = useState<ConsoleStatus | null>(null);
	const [launch, setLaunch] = useState<ConsoleLaunch | null>(null);
	const [state, setState] = useState<ConsoleState>(autoLaunch ? "loading" : "idle");

	const launchConsole = useCallback(async (knownStatus?: ConsoleStatus | null) => {
		try {
			setState("loading");
			const nextStatus = knownStatus ?? (await getConsoleStatus());
			setStatus(nextStatus);
			if (!nextStatus.available || !nextStatus.enabled) {
				setState("unavailable");
				return;
			}

			const nextLaunch = await getConsoleLaunch();
			setLaunch(nextLaunch);
			setState(nextLaunch.available && nextLaunch.enabled && buildConsoleFallbackUrl(nextLaunch, window.location.hostname) ? "ready" : "unavailable");
		}
		catch {
			setState("error");
		}
	}, []);

	useEffect(() => {
		let cancelled = false;

		async function loadStatus() {
			try {
				const nextStatus = await getConsoleStatus();
				if (cancelled) {
					return;
				}

				setStatus(nextStatus);
				if (autoLaunch) {
					await launchConsole(nextStatus);
				}
				else {
					setState("idle");
				}
			}
			catch {
				if (!cancelled) {
					setState("error");
				}
			}
		}

		void loadStatus();

		return () => {
			cancelled = true;
		};
	}, [autoLaunch, launchConsole]);

	const fallbackUrl = buildConsoleFallbackUrl(launch, window.location.hostname);
	const embeddedUrl = buildConsoleEmbeddedUrl(launch, window.location.hostname);

	return (
		<div className="mx-auto grid h-[calc(100vh-7rem)] min-h-[36rem] w-full max-w-7xl grid-rows-[auto_1fr] gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
				<div className="flex items-center gap-3">
					<div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
						<SquareTerminal className="size-4" />
					</div>
					<div>
						<h1 className="text-lg font-semibold">Router console</h1>
						<p className="text-sm text-muted-foreground">
							Session-bound launcher for ttyd. Inline embedding is disabled when ttyd requires helper credentials.
						</p>
					</div>
				</div>
				{fallbackUrl ? (
					<Button
						type="button"
						variant="outline"
						onClick={() => window.open(fallbackUrl, "_blank", "noopener,noreferrer")}
					>
						<ExternalLink className="mr-2 size-4" />
						Open console
					</Button>
				) : (
					<Button disabled={state === "loading"} type="button" onClick={() => void launchConsole(status)}>
						<SquareTerminal className="mr-2 size-4" />
						Open console
					</Button>
				)}
			</div>

			<div className="min-h-0 overflow-hidden rounded-md border bg-black">
				{state === "ready" && embeddedUrl ? (
					<iframe className="size-full border-0" src={embeddedUrl} title="Router console" />
				) : (
					<div className="grid size-full place-items-center p-6 text-center text-sm text-muted-foreground">
						{state === "idle" ? <p>Open the console to start a session.</p> : null}
						{state === "loading" ? <p>Opening console...</p> : null}
						{state === "ready" && !embeddedUrl ? (
							<div className="grid max-w-xl gap-3">
								<p>Inline console needs a same-origin console proxy before it can avoid browser-visible ttyd credentials.</p>
								<p>Open console uses the current direct ttyd fallback.</p>
							</div>
						) : null}
						{state === "unavailable" ? (
							<div className="grid gap-2">
								<p>Console bridge is not available.</p>
								<p>ttyd status: {status?.available ? "installed" : "missing"} / {status?.enabled ? "enabled" : "disabled"}</p>
							</div>
						) : null}
						{state === "error" ? <p>Console launch failed. Refresh and try again.</p> : null}
					</div>
				)}
			</div>
		</div>
	);
}
