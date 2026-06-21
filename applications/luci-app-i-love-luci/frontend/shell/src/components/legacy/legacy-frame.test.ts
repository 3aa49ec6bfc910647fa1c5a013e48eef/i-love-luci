import { describe, expect, it } from "vitest";

import { withLegacyFrameMarker } from "@/lib/legacy-frame-url";

describe("withLegacyFrameMarker", () => {
	it("adds the frame marker to compat routes", () => {
		expect(withLegacyFrameMarker("/cgi-bin/luci/admin/network/network", "http://router.test")).toBe(
			"/cgi-bin/luci/admin/network/network?iloveluci_frame=1",
		);
	});

	it("preserves existing query strings and hashes", () => {
		expect(
			withLegacyFrameMarker(
				"/cgi-bin/luci/admin/system/package-manager?tab=updates&filter=luci#available",
				"http://router.test",
			),
		).toBe("/cgi-bin/luci/admin/system/package-manager?tab=updates&filter=luci&iloveluci_frame=1#available");
	});
});
