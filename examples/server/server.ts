import { Application, Context } from "https://deno.land/x/oak/mod.ts";
import { Bundler } from "../../bundler.ts";
import { createDefaultPlugins } from "../../defaults.ts";
import { Watcher } from "../../watcher.ts";
import { path } from "../../deps.ts";
import { lookup } from "https://deno.land/x/media_types/mod.ts";

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

const app = new Application();

app.use((context: Context) => {
  const { request, response } = context;
  let pathname: string = request.url.pathname;
  if (pathname === "/") {
    pathname = root;
  } else if (path.isAbsolute(pathname)) {
    pathname = path.relative(
      Deno.cwd(),
      pathname,
    );
  }
  const type = lookup(pathname);
  if (!type) return context.throw(500);

  context.response.headers.set("Content-Type", type);
  response.body = bundles[pathname];
});

app.addEventListener("listen", ({ hostname, port, secure }) => {
  console.log(
    `${secure ? "https://" : "http://"}${hostname ?? "localhost"}:${port}`,
  );
});

await app.listen({ port: 8000 });
