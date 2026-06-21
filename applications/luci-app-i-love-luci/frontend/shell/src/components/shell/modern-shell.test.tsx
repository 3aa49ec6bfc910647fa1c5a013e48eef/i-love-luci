import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { ModernShell } from "@/components/shell/modern-shell";

function renderShell(desktopSidebarValue: string | null) {
	const storage = {
		getItem: vi.fn(() => desktopSidebarValue),
		setItem: vi.fn(),
	};

	vi.stubGlobal("document", {
		documentElement: {
			getAttribute: vi.fn(() => "ltr"),
		},
		title: "I Love LuCI",
	});
	vi.stubGlobal("window", {
		ILoveLuCI: {
			basePath: "/cgi-bin/luci/admin/i-love-luci",
			legacyBasePath: "/cgi-bin/luci/admin",
			login: false,
			repositoryUrl: "https://github.com/3aa49ec6bfc910647fa1c5a013e48eef/i-love-luci",
		},
		L: { env: {} },
		location: {
			hash: "",
			pathname: "/cgi-bin/luci/admin/i-love-luci",
			search: "",
		},
		localStorage: storage,
	});

	const markup = renderToStaticMarkup(
		<MemoryRouter initialEntries={["/"]}>
			<Routes>
				<Route element={<ModernShell />}>
					<Route path="/" element={<main>Dashboard</main>} />
				</Route>
			</Routes>
		</MemoryRouter>,
	);

	return { markup, storage };
}

describe("ModernShell sidebar", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("defaults the desktop sidebar to visible", () => {
		const { markup } = renderShell(null);

		expect(markup).toContain("w-72 border-border p-3 opacity-100");
		expect(markup).toContain('aria-label="Hide navigation"');
	});

	it("honors the persisted desktop sidebar hidden state", () => {
		const { markup, storage } = renderShell("false");

		expect(storage.getItem).toHaveBeenCalledWith("i-love-luci.desktopSidebarOpen");
		expect(markup).toContain("w-0 border-transparent p-0 opacity-0");
		expect(markup).toContain('aria-label="Show navigation"');
	});

	it("keeps the animated mobile drawer mounted", () => {
		const { markup } = renderShell(null);

		expect(markup).toContain("transition-[transform,opacity]");
		expect(markup).toContain("duration-500");
	});
});
