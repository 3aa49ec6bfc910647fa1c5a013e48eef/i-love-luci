import { Outlet } from "react-router-dom";
import { useState } from "react";

import { Header } from "@/components/shell/header";
import { Sidebar } from "@/components/shell/sidebar";
import { getShellConfig } from "@/lib/config";

export function ModernShell() {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const config = getShellConfig();

	return (
		<div className="iloveluci-shell">
			<Header onMenuClick={() => setSidebarOpen(true)} />
			<div className="flex min-h-[calc(100vh-4rem)]">
				<Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
				<main className="flex min-w-0 flex-1 flex-col px-4 py-5 sm:px-6 lg:px-8">
					<div className="min-w-0 flex-1">
						<Outlet />
					</div>
					<footer className="mt-8 flex flex-col gap-2 border-t pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
						<a
							className="inline-flex items-center gap-2 hover:text-foreground"
							href={config.repositoryUrl}
							rel="noreferrer"
							target="_blank"
						>
							<GitHubMark className="size-4" />
							<span>GitHub</span>
						</a>
						<span>I Love LuCI {config.version}</span>
					</footer>
				</main>
			</div>
		</div>
	);
}

function GitHubMark({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
			<path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49v-1.72c-2.78.62-3.37-1.38-3.37-1.38-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.12 2.91.86.09-.66.35-1.12.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.04 1.03-2.75-.1-.26-.45-1.31.1-2.72 0 0 .84-.28 2.75 1.05A9.32 9.32 0 0 1 12 7c.85 0 1.7.12 2.5.35 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.46.1 2.72.64.71 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.95.68 1.91v2.83c0 .27.18.59.69.49A10.23 10.23 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
		</svg>
	);
}
