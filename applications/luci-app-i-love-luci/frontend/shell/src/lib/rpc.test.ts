import { afterEach, describe, expect, it, vi } from "vitest";

import { getDashboardStatus, probeAuthSession } from "@/lib/rpc";

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

describe("getDashboardStatus", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("normalizes dashboard DHCP leases and preserves wireless associations", async () => {
		stubBrowser("session-123");
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				jsonResponse({
					result: [
						0,
						{
							ok: true,
							data: {
								board: {},
								system: {},
								devices: {},
								dhcpLeases: ["3600\taa:bb:cc:dd:ee:ff\t192.168.1.20\tphone\tclient-1"],
								wirelessAssociations: [{ mac: "aa:bb:cc:dd:ee:ff", interface: "wlan0", signal: -55 }],
							},
						},
					],
				}),
			),
		);

		await expect(getDashboardStatus()).resolves.toMatchObject({
			dhcpLeases: [
				{
					remaining: 3600,
					mac: "aa:bb:cc:dd:ee:ff",
					ip: "192.168.1.20",
					hostname: "phone",
					clientId: "client-1",
				},
			],
			wirelessAssociations: [{ mac: "aa:bb:cc:dd:ee:ff", interface: "wlan0", signal: -55 }],
		});
	});
});
