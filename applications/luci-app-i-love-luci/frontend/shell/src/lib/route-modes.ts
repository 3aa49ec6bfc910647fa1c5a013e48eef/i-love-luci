import type { MenuItem } from "@/lib/rpc";

export const routeModes = ["auto", "modern", "legacy", "hidden"] as const;

export const routeModeLabels: Record<(typeof routeModes)[number], string> = {
	auto: "Auto",
	modern: "Native",
	legacy: "LuCI compat",
	hidden: "Hidden",
};

export const coverageLabels: Record<NonNullable<MenuItem["nativeStatus"]>, string> = {
	supported: "Native",
	compat: "LuCI compat",
	unsupported: "LuCI compat only",
};

export function routeModeOptions(route: MenuItem) {
	return route.nativeStatus === "supported" ? routeModes : routeModes.filter((mode) => mode !== "modern");
}

export function selectedRouteMode(route: MenuItem) {
	if (route.configuredMode === "modern" && route.nativeStatus !== "supported") {
		return "auto";
	}

	return route.configuredMode ?? "auto";
}
