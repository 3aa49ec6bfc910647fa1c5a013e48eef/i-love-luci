import {
	Activity,
	Boxes,
	ChevronRight,
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
	desktopOpen: boolean;
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
	const itemPath = item.resolvedPath ?? item.firstChildPath ?? item.path;

	if (target.startsWith("/legacy")) {
		return activeLegacyPath(search) === itemPath || pathname === itemPath;
	}

	return pathname === target;
}

function collectExpandablePaths(items: MenuItem[]) {
	return flattenMenu(items)
		.filter((item) => item.children?.length)
		.map((item) => item.path);
}

function NavItem({
	depth = 0,
	expanded,
	item,
	onClose,
	onToggle,
}: {
	depth?: number;
	expanded: Set<string>;
	item: MenuItem;
	onClose?: () => void;
	onToggle: (path: string) => void;
}) {
	const location = useLocation();
	const target = itemTarget(item);
	const active = isActive(item, location.pathname, location.search);
	const children = item.children ?? [];
	const hasChildren = children.length > 0;
	const isExpanded = expanded.has(item.path);

	return (
		<div className="min-w-0">
			<div className="flex items-center gap-1">
				<Link
					className={cn(
						"flex h-9 min-w-0 flex-1 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground",
						active && hasChildren && "font-semibold text-foreground",
						active && !hasChildren && "bg-secondary font-semibold text-foreground",
					)}
					style={{ paddingLeft: `${0.75 + depth * 0.85}rem` }}
					to={target}
					onClick={onClose}
				>
					{depth === 0 ? itemIcon(item) : <span className="size-4 shrink-0" />}
					<span className="min-w-0 truncate">{item.title}</span>
				</Link>
				{hasChildren ? (
					<Button
						className="size-8 shrink-0"
						size="icon"
						variant="ghost"
						aria-label={isExpanded ? `Collapse ${item.title}` : `Expand ${item.title}`}
						aria-expanded={isExpanded}
						onClick={() => onToggle(item.path)}
					>
						<ChevronRight className={cn("size-4 transition-transform duration-300 ease-out", isExpanded && "rotate-90")} />
					</Button>
				) : null}
			</div>
			{hasChildren ? (
				<div
					className={cn(
						"grid transition-[grid-template-rows,opacity] duration-300 ease-out",
						isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
					)}
				>
					<div className="mt-0.5 grid min-h-0 gap-0.5 overflow-hidden">
					{children.map((child) => (
						<NavItem
							depth={depth + 1}
							expanded={expanded}
							item={child}
							key={child.path}
							onClose={onClose}
							onToggle={onToggle}
						/>
					))}
					</div>
				</div>
			) : null}
		</div>
	);
}

function NavItems({ onClose }: { onClose?: () => void }) {
	const [tree, setTree] = useState<MenuItem[]>(fallbackTree);
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

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
	const expandablePaths = useMemo(() => collectExpandablePaths(visibleTree), [visibleTree]);
	const allExpanded = expandablePaths.length > 0 && expandablePaths.every((path) => expanded.has(path));

	function togglePath(path: string) {
		setExpanded((current) => {
			const next = new Set(current);

			if (next.has(path)) {
				next.delete(path);
			}
			else {
				next.add(path);
			}

			return next;
		});
	}

	function toggleAll() {
		setExpanded(allExpanded ? new Set() : new Set(expandablePaths));
	}

	return (
		<nav className="flex min-h-0 flex-1 flex-col gap-3">
			<div className="min-h-0 flex-1 overflow-y-auto pr-1">
				<div className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
					<div className="text-xs font-semibold uppercase text-muted-foreground">Navigation</div>
					<Button
						className="h-7 px-2 text-xs"
						size="sm"
						variant="ghost"
						type="button"
						disabled={!expandablePaths.length}
						onClick={toggleAll}
					>
						{allExpanded ? "Collapse all" : "Expand all"}
					</Button>
				</div>
				<div className="grid gap-1">
					{visibleTree.map((item) => (
						<NavItem expanded={expanded} item={item} key={item.path} onClose={onClose} onToggle={togglePath} />
					))}
				</div>
			</div>
			<div className="shrink-0 border-t pt-3">
				<NavItem expanded={expanded} item={fallbackTree[1]} onClose={onClose} onToggle={togglePath} />
			</div>
		</nav>
	);
}

export function Sidebar({ desktopOpen, open, onClose }: SidebarProps) {
	return (
		<>
			<aside
				className={cn(
					"hidden h-full min-h-0 shrink-0 flex-col overflow-hidden border-r bg-card transition-[width,opacity,padding,border-color] duration-300 ease-out lg:flex",
					desktopOpen ? "w-72 border-border p-3 opacity-100" : "w-0 border-transparent p-0 opacity-0",
				)}
				aria-hidden={!desktopOpen}
			>
				<div className={cn("min-h-0 w-[16.5rem] flex-1 transition-transform duration-300 ease-out", desktopOpen ? "translate-x-0" : "-translate-x-4")}>
					<NavItems />
				</div>
			</aside>
			<div className={cn("fixed inset-0 z-50 lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
				<button
					className={cn(
						"absolute inset-0 bg-foreground/30 transition-opacity duration-300 ease-out",
						open ? "opacity-100" : "opacity-0",
					)}
					type="button"
					aria-label="Close navigation overlay"
					onClick={onClose}
					tabIndex={open ? 0 : -1}
				/>
				<aside
					className={cn(
						"absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col overflow-hidden border-r bg-card p-3 shadow-xl transition-transform duration-300 ease-out",
						open ? "translate-x-0" : "-translate-x-full",
					)}
				>
					<div className="mb-2 flex shrink-0 items-center justify-between px-2">
						<span className="font-semibold">I Love LuCI</span>
						<Button size="icon" variant="ghost" aria-label="Close navigation" onClick={onClose} tabIndex={open ? 0 : -1}>
							<X className="size-5" />
						</Button>
					</div>
					<div className="min-h-0 flex-1">
						<NavItems onClose={onClose} />
					</div>
				</aside>
			</div>
		</>
	);
}
