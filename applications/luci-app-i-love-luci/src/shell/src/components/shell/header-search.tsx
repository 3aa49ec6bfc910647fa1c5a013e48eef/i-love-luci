import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Input } from "@/components/ui/input";
import { getMenuTree, type MenuItem } from "@/lib/rpc";
import { searchMenu } from "@/lib/navigation";

export function HeaderSearch() {
	const navigate = useNavigate();
	const [items, setItems] = useState<MenuItem[]>([]);
	const [focused, setFocused] = useState(false);
	const [query, setQuery] = useState("");
	const results = useMemo(() => searchMenu(items, query).slice(0, 6), [items, query]);

	useEffect(() => {
		void getMenuTree().then(setItems);
	}, []);

	function openItem(item: MenuItem) {
		setFocused(false);
		setQuery("");

		if (item.legacy) {
			navigate(`/legacy?path=${encodeURIComponent(item.path)}`);
		}
		else {
			navigate(item.path === "/settings" ? "/settings" : "/");
		}
	}

	return (
		<div className="relative w-full">
			<div className="relative">
				<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					className="pl-9"
					placeholder="Search configuration"
					type="search"
					value={query}
					onBlur={() => window.setTimeout(() => setFocused(false), 120)}
					onChange={(event) => setQuery(event.target.value)}
					onFocus={() => setFocused(true)}
				/>
			</div>
			{focused ? (
				<div className="absolute left-0 right-0 top-11 z-50 rounded-lg border bg-card p-2 shadow-xl">
					<div className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">
						{query ? "Results" : "Recent"}
					</div>
					<div className="grid gap-1">
						{results.map((item) => (
							<button
								className="flex items-start gap-3 rounded-md px-2 py-2 text-left hover:bg-secondary"
								key={`${item.path}-${item.title}`}
								type="button"
								onMouseDown={(event) => event.preventDefault()}
								onClick={() => openItem(item)}
							>
								<span className="mt-0.5 grid size-7 place-items-center rounded-md border text-primary">
									<Search className="size-4" />
								</span>
								<span>
									<span className="block text-sm font-medium">{item.title}</span>
									<span className="block text-xs text-muted-foreground">
										{item.legacy ? "Legacy LuCI bridge" : "Native route"} · {item.path}
									</span>
								</span>
							</button>
						))}
					</div>
				</div>
			) : null}
		</div>
	);
}
