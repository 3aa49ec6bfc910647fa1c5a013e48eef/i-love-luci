import { describe, expect, it } from "vitest";

import { itemTarget, legacyHref, searchMenu } from "@/lib/navigation";

describe("legacyHref", () => {
	it("maps LuCI admin paths into the legacy base path", () => {
		expect(legacyHref("/admin/network/dhcp", "/cgi-bin/luci/admin")).toBe("/cgi-bin/luci/admin/network/dhcp");
	});

	it("preserves query strings and hashes when mapping compat routes", () => {
		expect(legacyHref("/admin/system/package-manager?tab=updates#available", "/cgi-bin/luci/admin")).toBe(
			"/cgi-bin/luci/admin/system/package-manager?tab=updates#available",
		);
	});
});

describe("searchMenu", () => {
	it("matches by title and path", () => {
		const items = [
			{ title: "DHCP and DNS", path: "/admin/network/dhcp", legacy: true },
			{ title: "Status overview", path: "/admin/status/overview", legacy: true },
		];

		expect(searchMenu(items, "dns")).toEqual([items[0]]);
		expect(searchMenu(items, "status")).toEqual([items[1]]);
	});
});

describe("itemTarget", () => {
	it("uses LuCI compatibility when auto mode resolves to legacy", () => {
		expect(
			itemTarget({
				title: "banIP",
				path: "/admin/services/banip",
				nativePath: "/native/service/banip",
				effectiveMode: "legacy",
				configuredMode: "auto",
				legacy: true,
			}),
		).toBe("/legacy?path=%2Fadmin%2Fservices%2Fbanip");
	});

	it("uses native path when route resolves to modern", () => {
		expect(
			itemTarget({
				title: "Scheduled tasks",
				path: "/admin/system/crontab",
				nativePath: "/native/crontab",
				effectiveMode: "modern",
				configuredMode: "auto",
				legacy: false,
			}),
		).toBe("/native/crontab");
	});

	it("routes LuCI realtime graphs to the dedicated realtime surface", () => {
		expect(
			itemTarget({
				title: "Realtime graphs",
				path: "/admin/status/realtime",
				effectiveMode: "modern",
				configuredMode: "auto",
				legacy: false,
			}),
		).toBe("/realtime");
	});

	it("routes supported attended sysupgrade configuration to native settings", () => {
		expect(
			itemTarget({
				title: "Configuration",
				path: "/admin/system/attendedsysupgrade/configuration",
				nativePath: "/native/attendedsysupgrade-config",
				effectiveMode: "modern",
				configuredMode: "auto",
				nativeStatus: "supported",
				legacy: false,
			}),
		).toBe("/native/attendedsysupgrade-config");
	});

	it("keeps compat routes in LuCI compatibility even if stale metadata includes a native path", () => {
		expect(
			itemTarget({
				title: "Edit Allowlist",
				path: "/admin/services/banip/allowlist",
				nativePath: "/native/service/banip/allowlist",
				effectiveMode: "modern",
				configuredMode: "modern",
				nativeStatus: "compat",
				legacy: false,
			}),
		).toBe("/legacy?path=%2Fadmin%2Fservices%2Fbanip%2Fallowlist");
	});

	it("keeps query strings when routing to LuCI compatibility", () => {
		expect(
			itemTarget({
				title: "Software",
				path: "/admin/system/package-manager?tab=updates",
				effectiveMode: "legacy",
				configuredMode: "auto",
				nativeStatus: "compat",
				legacy: true,
			}),
		).toBe("/legacy?path=%2Fadmin%2Fsystem%2Fpackage-manager%3Ftab%3Dupdates");
	});
});
