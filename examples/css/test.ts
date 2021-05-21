import { Bundler } from "../../bundler.ts";
import { postcss, postcssPresetEnv } from "../../deps.ts";
import { CssPlugin } from "../../plugins/css/css.ts";
import { HtmlPlugin } from "../../plugins/html/html.ts";
import { ImagePlugin } from "../../plugins/image/image.ts";
import { DependencyType, Plugin } from "../../plugins/plugin.ts";
import { TypescriptTopLevelAwaitModulePlugin } from "../../plugins/typescript/typescript_top_level_await_module.ts";
import { assertEquals } from "../../test_deps.ts";

const use: postcss.AcceptedPlugin[] = [
  postcssPresetEnv({
    stage: 2,
    features: {
      "nesting-rules": true,
    },
  }) as any,
];

Deno.test({
  name: "example → css",
  async fn() {
    const plugins: Plugin[] = [
      new HtmlPlugin(),
      new TypescriptTopLevelAwaitModulePlugin(),
      new CssPlugin({ use }),
      new ImagePlugin(),
    ];
    const bundler = new Bundler(plugins);
    bundler.logger.quiet = true;
    const input = "examples/css/src/index.html";
    const inputs = [
      input,
    ];
    const outputMap = {
      [input]: "examples/css/dist/index.html",
    };
    const graph = await bundler.createGraph(inputs, { outputMap });

    assertEquals(Object.keys(graph[input]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/css/src/index.ts"]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/css/src/h1.css"]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/css/src/import.css"]), [
      DependencyType.Import,
    ]);

    assertEquals(Object.keys(graph["examples/css/src/styles.css"]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/css/src/image.png"]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/css/src/script.css"]), [
      DependencyType.Import,
    ]);

    const chunks = await bundler.createChunks(inputs, graph);

    assertEquals(chunks.map((chunk) => chunk.item.history[0]), [
      input,
      "examples/css/src/index.ts",
      "examples/css/src/styles.css",
      "examples/css/src/image.png",
    ]);

    const bundles = await bundler.createBundles(chunks, graph, {
      reload: true,
    });

    assertEquals(Object.keys(bundles), [
      "examples/css/dist/index.html",
      "dist/deps/02e2f6aba4f195fc1c607a3c753a2a11def721b856585792ce37d7e77ed06087.js",
      "dist/deps/30a1023d732b9ad04797223b3b7e8cb4dc11c9984e224f841b53195bb1c1de11.css",
      "dist/deps/02463e3056e72d447d568ff98171fdf96a719fe955de7442769323a2557d5ab6.png",
    ]);
  },
});
