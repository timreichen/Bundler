import { assertEquals } from "../../test_deps.ts";
import { TypescriptPlugin } from "./typescript_plugin.ts";
import { path, ts } from "../../deps.ts";
import { Asset, Chunk, DependencyFormat, DependencyType } from "../plugin.ts";
import { Bundler } from "../../bundler.ts";

const plugin = new TypescriptPlugin({ newLine: ts.NewLineKind.LineFeed });

const moduleDir = path.dirname(path.fromFileUrl(import.meta.url));
const testdataDir = path.resolve(moduleDir, "../../testdata");

Deno.test({
  name: "test",
  fn() {
    assertEquals(
      plugin.test(
        "file.js",
        DependencyType.ImportExport,
        DependencyFormat.Unknown,
      ),
      true,
    );
    assertEquals(
      plugin.test(
        "file.ts",
        DependencyType.ImportExport,
        DependencyFormat.Unknown,
      ),
      true,
    );
    assertEquals(
      plugin.test(
        "file.mjs",
        DependencyType.ImportExport,
        DependencyFormat.Unknown,
      ),
      false,
    );
    assertEquals(
      plugin.test(
        "file.mjs",
        DependencyType.ImportExport,
        DependencyFormat.Script,
      ),
      true,
    );
    assertEquals(
      plugin.test(
        "file.jsx",
        DependencyType.ImportExport,
        DependencyFormat.Unknown,
      ),
      true,
    );
    assertEquals(
      plugin.test(
        "file.tsx",
        DependencyType.ImportExport,
        DependencyFormat.Unknown,
      ),
      true,
    );
    assertEquals(
      plugin.test(
        "file.json",
        DependencyType.ImportExport,
        DependencyFormat.Unknown,
      ),
      false,
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
          path.toFileUrl(path.join(testdataDir, "typescript/linear/a.ts")).href;

        const b =
          path.toFileUrl(path.join(testdataDir, "typescript/linear/b.ts")).href;

        const bundler = new Bundler({ plugins: [plugin], quiet: true });
        const asset = await plugin.createAsset(
          a,
          DependencyType.ImportExport,
          bundler,
        );

        assertEquals(asset, {
          input: a,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
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
      name: "circular a to b",
      async fn() {
        const a =
          path.toFileUrl(path.join(testdataDir, "typescript/circular/a.ts"))
            .href;

        const b =
          path.toFileUrl(path.join(testdataDir, "typescript/circular/b.ts"))
            .href;

        const bundler = new Bundler({ plugins: [plugin], quiet: true });
        const asset = await plugin.createAsset(
          a,
          DependencyType.ImportExport,
          bundler,
        );

        assertEquals(asset, {
          input: a,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
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
      name: "circular b to a",
      async fn() {
        const a =
          path.toFileUrl(path.join(testdataDir, "typescript/circular/a.ts"))
            .href;

        const b =
          path.toFileUrl(path.join(testdataDir, "typescript/circular/b.ts"))
            .href;

        const bundler = new Bundler({ plugins: [plugin], quiet: true });
        const asset = await plugin.createAsset(
          b,
          DependencyType.ImportExport,
          bundler,
        );

        assertEquals(asset, {
          input: b,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          dependencies: [
            {
              input: a,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
          ],
        });
      },
    });

    await t.step({
      name: "double import",
      async fn() {
        const a =
          path.toFileUrl(path.join(testdataDir, "typescript/double/import.ts"))
            .href;

        const b =
          path.toFileUrl(path.join(testdataDir, "typescript/double/b.ts")).href;

        const bundler = new Bundler({ plugins: [plugin], quiet: true });
        const asset = await plugin.createAsset(
          a,
          DependencyType.ImportExport,
          bundler,
        );

        assertEquals(asset, {
          input: a,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          dependencies: [
            {
              input: b,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
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
      name: "double export",
      async fn() {
        const a =
          path.toFileUrl(path.join(testdataDir, "typescript/double/export.ts"))
            .href;

        const b =
          path.toFileUrl(path.join(testdataDir, "typescript/double/b.ts")).href;

        const bundler = new Bundler({ plugins: [plugin], quiet: true });
        const asset = await plugin.createAsset(
          a,
          DependencyType.ImportExport,
          bundler,
        );

        assertEquals(asset, {
          input: a,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          dependencies: [
            {
              input: b,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
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
      name: "fetch",
      async fn() {
        const a =
          path.toFileUrl(path.join(testdataDir, "typescript/fetch/a.ts")).href;
        const b =
          path.toFileUrl(path.join(testdataDir, "typescript/fetch/b.ts")).href;

        const bundler = new Bundler({ plugins: [plugin], quiet: true });
        const asset = await plugin.createAsset(
          a,
          DependencyType.ImportExport,
          bundler,
        );

        assertEquals(asset, {
          input: a,
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          dependencies: [
            {
              format: DependencyFormat.Script,
              input: b,
              type: DependencyType.Fetch,
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
      name: "linear",
      async fn() {
        const a =
          path.toFileUrl(path.join(testdataDir, "typescript/linear/a.ts")).href;
        const b =
          path.toFileUrl(path.join(testdataDir, "typescript/linear/b.ts")).href;

        const bundler = new Bundler({ plugins: [plugin], quiet: true });
        const asset = await plugin.createAsset(
          a,
          DependencyType.ImportExport,
          bundler,
        );

        const assetB = await plugin.createAsset(
          b,
          DependencyType.ImportExport,
          bundler,
        );
        const chunkAssets: Set<Asset> = new Set();
        const chunk = await plugin.createChunk(asset, chunkAssets, undefined, {
          outputMap: {},
          root: "file:///dist/",
          assets: [asset, assetB],
        });
        assertEquals(chunk, {
          item: {
            input: a,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
          dependencyItems: [
            {
              input: b,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
          ],
          output: await plugin.createOutput(a, "dist", ".js"),
        });
      },
    });

    await t.step({
      name: "chain",
      async fn() {
        const a =
          path.toFileUrl(path.join(testdataDir, "typescript/chain/a.ts")).href;
        const b =
          path.toFileUrl(path.join(testdataDir, "typescript/chain/b.ts")).href;
        const c =
          path.toFileUrl(path.join(testdataDir, "typescript/chain/c.ts")).href;
        const bundler = new Bundler({ plugins: [plugin], quiet: true });
        const asset = await plugin.createAsset(
          a,
          DependencyType.ImportExport,
          bundler,
        );
        const assetB = await plugin.createAsset(
          b,
          DependencyType.ImportExport,
          bundler,
        );
        const assetC = await plugin.createAsset(
          c,
          DependencyType.ImportExport,
          bundler,
        );
        const chunkAssets: Set<Asset> = new Set();
        const chunk = await plugin.createChunk(asset, chunkAssets, undefined, {
          outputMap: {},
          root: "file:///dist/",
          assets: [asset, assetB, assetC],
        });
        assertEquals(chunk, {
          item: {
            input: a,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
          dependencyItems: [
            {
              input: b,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
            {
              format: DependencyFormat.Script,
              input: c,
              type: DependencyType.ImportExport,
            },
          ],
          output: await plugin.createOutput(a, "dist", ".js"),
        });
      },
    });

    await t.step({
      name: "circular a to b",
      async fn() {
        const a =
          path.toFileUrl(path.join(testdataDir, "typescript/circular/a.ts"))
            .href;

        const b =
          path.toFileUrl(path.join(testdataDir, "typescript/circular/b.ts"))
            .href;

        const bundler = new Bundler({ plugins: [plugin], quiet: true });
        const assetA = await plugin.createAsset(
          a,
          DependencyType.ImportExport,
          bundler,
        );
        const assetB = await plugin.createAsset(
          b,
          DependencyType.ImportExport,
          bundler,
        );

        const chunkContext = {
          outputMap: {},
          root: "file:///dist/",
          assets: [assetA, assetB],
        };
        const chunkAssets: Set<Asset> = new Set();
        const chunk = await plugin.createChunk(
          assetA,
          chunkAssets,
          undefined,
          chunkContext,
        );
        assertEquals(chunk, {
          item: {
            input: a,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
          dependencyItems: [
            {
              input: b,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
          ],
          output: await plugin.createOutput(a, "dist", ".js"),
        });
      },
    });

    await t.step({
      name: "circular b to a",
      async fn() {
        const a =
          path.toFileUrl(path.join(testdataDir, "typescript/circular/a.ts"))
            .href;

        const b =
          path.toFileUrl(path.join(testdataDir, "typescript/circular/b.ts"))
            .href;

        const bundler = new Bundler({ plugins: [plugin], quiet: true });
        const assetA = await plugin.createAsset(
          a,
          DependencyType.ImportExport,
          bundler,
        );
        const assetB = await plugin.createAsset(
          b,
          DependencyType.ImportExport,
          bundler,
        );

        const chunkContext = {
          outputMap: {},
          root: "file:///dist/",
          assets: [assetA, assetB],
        };
        const chunkAssets: Set<Asset> = new Set();
        const chunk = await plugin.createChunk(
          assetB,
          chunkAssets,
          undefined,
          chunkContext,
        );
        assertEquals(chunk, {
          item: {
            input: b,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
          dependencyItems: [
            {
              input: a,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
          ],
          output: await plugin.createOutput(b, "dist", ".js"),
        });
      },
    });

    await t.step({
      name: "double import",
      async fn() {
        const a =
          path.toFileUrl(path.join(testdataDir, "typescript/double/import.ts"))
            .href;

        const b =
          path.toFileUrl(path.join(testdataDir, "typescript/double/b.ts")).href;

        const bundler = new Bundler({ plugins: [plugin], quiet: true });
        const assetA = await plugin.createAsset(
          a,
          DependencyType.ImportExport,
          bundler,
        );

        const assetB = await plugin.createAsset(
          b,
          DependencyType.ImportExport,
          bundler,
        );

        const chunkContext = {
          outputMap: {},
          root: "file:///dist/",
          assets: [assetB],
        };
        const chunkAssets: Set<Asset> = new Set();
        const chunk = await plugin.createChunk(
          assetA,
          chunkAssets,
          undefined,
          chunkContext,
        );
        assertEquals(chunk, {
          item: {
            input: a,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
          dependencyItems: [
            {
              input: b,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
          ],
          output: await plugin.createOutput(a, "dist", ".js"),
        });
      },
    });

    await t.step({
      name: "fetch",
      async fn() {
        const a =
          path.toFileUrl(path.join(testdataDir, "typescript/fetch/a.ts")).href;
        const b =
          path.toFileUrl(path.join(testdataDir, "typescript/fetch/b.ts")).href;

        const bundler = new Bundler({ plugins: [plugin], quiet: true });
        const assetA = await plugin.createAsset(
          a,
          DependencyType.ImportExport,
          bundler,
        );
        const assetB = await plugin.createAsset(
          b,
          DependencyType.Fetch,
          bundler,
        );

        const chunkContext = {
          outputMap: {},
          root: "file:///dist/",
          assets: [assetB],
        };
        const chunkAssets: Set<Asset> = new Set([assetB]);
        const chunk = await plugin.createChunk(
          assetA,
          chunkAssets,
          undefined,
          chunkContext,
        );

        assertEquals(chunk, {
          item: {
            input: a,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
          dependencyItems: [],
          output: await plugin.createOutput(a, "dist", ".js"),
        });
      },
    });
  },
});

Deno.test({
  name: "createBundle",
  async fn(t) {
    await t.step({
      name: "simple",
      async fn() {
        const root = "dist";
        const a =
          path.toFileUrl(path.join(testdataDir, "typescript/simple/a.ts")).href;
        const chunk: Chunk = {
          item: {
            input: a,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
          dependencyItems: [],
          output: await plugin.createOutput(a, "dist", ".js"),
        };
        const chunks: Chunk[] = [];
        const bundler = new Bundler({ plugins: [plugin], quiet: true });
        const { input, type, format } = chunk.item;
        const ast = await bundler.createSource(input, type, format);
        const bundle = await plugin.createBundle(
          chunk,
          ast,
          bundler,
          {
            chunks,
            root,
          },
        );
        assertEquals(bundle, {
          source: `console.info("hello world");\n`,
          output: await plugin.createOutput(a, "dist", ".js"),
        });
      },
    });

    await t.step({
      name: "linear",
      async fn() {
        const root = "dist";
        const a =
          path.toFileUrl(path.join(testdataDir, "typescript/linear/a.ts")).href;
        const b =
          path.toFileUrl(path.join(testdataDir, "typescript/linear/b.ts")).href;
        const chunk: Chunk = {
          item: {
            input: a,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
          dependencyItems: [{
            input: b,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          }],
          output: await plugin.createOutput(a, "dist", ".js"),
        };
        const chunks: Chunk[] = [];

        const bundler = new Bundler({ plugins: [plugin], quiet: true });
        const { input, type, format } = chunk.item;
        const ast = await bundler.createSource(input, type, format);

        const bundle = await plugin.createBundle(
          chunk,
          ast,
          bundler,
          {
            chunks,
            root,
          },
        );

        assertEquals(bundle, {
          source: `const b = "b";\nconsole.info(b);\n`,
          output: await plugin.createOutput(a, "dist", ".js"),
        });
      },
    });
  },
});
