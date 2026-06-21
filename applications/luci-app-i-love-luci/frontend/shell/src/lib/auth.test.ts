import { describe, expect, it } from "vitest";

import { currentHashRoute, loginRedirectUrl, normalizeReturnRoute } from "@/lib/auth";

describe("currentHashRoute", () => {
	it("extracts hash-router deep links", () => {
		expect(currentHashRoute({ hash: "#/native/system" } as Location)).toBe("/native/system");
	});

	it("keeps deep-link query strings", () => {
		expect(currentHashRoute({ hash: "#/legacy?path=%2Fadmin%2Fnetwork%2Ffirewall" } as Location)).toBe(
			"/legacy?path=%2Fadmin%2Fnetwork%2Ffirewall",
		);
	});

	it("falls back to the dashboard when no deep link exists", () => {
		expect(currentHashRoute({ hash: "" } as Location)).toBe("/");
	});
});

describe("normalizeReturnRoute", () => {
	it("keeps app-relative routes absolute", () => {
		expect(normalizeReturnRoute("legacy?path=%2Fadmin%2Fservices%2Fbanip")).toBe(
			"/legacy?path=%2Fadmin%2Fservices%2Fbanip",
		);
	});

	it("rejects protocol-relative routes", () => {
		expect(normalizeReturnRoute("//example.test/admin")).toBe("/");
	});
});

describe("loginRedirectUrl", () => {
	it("carries the return route in the hash", () => {
		expect(loginRedirectUrl("/cgi-bin/luci/admin/i-love-luci", "http://router.test", "/native/system")).toBe(
			"http://router.test/cgi-bin/luci/admin/i-love-luci#/native/system",
		);
	});
});
