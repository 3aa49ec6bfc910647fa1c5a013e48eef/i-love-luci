export function withLegacyFrameMarker(src: string, origin = window.location.origin) {
	const url = new URL(src, origin);
	url.searchParams.set("iloveluci_frame", "1");
	return `${url.pathname}${url.search}${url.hash}`;
}
