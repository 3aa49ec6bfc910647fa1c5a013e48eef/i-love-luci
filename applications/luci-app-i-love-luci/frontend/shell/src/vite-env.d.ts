/// <reference types="vite/client" />

interface Window {
	ILoveLuCI?: {
		basePath?: string;
		legacyBasePath?: string;
		resourcePath?: string;
		sessionId?: string;
		authUser?: string;
		version?: string;
		repositoryUrl?: string;
	};
	L?: {
		env?: {
			sessionid?: string;
		};
	};
}
