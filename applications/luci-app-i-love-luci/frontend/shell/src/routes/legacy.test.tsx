import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { LegacyFallbackPage } from "@/routes/legacy";

function stubShellConfig() {
	vi.stubGlobal("document", {
		body: { dataset: {} },
		title: "I Love LuCI",
	});
	vi.stubGlobal("window", {
		ILoveLuCI: {
			legacyBasePath: "/cgi-bin/luci/admin",
		},
		L: { env: {} },
		location: {
			origin: "http://router.test",
		},
	});
}

describe("LegacyFallbackPage", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("renders direct LuCI admin deep links through the compat iframe", () => {
		stubShellConfig();

		const markup = renderToStaticMarkup(
			<MemoryRouter initialEntries={["/admin/services/banip?tab=overview"]}>
				<Routes>
					<Route path="*" element={<LegacyFallbackPage />} />
				</Routes>
			</MemoryRouter>,
		);

		expect(markup).toContain('title="LuCI compatibility content"');
		expect(markup).toContain('src="/cgi-bin/luci/admin/services/banip?tab=overview&amp;iloveluci_frame=1"');
	});
});
