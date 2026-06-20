import type { MenuItem } from "@/lib/rpc";

export function flattenMenu(items: MenuItem[]): MenuItem[] {
	return items.flatMap((item) => [item, ...flattenMenu(item.children ?? [])]);
}

export function itemTarget(item: MenuItem) {
	const path = item.resolvedPath ?? item.firstChildPath ?? item.path;
	const nativePath = item.nativePath ?? nativePathFor(path);

	if (nativePath && item.configuredMode !== "legacy") {
		return nativePath;
	}

	if (!item.legacy && path === "/settings") {
		return "/settings";
	}

	return `/legacy?path=${encodeURIComponent(path)}`;
}

export function nativePathFor(path: string) {
	const nativePaths: Record<string, string> = {
		"/admin/status/overview": "/",
		"/admin/status": "/",
		"/admin/network": "/core/network",
		"/admin/network/network": "/core/network",
		"/admin/network/routes": "/core/network",
		"/admin/network/dhcp": "/core/dhcp",
		"/admin/network/dns": "/core/dhcp",
		"/admin/network/firewall": "/core/firewall",
		"/admin/network/firewall/zones": "/core/firewall",
		"/admin/network/firewall/forwards": "/core/firewall",
		"/admin/network/firewall/rules": "/core/firewall",
		"/admin/network/firewall/snats": "/core/firewall",
		"/admin/network/firewall/ipsets": "/core/firewall",
		"/admin/network/firewall/custom": "/core/firewall",
		"/admin/system": "/core/system",
		"/admin/system/system": "/core/system",
		"/admin/system/admin": "/core/system",
		"/admin/system/admin/password": "/core/system",
		"/admin/system/admin/dropbear": "/core/system",
		"/admin/system/admin/sshkeys": "/core/system",
		"/admin/system/admin/uhttpd": "/core/system",
		"/admin/system/admin/repokeys": "/core/system",
		"/admin/system/leds": "/core/system",
		"/settings": "/settings",
	};

	return nativePaths[path] ?? null;
}

export function legacyHref(path: string, legacyBasePath: string) {
	if (path.startsWith("/admin/")) {
		return `${legacyBasePath}${path.slice("/admin".length)}`;
	}

	if (path.startsWith("/")) {
		return `${legacyBasePath}${path}`;
	}

	return `${legacyBasePath}/${path}`;
}

export function searchMenu(items: MenuItem[], query: string) {
	const needle = query.trim().toLowerCase();

	if (!needle) {
		return items;
	}

	return items.filter((item) => {
		return item.title.toLowerCase().includes(needle) || item.path.toLowerCase().includes(needle);
	});
}
