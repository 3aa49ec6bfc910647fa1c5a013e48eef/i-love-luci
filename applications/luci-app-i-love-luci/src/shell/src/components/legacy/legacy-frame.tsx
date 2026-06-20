import { ExternalLink, RefreshCw } from "lucide-react";
import { useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import { getShellConfig } from "@/lib/config";
import { legacyHref } from "@/lib/navigation";

type LegacyFrameProps = {
	path: string;
};

export function LegacyFrame({ path }: LegacyFrameProps) {
	const frameRef = useRef<HTMLIFrameElement | null>(null);
	const config = getShellConfig();
	const src = useMemo(() => legacyHref(path, config.legacyBasePath), [config.legacyBasePath, path]);

	return (
		<div className="grid min-h-[calc(100vh-7rem)] gap-3">
			<div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
				<div>
					<h1 className="text-sm font-semibold">Legacy LuCI bridge</h1>
					<p className="text-xs text-muted-foreground">{path}</p>
				</div>
				<div className="flex gap-2">
					<Button size="sm" variant="outline" onClick={() => frameRef.current?.contentWindow?.location.reload()}>
						<RefreshCw className="size-4" />
						Refresh
					</Button>
					<Button size="sm" variant="outline" onClick={() => window.open(src, "_blank")}>
						<ExternalLink className="size-4" />
						Open
					</Button>
				</div>
			</div>
			<iframe
				className="h-[calc(100vh-11rem)] w-full rounded-lg border bg-card"
				ref={frameRef}
				src={src}
				title="Legacy LuCI content"
			/>
		</div>
	);
}
