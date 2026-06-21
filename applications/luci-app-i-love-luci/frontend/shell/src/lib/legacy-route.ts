export function legacyPathFromUnmatchedLocation(pathname: string, search = "", hash = "") {
	if (pathname === "/admin" || pathname.startsWith("/admin/")) {
		return `${pathname}${search}${hash}`;
	}

	return null;
}
