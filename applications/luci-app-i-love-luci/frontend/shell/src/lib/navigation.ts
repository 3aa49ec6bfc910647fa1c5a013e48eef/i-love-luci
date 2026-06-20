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
	if (path === "/admin/status/overview") {
		return "/";
	}

	if (path === "/settings") {
		return "/settings";
	}

	return null;
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
