import { Activity, Cable, Cog, LayoutDashboard, Network, X } from "lucide-react";
import { NavLink } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const items = [
	{ title: "Dashboard", icon: LayoutDashboard, to: "/" },
	{ title: "Status overview", icon: Activity, to: "/legacy?path=%2Fadmin%2Fstatus%2Foverview" },
	{ title: "Network", icon: Network, to: "/legacy?path=%2Fadmin%2Fnetwork%2Fnetwork" },
	{ title: "DHCP and DNS", icon: Cable, to: "/legacy?path=%2Fadmin%2Fnetwork%2Fdhcp" },
	{ title: "Settings", icon: Cog, to: "/settings" },
];

type SidebarProps = {
	open: boolean;
	onClose: () => void;
};

function NavItems({ onClose }: { onClose?: () => void }) {
	return (
		<nav className="grid gap-1">
			<div className="px-3 pb-2 pt-3 text-xs font-semibold uppercase text-muted-foreground">Navigation</div>
			{items.map((item) => (
				<NavLink
					className={({ isActive }) =>
						cn(
							"flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground",
							isActive && "bg-secondary font-semibold text-foreground",
						)
					}
					key={item.to}
					to={item.to}
					onClick={onClose}
				>
					<item.icon className="size-4" />
					{item.title}
				</NavLink>
			))}
		</nav>
	);
}

export function Sidebar({ open, onClose }: SidebarProps) {
	return (
		<>
			<aside className="hidden w-72 shrink-0 border-r bg-card p-3 lg:block">
				<NavItems />
			</aside>
			{open ? (
				<div className="fixed inset-0 z-50 lg:hidden">
					<button
						className="absolute inset-0 bg-foreground/30"
						type="button"
						aria-label="Close navigation overlay"
						onClick={onClose}
					/>
					<aside className="absolute inset-y-0 left-0 w-[min(20rem,85vw)] border-r bg-card p-3 shadow-xl">
						<div className="mb-2 flex items-center justify-between px-2">
							<span className="font-semibold">I Love LuCI</span>
							<Button size="icon" variant="ghost" aria-label="Close navigation" onClick={onClose}>
								<X className="size-5" />
							</Button>
						</div>
						<NavItems onClose={onClose} />
					</aside>
				</div>
			) : null}
		</>
	);
}
