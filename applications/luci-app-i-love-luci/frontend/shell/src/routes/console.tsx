import { ExternalLink, SquareTerminal } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { buildConsoleEmbeddedUrl, buildConsoleFallbackUrl } from "@/lib/console-url";
import {
	closeConsole,
	getConsoleLaunch,
	getConsoleStatus,
	pollConsole,
	writeConsole,
	type ConsoleLaunch,
	type ConsoleStatus,
} from "@/lib/rpc";

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
			const hasDirectFallback = !!buildConsoleFallbackUrl(nextLaunch, window.location.hostname);
			setState(nextLaunch.available && nextLaunch.enabled && (hasDirectFallback || !!nextLaunch.sessionId) ? "ready" : "unavailable");
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
							Direct ttyd launcher. Same-origin tunnel is planned but is not active in this build.
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
				{state === "ready" && launch?.sessionId ? (
					<TunnelConsole pollAfterMs={launch.pollAfterMs} sessionId={launch.sessionId} />
				) : state === "ready" && embeddedUrl ? (
					<iframe className="size-full border-0" src={embeddedUrl} title="Router console" />
				) : (
					<div className="grid size-full place-items-center p-6 text-center text-sm text-muted-foreground">
						{state === "idle" ? <p>Open the console to start a session.</p> : null}
						{state === "loading" ? <p>Opening console...</p> : null}
						{state === "ready" && !embeddedUrl ? (
							<div className="grid max-w-xl gap-3">
								<p>Console tunnel is not available yet.</p>
								<p>Open console uses direct ttyd connectivity on port {launch?.port ?? status?.port ?? "7681"}.</p>
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

function TunnelConsole({ pollAfterMs, sessionId }: { pollAfterMs?: number; sessionId: string }) {
	const [output, setOutput] = useState("");
	const [sequence, setSequence] = useState(0);
	const [input, setInput] = useState("");
	const [active, setActive] = useState(true);
	const delay = Math.max(100, pollAfterMs ?? 200);

	useEffect(() => {
		let cancelled = false;
		let timer: number | null = null;

		async function poll() {
			const result = await pollConsole(sessionId, sequence);

			if (cancelled) {
				return;
			}

			if (!result.available || !result.active) {
				setActive(false);
				return;
			}

			if (result.output) {
				setOutput((current) => `${current}${result.output}`);
			}
			if (typeof result.sequence === "number") {
				setSequence(result.sequence);
			}

			timer = window.setTimeout(() => void poll(), delay);
		}

		void poll();

		return () => {
			cancelled = true;
			if (timer != null) {
				window.clearTimeout(timer);
			}
		};
	}, [delay, sequence, sessionId]);

	useEffect(() => {
		return () => {
			void closeConsole(sessionId);
		};
	}, [sessionId]);

	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!input || !active) {
			return;
		}
		const value = `${input}\n`;
		setInput("");
		await writeConsole(sessionId, value);
	}

	return (
		<div className="flex size-full flex-col bg-black text-sm text-zinc-100">
			<div className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono leading-relaxed">
				{output || "Opening router shell..."}
			</div>
			<form className="flex border-t border-zinc-800" onSubmit={(event) => void submit(event)}>
				<input
					className="min-w-0 flex-1 bg-black px-4 py-3 font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
					disabled={!active}
					onChange={(event) => setInput(event.target.value)}
					placeholder={active ? "Type a command" : "Console session ended"}
					value={input}
				/>
				<Button className="m-2" disabled={!active || !input} type="submit" variant="secondary">
					Send
				</Button>
			</form>
		</div>
	);
}
