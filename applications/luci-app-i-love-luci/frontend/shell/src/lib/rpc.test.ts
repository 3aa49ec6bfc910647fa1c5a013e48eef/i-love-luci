import { afterEach, describe, expect, it, vi } from "vitest";

import { probeAuthSession } from "@/lib/rpc";

function stubBrowser(sessionId: string | null) {
	vi.stubGlobal("document", {
		body: { dataset: {} },
		title: "I Love LuCI",
	});
	vi.stubGlobal("window", {
		ILoveLuCI: sessionId ? { sessionId } : {},
		L: { env: {} },
	});
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
	return new Response(JSON.stringify(body), {
		headers: { "content-type": "application/json", ...(init.headers ?? {}) },
		status: init.status ?? 200,
	});
}

describe("probeAuthSession", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("reports expired when no LuCI session id exists", async () => {
		stubBrowser(null);

		await expect(probeAuthSession()).resolves.toEqual({
			status: "expired",
			message: "Missing LuCI session id",
		});
	});

	it("reports valid when session_info returns successfully", async () => {
		stubBrowser("session-123");
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse({
				result: [0, { ok: true, data: { user: "root", features: { mfa: false, passkeys: false, legacyFrame: true } } }],
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		await expect(probeAuthSession()).resolves.toEqual({ status: "valid" });
		expect(fetchMock).toHaveBeenCalledWith(
			"/ubus/",
			expect.objectContaining({
				credentials: "same-origin",
				method: "POST",
			}),
		);
		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
			params: ["session-123", "luci.iloveluci", "session_info", {}],
		});
	});

	it("reports expired when uhttpd asks for login", async () => {
		stubBrowser("expired-session");
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, { status: 403 })));

		await expect(probeAuthSession()).resolves.toEqual({
			status: "expired",
			message: "LuCI login required",
		});
	});

	it("reports unknown for transient network failures", async () => {
		stubBrowser("session-123");
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

		await expect(probeAuthSession()).resolves.toEqual({
			status: "unknown",
			message: "network down",
		});
	});
});
