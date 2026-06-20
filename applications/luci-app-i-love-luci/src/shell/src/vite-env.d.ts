/// <reference types="vite/client" />

interface Window {
	ILoveLuCI?: {
		basePath?: string;
		legacyBasePath?: string;
		resourcePath?: string;
		sessionId?: string;
		authUser?: string;
	};
	L?: {
		env?: {
			sessionid?: string;
		};
	};
}
