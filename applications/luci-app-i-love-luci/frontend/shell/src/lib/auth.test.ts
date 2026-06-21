import { describe, expect, it } from "vitest";

import { currentHashRoute, normalizeReturnRoute } from "@/lib/auth";

describe("currentHashRoute", () => {
	it("extracts hash-router deep links", () => {
		expect(currentHashRoute({ hash: "#/native/system" } as Location)).toBe("/native/system");
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
