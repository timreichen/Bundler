import { assertEquals } from "../../test_deps.ts";
import { HTMLPlugin } from "./html_plugin.ts";
import { path } from "../../deps.ts";
import { Asset, Chunk, DependencyFormat, DependencyType } from "../_util.ts";
import { stringify } from "./_util.ts";
import { Bundler } from "../../bundler.ts";

const plugin = new HTMLPlugin();

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

        const bundler = new Bundler({ plugins: [plugin], quiet: true });
        const asset = await plugin.createAsset(
          a,
          DependencyType.ImportExport,
          bundler,
        );

        const b = path.toFileUrl(
          path.join(testdataDir, "html/script/index.ts"),
        ).href;

        assertEquals(
          stringify(
            await plugin.createSource(asset.input),
          ),
          `<!DOCTYPE html><html><head>\n    <script src="index.ts"></script>\n  </head>\n  <body>\n  \n</body></html>`,
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

        const bundler = new Bundler({ plugins: [plugin], quiet: true });
        const asset = await plugin.createAsset(
          a,
          DependencyType.ImportExport,
          bundler,
        );

        assertEquals(
          stringify(
            await plugin.createSource(asset.input),
          ),
          `<!DOCTYPE html><html><head>\n    <link rel="stylesheet" href="style.css">\n  </head>\n  <body>\n  \n</body></html>`,
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

        const asset: Asset = {
          input: a,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Html,
          dependencies: [],
        };

        const chunkAssets: Set<Asset> = new Set();
        const chunk = await plugin.createChunk(asset, chunkAssets, undefined, {
          root: "dist",
        });
        assertEquals(chunk, {
          dependencyItems: [],
          item: {
            input: a,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Html,
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

        const bundler = new Bundler({ plugins: [plugin], quiet: true });
        const asset = await plugin.createAsset(
          a,
          DependencyType.ImportExport,
          bundler,
        );

        const chunkAssets: Set<Asset> = new Set();
        const chunk = await plugin.createChunk(asset, chunkAssets, undefined, {
          root: "dist",
        });
        assertEquals(chunk, {
          dependencyItems: [],
          item: {
            format: DependencyFormat.Html,
            input: a,
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

        const bundler = new Bundler({ plugins: [plugin], quiet: true });
        const asset = await plugin.createAsset(
          a,
          DependencyType.ImportExport,
          bundler,
        );
        const chunkAssets: Set<Asset> = new Set();
        const chunk = await plugin.createChunk(asset, chunkAssets, undefined, {
          root: "dist",
        });
        const chunkB: Chunk = {
          item: {
            input: b,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
          output: "file:///dist/index.js",
          dependencyItems: [],
        };
        const { input, type, format } = chunk.item;
        const ast = await bundler.createSource(input, type, format);

        const bundle = await plugin.createBundle(
          chunk,
          ast,
          bundler,
          { chunks: [chunkB], root: "dist" },
        );

        assertEquals(bundle, {
          output: await plugin.createOutput(a, "dist", ".html"),
          source:
            `<!DOCTYPE html><html><head>\n    <script src="/index.js"></script>\n  </head>\n  <body>\n  \n</body></html>`,
        });
      },
    });
    await t.step({
      name: "doctype",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "html/doctype/index.html"),
        ).href;

        const bundler = new Bundler({ plugins: [plugin], quiet: true });
        const asset = await plugin.createAsset(
          a,
          DependencyType.ImportExport,
          bundler,
        );
        const chunkAssets: Set<Asset> = new Set();
        const chunk = await plugin.createChunk(asset, chunkAssets, undefined, {
          root: "dist",
        });
        const { input, type, format } = chunk.item;
        const ast = await bundler.createSource(input, type, format);

        const bundle = await plugin.createBundle(
          chunk,
          ast,
          bundler,
          { root: "dist" },
        );
        assertEquals(bundle, {
          output: await plugin.createOutput(a, "dist", ".html"),
          source:
            `<!DOCTYPE html><html><head>\n  </head>\n  <body>\n  \n</body></html>`,
        });
      },
    });
  },
});
