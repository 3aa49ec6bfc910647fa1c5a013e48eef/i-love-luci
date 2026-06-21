import { useMemo } from "react";

import { getShellConfig } from "@/lib/config";
import { legacyHref } from "@/lib/navigation";

type LegacyFrameProps = {
	path: string;
};

const legacyFrameChromeStyle = `
#menubar,
#mainmenu,
#modemenu,
.skiplink,
p.luci {
	display: none !important;
}

body {
	padding-top: 0 !important;
}

#maincontainer,
#maincontent {
	display: block !important;
	width: 100% !important;
	max-width: none !important;
	min-height: 100vh !important;
	margin: 0 !important;
	padding: 0 !important;
}

#tabmenu {
	margin-top: 0 !important;
}
`;

function withLegacyFrameMarker(src: string) {
	const url = new URL(src, window.location.origin);
	url.searchParams.set("iloveluci_frame", "1");
	return `${url.pathname}${url.search}${url.hash}`;
}

function hideLegacyChrome(frame: HTMLIFrameElement | null) {
	const doc = frame?.contentDocument;

	if (!doc || doc.getElementById("iloveluci-legacy-frame-style")) {
		return;
	}

	const style = doc.createElement("style");
	style.id = "iloveluci-legacy-frame-style";
	style.textContent = legacyFrameChromeStyle;
	doc.head.appendChild(style);
	doc.documentElement.dataset.iloveluciFrame = "1";
	doc.body?.classList.add("iloveluci-embedded-frame");
}

export function LegacyFrame({ path }: LegacyFrameProps) {
	const config = getShellConfig();
	const src = useMemo(
		() => withLegacyFrameMarker(legacyHref(path, config.legacyBasePath)),
		[config.legacyBasePath, path],
	);

	return (
		<iframe
			className="h-[calc(100vh-5rem)] w-full border-0 bg-card"
			src={src}
			title="LuCI compatibility content"
			onLoad={(event) => hideLegacyChrome(event.currentTarget)}
		/>
	);
}
