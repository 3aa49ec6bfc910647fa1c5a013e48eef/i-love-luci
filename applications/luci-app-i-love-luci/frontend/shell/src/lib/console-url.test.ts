import { describe, expect, it } from "vitest";

import { buildConsoleEmbeddedUrl, buildConsoleFallbackUrl } from "@/lib/console-url";

describe("console URLs", () => {
	const launch = {
		available: true,
		enabled: true,
		url: "http://{{host}}:7681/",
		username: "root",
		password: "secret",
	};

	it("keeps credentials out of embedded console URLs", () => {
		expect(buildConsoleEmbeddedUrl(launch, "router.lan")).toBeNull();
	});

	it("uses credentials only for top-level direct fallback", () => {
		expect(buildConsoleFallbackUrl(launch, "router.lan")).toBe("http://root:secret@router.lan:7681/");
	});
});
