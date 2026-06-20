import { Outlet } from "react-router-dom";
import { useState } from "react";

import { Header } from "@/components/shell/header";
import { Sidebar } from "@/components/shell/sidebar";

export function ModernShell() {
	const [sidebarOpen, setSidebarOpen] = useState(false);

	return (
		<div className="iloveluci-shell">
			<Header onMenuClick={() => setSidebarOpen(true)} />
			<div className="flex min-h-[calc(100vh-4rem)]">
				<Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
				<main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
