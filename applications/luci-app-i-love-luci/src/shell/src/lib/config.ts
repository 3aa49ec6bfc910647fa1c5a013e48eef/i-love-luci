export type ShellConfig = {
	basePath: string;
	legacyBasePath: string;
	resourcePath: string;
};

export function getShellConfig(): ShellConfig {
	return {
		basePath: window.ILoveLuCI?.basePath ?? "/cgi-bin/luci/admin/i-love-luci",
		legacyBasePath: window.ILoveLuCI?.legacyBasePath ?? "/cgi-bin/luci/admin",
		resourcePath: window.ILoveLuCI?.resourcePath ?? "/luci-static/i-love-luci-app",
	};
}
