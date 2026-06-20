import {
	Activity,
	Boxes,
	Cog,
	LayoutDashboard,
	Network,
	Server,
	Shield,
	SquareTerminal,
	Wifi,
	X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { flattenMenu, itemTarget } from "@/lib/navigation";
import { getMenuTree, type MenuItem } from "@/lib/rpc";
import { cn } from "@/lib/utils";

type SidebarProps = {
	open: boolean;
	onClose: () => void;
};

const fallbackTree: MenuItem[] = [
	{ title: "Dashboard", path: "/admin/status/overview", nativePath: "/", legacy: false },
	{ title: "Settings", path: "/settings", nativePath: "/settings", legacy: false },
];

function itemIcon(item: MenuItem) {
	const path = item.path;

	if (path === "/admin/status/overview") {
		return <LayoutDashboard className="size-4 shrink-0" />;
	}

	if (path.startsWith("/admin/status")) {
		return <Activity className="size-4 shrink-0" />;
	}

	if (path.startsWith("/admin/system")) {
		return <Server className="size-4 shrink-0" />;
	}

	if (path.startsWith("/admin/network")) {
		return <Network className="size-4 shrink-0" />;
	}

	if (path.startsWith("/admin/services")) {
		return <Boxes className="size-4 shrink-0" />;
	}

	if (path.startsWith("/admin/vpn")) {
		return <Shield className="size-4 shrink-0" />;
	}

	if (path.includes("wireless") || path.includes("wifi")) {
		return <Wifi className="size-4 shrink-0" />;
	}

	if (path === "/settings") {
		return <Cog className="size-4 shrink-0" />;
	}

	return <SquareTerminal className="size-4 shrink-0" />;
}

function activeLegacyPath(search: string) {
	return new URLSearchParams(search).get("path");
}

function isActive(item: MenuItem, pathname: string, search: string) {
	const target = itemTarget(item);

	if (target.startsWith("/legacy")) {
		return activeLegacyPath(search) === (item.resolvedPath ?? item.firstChildPath ?? item.path) && !item.children?.length;
	}

	return pathname === target && !item.children?.length;
}

function NavItem({ depth = 0, item, onClose }: { depth?: number; item: MenuItem; onClose?: () => void }) {
	const location = useLocation();
	const target = itemTarget(item);
	const active = isActive(item, location.pathname, location.search);
	const children = item.children ?? [];

	return (
		<div>
			<Link
				className={cn(
					"flex h-9 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground",
					active && "bg-secondary font-semibold text-foreground",
				)}
				style={{ paddingLeft: `${0.75 + depth * 0.85}rem` }}
				to={target}
				onClick={onClose}
			>
				{depth === 0 ? itemIcon(item) : <span className="size-4 shrink-0" />}
				<span className="min-w-0 truncate">{item.title}</span>
			</Link>
			{children.length ? (
				<div className="mt-0.5 grid gap-0.5">
					{children.map((child) => (
						<NavItem depth={depth + 1} item={child} key={child.path} onClose={onClose} />
					))}
				</div>
			) : null}
		</div>
	);
}

function NavItems({ onClose }: { onClose?: () => void }) {
	const [tree, setTree] = useState<MenuItem[]>(fallbackTree);

	useEffect(() => {
		let cancelled = false;

		void getMenuTree().then((menu) => {
			if (cancelled) {
				return;
			}

			setTree(menu.tree.length ? menu.tree : fallbackTree);
		});

		return () => {
			cancelled = true;
		};
	}, []);

	const visibleTree = useMemo(() => {
		const withoutSettings = tree.filter((item) => item.path !== "/settings");
		const hasDashboard = flattenMenu(withoutSettings).some((item) => item.path === "/admin/status/overview");
		const dashboard = hasDashboard ? [] : [fallbackTree[0]];

		return [...dashboard, ...withoutSettings];
	}, [tree]);

	return (
		<nav className="flex min-h-full flex-col gap-3">
			<div>
				<div className="px-3 pb-2 pt-3 text-xs font-semibold uppercase text-muted-foreground">Navigation</div>
				<div className="grid gap-1">
					{visibleTree.map((item) => (
						<NavItem item={item} key={item.path} onClose={onClose} />
					))}
				</div>
			</div>
			<div className="mt-auto border-t pt-3">
				<NavItem item={fallbackTree[1]} onClose={onClose} />
			</div>
		</nav>
	);
}

export function Sidebar({ open, onClose }: SidebarProps) {
	return (
		<>
			<aside className="hidden w-72 shrink-0 overflow-y-auto border-r bg-card p-3 lg:block">
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
					<aside className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col overflow-y-auto border-r bg-card p-3 shadow-xl">
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
