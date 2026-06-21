import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { LoginForm } from "@/components/auth/login-form";

function renderLogin({
	defaultUser = "root",
	loginFailed = false,
	pathname = "/cgi-bin/luci/",
	search = "",
} = {}) {
	vi.stubGlobal("document", {
		body: { dataset: {} },
		title: "Log in | I Love LuCI",
	});
	vi.stubGlobal("window", {
		ILoveLuCI: {
			defaultUser,
			login: true,
			loginFailed,
		},
		L: { env: {} },
		location: {
			pathname,
			search,
		},
	});

	return renderToStaticMarkup(<LoginForm />);
}

describe("LoginForm", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("renders the LuCI-compatible password-manager form contract", () => {
		const markup = renderLogin({ pathname: "/cgi-bin/luci/", search: "?foo=bar" });

		expect(markup).toContain('action="/cgi-bin/luci/?foo=bar"');
		expect(markup).toContain('method="post"');
		expect(markup).toContain('autoComplete="on"');
		expect(markup).toContain('name="luci_username"');
		expect(markup).toContain('autoComplete="username"');
		expect(markup).toContain('name="luci_password"');
		expect(markup).toContain('autoComplete="current-password"');
		expect(markup).toContain('type="password"');
		expect(markup).toContain('value="root"');
	});

	it("keeps the modern login copy and no reset button", () => {
		const markup = renderLogin();

		expect(markup).toContain("I Love LuCI");
		expect(markup).toContain("Router administration");
		expect(markup).toContain("Log in");
		expect(markup).not.toContain("Authorization Required");
		expect(markup).not.toContain("Please enter your username and password.");
		expect(markup).not.toContain('type="reset"');
	});

	it("renders invalid credential feedback without changing field names", () => {
		const markup = renderLogin({ loginFailed: true });

		expect(markup).toContain("Invalid username or password.");
		expect(markup).toContain('name="luci_username"');
		expect(markup).toContain('name="luci_password"');
	});
});
