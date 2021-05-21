import { Bundler } from "../../bundler.ts";
import { HtmlPlugin } from "../../plugins/html/html.ts";
import { JsonPlugin } from "../../plugins/json/json.ts";
import { DependencyType, Plugin } from "../../plugins/plugin.ts";
import { TypescriptTopLevelAwaitModulePlugin } from "../../plugins/typescript/typescript_top_level_await_module.ts";
import { assertEquals, assertStringIncludes } from "../../test_deps.ts";

Deno.test({
  name: "example → json",
  async fn() {
    const plugins: Plugin[] = [
      new HtmlPlugin(),
      new TypescriptTopLevelAwaitModulePlugin(),
      new JsonPlugin(),
    ];
    const bundler = new Bundler(plugins);
    bundler.logger.quiet = true;
    const input = "examples/json/src/index.html";
    const inputs = [
      input,
    ];
    const graph = await bundler.createGraph(inputs);
    assertEquals(Object.keys(graph[input]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/json/src/index.ts"]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/json/src/data.json"]), [
      DependencyType.Import,
    ]);

    const chunks = await bundler.createChunks(inputs, graph);

    const bundles = await bundler.createBundles(chunks, graph);

    assertEquals(Object.keys(bundles), [
      "dist/deps/09d8e952e45bcc70a3ecee25cafa7ffdef5b7ef6b3280adab0143b048b420c7c.html",
      "dist/deps/db86e1fd887f6089efeeabc89602a3e33578f97f3a853b0cd9cf95c8fedc996a.js",
    ]);

    assertStringIncludes(
      bundles[
        "dist/deps/db86e1fd887f6089efeeabc89602a3e33578f97f3a853b0cd9cf95c8fedc996a.js"
      ] as string,
      `const mod = (async ()=>{`,
    );
    assertStringIncludes(
      bundles[
        "dist/deps/db86e1fd887f6089efeeabc89602a3e33578f97f3a853b0cd9cf95c8fedc996a.js"
      ] as string,
      `return {
        default: {
            "hello world": "from JSON"
        }
    };`,
    );
    assertStringIncludes(
      bundles[
        "dist/deps/db86e1fd887f6089efeeabc89602a3e33578f97f3a853b0cd9cf95c8fedc996a.js"
      ] as string,
      `export default (async ()=>{`,
    );
  },
});
