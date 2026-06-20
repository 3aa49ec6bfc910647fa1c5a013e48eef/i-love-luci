import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthRoute } from "@/components/auth/auth-route";
import { LoginPage } from "@/routes/login";
import { ModernShell } from "@/components/shell/modern-shell";
import { DashboardPage } from "@/routes/dashboard";
import { LegacyPage } from "@/routes/legacy";
import { SettingsPage } from "@/routes/settings";
import { Toaster } from "@/components/ui/sonner";

export function App() {
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
					<Route path="settings" element={<SettingsPage />} />
					<Route path="legacy/*" element={<LegacyPage />} />
					<Route path="*" element={<Navigate to="/" replace />} />
				</Route>
			</Routes>
			<Toaster position="top-center" richColors closeButton />
		</HashRouter>
	);
}
