import type { ReactNode } from "react";

type AuthRouteProps = {
	children: ReactNode;
};

export function AuthRoute({ children }: AuthRouteProps) {
	return children;
}
