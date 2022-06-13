import { assertEquals } from "../../test_deps.ts";
import { Bundler } from "../../bundler.ts";
import { Asset, DependencyFormat, DependencyType } from "../plugin.ts";
import { HTMLPlugin } from "./html_plugin.ts";
import { path } from "../../deps.ts";

const plugin = new HTMLPlugin();

const bundler = new Bundler({ plugins: [plugin], quiet: true });

const moduleDir = path.dirname(path.fromFileUrl(import.meta.url));
const testdataDir = path.resolve(moduleDir, "../../testdata");

Deno.test({
  name: "test",
  fn() {
    assertEquals(plugin.test(".html", DependencyType.ImportExport), true);
    assertEquals(plugin.test(".html", DependencyType.Fetch), true);
    assertEquals(plugin.test(".xml", DependencyType.Fetch), false);
  },
});

Deno.test({
  name: "createAsset",
  async fn(t) {
    await t.step({
      name: "script",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "html/script/index.html"),
        ).href;
        const b = path.toFileUrl(
          path.join(testdataDir, "html/script/index.ts"),
        ).href;
        const asset = await bundler.createAsset(a, DependencyType.ImportExport);
        assertEquals(asset, {
          input: a,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Html,
          dependencies: [
            {
              input: b,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
          ],
          exports: {},
          source:
            '<html>\n  <head>\n    <script src="index.ts"></script>\n  </head>\n  <body>\n  </body>\n</html>',
        });
      },
    });

    await t.step({
      name: "link",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "html/link/index.html"),
        ).href;
        const b =
          path.toFileUrl(path.join(testdataDir, "html/link/style.css")).href;

        const asset = await bundler.createAsset(a, DependencyType.ImportExport);
        assertEquals(asset, {
          input: a,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Html,
          dependencies: [
            {
              input: b,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Style,
            },
          ],
          exports: {},
          source:
            '<html>\n  <head>\n    <link rel="stylesheet" href="style.css">\n  </head>\n  <body>\n  </body>\n</html>',
        });
      },
    });
  },
});

Deno.test({
  name: "createChunk",
  async fn(t) {
    await t.step({
      name: "script",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "html/script/index.html"),
        ).href;

        const asset = await bundler.createAsset(a, DependencyType.ImportExport);

        const chunkAssets: Set<Asset> = new Set();
        const chunk = await bundler.createChunk(asset, chunkAssets);
        assertEquals(chunk, {
          dependencyItems: [],
          item: {
            format: DependencyFormat.Html,
            input: a,
            source:
              '<html>\n  <head>\n    <script src="index.ts"></script>\n  </head>\n  <body>\n  </body>\n</html>',
            type: DependencyType.ImportExport,
          },
          output: await plugin.createOutput(a, "dist", ".html"),
        });
      },
    });

    await t.step({
      name: "link",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "html/link/index.html"),
        ).href;

        const asset = await bundler.createAsset(a, DependencyType.ImportExport);

        const chunkAssets: Set<Asset> = new Set();
        const chunk = await bundler.createChunk(asset, chunkAssets);
        assertEquals(chunk, {
          dependencyItems: [],
          item: {
            format: DependencyFormat.Html,
            input: a,
            source:
              '<html>\n  <head>\n    <link rel="stylesheet" href="style.css">\n  </head>\n  <body>\n  </body>\n</html>',
            type: DependencyType.ImportExport,
          },
          output: await plugin.createOutput(a, "dist", ".html"),
        });
      },
    });
  },
});

Deno.test({
  name: "createBundle",
  async fn(t) {
    await t.step({
      name: "import",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "html/script/index.html"),
        ).href;
        const b = path.toFileUrl(
          path.join(testdataDir, "html/script/index.ts"),
        ).href;

        const asset = await bundler.createAsset(a, DependencyType.ImportExport);
        const chunkAssets: Set<Asset> = new Set();
        const chunk = await bundler.createChunk(asset, chunkAssets);
        const chunkB = {
          item: {
            input: b,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            source: `console.log("hello world");`,
            dependencies: [],
            exports: {},
          },
          output: "file:///dist/index.js",
          dependencyItems: [],
        };
        const bundle = await bundler.createBundle(chunk, { chunks: [chunkB] });
        assertEquals(bundle, {
          output: await plugin.createOutput(a, "dist", ".html"),
          source:
            '<html>\n  <head>\n    <script src="/index.js"></script>\n  </head>\n  <body>\n  </body>\n</html>',
        });
      },
    });
  },
});
