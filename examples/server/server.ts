import { Application, Context } from "https://deno.land/x/oak/mod.ts";
import { Bundler } from "../../bundler.ts";
import { createDefaultPlugins } from "../../defaults.ts";
import { Watcher } from "../../watcher.ts";
import { path } from "../../deps.ts";

const plugins = createDefaultPlugins();
const bundler = new Bundler(plugins);

const root = "/index.html";

const inputs = [
  "src/index.html",
];
const outputMap = {
  "src/index.html": root,
};

const watcher = new Watcher({ logger: bundler.logger });

let bundles: Record<string, any> = {};
async function bundle() {
  const { bundles: newBundles, graph: newGraph } = await bundler.bundle(
    inputs,
    { outputMap },
  );
  bundles = { ...bundles, ...newBundles };
  watcher.watch(Object.keys(newGraph)).then(() => bundle());
}
await bundle();

const contentTypes: Record<string, string> = {
  ".js": "application/javascript",
  ".html": "text/html",
  ".css": "text/css",
};

const app = new Application();

app.use((context: Context) => {
  let pathname = context.request.url.pathname;
  if (pathname === "/") {
    pathname = root;
  } else if (path.isAbsolute(pathname)) {
    pathname = path.relative(
      Deno.cwd(),
      pathname,
    );
  }
  const extname = path.extname(pathname);
  const contentType = contentTypes[extname];
  context.response.headers.set("Content-Type", contentType);
  context.response.body = bundles[pathname];
});

app.addEventListener("listen", ({ hostname, port, secure }) => {
  console.log(
    `Listening on: ${secure ? "https://" : "http://"}${hostname ??
      "localhost"}:${port}`,
  );
});
await app.listen({ port: 8000 });
