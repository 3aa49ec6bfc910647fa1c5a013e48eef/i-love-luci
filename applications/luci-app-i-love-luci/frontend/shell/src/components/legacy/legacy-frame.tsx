import { useMemo } from "react";

import { getShellConfig } from "@/lib/config";
import { withLegacyFrameMarker } from "@/lib/legacy-frame-url";
import { legacyHref } from "@/lib/navigation";

type LegacyFrameProps = {
	path: string;
};

export const legacyFrameChromeStyle = `
:root {
	color-scheme: light;
	--iloveluci-bg: #fafafa;
	--iloveluci-card: #ffffff;
	--iloveluci-fg: #18181b;
	--iloveluci-muted: #71717a;
	--iloveluci-border: #e4e4e7;
	--iloveluci-subtle: #f4f4f5;
	--iloveluci-primary: #0f766e;
	--iloveluci-primary-hover: #115e59;
	--iloveluci-danger: #dc2626;
	--iloveluci-radius: 8px;
	--iloveluci-shadow: 0 1px 2px rgb(24 24 27 / 0.05);
	font-family: "Galano", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

html,
body {
	min-width: 0 !important;
	background: var(--iloveluci-bg) !important;
	color: var(--iloveluci-fg) !important;
	font-family: "Galano", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
	font-size: 14px !important;
	line-height: 1.5 !important;
}

#menubar,
#mainmenu,
#modemenu,
.navbar,
.brand,
.skiplink,
p.luci {
	display: none !important;
}

body {
	padding-top: 0 !important;
	margin: 0 !important;
}

#maincontainer,
#maincontent {
	display: block !important;
	width: 100% !important;
	max-width: none !important;
	min-height: 100dvh !important;
	margin: 0 !important;
	padding: 1rem !important;
	box-sizing: border-box !important;
	background: var(--iloveluci-bg) !important;
}

#tabmenu {
	margin: 0 0 1rem !important;
	padding: 0 !important;
	border: 0 !important;
	background: transparent !important;
}

#tabmenu ul,
.tabs {
	display: flex !important;
	flex-wrap: wrap !important;
	gap: 0.35rem !important;
	margin: 0 !important;
	padding: 0 !important;
	border: 0 !important;
	list-style: none !important;
}

#tabmenu li,
.tabs li {
	margin: 0 !important;
	border: 0 !important;
	background: transparent !important;
}

#tabmenu a,
.tabs a {
	display: inline-flex !important;
	align-items: center !important;
	min-height: 2rem !important;
	border: 1px solid var(--iloveluci-border) !important;
	border-radius: 999px !important;
	background: var(--iloveluci-card) !important;
	color: var(--iloveluci-muted) !important;
	padding: 0.35rem 0.75rem !important;
	text-decoration: none !important;
	box-shadow: var(--iloveluci-shadow) !important;
}

#tabmenu .active a,
.tabs .active a,
#tabmenu a.active,
.tabs a.active {
	border-color: rgb(15 118 110 / 0.35) !important;
	background: rgb(15 118 110 / 0.09) !important;
	color: var(--iloveluci-primary) !important;
	font-weight: 600 !important;
}

h1,
h2,
h3 {
	color: var(--iloveluci-fg) !important;
	font-weight: 650 !important;
	letter-spacing: 0 !important;
}

h1 {
	margin: 0 0 1rem !important;
	font-size: 1.5rem !important;
	line-height: 2rem !important;
}

h2 {
	margin: 0 0 0.75rem !important;
	font-size: 1.25rem !important;
	line-height: 1.75rem !important;
}

h3 {
	margin: 0 0 0.5rem !important;
	font-size: 1rem !important;
	line-height: 1.5rem !important;
}

p,
.cbi-value-description,
.cbi-section-descr,
.alert-message {
	color: var(--iloveluci-muted) !important;
}

a {
	color: var(--iloveluci-primary) !important;
}

.cbi-map,
.cbi-section,
.cbi-section-node,
.panel,
.modal,
.alert,
.alert-message,
.ifacebox,
.ifacebox-body,
.network-status-table,
.package-list {
	border: 1px solid var(--iloveluci-border) !important;
	border-radius: var(--iloveluci-radius) !important;
	background: var(--iloveluci-card) !important;
	box-shadow: var(--iloveluci-shadow) !important;
}

.cbi-map,
.cbi-section,
.panel,
.modal,
.alert,
.alert-message {
	margin: 0 0 1rem !important;
	padding: 1rem !important;
}

.cbi-section-node {
	margin: 0.75rem 0 !important;
	padding: 0.75rem !important;
}

.cbi-value {
	display: grid !important;
	grid-template-columns: minmax(10rem, 14rem) minmax(0, 1fr) !important;
	gap: 0.5rem 1rem !important;
	align-items: start !important;
	padding: 0.75rem 0 !important;
	border-bottom: 1px solid var(--iloveluci-border) !important;
}

.cbi-value:last-child {
	border-bottom: 0 !important;
}

.cbi-value-title {
	color: var(--iloveluci-fg) !important;
	font-weight: 600 !important;
}

.cbi-value-field {
	min-width: 0 !important;
}

input:not([type="checkbox"]):not([type="radio"]),
select,
textarea,
.cbi-input-text,
.cbi-input-select,
.cbi-input-password {
	min-height: 2.25rem !important;
	max-width: 100% !important;
	border: 1px solid var(--iloveluci-border) !important;
	border-radius: 6px !important;
	background: var(--iloveluci-card) !important;
	color: var(--iloveluci-fg) !important;
	padding: 0.4rem 0.6rem !important;
	box-shadow: none !important;
	box-sizing: border-box !important;
}

textarea {
	min-height: 6rem !important;
}

input:not([type="checkbox"]):not([type="radio"]):focus,
select:focus,
textarea:focus {
	outline: 2px solid rgb(15 118 110 / 0.35) !important;
	outline-offset: 2px !important;
	border-color: var(--iloveluci-primary) !important;
}

.btn,
button,
input[type="button"],
input[type="submit"],
.cbi-button {
	display: inline-flex !important;
	align-items: center !important;
	justify-content: center !important;
	min-height: 2.25rem !important;
	border: 1px solid var(--iloveluci-border) !important;
	border-radius: 6px !important;
	background: var(--iloveluci-card) !important;
	color: var(--iloveluci-fg) !important;
	padding: 0.4rem 0.8rem !important;
	font-weight: 600 !important;
	text-shadow: none !important;
	box-shadow: var(--iloveluci-shadow) !important;
	cursor: pointer !important;
}

.btn:hover,
button:hover,
input[type="button"]:hover,
input[type="submit"]:hover,
.cbi-button:hover {
	background: var(--iloveluci-subtle) !important;
}

.btn-primary,
.cbi-button-apply,
.cbi-button-save,
.cbi-button-positive,
input[type="submit"] {
	border-color: var(--iloveluci-primary) !important;
	background: var(--iloveluci-primary) !important;
	color: #ffffff !important;
}

.btn-primary:hover,
.cbi-button-apply:hover,
.cbi-button-save:hover,
.cbi-button-positive:hover,
input[type="submit"]:hover {
	background: var(--iloveluci-primary-hover) !important;
}

.btn-danger,
.cbi-button-negative,
.cbi-button-remove,
.cbi-button-reset {
	border-color: rgb(220 38 38 / 0.3) !important;
	color: var(--iloveluci-danger) !important;
}

.table,
table {
	width: 100% !important;
	border-collapse: separate !important;
	border-spacing: 0 !important;
	overflow: hidden !important;
	border: 1px solid var(--iloveluci-border) !important;
	border-radius: var(--iloveluci-radius) !important;
	background: var(--iloveluci-card) !important;
}

th,
td {
	border-bottom: 1px solid var(--iloveluci-border) !important;
	padding: 0.65rem 0.75rem !important;
	vertical-align: top !important;
}

th {
	background: var(--iloveluci-subtle) !important;
	color: var(--iloveluci-muted) !important;
	font-size: 0.78rem !important;
	font-weight: 700 !important;
	text-transform: uppercase !important;
}

tr:last-child > td {
	border-bottom: 0 !important;
}

.cbi-page-actions,
.right,
.actions {
	display: flex !important;
	flex-wrap: wrap !important;
	gap: 0.5rem !important;
	justify-content: flex-end !important;
	align-items: center !important;
}

.cbi-page-actions {
	position: sticky !important;
	bottom: 0 !important;
	z-index: 20 !important;
	margin: 1rem -1rem -1rem !important;
	padding: 0.75rem 1rem !important;
	border-top: 1px solid var(--iloveluci-border) !important;
	background: rgb(255 255 255 / 0.95) !important;
	backdrop-filter: blur(10px) !important;
}

@media (max-width: 700px) {
	#maincontent {
		padding: 0.75rem !important;
	}

	.cbi-value {
		grid-template-columns: minmax(0, 1fr) !important;
	}

	.cbi-map,
	.cbi-section,
	.panel,
	.modal,
	.alert,
	.alert-message {
		padding: 0.75rem !important;
	}

	.table,
	table {
		display: block !important;
		overflow-x: auto !important;
	}
}
`;

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
		<div className="iloveluci-legacy-frame flex h-[calc(100dvh-10rem)] min-h-[32rem] w-full min-w-0 flex-1 overflow-hidden rounded-md border bg-card shadow-sm">
			<iframe
				className="min-h-0 flex-1 border-0 bg-card"
				src={src}
				title="LuCI compatibility content"
				onLoad={(event) => hideLegacyChrome(event.currentTarget)}
			/>
		</div>
	);
}
