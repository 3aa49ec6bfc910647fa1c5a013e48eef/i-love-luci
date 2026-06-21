import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/app/app";
import { restoreReturnRouteAfterLogin } from "@/lib/auth";
import "@/styles/globals.css";

const root = document.getElementById("i-love-luci-root");

if (!root) {
	throw new Error("Missing #i-love-luci-root mount element");
}

restoreReturnRouteAfterLogin();

createRoot(root).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
