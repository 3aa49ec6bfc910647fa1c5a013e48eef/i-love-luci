import type { MenuItem } from "@/lib/rpc";

export function flattenMenu(items: MenuItem[]): MenuItem[] {
	return items.flatMap((item) => [item, ...flattenMenu(item.children ?? [])]);
}

export function itemTarget(item: MenuItem) {
	const path = item.resolvedPath ?? item.firstChildPath ?? item.path;
	const nativePath = item.nativePath ?? nativePathFor(path);
	const effectiveMode = item.effectiveMode ?? (item.legacy ? "legacy" : "modern");

	if (nativePath && effectiveMode === "modern") {
		return nativePath;
	}

	if (path === "/settings" && effectiveMode !== "legacy") {
		return "/settings";
	}

	return `/legacy?path=${encodeURIComponent(path)}`;
}

export function nativePathFor(path: string) {
	const nativePaths: Record<string, string> = {
		"/admin/status/overview": "/",
		"/admin/status": "/",
		"/admin/status/routes": "/native/status-routes",
		"/admin/status/nftables": "/native/firewall-status",
		"/admin/status/logs": "/native/logs",
		"/admin/status/logs/syslog": "/native/logs",
		"/admin/status/logs/dmesg": "/native/logs",
		"/admin/status/processes": "/native/processes",
		"/admin/status/realtime": "/realtime",
		"/admin/status/realtime/load": "/realtime",
		"/admin/status/realtime/bandwidth": "/realtime",
		"/admin/status/realtime/connections": "/native/connections",
		"/admin/network": "/core/network",
		"/admin/network/network": "/core/network",
		"/admin/network/routes": "/core/network",
		"/admin/network/diagnostics": "/native/diagnostics",
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
		"/admin/system/admin": "/native/password",
		"/admin/system/admin/password": "/native/password",
		"/admin/system/admin/dropbear": "/native/service/dropbear",
		"/admin/system/admin/sshkeys": "/native/sshkeys",
		"/admin/system/admin/uhttpd": "/native/service/uhttpd",
		"/admin/system/admin/repokeys": "/native/repokeys",
		"/admin/system/package-manager": "/native/packages",
		"/admin/system/startup": "/native/startup",
		"/admin/system/crontab": "/native/crontab",
		"/admin/system/flash": "/native/flash",
		"/admin/system/commands": "/native/service/commands",
		"/admin/system/commands/dashboard": "/native/service/commands",
		"/admin/system/commands/config": "/native/service/commands",
		"/admin/system/i-love-luci-theme": "/settings",
		"/admin/system/reboot": "/native/reboot",
		"/admin/system/leds": "/native/leds",
		"/admin/services": "/native/services",
		"/admin/services/banip": "/native/service/banip",
		"/admin/services/banip/overview": "/native/service/banip",
		"/admin/services/banip/allowlist": "/native/service/banip/allowlist",
		"/admin/services/banip/blocklist": "/native/service/banip/blocklist",
		"/admin/services/banip/feeds": "/native/service/banip/feeds",
		"/admin/services/banip/setreport": "/native/service/banip/setreport",
		"/admin/services/banip/firewall_log": "/native/service/banip/firewall_log",
		"/admin/services/banip/processing_log": "/native/service/banip/processing_log",
		"/admin/services/adblock-fast": "/native/service/adblock-fast",
		"/admin/services/upnp": "/native/service/upnpd",
		"/admin/services/uhttpd": "/native/service/uhttpd",
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
