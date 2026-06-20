import { Bell, Menu, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { HeaderSearch } from "@/components/shell/header-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPendingChanges, getSessionInfo, type SessionInfo } from "@/lib/rpc";

export function Header() {
	const [pending, setPending] = useState(0);
	const [session, setSession] = useState<SessionInfo | null>(null);

	useEffect(() => {
		void getSessionInfo().then(setSession);
		void getPendingChanges().then(setPending);
	}, []);

	return (
		<header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-card/95 px-3 backdrop-blur sm:px-5">
			<Button className="lg:hidden" size="icon" variant="ghost" aria-label="Open navigation">
				<Menu className="size-5" />
			</Button>
			<Link className="hidden items-center gap-2 font-semibold sm:flex" to="/">
				<span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">IL</span>
				<span>I Love LuCI</span>
			</Link>
			<div className="mx-auto flex w-full max-w-xl items-center">
				<HeaderSearch />
			</div>
			<div className="ml-auto flex items-center gap-2">
				{pending > 0 ? (
					<Badge className="border-primary/30 text-primary">{pending} pending</Badge>
				) : null}
				<Badge className="hidden sm:inline-flex">
					<Bell className="mr-1 size-3.5" />
					Idle
				</Badge>
				<Button
					size="icon"
					variant="outline"
					aria-label="Profile"
					onClick={() =>
						toast("Profile", {
							description: `Signed in as ${session?.user ?? "root"}. Logout wiring comes with auth bridge.`,
						})
					}
				>
					<UserRound className="size-4" />
				</Button>
			</div>
		</header>
	);
}
