import { Activity, Cable, Clock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const metrics = [
	{ label: "Mode", value: "Spike", icon: Activity },
	{ label: "Legacy bridge", value: "Ready", icon: Cable },
	{ label: "MFA", value: "Planned", icon: ShieldCheck },
	{ label: "Build", value: "Local first", icon: Clock },
];

export function DashboardPage() {
	return (
		<div className="mx-auto grid max-w-6xl gap-5">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold">I Love LuCI shell</h1>
					<p className="text-sm text-muted-foreground">
						Modern React shell with legacy LuCI fallback and router-native package shape.
					</p>
				</div>
				<Button
					onClick={() =>
						toast.success("Spike shell active", {
							description: "Sonner is wired and ready for save/apply feedback.",
						})
					}
				>
					Show toast
				</Button>
			</div>
			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{metrics.map((metric) => (
					<Card key={metric.label}>
						<CardContent className="flex items-center justify-between p-4">
							<div>
								<p className="text-sm text-muted-foreground">{metric.label}</p>
								<p className="mt-1 text-xl font-semibold">{metric.value}</p>
							</div>
							<div className="grid size-10 place-items-center rounded-lg bg-secondary text-primary">
								<metric.icon className="size-5" />
							</div>
						</CardContent>
					</Card>
				))}
			</div>
			<Card>
				<CardHeader>
					<CardTitle>Spike scope</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-3 text-sm text-muted-foreground">
					<p>
						This route proves the modern shell, local component library, Tailwind v4 styling, Sonner toasts, and
						LuCI package delivery path.
					</p>
					<p>
						Native pages can be added incrementally. Unsupported pages should use the legacy bridge so existing
						LuCI packages remain usable.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
