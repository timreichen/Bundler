import { Bundler } from "../../bundler.ts";
import { HtmlPlugin } from "../../plugins/html/html.ts";
import { DependencyType, Plugin } from "../../plugins/plugin.ts";
import { TypescriptTopLevelAwaitModulePlugin } from "../../plugins/typescript/typescript_top_level_await_module.ts";
import { assertEquals, assertStringIncludes } from "../../test_deps.ts";

Deno.test({
  name: "[example] hello_world",
  async fn() {
    const plugins: Plugin[] = [
      new HtmlPlugin(),
      new TypescriptTopLevelAwaitModulePlugin(),
    ];
    const bundler = new Bundler(plugins, { quiet: true });
    const input = "examples/hello_world/src/index.html";
    const inputs = [
      input,
    ];
    const graph = await bundler.createGraph(inputs);

    assertEquals(Object.keys(graph[input]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/hello_world/src/index.ts"]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/hello_world/src/world.ts"]), [
      DependencyType.Import,
    ]);

    const chunks = await bundler.createChunks(inputs, graph);

    assertEquals(chunks.map((chunk) => chunk.history[0]), [
      input,
      "examples/hello_world/src/index.ts",
    ]);

    const bundles = await bundler.createBundles(chunks, graph, {
      reload: true,
    });

    assertEquals(Object.keys(bundles), [
      "dist/deps/f5a1cceabf0fa01aaf52d0156eb54836968e6306ee08d75e39bce9feccf9f2ea.html",
      "dist/deps/a44f6db2f2769e51be622a23d3ff909fc7d7fec8d2e0bdc23b636cdf12fccbe0.js",
    ]);

    assertStringIncludes(
      bundles[
        "dist/deps/a44f6db2f2769e51be622a23d3ff909fc7d7fec8d2e0bdc23b636cdf12fccbe0.js"
      ] as string,
      `const mod = (async () => {`,
    );
    assertStringIncludes(
      bundles[
        "dist/deps/a44f6db2f2769e51be622a23d3ff909fc7d7fec8d2e0bdc23b636cdf12fccbe0.js"
      ] as string,
      `export default (async () => {`,
    );
    assertStringIncludes(
      bundles[
        "dist/deps/a44f6db2f2769e51be622a23d3ff909fc7d7fec8d2e0bdc23b636cdf12fccbe0.js"
      ] as string,
      `const { world } = await mod;`,
    );
    assertStringIncludes(
      bundles[
        "dist/deps/a44f6db2f2769e51be622a23d3ff909fc7d7fec8d2e0bdc23b636cdf12fccbe0.js"
      ] as string,
      `return { world };`,
    );
  },
});
