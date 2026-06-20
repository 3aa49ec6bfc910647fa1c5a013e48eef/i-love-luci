import { Activity, Cable, Cog, LayoutDashboard, Network } from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

const items = [
	{ title: "Dashboard", icon: LayoutDashboard, to: "/" },
	{ title: "Status overview", icon: Activity, to: "/legacy?path=%2Fadmin%2Fstatus%2Foverview" },
	{ title: "Network", icon: Network, to: "/legacy?path=%2Fadmin%2Fnetwork%2Fnetwork" },
	{ title: "DHCP and DNS", icon: Cable, to: "/legacy?path=%2Fadmin%2Fnetwork%2Fdhcp" },
	{ title: "Settings", icon: Cog, to: "/settings" },
];

export function Sidebar() {
	return (
		<aside className="hidden w-72 shrink-0 border-r bg-card p-3 lg:block">
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
					>
						<item.icon className="size-4" />
						{item.title}
					</NavLink>
				))}
			</nav>
		</aside>
	);
}
