import { getShellConfig } from "@/lib/config";

const RETURN_TO_KEY = "iloveluci.returnTo";

export function currentHashRoute(location: Location = window.location): string {
	const hash = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;

	if (!hash || hash === "/login") {
		return "/";
	}

	return normalizeReturnRoute(hash);
}

export function normalizeReturnRoute(route: string | null | undefined): string {
	if (!route) {
		return "/";
	}

	const normalized = route.startsWith("/") ? route : `/${route}`;

	if (normalized.startsWith("//")) {
		return "/";
	}

	return normalized;
}

export function storeReturnRoute(route: string = currentHashRoute()): void {
	try {
		window.sessionStorage.setItem(RETURN_TO_KEY, normalizeReturnRoute(route));
	}
	catch {
		// Session storage may be unavailable in hardened browser modes.
	}
}

export function storeReturnRouteFromHash(): void {
	if (window.location.hash && window.location.hash !== "#/login") {
		storeReturnRoute(currentHashRoute());
	}
}

export function consumeReturnRoute(): string | null {
	try {
		const route = window.sessionStorage.getItem(RETURN_TO_KEY);
		window.sessionStorage.removeItem(RETURN_TO_KEY);

		if (!route) {
			return null;
		}

		return normalizeReturnRoute(route);
	}
	catch {
		return null;
	}
}

export function restoreReturnRouteAfterLogin(): void {
	if (getShellConfig().login) {
		storeReturnRouteFromHash();
		return;
	}

	const route = consumeReturnRoute();

	if (!route || route === currentHashRoute()) {
		return;
	}

	const nextUrl = `${window.location.pathname}${window.location.search}#${route}`;
	window.history.replaceState(null, "", nextUrl);
}

export function loginRedirectUrl(basePath: string, origin: string, route: string): string {
	const url = new URL(basePath, origin);
	url.hash = normalizeReturnRoute(route);
	return url.toString();
}

export function redirectToLogin(): void {
	const route = currentHashRoute();
	storeReturnRoute(route);

	const config = getShellConfig();
	window.location.assign(loginRedirectUrl(config.basePath, window.location.origin, route));
}
