import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getMenuTree, setRouteMode, type MenuItem } from "@/lib/rpc";
import { coverageLabels, routeModeLabels, routeModeOptions, selectedRouteMode } from "@/lib/route-modes";

export function SettingsPage() {
	const [mfaOpen, setMfaOpen] = useState(false);
	const [routes, setRoutes] = useState<MenuItem[]>([]);
	const [routeQuery, setRouteQuery] = useState("");
	const visibleRoutes = useMemo(() => {
		const query = routeQuery.trim().toLowerCase();

		return routes
			.filter((route) => !query || route.title.toLowerCase().includes(query) || route.path.toLowerCase().includes(query))
			.slice(0, 80);
	}, [routeQuery, routes]);

	useEffect(() => {
		void getMenuTree().then((menu) => setRoutes(menu.routes?.length ? menu.routes : menu.items));
	}, []);

	async function updateRouteMode(route: MenuItem, mode: MenuItem["configuredMode"]) {
		const nextMode = mode ?? "auto";
		const saved = await setRouteMode(route.path, nextMode);

		if (!saved) {
			toast.error("Route mode was not saved");
			return;
		}

		setRoutes((current) =>
			current.map((item) => (item.path === route.path ? { ...item, configuredMode: nextMode } : item)),
		);
		toast.success("Route mode saved", {
			description: `${route.title} uses ${routeModeLabels[nextMode]}.`,
		});
	}

	return (
		<div className="mx-auto grid max-w-6xl gap-5">
			<div>
				<h1 className="text-2xl font-semibold">Settings</h1>
				<p className="text-sm text-muted-foreground">Router shell configuration and security options.</p>
			</div>
			<Card>
				<CardHeader>
					<CardTitle>Authentication</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4">
					<div className="flex items-center justify-between gap-4">
						<div>
							<p className="font-medium">Multi-factor authentication</p>
							<p className="text-sm text-muted-foreground">
								TOTP MFA requires server-side support before it can be enabled.
							</p>
						</div>
						<Button variant="outline" onClick={() => setMfaOpen(true)}>
							Configure
						</Button>
					</div>
					<div className="flex items-center justify-between gap-4 border-t pt-4">
						<div>
							<p className="font-medium">Passcode / passkey</p>
							<p className="text-sm text-muted-foreground">
								Passcode is feasible later; WebAuthn/passkey should be optional after TOTP lands.
							</p>
						</div>
						<Button
							variant="outline"
							onClick={() =>
								toast.info("Not enabled", {
									description: "Passkey support needs HTTPS and server-side challenge verification.",
								})
							}
						>
							Review
						</Button>
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Route compatibility</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4">
					<div className="grid gap-2 sm:max-w-md">
						<label className="text-sm font-medium" htmlFor="route-search">
							Search routes
						</label>
						<Input
							id="route-search"
							placeholder="Status, DHCP, firewall"
							value={routeQuery}
							onChange={(event) => setRouteQuery(event.target.value)}
						/>
					</div>
					<div className="overflow-x-auto rounded-md border">
						<table className="w-full min-w-[48rem] text-left text-sm">
							<thead className="border-b text-xs uppercase text-muted-foreground">
								<tr>
									<th className="px-3 py-2 font-medium">Route</th>
									<th className="px-3 py-2 font-medium">Coverage</th>
									<th className="px-3 py-2 font-medium">Mode</th>
								</tr>
							</thead>
							<tbody>
								{visibleRoutes.map((route) => (
									<tr className="border-b last:border-0" key={route.path}>
										<td className="px-3 py-2">
											<div className="font-medium">{route.title}</div>
											<div className="text-xs text-muted-foreground">{route.path}</div>
										</td>
										<td className="px-3 py-2 text-muted-foreground">
											{coverageLabels[route.nativeStatus ?? "unsupported"]}
										</td>
										<td className="px-3 py-2">
											<select
												className="h-9 rounded-md border bg-card px-2 text-sm"
												value={selectedRouteMode(route)}
												onChange={(event) => void updateRouteMode(route, event.target.value as MenuItem["configuredMode"])}
											>
												{routeModeOptions(route).map((mode) => (
													<option key={mode} value={mode}>
														{routeModeLabels[mode]}
													</option>
												))}
											</select>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>
			<Dialog open={mfaOpen} title="MFA setup" onOpenChange={setMfaOpen}>
				<div className="grid gap-4">
					<p className="text-sm text-muted-foreground">
						MFA setup is not available in this package yet. TOTP secrets must be generated and verified on the router.
					</p>
					<div className="grid gap-2">
						<label className="text-sm font-medium" htmlFor="mfa-code">
							Verification code
						</label>
						<Input id="mfa-code" inputMode="numeric" placeholder="000000" />
					</div>
					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => setMfaOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={() => {
								setMfaOpen(false);
								toast.info("MFA not enabled", {
									description: "Server-side TOTP support is required first.",
								});
							}}
						>
							Verify
						</Button>
					</div>
				</div>
			</Dialog>
		</div>
	);
}
