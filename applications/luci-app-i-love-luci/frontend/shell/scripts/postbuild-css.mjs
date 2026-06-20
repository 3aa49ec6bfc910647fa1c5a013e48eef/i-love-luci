import fs from "node:fs/promises";
import { URL } from "node:url";
import postcss from "postcss";
import mediaMinMax from "@csstools/postcss-media-minmax";

const cssPath = new URL("../../../htdocs/luci-static/i-love-luci-app/assets/app.css", import.meta.url);
const input = await fs.readFile(cssPath, "utf8");
const result = await postcss([mediaMinMax()]).process(input, {
	from: cssPath.pathname,
	to: cssPath.pathname,
});

await fs.writeFile(cssPath, result.css);
