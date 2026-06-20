import { useEffect, useRef } from "react";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getShellConfig } from "@/lib/config";

export function LoginForm() {
	const config = getShellConfig();
	const passwordRef = useRef<HTMLInputElement>(null);
	const usernameRef = useRef<HTMLInputElement>(null);
	const defaultUser = config.defaultUser || "root";

	useEffect(() => {
		if (defaultUser) {
			passwordRef.current?.focus();
		}
		else {
			usernameRef.current?.focus();
		}
	}, [defaultUser]);

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

				{config.loginFailed ? (
					<div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-foreground">
						Invalid username or password.
					</div>
				) : null}

				<form className="grid gap-4" method="post">
					<div className="grid gap-2">
						<label className="text-sm font-medium" htmlFor="luci_username">
							Username
						</label>
						<Input
							ref={usernameRef}
							autoComplete="username"
							defaultValue={defaultUser}
							id="luci_username"
							name="luci_username"
						/>
					</div>
					<div className="grid gap-2">
						<label className="text-sm font-medium" htmlFor="luci_password">
							Password
						</label>
						<Input
							ref={passwordRef}
							autoComplete="current-password"
							id="luci_password"
							name="luci_password"
							type="password"
						/>
					</div>
					<div className="flex justify-end">
						<Button type="submit">Log in</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
