import type { ConsoleLaunch } from "@/lib/rpc";

export function buildConsoleBaseUrl(status: ConsoleLaunch | null, host: string) {
	if (!status?.url) {
		return null;
	}

	return new URL(status.url.replace("{{host}}", host));
}

export function buildConsoleFallbackUrl(status: ConsoleLaunch | null, host: string) {
	const url = buildConsoleBaseUrl(status, host);

	if (!url) {
		return null;
	}

	if (status?.username && status.password) {
		url.username = status.username;
		url.password = status.password;
	}

	return url.toString();
}

export function buildConsoleEmbeddedUrl(status: ConsoleLaunch | null, host: string) {
	if (status?.username || status?.password) {
		return null;
	}

	return buildConsoleBaseUrl(status, host)?.toString() ?? null;
}
