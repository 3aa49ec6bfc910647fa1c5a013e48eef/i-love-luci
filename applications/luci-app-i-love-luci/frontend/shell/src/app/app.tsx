import { HashRouter, Route, Routes } from "react-router-dom";

import { AuthRoute } from "@/components/auth/auth-route";
import { LoginPage } from "@/routes/login";
import { ModernShell } from "@/components/shell/modern-shell";
import { CoreSettingsPage } from "@/routes/core-settings";
import { ConsolePage } from "@/routes/console";
import { DashboardPage } from "@/routes/dashboard";
import { LegacyFallbackPage, LegacyPage } from "@/routes/legacy";
import { NativePage, NativeServicePage } from "@/routes/native-page";
import { SettingsPage } from "@/routes/settings";
import { Toaster } from "@/components/ui/sonner";
import { getShellConfig } from "@/lib/config";

export function App() {
	if (getShellConfig().login) {
		return (
			<>
				<LoginPage />
				<Toaster position="top-center" richColors closeButton />
			</>
		);
	}

	return (
		<HashRouter>
			<Routes>
				<Route path="/login" element={<LoginPage />} />
				<Route
					path="/"
					element={
						<AuthRoute>
							<ModernShell />
						</AuthRoute>
					}
				>
					<Route index element={<DashboardPage />} />
					<Route
						path="realtime"
						element={
							<DashboardPage
								description="Live bandwidth, CPU load, memory, and active interface rates from the router."
								title="Realtime graphs"
							/>
						}
					/>
					<Route path="console" element={<ConsolePage />} />
					<Route path="core/:page" element={<CoreSettingsPage />} />
					<Route path="native/:page" element={<NativePage />} />
					<Route path="native/service/:service" element={<NativeServicePage />} />
					<Route path="native/service/:service/:focus" element={<NativeServicePage />} />
					<Route path="settings" element={<SettingsPage />} />
					<Route path="legacy/*" element={<LegacyPage />} />
					<Route path="*" element={<LegacyFallbackPage />} />
				</Route>
			</Routes>
			<Toaster position="top-center" richColors closeButton />
		</HashRouter>
	);
}
