import { useState } from "react";
import type { FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function LoginForm() {
	const navigate = useNavigate();
	const [needsMfa, setNeedsMfa] = useState(false);

	function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setNeedsMfa(true);
		toast.info("MFA challenge ready", {
			description: "Enter a verification code to continue.",
		});
	}

	function handleMfaSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		toast.success("Signed in", {
			description: "Session verified.",
		});
		navigate("/");
	}

	return (
		<Card className="w-full max-w-sm shadow-sm">
			<CardContent className="p-6">
				<div className="mb-6 flex items-center gap-3">
					<div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
						<ShieldCheck className="size-5" />
					</div>
					<div>
						<h1 className="text-xl font-semibold">I Love LuCI</h1>
						<p className="text-sm text-muted-foreground">Router administration</p>
					</div>
				</div>

				{needsMfa ? (
					<form className="grid gap-4" onSubmit={handleMfaSubmit}>
						<div className="grid gap-2">
							<label className="text-sm font-medium" htmlFor="verification-code">
								Verification code
							</label>
							<Input
								autoComplete="one-time-code"
								id="verification-code"
								inputMode="numeric"
								maxLength={6}
								placeholder="000000"
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button type="button" variant="outline" onClick={() => setNeedsMfa(false)}>
								Back
							</Button>
							<Button type="submit">Verify</Button>
						</div>
					</form>
				) : (
					<form className="grid gap-4" onSubmit={handlePasswordSubmit}>
						<div className="grid gap-2">
							<label className="text-sm font-medium" htmlFor="username">
								Username
							</label>
							<Input autoComplete="username" defaultValue="root" id="username" />
						</div>
						<div className="grid gap-2">
							<label className="text-sm font-medium" htmlFor="password">
								Password
							</label>
							<Input autoComplete="current-password" id="password" type="password" />
						</div>
						<div className="flex justify-end">
							<Button type="submit">Continue</Button>
						</div>
					</form>
				)}
			</CardContent>
		</Card>
	);
}
