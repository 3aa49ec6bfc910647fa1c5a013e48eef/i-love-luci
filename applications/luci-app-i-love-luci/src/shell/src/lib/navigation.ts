import type { MenuItem } from "@/lib/rpc";

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
