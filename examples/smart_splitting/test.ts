import { Bundler } from "../../bundler.ts";
import { HtmlPlugin } from "../../plugins/html/html.ts";
import { DependencyType, Plugin } from "../../plugins/plugin.ts";
import { TypescriptTopLevelAwaitModulePlugin } from "../../plugins/typescript/typescript_top_level_await_module.ts";
import { assertEquals, assertStringIncludes } from "../../test_deps.ts";

Deno.test({
  name: "example → smart_splitting",
  async fn() {
    const plugins: Plugin[] = [
      new HtmlPlugin(),
      new TypescriptTopLevelAwaitModulePlugin(),
    ];
    const bundler = new Bundler(plugins);
    bundler.logger.quiet = true;
    const input = "examples/smart_splitting/src/index.html";
    const inputs = [
      input,
      "examples/smart_splitting/src/a.ts",
      "examples/smart_splitting/src/b.ts",
    ];
    const outputMap = {
      "examples/smart_splitting/src/a.ts": "dist/a.js",
      "examples/smart_splitting/src/b.ts": "dist/b.js",
    };
    const graph = await bundler.createGraph(inputs, { outputMap });

    assertEquals(Object.keys(graph[input]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/smart_splitting/src/a.ts"]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/smart_splitting/src/b.ts"]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/smart_splitting/src/c.ts"]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/smart_splitting/src/d.ts"]), [
      DependencyType.Import,
    ]);

    const chunks = await bundler.createChunks(inputs, graph);
    assertEquals(chunks.map((chunk) => chunk.item.history[0]), [
      input,
      "examples/smart_splitting/src/a.ts",
      "examples/smart_splitting/src/b.ts",
      "examples/smart_splitting/src/c.ts",
    ]);

    const bundles = await bundler.createBundles(chunks, graph, {
      reload: true,
    });

    assertEquals(Object.keys(bundles), [
      "dist/deps/4aa22094e5ea69fa716bf824ea91432e74c1b3b5b9052b33a484c7fd52510a06.html",
      "dist/a.js",
      "dist/b.js",
      "dist/deps/cc48d69a5071eab490d13fa66ddad7c5d07f4474cde05a347df22a49b4639228.js",
    ]);

    assertStringIncludes(
      bundles[
        "dist/b.js"
      ] as string,
      `export default (async ()=>{`,
    );
    assertStringIncludes(
      bundles[
        "dist/b.js"
      ] as string,
      `return {\n    };`,
    );

    assertStringIncludes(
      bundles[
        "dist/deps/cc48d69a5071eab490d13fa66ddad7c5d07f4474cde05a347df22a49b4639228.js"
      ] as string,
      `export default (async ()=>{`,
    );
    assertStringIncludes(
      bundles[
        "dist/deps/cc48d69a5071eab490d13fa66ddad7c5d07f4474cde05a347df22a49b4639228.js"
      ] as string,
      `const mod = (async ()=>{`,
    );
  },
});
