import { Bundler } from "../../bundler.ts";
import { HtmlPlugin } from "../../plugins/html/html.ts";
import { DependencyType, Plugin } from "../../plugins/plugin.ts";
import { TypescriptTopLevelAwaitModulePlugin } from "../../plugins/typescript/typescript_top_level_await_module.ts";
import { WebWorkerPlugin } from "../../plugins/typescript/webworker.ts";
import { assertEquals } from "../../test_deps.ts";

Deno.test({
  name: "example → webworker",
  async fn() {
    const plugins: Plugin[] = [
      new HtmlPlugin(),
      new WebWorkerPlugin(),
      new TypescriptTopLevelAwaitModulePlugin(),
    ];
    const bundler = new Bundler(plugins);
    bundler.logger.quiet = true;
    const input = "examples/webworker/src/index.html";
    const inputs = [
      input,
    ];
    const graph = await bundler.createGraph(inputs);

    assertEquals(Object.keys(graph[input]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/webworker/src/index.ts"]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/webworker/src/worker.ts"]), [
      DependencyType.WebWorker,
    ]);

    const chunks = await bundler.createChunks(inputs, graph);

    assertEquals(chunks.map((chunk) => chunk.item.history[0]), [
      input,
      "examples/webworker/src/index.ts",
      "examples/webworker/src/worker.ts",
    ]);

    const bundles = await bundler.createBundles(chunks, graph, {
      reload: true,
    });

    assertEquals(Object.keys(bundles), [
      "dist/deps/504936b742949c115594a7aeba56661c94fd4faa7537b974c13bf14b129d5e6d.html",
      "dist/deps/82d670387b0952d4c319206c974c1550767cf1957072076b48dde3008afd01f8.js",
      "dist/86a71ceacb0cc3aea7eba7aecd208553d5a129a608e49893445cafb43ebb655b.js",
    ]);
  },
});
