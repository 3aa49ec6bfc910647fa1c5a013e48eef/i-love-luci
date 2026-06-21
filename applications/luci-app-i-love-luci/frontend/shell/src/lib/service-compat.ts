export function serviceCompatPath(service: string, focus = "") {
	if (service === "adblock-fast") {
		return "/admin/services/adblock-fast";
	}

	if (service === "banip") {
		return focus ? `/admin/services/banip/${focus}` : "/admin/services/banip";
	}

	return null;
}

export function nativePageCompatPath(page: string) {
	const paths: Record<string, string> = {
		attendedsysupgrade: "/admin/system/attendedsysupgrade/overview",
		flash: "/admin/system/flash",
		packages: "/admin/system/package-manager",
	};

	return paths[page] ?? null;
}

export function legacyTarget(path: string) {
	return `/legacy?path=${encodeURIComponent(path)}`;
}
