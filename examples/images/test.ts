import { Bundler } from "../../bundler.ts";
import { CssPlugin } from "../../plugins/css/css.ts";
import { HtmlPlugin } from "../../plugins/html/html.ts";
import { ImagePlugin } from "../../plugins/image/image.ts";
import { SvgPlugin } from "../../plugins/image/svg.ts";
import { DependencyType, Plugin } from "../../plugins/plugin.ts";
import { SystemPlugin } from "../../plugins/typescript/system.ts";
import { assertEquals } from "../../test_deps.ts";

Deno.test({
  name: "[example] images",
  async fn() {
    const plugins: Plugin[] = [
      new HtmlPlugin(),
      new CssPlugin(),
      new SystemPlugin(),
      new ImagePlugin(),
      new SvgPlugin(),
    ];
    const bundler = new Bundler(plugins, { quiet: true });
    const input = "examples/images/src/index.html";
    const inputs = [
      input,
    ];
    const graph = await bundler.createGraph(inputs);

    assertEquals(Object.keys(graph["examples/images/src/styles.css"]), [
      DependencyType.Fetch,
    ]);
    assertEquals(Object.keys(graph["examples/images/src/image.ico"]), [
      DependencyType.Fetch,
    ]);
    assertEquals(Object.keys(graph["examples/images/src/image.png"]), [
      DependencyType.Fetch,
    ]);
    assertEquals(Object.keys(graph["examples/images/src/image.jpeg"]), [
      DependencyType.Fetch,
    ]);
    assertEquals(Object.keys(graph["examples/images/src/image.svg"]), [
      DependencyType.Fetch,
    ]);
    assertEquals(Object.keys(graph["examples/images/src/image.gif"]), [
      DependencyType.Fetch,
    ]);
    assertEquals(Object.keys(graph["examples/images/src/index.html"]), [
      DependencyType.Import,
    ]);
    assertEquals(Object.keys(graph["examples/images/src/index.ts"]), [
      DependencyType.Import,
    ]);

    const chunks = await bundler.createChunks(inputs, graph);

    assertEquals(chunks.map((chunk) => chunk.history[0]), [
      "examples/images/src/index.html",
      "examples/images/src/index.ts",
      "examples/images/src/styles.css",

      "examples/images/src/image.ico",
      "examples/images/src/image.png",
      "examples/images/src/image.jpeg",

      "examples/images/src/image.svg",
      "examples/images/src/image.gif",
    ]);
    const bundles = await bundler.createBundles(chunks, graph, {
      reload: true,
    });

    assertEquals(Object.keys(bundles), [
      "dist/deps/bca907c2659d86a1bf1c86ecb83ba9147dde5dc72fdb83a84fc46b125e1839bd.html",
      "dist/deps/fefe605a83468ffbe92afa7b19e35bde973116a73ce5e8af0d21ff1c5247e06e.js",
      "dist/deps/6d144280381ee48f66ccca93b289cee685bc1d2e406aea155c91afd1fae88e7f.css",
      "dist/deps/d4b74b61ed81ed04bfe1e6cd1b2503eeec7d27112555de294f075d8985313f39.ico",
      "dist/deps/c9be25f35fb30bd40f5de70ae9b52f6571c88683052c3c168084e551c9533ed3.png",
      "dist/deps/adf9f9108a598d40dedceda5a4706cc0aa76561a091dd06f60b67d0ce19ef305.jpeg",
      "dist/deps/3eb45b517bdbe9fce14f9ed59a51c61759a40b39ea9d0c029c06fa6757e5c24f.svg",
      "dist/deps/dc7dba1cee5143b32505229b1dbd860760e5fc0a85a7e51732681f4389328586.gif",
    ]);
  },
});
