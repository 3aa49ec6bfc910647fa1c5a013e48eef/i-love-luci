import { Navigate, useLocation, useSearchParams } from "react-router-dom";

import { LegacyFrame } from "@/components/legacy/legacy-frame";
import { legacyPathFromUnmatchedLocation } from "@/lib/legacy-route";

export function LegacyPage() {
	const [params] = useSearchParams();
	const path = params.get("path") ?? "/admin/status/overview";

	return <LegacyFrame path={path} />;
}

export function LegacyFallbackPage() {
	const location = useLocation();
	const path = legacyPathFromUnmatchedLocation(location.pathname, location.search, location.hash);

	if (!path) {
		return <Navigate to="/" replace />;
	}

	return <LegacyFrame path={path} />;
}
