import { Bundler } from "../../bundler.ts";
import { HtmlPlugin } from "../../plugins/html/html.ts";
import { ImagePlugin } from "../../plugins/image/image.ts";
import { WebManifestPlugin } from "../../plugins/json/webmanifest.ts";
import { DependencyType, Plugin } from "../../plugins/plugin.ts";
import { TypescriptTopLevelAwaitModulePlugin } from "../../plugins/typescript/typescript_top_level_await_module.ts";
import { assertEquals } from "../../test_deps.ts";

Deno.test({
  name: "example → webmanifest",
  async fn() {
    const plugins: Plugin[] = [
      new HtmlPlugin(),
      new TypescriptTopLevelAwaitModulePlugin(),
      new ImagePlugin(),
      new WebManifestPlugin(),
    ];
    const bundler = new Bundler(plugins, { quiet: true });
    const input = "examples/webmanifest/src/index.html";
    const inputs = [
      input,
    ];
    const graph = await bundler.createGraph(inputs);

    assertEquals(Object.keys(graph[input]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/webmanifest/src/manifest.json"]), [
      DependencyType.Import,
    ]);
    assertEquals(
      Object.keys(graph["examples/webmanifest/src/images/icon-128x128.png"]),
      [
        DependencyType.Import,
      ],
    );
    assertEquals(
      Object.keys(graph["examples/webmanifest/src/images/icon-192x192.png"]),
      [
        DependencyType.Import,
      ],
    );

    const chunks = await bundler.createChunks(inputs, graph);

    assertEquals(chunks.map((chunk) => chunk.history[0]), [
      input,
      "examples/webmanifest/src/manifest.json",
      "examples/webmanifest/src/images/icon-128x128.png",
      "examples/webmanifest/src/images/icon-192x192.png",
    ]);
    const bundles = await bundler.createBundles(chunks, graph, {
      reload: true,
    });

    assertEquals(Object.keys(bundles), [
      "dist/deps/64a7d0918ea789b4ef309940e5e2e584dd3ea7431d6c635e5fb195a9cd19815e.html",
      "dist/deps/d16e6ee97ba107ecced484aa0ef110fcef8b52fdfa25e5f4a43d519183bcdf04.json",
      "dist/deps/7ccc2ebe60fd8c58b2326c76d34102f327a2d4ffa400a23ffefa6e9bf022f697.png",
      "dist/deps/94484d6951b794c37c88b100c3c6712f844ed4cbf6e2beeca52ef4d4e861fe3f.png",
    ]);
  },
});
