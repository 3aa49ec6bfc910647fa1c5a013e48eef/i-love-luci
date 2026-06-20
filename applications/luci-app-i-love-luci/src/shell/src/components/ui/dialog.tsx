import { X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DialogProps = {
	open: boolean;
	title: string;
	children: ReactNode;
	onOpenChange: (open: boolean) => void;
	className?: string;
};

export function Dialog({ open, title, children, onOpenChange, className }: DialogProps) {
	if (!open) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4">
			<div className={cn("w-full max-w-lg rounded-lg border bg-card shadow-xl", className)}>
				<div className="flex items-center justify-between border-b px-4 py-3">
					<h2 className="text-base font-semibold">{title}</h2>
					<Button aria-label="Close" size="icon" variant="ghost" onClick={() => onOpenChange(false)}>
						<X className="size-4" />
					</Button>
				</div>
				<div className="p-4">{children}</div>
			</div>
		</div>
	);
}
