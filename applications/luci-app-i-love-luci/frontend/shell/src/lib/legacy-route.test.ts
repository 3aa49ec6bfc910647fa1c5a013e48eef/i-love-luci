import { describe, expect, it } from "vitest";

import { legacyPathFromUnmatchedLocation } from "@/lib/legacy-route";

describe("legacyPathFromUnmatchedLocation", () => {
	it("maps direct LuCI admin deep links to compat paths", () => {
		expect(legacyPathFromUnmatchedLocation("/admin/services/banip")).toBe("/admin/services/banip");
	});

	it("preserves direct LuCI deep-link query strings and hashes", () => {
		expect(legacyPathFromUnmatchedLocation("/admin/system/package-manager", "?tab=updates", "#available")).toBe(
			"/admin/system/package-manager?tab=updates#available",
		);
	});

	it("leaves unknown non-LuCI shell routes for the normal app fallback", () => {
		expect(legacyPathFromUnmatchedLocation("/unknown")).toBeNull();
	});
});
