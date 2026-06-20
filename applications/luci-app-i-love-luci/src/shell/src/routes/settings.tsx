import { useState } from "react";
import { toast } from "sonner";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function SettingsPage() {
	const [mfaOpen, setMfaOpen] = useState(false);

	return (
		<div className="mx-auto grid max-w-4xl gap-5">
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
