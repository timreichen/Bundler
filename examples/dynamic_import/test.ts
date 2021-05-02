import { Bundler } from "../../bundler.ts";
import { HtmlPlugin } from "../../plugins/html/html.ts";
import { DependencyType, Plugin } from "../../plugins/plugin.ts";
import { TypescriptTopLevelAwaitModulePlugin } from "../../plugins/typescript/typescript_top_level_await_module.ts";
import { assertEquals, assertStringIncludes } from "../../test_deps.ts";

Deno.test({
  name: "example → dynamic_import",
  async fn() {
    const plugins: Plugin[] = [
      new HtmlPlugin(),
      new TypescriptTopLevelAwaitModulePlugin(),
    ];
    const bundler = new Bundler(plugins);
    bundler.logger.quiet = true;
    const input = "examples/dynamic_import/src/index.html";
    const inputs = [
      input,
    ];
    const graph = await bundler.createGraph(inputs);

    assertEquals(Object.keys(graph[input]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/dynamic_import/src/index.ts"]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/dynamic_import/src/message.ts"]), [
      DependencyType.DynamicImport,
    ]);

    const chunks = await bundler.createChunks(inputs, graph);

    assertEquals(chunks.map((chunk) => chunk.history[0]), [
      input,
      "examples/dynamic_import/src/index.ts",
      "examples/dynamic_import/src/message.ts",
    ]);

    const bundles = await bundler.createBundles(chunks, graph, {
      reload: true,
    });

    assertEquals(Object.keys(bundles), [
      "dist/deps/c073af8985d46cf5f6207f4b1635f81ccb69a6c5a9e4b4cb91b837c435510f68.html",
      "dist/deps/d3c93bde518cbbd27392ec0a96822aa4fe177fc20b4a2c10319a746cad771beb.js",
      "dist/deps/e447e137aeff698a0e83a3673ce8e12a50a55d7e0f1888b83396be6950ef07bd.js",
    ]);

    const indexSource = bundles[
      "dist/deps/d3c93bde518cbbd27392ec0a96822aa4fe177fc20b4a2c10319a746cad771beb.js"
    ] as string;

    assertStringIncludes(
      indexSource,
      `await import("./e447e137aeff698a0e83a3673ce8e12a50a55d7e0f1888b83396be6950ef07bd.js").then(async (data) => await data.default)`,
    );
    assertStringIncludes(
      indexSource,
      `export default (async () => {`,
    );
    const messageSource = bundles[
      "dist/deps/e447e137aeff698a0e83a3673ce8e12a50a55d7e0f1888b83396be6950ef07bd.js"
    ] as string;

    assertStringIncludes(
      messageSource,
      `export default (async () => {`,
    );
    assertStringIncludes(
      messageSource,
      `return { message }`,
    );
  },
});
