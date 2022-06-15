import { assertEquals } from "../../test_deps.ts";
import { Bundler } from "../../bundler.ts";
import { Asset, DependencyFormat, DependencyType } from "../plugin.ts";
import { CSSPlugin } from "./css_plugin.ts";
import { path } from "../../deps.ts";

const plugin = new CSSPlugin();

const bundler = new Bundler({ plugins: [plugin], quiet: true });

const moduleDir = path.dirname(path.fromFileUrl(import.meta.url));
const testdataDir = path.resolve(moduleDir, "../../testdata");

Deno.test({
  name: "test",
  fn() {
    assertEquals(
      plugin.test(
        "file.css",
        DependencyType.ImportExport,
        DependencyFormat.Unknown,
      ),
      true,
    );
    assertEquals(
      plugin.test(
        "file.scss",
        DependencyType.ImportExport,
        DependencyFormat.Unknown,
      ),
      false,
    );
    assertEquals(
      plugin.test(
        "file.style",
        DependencyType.ImportExport,
        DependencyFormat.Style,
      ),
      true,
    );
  },
});

Deno.test({
  name: "createAsset",
  async fn(t) {
    await t.step({
      name: "linear",
      async fn() {
        const a =
          path.toFileUrl(path.join(testdataDir, "/css/linear/a.css")).href;
        const b =
          path.toFileUrl(path.join(testdataDir, "/css/linear/b.css")).href;
        const asset = await bundler.createAsset(
          a,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
        );
        assertEquals(asset, {
          input: a,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
          dependencies: [
            {
              input: b,
              format: DependencyFormat.Style,
              type: DependencyType.ImportExport,
            },
          ],
          exports: {},
          source: `@import "./b.css";\n\nh1 {\n  font-family: Helvetica;\n}`,
        });
      },
    });
    await t.step({
      name: "image",
      async fn() {
        const a =
          path.toFileUrl(path.join(testdataDir, "/css/image/a.css")).href;
        const image = new URL(
          "../../testdata/css/image/image.png",
          import.meta.url,
        );
        const asset = await bundler.createAsset(
          a,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
        );
        assertEquals(asset, {
          input: a,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
          dependencies: [
            {
              input: image.href,
              format: DependencyFormat.Binary,
              type: DependencyType.ImportExport,
            },
          ],
          exports: {},
          source: `div {\n  background-image: url("./image.png");\n}`,
        });
      },
    });
    await t.step({
      name: "nesting",
      async fn() {
        const a =
          path.toFileUrl(path.join(testdataDir, "css/nesting/a.css")).href;
        const asset = await bundler.createAssets([a]);
        assertEquals(asset, [{
          input: a,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
          dependencies: [],
          exports: {},
          source: `\n  div > h1 {\n    font-family: Helvetica;\n  }`,
        }]);
      },
    });
  },
});

Deno.test({
  name: "createChunk",
  async fn(t) {
    await t.step({
      name: "linear",
      async fn() {
        const a =
          path.toFileUrl(path.join(testdataDir, "/css/linear/a.css")).href;
        const b =
          path.toFileUrl(path.join(testdataDir, "/css/linear/b.css")).href;
        const assetA = await bundler.createAsset(
          a,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
        );
        const assetB = await bundler.createAsset(
          b,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
        );

        const chunkContext = {
          assets: [
            assetA,
            assetB,
          ],
        };

        const chunkAssets: Set<Asset> = new Set();
        const chunk = await bundler.createChunk(
          assetA,
          chunkAssets,
          chunkContext,
        );
        assertEquals(chunk, {
          dependencyItems: [
            {
              format: DependencyFormat.Style,
              input: b,
              type: DependencyType.ImportExport,
              source: `h1 {\n  color: green;\n}`,
            },
          ],
          item: {
            format: DependencyFormat.Style,
            input: a,
            source: `@import "./b.css";\n\nh1 {\n  font-family: Helvetica;\n}`,
            type: DependencyType.ImportExport,
          },
          output: await plugin.createOutput(a, "dist", ".css"),
        });
      },
    });

    await t.step({
      name: "image",
      async fn() {
        const a =
          path.toFileUrl(path.join(testdataDir, "/css/image/a.css")).href;
        const b =
          path.toFileUrl(path.join(testdataDir, "/css/image/image.png")).href;
        const asset = await bundler.createAsset(
          a,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
        );

        const assetB: Asset = {
          input: b,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Binary,
          source: `imagedata`,
          exports: {},
          dependencies: [],
        };

        const chunkContext = {
          bundler,
          outputMap: {},
          root: "file:///dist/",
          assets: [asset, assetB],
        };

        const chunkAssets: Set<Asset> = new Set();
        const chunk = await plugin.createChunk(
          asset,
          chunkAssets,
          chunkContext,
        );
        assertEquals(chunk, {
          dependencyItems: [],
          item: {
            format: DependencyFormat.Style,
            input: a,
            source: `div {\n  background-image: url("./image.png");\n}`,
            type: DependencyType.ImportExport,
          },
          output: await plugin.createOutput(a, "dist", ".css"),
        });
      },
    });
  },
});

Deno.test({
  name: "createBundle",
  async fn(t) {
    await t.step({
      name: "inject import source",
      async fn() {
        const a =
          path.toFileUrl(path.join(testdataDir, "/css/linear/a.css")).href;
        const b =
          path.toFileUrl(path.join(testdataDir, "/css/linear/b.css")).href;
        const assetA = await bundler.createAsset(
          a,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
        );
        const assetB = await bundler.createAsset(
          b,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
        );

        const chunkContext = {
          assets: [
            assetA,
            assetB,
          ],
        };
        const chunkAssets: Set<Asset> = new Set();
        const chunk = await bundler.createChunk(
          assetA,
          chunkAssets,
          chunkContext,
        );

        const bundle = await bundler.createBundle(chunk);
        assertEquals(bundle, {
          output: await plugin.createOutput(a, "dist", ".css"),
          source:
            `h1 {\n  color: green;\n}\n\nh1 {\n  font-family: Helvetica;\n}`,
        });
      },
    });

    // replace @import with source even though a chunk of the dependency exists.
    // This ensures functional css in custom elements
    await t.step({
      name: "always inline import source",
      async fn() {
        const a =
          path.toFileUrl(path.join(testdataDir, "/css/linear/a.css")).href;
        const b =
          path.toFileUrl(path.join(testdataDir, "/css/linear/b.css")).href;
        const assetA = await bundler.createAsset(
          a,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
        );
        const assetB = await bundler.createAsset(
          b,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
        );

        const chunkContext = {
          assets: [
            assetA,
            assetB,
          ],
        };
        const chunkAssets: Set<Asset> = new Set();
        const chunk = await bundler.createChunk(
          assetA,
          chunkAssets,
          chunkContext,
        );
        const chunkB = await bundler.createChunk(
          assetB,
          chunkAssets,
          chunkContext,
        );

        const bundle = await bundler.createBundle(chunk, { chunks: [chunkB] });
        assertEquals(bundle, {
          output: await plugin.createOutput(a, "dist", ".css"),
          source:
            `h1 {\n  color: green;\n}\n\nh1 {\n  font-family: Helvetica;\n}`,
        });
      },
    });

    await t.step({
      name: "inject dependency path",
      async fn() {
        const a =
          path.toFileUrl(path.join(testdataDir, "/css/image/a.css")).href;
        const b =
          path.toFileUrl(path.join(testdataDir, "/css/image/image.png")).href;
        const assetA = await bundler.createAsset(
          a,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
        );

        const assetB: Asset = {
          input: b,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Binary,
          source: `imagedata`,
          exports: {},
          dependencies: [],
        };

        const chunkAssets: Set<Asset> = new Set();
        const chunk = await bundler.createChunk(assetA, chunkAssets, {
          assets: [assetA, assetB],
        });
        const chunkB = {
          item: { ...assetB },
          output: "file:///dist/image.png",
          dependencyItems: [],
        };

        const bundle = await bundler.createBundle(chunk, {
          chunks: [chunk, chunkB],
        });

        assertEquals(bundle, {
          output: await plugin.createOutput(a, "dist", ".css"),
          source: `div {\n  background-image: url("/image.png");\n}`,
        });
      },
    });
  },
});
