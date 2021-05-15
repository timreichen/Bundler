import { Bundler } from "../../bundler.ts";
import { HtmlPlugin } from "../../plugins/html/html.ts";
import { DependencyType, Plugin } from "../../plugins/plugin.ts";
import { TypescriptTopLevelAwaitModulePlugin } from "../../plugins/typescript/typescript_top_level_await_module.ts";
import { assertEquals } from "../../test_deps.ts";

Deno.test({
  name: "example → no_module",
  async fn() {
    const plugins: Plugin[] = [
      new HtmlPlugin(),
      new TypescriptTopLevelAwaitModulePlugin(),
    ];
    const bundler = new Bundler(plugins);
    bundler.logger.quiet = true;
    const input = "examples/no_module/src/index.html";
    const inputs = [
      input,
    ];
    const graph = await bundler.createGraph(inputs);

    assertEquals(Object.keys(graph[input]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/no_module/src/index.ts"]), [
      DependencyType.Import,
    ]);

    const chunks = await bundler.createChunks(inputs, graph);

    assertEquals(chunks.map((chunk) => chunk.history[0]), [
      input,
      "examples/no_module/src/index.ts",
    ]);

    const bundles = await bundler.createBundles(chunks, graph, {
      reload: true,
    });

    assertEquals(Object.keys(bundles), [
      "dist/deps/b4a59b0e2e1a3d63f2e7fb43740d6f198a6ea69c243812c07d2c29cddd4a4f0c.html",
      "dist/deps/8dafca19494ff1a037710578d62b13f75af730106eee5d98f714fec3427fd457.js",
    ]);

    assertEquals(
      bundles[
        "dist/deps/8dafca19494ff1a037710578d62b13f75af730106eee5d98f714fec3427fd457.js"
      ] as string,
      `\n/* examples/no_module/src/index.ts */\nconst world = "world";\r\ndocument.addEventListener("DOMContentLoaded", () => {\r\n    const h1 = document.createElement("h1");\r\n    h1.innerHTML = \`Hello, \${world}!\`;\r\n    document.body.appendChild(h1);\r\n});\r\n`,
    );
  },
});
