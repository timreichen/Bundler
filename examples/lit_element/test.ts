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
      Deno.readTextFileSync("examples/lit_element/importmap.json"),
    );
    const plugins: Plugin[] = [
      new HtmlPlugin(),
      new TypescriptTopLevelAwaitModulePlugin(),
      new CssPlugin(),
    ];
    const bundler = new Bundler(plugins, { quiet: true });
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
    assertEquals(Object.keys(graph["https://jspm.dev/lit-element@2.4.0"]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph), [
      input,
      "examples/lit_element/src/index.ts",
      "examples/lit_element/src/element.ts",
      "https://jspm.dev/lit-element@2.4.0",
      "examples/lit_element/src/styles.css",
      "https://jspm.dev/npm:lit-html@1/lib/shady-render.js",
      "https://jspm.dev/npm:lit-element@2.4.0/lib/updating-element.js",
      "https://jspm.dev/npm:lit-element@2.4.0/lib/decorators",
      "https://jspm.dev/npm:lit-html@1/lit-html.js",
      "https://jspm.dev/npm:lit-element@2.4.0/lib/css-tag",
      "https://jspm.dev/npm:lit-element@2.4.0",
      "https://jspm.dev/npm:lit-html@1.3.0/lib/directive.js",
      "https://jspm.dev/npm:lit-html@1.3.0/lib/dom.js",
      "https://jspm.dev/npm:lit-html@1.3.0/lib/part.js",
      "https://jspm.dev/npm:lit-html@1.3.0/lib/template.js",
      "https://jspm.dev/npm:lit-html@1.3.0/_/35f522a9.js",
      "https://jspm.dev/npm:lit-html@1.3.0",
      "https://jspm.dev/npm:lit-html@1.3.0/lib/template-factory.js",
      "https://jspm.dev/npm:lit-html@1.3.0/lib/render.js",
      "https://jspm.dev/npm:lit-html@1.3.0/lib/shady-render",
    ]);

    const chunks = await bundler.createChunks(inputs, graph, { importMap });

    assertEquals(chunks.map((chunk) => chunk.history[0]), [
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
