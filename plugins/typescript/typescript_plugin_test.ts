import { assertEquals } from "../../test_deps.ts";
import { Bundler } from "../../bundler.ts";
import { Asset, DependencyFormat, DependencyType } from "../plugin.ts";
import { TypescriptPlugin } from "./typescript_plugin.ts";
import { path } from "../../deps.ts";
import { newline } from "../../_util.ts";

const plugin = new TypescriptPlugin();

const bundler = new Bundler({ plugins: [plugin], quiet: true });

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

        const asset = await bundler.createAsset(
          a,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
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
              specifiers: {
                b: "b",
              },
            },
          ],
          exports: {},
          source:
            `import { b } from "./b.ts";${newline}console.log(b);${newline}`,
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

        const asset = await bundler.createAsset(
          a,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
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
              specifiers: {
                b: "b",
              },
            },
          ],
          exports: {
            specifiers: {
              a: "a",
            },
          },
          source:
            `import { b } from "./b.ts";${newline}console.log(b);${newline}export const a = "a";${newline}`,
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

        const asset = await bundler.createAsset(
          b,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
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
              specifiers: {
                a: "a",
              },
            },
          ],
          exports: {
            specifiers: {
              b: "b",
            },
          },
          source:
            `import { a } from "./a.ts";${newline}console.log(a);${newline}export const b = "b";${newline}`,
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

        const asset = await bundler.createAsset(
          a,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
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
              specifiers: {
                b: "b",
              },
            },
            {
              input: b,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
              specifiers: {
                c: "b",
              },
            },
          ],
          exports: {},
          source:
            `import { b } from "./b.ts";${newline}import { b as c } from "./b.ts";${newline}console.log(b, c);${newline}`,
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

        const asset = await bundler.createAsset(
          a,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
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
              specifiers: {
                b: "b",
              },
            },
            {
              input: b,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
              specifiers: {
                c: "b",
              },
            },
          ],
          exports: {},
          source:
            `export { b } from "./b.ts";${newline}export { b as c } from "./b.ts";${newline}`,
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

        const asset = await bundler.createAsset(
          a,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
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
          exports: {},
          source:
            `const b = await fetch("./b.ts");${newline}console.log(b);${newline}`,
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

        const asset = await bundler.createAsset(
          a,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
        );

        const assetB = await bundler.createAsset(
          b,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
        );
        const chunkAssets: Set<Asset> = new Set();
        const chunk = await bundler.createChunk(asset, chunkAssets, {
          bundler,
          outputMap: {},
          root: "file:///dist/",
          assets: [asset, assetB],
        });
        assertEquals(chunk, {
          item: {
            input: a,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            source:
              `import { b } from "./b.ts";${newline}console.log(b);${newline}`,
          },
          dependencyItems: [
            {
              input: b,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
              source: `export const b = "b";${newline}`,
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
        const asset = await bundler.createAsset(
          a,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
        );
        const assetB = await bundler.createAsset(
          b,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
        );
        const assetC = await bundler.createAsset(
          c,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
        );
        const chunkAssets: Set<Asset> = new Set();
        const chunk = await bundler.createChunk(asset, chunkAssets, {
          bundler,
          outputMap: {},
          root: "file:///dist/",
          assets: [asset, assetB, assetC],
        });
        assertEquals(chunk, {
          item: {
            input: a,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            source:
              `import { b } from "./b.ts";${newline}console.log(b);${newline}`,
          },
          dependencyItems: [
            {
              input: b,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
              source:
                `import { c } from "./c.ts";${newline}console.log(c);${newline}export const b = "b";${newline}`,
            },
            {
              format: DependencyFormat.Script,
              input: c,
              source: `export const c = "c";${newline}`,
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
          bundler,
          outputMap: {},
          root: "file:///dist/",
          assets: [assetA, assetB],
        };
        const chunkAssets: Set<Asset> = new Set();
        const chunk = await bundler.createChunk(
          assetA,
          chunkAssets,
          chunkContext,
        );
        assertEquals(chunk, {
          item: {
            input: a,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            source:
              `import { b } from "./b.ts";${newline}console.log(b);${newline}export const a = "a";${newline}`,
          },
          dependencyItems: [
            {
              input: b,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
              source:
                `import { a } from "./a.ts";${newline}console.log(a);${newline}export const b = "b";${newline}`,
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
          bundler,
          outputMap: {},
          root: "file:///dist/",
          assets: [assetA, assetB],
        };
        const chunkAssets: Set<Asset> = new Set();
        const chunk = await bundler.createChunk(
          assetB,
          chunkAssets,
          chunkContext,
        );
        assertEquals(chunk, {
          item: {
            input: b,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            source:
              `import { a } from "./a.ts";${newline}console.log(a);${newline}export const b = "b";${newline}`,
          },
          dependencyItems: [
            {
              input: a,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
              source:
                `import { b } from "./b.ts";${newline}console.log(b);${newline}export const a = "a";${newline}`,
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
          bundler,
          outputMap: {},
          root: "file:///dist/",
          assets: [assetB],
        };
        const chunkAssets: Set<Asset> = new Set();
        const chunk = await bundler.createChunk(
          assetA,
          chunkAssets,
          chunkContext,
        );
        assertEquals(chunk, {
          item: {
            input: a,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            source:
              `import { b } from "./b.ts";${newline}import { b as c } from "./b.ts";${newline}console.log(b, c);${newline}`,
          },
          dependencyItems: [
            {
              input: b,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
              source: `export const b = "b";${newline}`,
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

        const assetA = await bundler.createAsset(
          a,
          DependencyType.ImportExport,
          DependencyFormat.Unknown,
        );
        const assetB = await bundler.createAsset(
          b,
          DependencyType.Fetch,
          DependencyFormat.Unknown,
        );

        const chunkContext = {
          bundler,
          outputMap: {},
          root: "file:///dist/",
          assets: [assetB],
        };
        const chunkAssets: Set<Asset> = new Set([assetB]);
        const chunk = await bundler.createChunk(
          assetA,
          chunkAssets,
          chunkContext,
        );

        assertEquals(chunk, {
          item: {
            input: a,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            source:
              `const b = await fetch("./b.ts");${newline}console.log(b);${newline}`,
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
        const a =
          path.toFileUrl(path.join(testdataDir, "typescript/simple/a.ts")).href;
        const assets = await bundler.createAssets([a]);
        const chunks = await bundler.createChunks([a], assets);
        const bundles = await bundler.createBundles(chunks);
        assertEquals(bundles, [
          {
            output: await plugin.createOutput(a, "dist", ".js"),
            source: `console.log("hello world");${newline}`,
          },
        ]);
      },
    });

    await t.step({
      name: "linear",
      async fn() {
        const a =
          path.toFileUrl(path.join(testdataDir, "typescript/linear/a.ts")).href;
        const assets = await bundler.createAssets([a]);
        const chunks = await bundler.createChunks([a], assets);

        const bundles = await bundler.createBundles(chunks);

        assertEquals(bundles, [
          {
            output: await plugin.createOutput(a, "dist", ".js"),
            source: `const b = "b";${newline}console.log(b);${newline}`,
          },
        ]);
      },
    });

    // await t.step({
    //   name: "chain",
    //   async fn() {
    //     const a =
    //       path.toFileUrl(path.join(testdataDir, "typescript/chain/a.ts", import.meta.url).href
    //         .href;
    //     const assets = await bundler.createAssets([a]);
    //     const chunks = await bundler.createChunks([a], assets);
    //     const bundles = await bundler.createBundles(chunks);

    //     assertEquals(bundles, [
    //       {
    //         output:
    //           "file:///dist/7c73a4e48a92bf09ae88a5ba220d6f68a5ae634f5447c8617b35c19c90554951.js",
    //         source:
    //           'const mod1 = (() => {${newline}    const c = "c";${newline}    return { c };${newline}})();${newline}const mod2 = (() => {${newline}    const { c } = mod1;${newline}    console.log(c);${newline}    const b = "b";${newline}    return { b };${newline}})();${newline}const { b } = mod2;${newline}console.log(b);${newline}',
    //       },
    //     ]);
    //   },
    // });

    // await t.step({
    //   name: "circular",
    //   async fn() {
    //     const a =
    //       path.toFileUrl(path.join(testdataDir, "typescript/circular/a.ts", import.meta.url).href
    //         .href;
    //     const assets = await bundler.createAssets([a]);
    //     const chunks = await bundler.createChunks([a], assets);
    //     const bundles = await bundler.createBundles(chunks);

    //     assertEquals(bundles, [
    //       {
    //         output:
    //           "file:///dist/e5e6b50d3a820edecb2e4674aa65f925887e6627b23392eab02fdccc7f387582.js",
    //         source: "",
    //       },
    //     ]);
    //   },
    // });
  },
});
