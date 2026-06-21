import { describe, expect, it } from "vitest";

import { nativePageCompatPath, serviceCompatPath } from "@/lib/service-compat";

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

describe("nativePageCompatPath", () => {
	it("redirects compat-only native page aliases to full LuCI routes", () => {
		expect(nativePageCompatPath("attendedsysupgrade")).toBe("/admin/system/attendedsysupgrade/overview");
		expect(nativePageCompatPath("flash")).toBe("/admin/system/flash");
		expect(nativePageCompatPath("packages")).toBe("/admin/system/package-manager");
	});

	it("allows supported native page routes", () => {
		expect(nativePageCompatPath("attendedsysupgrade-config")).toBeNull();
		expect(nativePageCompatPath("status-routes")).toBeNull();
		expect(nativePageCompatPath("logs")).toBeNull();
	});
});
