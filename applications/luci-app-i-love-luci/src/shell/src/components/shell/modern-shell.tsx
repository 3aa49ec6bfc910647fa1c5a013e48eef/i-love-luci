import { Outlet } from "react-router-dom";

import { Header } from "@/components/shell/header";
import { Sidebar } from "@/components/shell/sidebar";

export function ModernShell() {
	return (
		<div className="iloveluci-shell">
			<Header />
			<div className="flex min-h-[calc(100vh-4rem)]">
				<Sidebar />
				<main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
