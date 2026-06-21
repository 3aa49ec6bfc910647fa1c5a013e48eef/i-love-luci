import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { App } from "@/app/app";

function renderAppLogin() {
	vi.stubGlobal("document", {
		body: {
			dataset: {
				iloveluciLogin: "true",
				defaultUser: "root",
			},
		},
		documentElement: {
			getAttribute: vi.fn(() => "ltr"),
		},
		title: "Log in | I Love LuCI",
	});
	vi.stubGlobal("window", {
		ILoveLuCI: {
			defaultUser: "root",
			login: true,
			loginFailed: false,
		},
		L: { env: {} },
		location: {
			hash: "",
			pathname: "/cgi-bin/luci/",
			search: "",
		},
		sessionStorage: {
			setItem: vi.fn(),
		},
	});

	return renderToStaticMarkup(<App />);
}

describe("App login mode", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("renders only the React login shell without the app header, menu, or compat frame", () => {
		const markup = renderAppLogin();

		expect(markup).toContain("I Love LuCI");
		expect(markup).toContain('name="luci_username"');
		expect(markup).toContain('name="luci_password"');
		expect(markup).not.toContain("Open navigation");
		expect(markup).not.toContain("HeaderSearch");
		expect(markup).not.toContain("Profile");
		expect(markup).not.toContain("LuCI compatibility content");
		expect(markup).not.toContain("Idle");
	});
});
