import { describe, expect, it } from "vitest";

import { coverageLabels, routeModeLabels, routeModeOptions, selectedRouteMode } from "@/lib/route-modes";

describe("route mode settings helpers", () => {
	it("labels internal route modes without exposing modern/legacy product wording", () => {
		expect(routeModeLabels.modern).toBe("Native");
		expect(routeModeLabels.legacy).toBe("LuCI compat");
		expect(coverageLabels.compat).toBe("LuCI compat");
		expect(coverageLabels.unsupported).toBe("LuCI compat only");
	});

	it("allows native mode only for supported routes", () => {
		expect(routeModeOptions({ title: "DHCP", path: "/admin/network/dhcp", legacy: false, nativeStatus: "supported" })).toContain(
			"modern",
		);
		expect(routeModeOptions({ title: "banIP", path: "/admin/services/banip", legacy: true, nativeStatus: "compat" })).not.toContain(
			"modern",
		);
		expect(
			routeModeOptions({ title: "Unknown", path: "/admin/example", legacy: true, nativeStatus: "unsupported" }),
		).not.toContain("modern");
	});

	it("normalizes stale native selection for compat routes back to auto", () => {
		expect(
			selectedRouteMode({
				title: "Software",
				path: "/admin/system/package-manager",
				legacy: true,
				configuredMode: "modern",
				nativeStatus: "compat",
			}),
		).toBe("auto");
	});
});
