import { Bundler } from "../../bundler.ts";
import { HtmlPlugin } from "../../plugins/html/html.ts";
import { DependencyType, Plugin } from "../../plugins/plugin.ts";
import { ServiceWorkerPlugin } from "../../plugins/typescript/serviceworker.ts";
import { TypescriptTopLevelAwaitModulePlugin } from "../../plugins/typescript/typescript_top_level_await_module.ts";
import { assertEquals } from "../../test_deps.ts";

Deno.test({
  name: "example → serviceworker",
  async fn() {
    const plugins: Plugin[] = [
      new HtmlPlugin(),
      new ServiceWorkerPlugin(),
      new TypescriptTopLevelAwaitModulePlugin(),
    ];
    const bundler = new Bundler(plugins);
    bundler.logger.quiet = true;
    const input = "examples/serviceworker/src/index.html";
    const inputs = [
      input,
    ];
    const graph = await bundler.createGraph(inputs);

    assertEquals(Object.keys(graph[input]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/serviceworker/src/index.ts"]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/serviceworker/src/sw.ts"]), [
      DependencyType.ServiceWorker,
    ]);

    const chunks = await bundler.createChunks(inputs, graph);

    assertEquals(chunks.map((chunk) => chunk.item.history[0]), [
      input,
      "examples/serviceworker/src/index.ts",
      "examples/serviceworker/src/sw.ts",
    ]);

    const bundles = await bundler.createBundles(chunks, graph, {
      reload: true,
    });

    assertEquals(Object.keys(bundles), [
      "dist/deps/34f58966f52979ce20c1a95a222c97ad1615a50b2b0bbb8c0ba17158b18b52df.html",
      "dist/deps/87a0c8eb1b184ccd3f522df2cc5ed14c3a09ceb1df630432f8ee936f775b592f.js",
      "dist/0e9584d18db73a5e6a08a6adce85cc19f214656547269dbbb8b68dfc11fdf912.js",
    ]);
  },
});
