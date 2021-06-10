import { Bundler } from "../../bundler.ts";
import { HtmlPlugin } from "../../plugins/html/html.ts";
import { CssPlugin } from "../../plugins/css/css.ts";
import { DependencyType, Plugin } from "../../plugins/plugin.ts";
import { TypescriptTopLevelAwaitModulePlugin } from "../../plugins/typescript/typescript_top_level_await_module.ts";
import { assertEquals } from "../../test_deps.ts";

Deno.test({
  name: "example → lit_element",
  async fn() {
    const importMap = JSON.parse(
      Deno.readTextFileSync("examples/lit_element/import_map.json"),
    );
    const plugins: Plugin[] = [
      new HtmlPlugin(),
      new TypescriptTopLevelAwaitModulePlugin(),
      new CssPlugin(),
    ];
    const bundler = new Bundler(plugins);
    bundler.logger.quiet = true;
    const input = "examples/lit_element/src/index.html";
    const inputs = [
      input,
    ];
    const graph = await bundler.createGraph(inputs, { importMap });

    assertEquals(Object.keys(graph[input]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/lit_element/src/index.ts"]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/lit_element/src/element.ts"]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["https://cdn.skypack.dev/lit"]), [
      DependencyType.Import,
    ]);

    assertEquals(Object.keys(graph), [
      input,
      "examples/lit_element/src/index.ts",
      "examples/lit_element/src/element.ts",
      "https://cdn.skypack.dev/lit",
      "https://cdn.skypack.dev/lit/decorators.js",
      "examples/lit_element/src/styles.css",
      "https://cdn.skypack.dev/-/lit@v2.0.0-rc.2-0IAqZvGziwqAJXQ3ixcb/dist=es2020,mode=imports/optimized/lit.js",
      "https://cdn.skypack.dev/-/lit@v2.0.0-rc.2-0IAqZvGziwqAJXQ3ixcb/dist=es2020,mode=imports/optimized/lit/decorators.js",
      "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element.js",
      "https://cdn.skypack.dev/-/lit-html@v2.0.0-rc.3-mF2EKOQ7ge0WnKTCrvCT/dist=es2020,mode=imports/optimized/lit-html.js",
      "https://cdn.skypack.dev/-/lit-element@v3.0.0-rc.2-etHLWyR5eQWAXCYS9lMl/dist=es2020,mode=imports/optimized/lit-element/lit-element.js",
      "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/custom-element.js",
      "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/property.js",
      "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/state.js",
      "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/event-options.js",
      "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/query.js",
      "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/query-all.js",
      "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/query-async.js",
      "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/query-assigned-nodes.js",
      "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/css-tag.js",
      "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/base.js",
    ]);

    const chunks = await bundler.createChunks(inputs, graph, { importMap });

    assertEquals(chunks.map((chunk) => chunk.item.history[0]), [
      input,
      "examples/lit_element/src/index.ts",
    ]);
    const bundles = await bundler.createBundles(chunks, graph, {
      importMap,
      reload: true,
    });

    assertEquals(Object.keys(bundles), [
      "dist/deps/9f35838a4736c3bf3884faaaa3a31fff881050a44a87d4f858a3b87a250d09db.html",
      "dist/deps/9449cbe98e4f1727f4449e454327da2acc2a61fcc305023036f6b71006b5685f.js",
    ]);
  },
});
