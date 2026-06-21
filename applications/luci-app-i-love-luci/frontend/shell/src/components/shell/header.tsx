import { Bell, LogOut, Menu, SquareTerminal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { HeaderSearch } from "@/components/shell/header-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
	getConsoleStatus,
	getPendingChangeList,
	getPendingChanges,
	getSessionInfo,
	revertPendingChanges,
	type ConsoleStatus,
	type PendingChange,
	type SessionInfo,
} from "@/lib/rpc";

type HeaderProps = {
	navigationOpen: boolean;
	onMenuClick: () => void;
};

export function Header({ navigationOpen, onMenuClick }: HeaderProps) {
	const [pending, setPending] = useState(0);
	const [session, setSession] = useState<SessionInfo | null>(null);
	const [consoleStatus, setConsoleStatus] = useState<ConsoleStatus | null>(null);
	const [consoleOpen, setConsoleOpen] = useState(false);
	const [pendingOpen, setPendingOpen] = useState(false);
	const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
	const [profileOpen, setProfileOpen] = useState(false);
	const user = session?.user ?? "root";
	const initials = useMemo(() => user.slice(0, 1).toUpperCase() || "R", [user]);

	useEffect(() => {
		void getSessionInfo().then(setSession);
		void getPendingChanges().then(setPending);
		void getConsoleStatus().then(setConsoleStatus);
	}, []);

	async function openConsole() {
		const status = consoleStatus ?? (await getConsoleStatus());
		setConsoleStatus(status);

		if (!status.available || !status.enabled) {
			setConsoleOpen(true);
			return;
		}

		window.open(`${window.location.pathname}${window.location.search}#/console?launch=1`, "_blank", "noopener,noreferrer");
	}

	async function openPending() {
		const changes = await getPendingChangeList();
		setPendingChanges(changes);
		setPending(changes.length);
		setPendingOpen(true);
	}

	async function discardPending() {
		const result = await revertPendingChanges();

		if (!result.reverted) {
			toast.error("Pending changes were not discarded.");
			return;
		}

		setPending(0);
		setPendingChanges([]);
		setPendingOpen(false);
		toast.success("Pending changes discarded.", {
			description: `${result.count} change${result.count === 1 ? "" : "s"} reverted.`,
		});
	}

	return (
		<header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-card/95 px-3 backdrop-blur sm:px-5">
			<Button
				className="shrink-0"
				size="icon"
				variant="ghost"
				aria-expanded={navigationOpen}
				aria-label={navigationOpen ? "Hide navigation" : "Show navigation"}
				onClick={onMenuClick}
			>
				<Menu className="size-5" />
			</Button>
			<Link className="hidden items-center gap-2 font-semibold sm:flex" to="/">
				<span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">IL</span>
				<span>I Love LuCI</span>
			</Link>
			<div className="min-w-0 flex-1 sm:mx-auto sm:max-w-xl">
				<HeaderSearch />
			</div>
			<div className="ml-auto flex shrink-0 items-center gap-2">
				{pending > 0 ? (
					<button
						className="hidden rounded-md border border-primary/30 px-2 py-1 text-xs font-medium text-primary sm:inline-flex"
						type="button"
						onClick={() => void openPending()}
					>
						{pending} pending
					</button>
				) : null}
				<Badge className="hidden sm:inline-flex">
					<Bell className="mr-1 size-3.5" />
					Idle
				</Badge>
				<Button
					size="icon"
					variant="outline"
					aria-label="Open console"
					title="Open console"
					onClick={() => void openConsole()}
				>
					<SquareTerminal className="size-4" />
				</Button>
				<div className="relative">
					<Button
						className="rounded-full font-semibold"
						size="icon"
						variant="outline"
						aria-expanded={profileOpen}
						aria-label="Profile"
						onClick={() => setProfileOpen((value) => !value)}
					>
						{initials}
					</Button>
					{profileOpen ? (
						<div className="absolute right-0 top-11 z-50 w-52 rounded-lg border bg-card p-1 text-sm shadow-xl">
							<div className="px-3 py-2 text-xs text-muted-foreground">Signed in as {user}</div>
							<a
								className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-secondary"
								href="/cgi-bin/luci/admin/logout"
							>
								<LogOut className="size-4" />
								Log out
							</a>
						</div>
					) : null}
				</div>
			</div>
			<Dialog
				className="max-w-5xl"
				open={consoleOpen}
				title="Router console"
				onOpenChange={setConsoleOpen}
			>
				{consoleStatus?.available && consoleStatus.enabled ? (
					<div className="grid gap-4 text-sm">
						<p className="text-muted-foreground">
							{consoleStatus.transport === "tunnel"
								? "Console tunnel is available through the authenticated I Love LuCI session."
								: `Console service is available on port ${consoleStatus.port}. This will use the trusted-LAN direct fallback.`}
						</p>
						<div className="flex justify-end">
							<Button variant="outline" onClick={() => void openConsole()}>
								Open console
							</Button>
						</div>
					</div>
				) : (
					<div className="grid gap-3 text-sm text-muted-foreground">
						<p>Console bridge is not available. Install and enable the `i-love-luci-console` helper on the router.</p>
					</div>
				)}
			</Dialog>
			<Dialog
				className="max-w-3xl"
				open={pendingOpen}
				title="Pending changes"
				onOpenChange={setPendingOpen}
			>
				<div className="grid gap-4">
					<div className="overflow-x-auto rounded-md border">
						<table className="w-full min-w-[40rem] text-left text-sm">
							<thead className="border-b text-xs uppercase text-muted-foreground">
								<tr>
									<th className="px-3 py-2 font-medium">Config</th>
									<th className="px-3 py-2 font-medium">Action</th>
									<th className="px-3 py-2 font-medium">Section</th>
									<th className="px-3 py-2 font-medium">Option</th>
									<th className="px-3 py-2 font-medium">Value</th>
								</tr>
							</thead>
							<tbody>
								{pendingChanges.length ? (
									pendingChanges.map((change, index) => (
										<tr className="border-b last:border-0" key={`${index}.${change.config}.${change.section}.${change.option}`}>
											<td className="px-3 py-3 font-medium">{change.config}</td>
											<td className="px-3 py-3">{change.action}</td>
											<td className="px-3 py-3 font-mono text-xs">{change.section || "none"}</td>
											<td className="px-3 py-3 font-mono text-xs">{change.option || "none"}</td>
											<td className="px-3 py-3 font-mono text-xs">{change.value || "none"}</td>
										</tr>
									))
								) : (
									<tr>
										<td className="px-3 py-6 text-muted-foreground" colSpan={5}>
											No pending changes.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => setPendingOpen(false)}>
							Close
						</Button>
						<Button disabled={!pendingChanges.length} variant="outline" onClick={() => void discardPending()}>
							Discard changes
						</Button>
					</div>
				</div>
			</Dialog>
		</header>
	);
}
