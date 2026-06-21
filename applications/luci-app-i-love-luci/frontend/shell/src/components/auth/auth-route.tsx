import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { redirectToLogin } from "@/lib/auth";
import { probeAuthSession } from "@/lib/rpc";

type AuthRouteProps = {
	children: ReactNode;
};

const MIN_PROBE_INTERVAL_MS = 10_000;
const RESUME_PROBE_DELAY_MS = 150;

export function AuthRoute({ children }: AuthRouteProps) {
	const checkingRef = useRef(false);
	const lastProbeRef = useRef(0);

	useEffect(() => {
		let disposed = false;
		let timer: number | null = null;

		async function checkAuth(force = false) {
			const now = Date.now();

			if (checkingRef.current || (!force && now - lastProbeRef.current < MIN_PROBE_INTERVAL_MS)) {
				return;
			}

			checkingRef.current = true;
			lastProbeRef.current = now;

			const result = await probeAuthSession();
			checkingRef.current = false;

			if (!disposed && result.status === "expired") {
				redirectToLogin();
			}
		}

		function scheduleCheck(force = false) {
			if (timer != null) {
				window.clearTimeout(timer);
			}

			timer = window.setTimeout(() => {
				timer = null;
				void checkAuth(force);
			}, RESUME_PROBE_DELAY_MS);
		}

		function handleVisibilityChange() {
			if (document.visibilityState === "visible") {
				scheduleCheck(true);
			}
		}

		function handleFocus() {
			scheduleCheck(false);
		}

		function handlePageShow() {
			scheduleCheck(false);
		}

		void checkAuth(true);
		window.addEventListener("focus", handleFocus);
		window.addEventListener("pageshow", handlePageShow);
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			disposed = true;

			if (timer != null) {
				window.clearTimeout(timer);
			}

			window.removeEventListener("focus", handleFocus);
			window.removeEventListener("pageshow", handlePageShow);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, []);

	return children;
}
