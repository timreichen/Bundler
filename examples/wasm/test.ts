import { Bundler } from "../../bundler.ts";
import { logLevels } from "../../logger.ts";
import { FetchPlugin } from "../../plugins/fetch.ts";
import { HtmlPlugin } from "../../plugins/html/html.ts";
import { DependencyType, Plugin } from "../../plugins/plugin.ts";
import { TypescriptTopLevelAwaitModulePlugin } from "../../plugins/typescript/typescript_top_level_await_module.ts";
import { assertEquals } from "../../test_deps.ts";

Deno.test({
  name: "example → wasm",
  async fn() {
    const plugins: Plugin[] = [
      new FetchPlugin(),
      new HtmlPlugin(),
      new TypescriptTopLevelAwaitModulePlugin(),
    ];
    const bundler = new Bundler(plugins);
    bundler.logger.quiet = true;
    const input = "examples/wasm/src/index.html";
    const inputs = [
      input,
    ];
    const graph = await bundler.createGraph(inputs);

    assertEquals(Object.keys(graph[input]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/wasm/src/index.ts"]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/wasm/src/simple.wasm"]), [
      DependencyType.Fetch,
    ]);

    const chunks = await bundler.createChunks(inputs, graph);

    assertEquals(chunks.map((chunk) => chunk.item.history[0]), [
      input,
      "examples/wasm/src/index.ts",
      "examples/wasm/src/simple.wasm",
    ]);

    const bundles = await bundler.createBundles(chunks, graph, {
      reload: true,
    });

    assertEquals(Object.keys(bundles), [
      "dist/deps/a038d91c220ba0e9bb167e8725e9bedabb8e49aef7e9d17dd9d976a571bb1f39.html",
      "dist/deps/8a3411c4cbead5b7c6e5500f9e60d0ca60016cc86017bff82b814d0c5a3c1d41.js",
      "dist/deps/93110dcc6753effdf1ad3ddd826e36c5792ab66aed7ac4163f4845c175cee4a7.wasm",
    ]);
  },
});
