import { describe, expect, it } from "vitest";

import { serviceCompatPath } from "@/lib/service-compat";

describe("serviceCompatPath", () => {
	it("keeps third-party LuCI apps on compatibility routes", () => {
		expect(serviceCompatPath("adblock-fast")).toBe("/admin/services/adblock-fast");
		expect(serviceCompatPath("banip")).toBe("/admin/services/banip");
		expect(serviceCompatPath("banip", "allowlist")).toBe("/admin/services/banip/allowlist");
	});

	it("allows approved native service routes", () => {
		expect(serviceCompatPath("uhttpd")).toBeNull();
		expect(serviceCompatPath("upnpd")).toBeNull();
		expect(serviceCompatPath("commands")).toBeNull();
	});
});
