import { Bell, LogOut, Menu } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { HeaderSearch } from "@/components/shell/header-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPendingChanges, getSessionInfo, type SessionInfo } from "@/lib/rpc";

type HeaderProps = {
	onMenuClick: () => void;
};

export function Header({ onMenuClick }: HeaderProps) {
	const [pending, setPending] = useState(0);
	const [session, setSession] = useState<SessionInfo | null>(null);
	const [profileOpen, setProfileOpen] = useState(false);
	const user = session?.user ?? "root";
	const initials = useMemo(() => user.slice(0, 1).toUpperCase() || "R", [user]);

	useEffect(() => {
		void getSessionInfo().then(setSession);
		void getPendingChanges().then(setPending);
	}, []);

	return (
		<header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-card/95 px-3 backdrop-blur sm:px-5">
			<Button className="shrink-0 lg:hidden" size="icon" variant="ghost" aria-label="Open navigation" onClick={onMenuClick}>
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
					<Badge className="hidden border-primary/30 text-primary sm:inline-flex">{pending} pending</Badge>
				) : null}
				<Badge className="hidden sm:inline-flex">
					<Bell className="mr-1 size-3.5" />
					Idle
				</Badge>
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
		</header>
	);
}
