import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
	return (
		<span
			className={cn(
				"inline-flex h-7 items-center rounded-full border bg-card px-2.5 text-xs font-medium text-muted-foreground",
				className,
			)}
			{...props}
		/>
	);
}
