export type ShellConfig = {
	basePath: string;
	legacyBasePath: string;
	resourcePath: string;
	sessionId: string | null;
	authUser: string | null;
	version: string;
	repositoryUrl: string;
};

export function getShellConfig(): ShellConfig {
	return {
		basePath: window.ILoveLuCI?.basePath ?? "/cgi-bin/luci/admin/i-love-luci",
		legacyBasePath: window.ILoveLuCI?.legacyBasePath ?? "/cgi-bin/luci/admin",
		resourcePath: window.ILoveLuCI?.resourcePath ?? "/luci-static/i-love-luci-app",
		sessionId: window.ILoveLuCI?.sessionId || window.L?.env?.sessionid || null,
		authUser: window.ILoveLuCI?.authUser || null,
		version: window.ILoveLuCI?.version ?? "1.0.0-r4",
		repositoryUrl: window.ILoveLuCI?.repositoryUrl ?? "https://github.com/3aa49ec6bfc910647fa1c5a013e48eef/i-love-luci",
	};
}
