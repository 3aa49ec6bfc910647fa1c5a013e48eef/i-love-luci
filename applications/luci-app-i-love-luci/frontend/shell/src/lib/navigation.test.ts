import { describe, expect, it } from "vitest";

import { itemTarget, legacyHref, searchMenu } from "@/lib/navigation";

describe("legacyHref", () => {
	it("maps LuCI admin paths into the legacy base path", () => {
		expect(legacyHref("/admin/network/dhcp", "/cgi-bin/luci/admin")).toBe("/cgi-bin/luci/admin/network/dhcp");
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
});
