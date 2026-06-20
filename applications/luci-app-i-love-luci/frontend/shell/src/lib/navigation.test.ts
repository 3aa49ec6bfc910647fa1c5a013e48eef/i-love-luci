import { describe, expect, it } from "vitest";

import { legacyHref, searchMenu } from "@/lib/navigation";

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
