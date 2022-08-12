import { assertEquals } from "../../test_deps.ts";
import { CSSPlugin } from "./css_plugin.ts";
import { path } from "../../deps.ts";
import { Asset, Chunk, DependencyFormat, DependencyType } from "../plugin.ts";
import { CreateChunkOptions } from "../plugin.ts";
import { Bundler } from "../../bundler.ts";

const plugin = new CSSPlugin();

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

        const bundler = new Bundler({ plugins: [plugin], quiet: true });
        const asset = await plugin.createAsset(
          a,
          DependencyType.ImportExport,
          bundler,
        );

        assertEquals(asset, {
          input: a,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
          dependencies: [{
            input: b,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Style,
          }],
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

        const bundler = new Bundler({ plugins: [plugin], quiet: true });
        const asset = await plugin.createAsset(
          a,
          DependencyType.ImportExport,
          bundler,
        );

        assertEquals(asset, {
          input: a,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
          dependencies: [{
            input: image.href,
            format: DependencyFormat.Binary,
            type: DependencyType.ImportExport,
          }],
        });
      },
    });
    await t.step({
      name: "nesting",
      async fn() {
        const a =
          path.toFileUrl(path.join(testdataDir, "css/nesting/a.css")).href;

        const bundler = new Bundler({ plugins: [plugin], quiet: true });
        const asset = await plugin.createAsset(
          a,
          DependencyType.ImportExport,
          bundler,
        );

        assertEquals(asset, {
          input: a,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
          dependencies: [],
        });
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
        const inputB =
          path.toFileUrl(path.join(testdataDir, "/css/linear/b.css")).href;
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
        };
        const assetB: Asset = {
          ...itemB,
          dependencies: [],
        };

        const inputA =
          path.toFileUrl(path.join(testdataDir, "/css/linear/a.css")).href;
        const itemA = {
          input: inputA,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
        };
        const assetA: Asset = {
          ...itemA,
          dependencies: [assetB],
        };

        const createChunkOptions: CreateChunkOptions = {
          root: "dist",
          outputMap: {},
          assets: [
            assetA,
            assetB,
          ],
        };

        const chunkAssets: Set<Asset> = new Set();
        const chunk = await plugin.createChunk(
          assetA,
          chunkAssets,
          undefined,
          createChunkOptions,
        );
        assertEquals(chunk, {
          dependencyItems: [itemB],
          item: itemA,
          output: await plugin.createOutput(inputA, "dist", ".css"),
        });
      },
    });
    await t.step({
      name: "image",
      async fn() {
        const inputB =
          path.toFileUrl(path.join(testdataDir, "/css/image/image.png")).href;
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Binary,
        };
        const assetB: Asset = {
          ...itemB,
          dependencies: [],
        };

        const inputA =
          path.toFileUrl(path.join(testdataDir, "/css/image/a.css")).href;
        const itemA = {
          input: inputA,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
        };
        const assetA: Asset = {
          ...itemA,
          dependencies: [assetB],
        };

        const createChunkOptions: CreateChunkOptions = {
          root: "dist",
          outputMap: {},
          assets: [
            assetA,
            assetB,
          ],
        };

        const chunkAssets: Set<Asset> = new Set();
        const chunk = await plugin.createChunk(
          assetA,
          chunkAssets,
          undefined,
          createChunkOptions,
        );
        assertEquals(chunk, {
          dependencyItems: [],
          item: itemA,
          output: await plugin.createOutput(inputA, "dist", ".css"),
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
        const inputB =
          path.toFileUrl(path.join(testdataDir, "/css/linear/b.css")).href;
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
        };

        const inputA =
          path.toFileUrl(path.join(testdataDir, "/css/linear/a.css")).href;
        const itemA = {
          input: inputA,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
        };

        const chunkA: Chunk = {
          dependencyItems: [itemB],
          item: itemA,
          output: await plugin.createOutput(inputA, "dist", ".css"),
        };

        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [plugin], quiet: true });
        const { input, type, format } = chunkA.item;
        const ast = await bundler.createSource(input, type, format);
        const bundle = await plugin.createBundle(
          chunkA,
          ast,
          bundler,
          { chunks, root: "dist" },
        );

        assertEquals(bundle, {
          output: await plugin.createOutput(inputA, "dist", ".css"),
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
        const inputB =
          path.toFileUrl(path.join(testdataDir, "/css/linear/b.css")).href;
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
        };

        const inputA =
          path.toFileUrl(path.join(testdataDir, "/css/linear/a.css")).href;
        const itemA = {
          input: inputA,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
        };

        const chunkB: Chunk = {
          dependencyItems: [],
          item: itemB,
          output: await plugin.createOutput(inputB, "dist", ".css"),
        };

        const chunkA: Chunk = {
          dependencyItems: [itemB],
          item: itemA,
          output: await plugin.createOutput(inputA, "dist", ".css"),
        };

        const chunks: Chunk[] = [chunkB];

        const bundler = new Bundler({ plugins: [plugin], quiet: true });

        const { input, type, format } = chunkA.item;
        const ast = await bundler.createSource(input, type, format);

        const bundle = await plugin.createBundle(
          chunkA,
          ast,
          bundler,
          { chunks, root: "dist" },
        );

        assertEquals(bundle, {
          output: await plugin.createOutput(inputA, "dist", ".css"),
          source:
            `h1 {\n  color: green;\n}\n\nh1 {\n  font-family: Helvetica;\n}`,
        });
      },
    });

    await t.step({
      name: "inject dependency path",
      async fn() {
        const inputB =
          path.toFileUrl(path.join(testdataDir, "/css/image/image.png")).href;
        const itemB = {
          input: inputB,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Binary,
        };

        const inputA =
          path.toFileUrl(path.join(testdataDir, "/css/image/a.css")).href;
        const itemA = {
          input: inputA,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
        };

        const chunkB: Chunk = {
          dependencyItems: [],
          item: itemB,
          output: "file:///dist/image.png",
        };

        const chunkA: Chunk = {
          dependencyItems: [itemB],
          item: itemA,
          output: await plugin.createOutput(inputA, "dist", ".css"),
        };

        const chunks: Chunk[] = [chunkB];

        const bundler = new Bundler({ plugins: [plugin], quiet: true });

        const { input, type, format } = chunkA.item;
        const ast = await bundler.createSource(input, type, format);

        const bundle = await plugin.createBundle(
          chunkA,
          ast,
          bundler,
          { chunks, root: "dist" },
        );

        assertEquals(bundle, {
          output: await plugin.createOutput(inputA, "dist", ".css"),
          source: `div {\n  background-image: url("/image.png");\n}`,
        });
      },
    });
  },
});
