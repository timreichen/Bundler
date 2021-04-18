import { Bundler } from "../../bundler.ts";
import { HtmlPlugin } from "../../plugins/html/html.ts";
import { DependencyType, Plugin } from "../../plugins/plugin.ts";
import { TypescriptTopLevelAwaitModulePlugin } from "../../plugins/typescript/typescript_top_level_await_module.ts";
import { assertEquals } from "../../test_deps.ts";

Deno.test({
  name: "[example] threejs",
  async fn() {
    const plugins: Plugin[] = [
      new HtmlPlugin(),
      new TypescriptTopLevelAwaitModulePlugin(),
    ];
    const bundler = new Bundler(plugins, { quiet: true });
    const input = "examples/threejs/src/index.html";
    const inputs = [
      input,
    ];
    const graph = await bundler.createGraph(inputs);

    assertEquals(Object.keys(graph[input]), [
      DependencyType.Import,
    ]);

    assertEquals(Object.keys(graph["examples/threejs/src/index.ts"]), [
      DependencyType.Import,
    ]);

    assertEquals(
      Object.keys(graph["https://unpkg.com/three/build/three.module.js"]),
      [
        DependencyType.Import,
      ],
    );

    const chunks = await bundler.createChunks(inputs, graph);

    assertEquals(chunks.map((chunk) => chunk.history[0]), [
      input,
      "examples/threejs/src/index.ts",
    ]);
    const bundles = await bundler.createBundles(chunks, graph, {
      reload: true,
    });

    assertEquals(Object.keys(bundles), [
      "dist/deps/8a09bb0613db9a54f453394582c9c11ac8aab8427cfa0285043d754e7884dd42.html",
      "dist/deps/ae8856d652293054080217dcd4a379a9209c4e88e3b4e2bff6c83bbd76af7bdd.js",
    ]);
  },
});
