import { useSearchParams } from "react-router-dom";

import { LegacyFrame } from "@/components/legacy/legacy-frame";

export function LegacyPage() {
	const [params] = useSearchParams();
	const path = params.get("path") ?? "/admin/status/overview";

	return <LegacyFrame path={path} />;
}
