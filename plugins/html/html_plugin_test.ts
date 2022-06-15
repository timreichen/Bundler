import { assertEquals } from "../../test_deps.ts";
import { Bundler } from "../../bundler.ts";
import { Asset, DependencyFormat, DependencyType } from "../plugin.ts";
import { HTMLPlugin } from "./html_plugin.ts";
import { path } from "../../deps.ts";
import { newline } from "../../_util.ts";

const plugin = new HTMLPlugin();

const bundler = new Bundler({ plugins: [plugin], quiet: true });

const moduleDir = path.dirname(path.fromFileUrl(import.meta.url));
const testdataDir = path.resolve(moduleDir, "../../testdata");

Deno.test({
  name: "test",
  fn() {
    assertEquals(
      plugin.test(
        "file.html",
        DependencyType.ImportExport,
        DependencyFormat.Unknown,
      ),
      true,
    );
    assertEquals(
      plugin.test("file.html", DependencyType.Fetch, DependencyFormat.Unknown),
      true,
    );
    assertEquals(
      plugin.test("file.xml", DependencyType.Fetch, DependencyFormat.Unknown),
      false,
    );
    assertEquals(
      plugin.test("file.xml", DependencyType.Fetch, DependencyFormat.Html),
      true,
    );
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
        const asset = await bundler.createAsset(
          a,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
        );
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
            `<html>${newline}  <head>${newline}    <script src="index.ts"></script>${newline}  </head>${newline}  <body>${newline}  </body>${newline}</html>`,
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

        const asset = await bundler.createAsset(
          a,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
        );
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
            `<html>${newline}  <head>${newline}    <link rel="stylesheet" href="style.css">${newline}  </head>${newline}  <body>${newline}  </body>${newline}</html>`,
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

        const asset = await bundler.createAsset(
          a,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
        );

        const chunkAssets: Set<Asset> = new Set();
        const chunk = await bundler.createChunk(asset, chunkAssets);
        assertEquals(chunk, {
          dependencyItems: [],
          item: {
            format: DependencyFormat.Html,
            input: a,
            source:
              `<html>${newline}  <head>${newline}    <script src="index.ts"></script>${newline}  </head>${newline}  <body>${newline}  </body>${newline}</html>`,
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

        const asset = await bundler.createAsset(
          a,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
        );

        const chunkAssets: Set<Asset> = new Set();
        const chunk = await bundler.createChunk(asset, chunkAssets);
        assertEquals(chunk, {
          dependencyItems: [],
          item: {
            format: DependencyFormat.Html,
            input: a,
            source:
              `<html>${newline}  <head>${newline}    <link rel="stylesheet" href="style.css">${newline}  </head>${newline}  <body>${newline}  </body>${newline}</html>`,
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

        const asset = await bundler.createAsset(
          a,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
        );
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
            `<html>${newline}  <head>${newline}    <script src="/index.js"></script>${newline}  </head>${newline}  <body>${newline}  </body>${newline}</html>`,
        });
      },
    });
  },
});
