import { assertEquals } from "./test_deps.ts";
import { Bundler } from "./bundler.ts";
import { CSSPlugin } from "./plugins/css/css_plugin.ts";
import { JSONPlugin } from "./plugins/json/json_plugin.ts";
import { DependencyFormat, DependencyType } from "./plugins/plugin.ts";
import { TypescriptPlugin } from "./plugins/typescript/typescript_plugin.ts";
import { WebManifestPlugin } from "./plugins/json/webmanifest_plugin.ts";
import { HTMLPlugin } from "./plugins/html/html_plugin.ts";
import { FilePlugin } from "./plugins/file/file.ts";
import { path, resolveImportMap, ts } from "./deps.ts";

const moduleDir = path.dirname(path.fromFileUrl(import.meta.url));
const testdataDir = path.resolve(moduleDir, "testdata");

const typescriptPlugin = new TypescriptPlugin({
  newLine: ts.NewLineKind.LineFeed,
});
const cssPlugin = new CSSPlugin();
const jsonPlugin = new JSONPlugin();
const htmlPlugin = new HTMLPlugin();
const webManifestPlugin = new WebManifestPlugin();
const filePlugin = new FilePlugin();

const bundler = new Bundler({
  plugins: [
    typescriptPlugin,
    cssPlugin,
    jsonPlugin,
    htmlPlugin,
    webManifestPlugin,
    filePlugin,
  ],
  quiet: true,
});

const root = "dist";

Deno.test({
  name: "createAssets",
  async fn(t) {
    await t.step({
      name: "simple",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/simple/a.ts"),
        ).href;
        const assets = await bundler.createAssets([inputA]);

        assertEquals(assets, [
          {
            input: inputA,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            dependencies: [],
          },
        ]);
      },
    });

    await t.step({
      name: "linear",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/linear/a.ts"),
        ).href;
        const inputB = path.toFileUrl(
          path.join(testdataDir, "typescript/linear/b.ts"),
        ).href;
        const assets = await bundler.createAssets([inputA]);
        assertEquals(assets, [
          {
            input: inputA,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            dependencies: [
              {
                input: inputB,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
              },
            ],
          },
          {
            dependencies: [],
            input: inputB,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
        ]);
      },
    });

    await t.step({
      name: "circular a to b",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/circular/a.ts"),
        ).href;
        const inputB = path.toFileUrl(
          path.join(testdataDir, "typescript/circular/b.ts"),
        ).href;
        const assets = await bundler.createAssets([inputA]);

        assertEquals(assets, [
          {
            dependencies: [
              {
                input: inputB,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
              },
            ],

            input: inputA,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
          {
            dependencies: [
              {
                input: inputA,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
              },
            ],
            input: inputB,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
        ]);
      },
    });

    await t.step({
      name: "circular b to a",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/circular/a.ts"),
        ).href;
        const inputB = path.toFileUrl(
          path.join(testdataDir, "typescript/circular/b.ts"),
        ).href;
        const assets = await bundler.createAssets([inputB]);

        assertEquals(assets, [
          {
            dependencies: [
              {
                input: inputA,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
              },
            ],

            input: inputB,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
          {
            dependencies: [
              {
                input: inputB,
                type: DependencyType.ImportExport,

                format: DependencyFormat.Script,
              },
            ],
            input: inputA,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
        ]);
      },
    });

    await t.step({
      name: "json module",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/json_module/a.ts"),
        ).href;
        const inputB = path.toFileUrl(
          path.join(testdataDir, "typescript/json_module/b.json"),
        ).href;
        const assets = await bundler.createAssets([inputA]);

        assertEquals(assets, [
          {
            dependencies: [
              {
                input: inputB,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Json,
              },
            ],
            input: inputA,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
          {
            dependencies: [],
            input: inputB,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Json,
          },
        ]);
      },
    });

    await t.step({
      name: "css module",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/css_module/a.ts"),
        ).href;
        const inputB = path.toFileUrl(
          path.join(testdataDir, "typescript/css_module/b.css"),
        ).href;
        const assets = await bundler.createAssets([inputA]);

        assertEquals(assets, [
          {
            dependencies: [
              {
                input: inputB,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Style,
              },
            ],
            input: inputA,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
          {
            dependencies: [],
            input: inputB,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Style,
          },
        ]);
      },
    });

    await t.step({
      name: "importmap",
      async fn() {
        const inputA =
          path.toFileUrl(path.join(testdataDir, "typescript/importmap/a.ts"))
            .href;
        const inputB = path.toFileUrl(
          path.join(testdataDir, "typescript/importmap/b.ts"),
        ).href;
        const importmapPath = path.join(
          testdataDir,
          "typescript/importmap/import_map.json",
        );

        const importMap = resolveImportMap(
          JSON.parse(await Deno.readTextFile(importmapPath)),
          path.toFileUrl(importmapPath),
        );

        const asset = await bundler.createAssets([inputA], { importMap });
        assertEquals(asset, [
          {
            input: inputA,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            dependencies: [
              {
                input: inputB,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
              },
            ],
          },
          {
            dependencies: [],

            input: inputB,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
        ]);
      },
    });
  },
});

Deno.test({
  name: "createChunks",
  async fn(t) {
    await t.step({
      name: "linear",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/linear/a.ts"),
        ).href;
        const inputB = path.toFileUrl(
          path.join(testdataDir, "typescript/linear/b.ts"),
        ).href;
        const assets = await bundler.createAssets([inputA]);
        const chunks = await bundler.createChunks([inputA], assets, { root });

        assertEquals(chunks, [
          {
            item: {
              input: inputA,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
            dependencyItems: [
              {
                input: inputB,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
              },
            ],
            output: await typescriptPlugin.createOutput(inputA, root, ".js"),
          },
        ]);
      },
    });

    await t.step({
      name: "linear split",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/linear/a.ts"),
        ).href;
        const inputB = path.toFileUrl(
          path.join(testdataDir, "typescript/linear/b.ts"),
        ).href;
        const assets = await bundler.createAssets([inputA]);
        const chunks = await bundler.createChunks([inputA, inputB], assets, {
          root,
        });
        assertEquals(chunks, [
          {
            item: {
              input: inputA,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
            dependencyItems: [],
            output: await typescriptPlugin.createOutput(inputA, root, ".js"),
          },
          {
            item: {
              format: DependencyFormat.Script,
              input: inputB,
              type: DependencyType.ImportExport,
            },
            dependencyItems: [],
            output: await typescriptPlugin.createOutput(inputB, root, ".js"),
          },
        ]);
      },
    });

    await t.step({
      name: "circular a to b",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/circular/a.ts"),
        ).href;
        const inputB = path.toFileUrl(
          path.join(testdataDir, "typescript/circular/b.ts"),
        ).href;
        const assets = await bundler.createAssets([inputA]);
        const chunks = await bundler.createChunks([inputA], assets, { root });
        assertEquals(chunks, [
          {
            item: {
              format: DependencyFormat.Script,
              input: inputA,
              type: DependencyType.ImportExport,
            },
            dependencyItems: [
              {
                format: DependencyFormat.Script,
                input: inputB,
                type: DependencyType.ImportExport,
              },
            ],
            output: await typescriptPlugin.createOutput(inputA, root, ".js"),
          },
        ]);
      },
    });

    await t.step({
      name: "circular b to a",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/circular/a.ts"),
        ).href;
        const inputB = path.toFileUrl(
          path.join(testdataDir, "typescript/circular/b.ts"),
        ).href;
        const assets = await bundler.createAssets([inputB]);
        const chunks = await bundler.createChunks([inputB], assets, { root });
        assertEquals(chunks, [
          {
            item: {
              format: DependencyFormat.Script,
              input: inputB,
              type: DependencyType.ImportExport,
            },
            dependencyItems: [
              {
                format: DependencyFormat.Script,
                input: inputA,
                type: DependencyType.ImportExport,
              },
            ],
            output: await typescriptPlugin.createOutput(inputB, root, ".js"),
          },
        ]);
      },
    });

    await t.step({
      name: "circular split",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/circular/a.ts"),
        ).href;
        const inputB = path.toFileUrl(
          path.join(testdataDir, "typescript/circular/b.ts"),
        ).href;
        const assets = await bundler.createAssets([inputA]);
        const chunks = await bundler.createChunks([inputA, inputB], assets, {
          root,
        });
        assertEquals(chunks, [
          {
            item: {
              input: inputA,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
            dependencyItems: [],
            output: await typescriptPlugin.createOutput(inputA, root, ".js"),
          },
          {
            dependencyItems: [],
            item: {
              input: inputB,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
            output: await typescriptPlugin.createOutput(inputB, root, ".js"),
          },
        ]);
      },
    });

    await t.step({
      name: "double import",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/double/import.ts"),
        ).href;
        const inputB = path.toFileUrl(
          path.join(testdataDir, "typescript/double/b.ts"),
        ).href;
        const assets = await bundler.createAssets([inputA]);
        const chunks = await bundler.createChunks([inputA], assets, { root });

        assertEquals(chunks, [
          {
            item: {
              format: DependencyFormat.Script,
              input: inputA,
              type: DependencyType.ImportExport,
            },
            dependencyItems: [
              {
                input: inputB,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
              },
            ],
            output: await typescriptPlugin.createOutput(inputA, root, ".js"),
          },
        ]);
      },
    });
    await t.step({
      name: "double export",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/double/export.ts"),
        ).href;
        const inputB = path.toFileUrl(
          path.join(testdataDir, "typescript/double/b.ts"),
        ).href;
        const assets = await bundler.createAssets([inputA]);
        const chunks = await bundler.createChunks([inputA], assets, { root });
        assertEquals(chunks, [
          {
            item: {
              input: inputA,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
            dependencyItems: [
              {
                input: inputB,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
              },
            ],
            output: await typescriptPlugin.createOutput(inputA, root, ".js"),
          },
        ]);
      },
    });
    await t.step({
      name: "double mixed",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/double/mixed.ts"),
        ).href;
        const inputB = path.toFileUrl(
          path.join(testdataDir, "typescript/double/b.ts"),
        ).href;
        const assets = await bundler.createAssets([inputA]);
        const chunks = await bundler.createChunks([inputA], assets, { root });
        assertEquals(chunks, [
          {
            item: {
              input: inputA,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
            dependencyItems: [
              {
                input: inputB,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
              },
            ],
            output: await typescriptPlugin.createOutput(inputA, root, ".js"),
          },
        ]);
      },
    });

    await t.step({
      name: "chain",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/chain/a.ts"),
        ).href;
        const inputB = path.toFileUrl(
          path.join(testdataDir, "typescript/chain/b.ts"),
        ).href;
        const c = path.toFileUrl(
          path.join(testdataDir, "typescript/chain/c.ts"),
        ).href;
        const assets = await bundler.createAssets([inputA]);
        const chunks = await bundler.createChunks([inputA], assets, { root });
        assertEquals(chunks, [
          {
            item: {
              format: DependencyFormat.Script,
              input: inputA,
              type: DependencyType.ImportExport,
            },
            dependencyItems: [
              {
                input: inputB,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
              },
              {
                input: c,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
              },
            ],
            output: await typescriptPlugin.createOutput(inputA, root, ".js"),
          },
        ]);
      },
    });
    await t.step({
      name: "chain chain fetch",
      async fn() {
        const root = "dist";
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/chain_chain_fetch/a.ts"),
        ).href;
        const inputB = path.toFileUrl(
          path.join(testdataDir, "typescript/chain_chain_fetch/b.ts"),
        ).href;
        const inputC = path.toFileUrl(
          path.join(testdataDir, "typescript/chain_chain_fetch/c.ts"),
        ).href;
        const inputD = path.toFileUrl(
          path.join(testdataDir, "typescript/chain_chain_fetch/d.ts"),
        ).href;

        const assets = await bundler.createAssets([inputA]);

        const chunks = await bundler.createChunks([inputA], assets, { root });

        assertEquals(chunks, [
          {
            dependencyItems: [
              {
                format: DependencyFormat.Script,
                input: inputB,
                type: DependencyType.ImportExport,
              },
              {
                format: DependencyFormat.Script,
                input: inputC,
                type: DependencyType.ImportExport,
              },
            ],
            item: {
              format: DependencyFormat.Script,
              input: inputA,
              type: DependencyType.ImportExport,
            },
            output: await typescriptPlugin.createOutput(inputA, root, ".js"),
          },
          {
            dependencyItems: [],
            item: {
              format: DependencyFormat.Script,
              input: inputD,
              type: DependencyType.Fetch,
            },
            output: await typescriptPlugin.createOutput(inputD, root, ".js"),
          },
        ]);
      },
    });
    await t.step({
      name: "css chain",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/css_chain/a.ts"),
        ).href;
        const inputB = path.toFileUrl(
          path.join(testdataDir, "typescript/css_chain/b.css"),
        ).href;
        const c = path.toFileUrl(
          path.join(testdataDir, "typescript/css_chain/c.css"),
        ).href;

        const assets = await bundler.createAssets([inputA]);
        const chunks = await bundler.createChunks([inputA], assets, { root });
        assertEquals(chunks, [
          {
            item: {
              format: DependencyFormat.Script,
              input: inputA,
              type: DependencyType.ImportExport,
            },
            dependencyItems: [
              {
                input: inputB,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Style,
              },
              {
                input: c,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Style,
              },
            ],
            output: await typescriptPlugin.createOutput(inputA, root, ".js"),
          },
        ]);
      },
    });

    await t.step({
      name: "shared inline",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/shared/a.ts"),
        ).href;
        const inputB = path.toFileUrl(
          path.join(testdataDir, "typescript/shared/b.ts"),
        ).href;
        const c = path.toFileUrl(
          path.join(testdataDir, "typescript/shared/c.ts"),
        ).href;
        const assets = await bundler.createAssets([inputA]);
        const chunks = await bundler.createChunks([inputA], assets, { root });
        assertEquals(chunks, [
          {
            item: {
              input: inputA,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
            dependencyItems: [
              {
                input: inputB,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
              },
              {
                input: c,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
              },
            ],
            output: await typescriptPlugin.createOutput(inputA, root, ".js"),
          },
        ]);
      },
    });

    await t.step({
      name: "shared split",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/shared/a.ts"),
        ).href;
        const inputB = path.toFileUrl(
          path.join(testdataDir, "typescript/shared/b.ts"),
        ).href;
        const c = path.toFileUrl(
          path.join(testdataDir, "typescript/shared/c.ts"),
        ).href;
        const assets = await bundler.createAssets([inputA]);
        const chunks = await bundler.createChunks([inputA, inputB], assets, {
          root,
        });
        assertEquals(chunks, [
          {
            item: {
              input: inputA,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
            dependencyItems: [],
            output: await typescriptPlugin.createOutput(inputA, root, ".js"),
          },
          {
            item: {
              input: inputB,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
            dependencyItems: [],
            output: await typescriptPlugin.createOutput(inputB, root, ".js"),
          },
          {
            item: {
              input: c,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
            dependencyItems: [],
            output: await typescriptPlugin.createOutput(c, root, ".js"),
          },
        ]);
      },
    });

    await t.step({
      name: "manual split fetch dependencies",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/fetch/a.ts"),
        ).href;
        const inputB = path.toFileUrl(
          path.join(testdataDir, "typescript/fetch/b.ts"),
        ).href;
        const assets = await bundler.createAssets([inputA]);
        const chunks = await bundler.createChunks([inputA], assets, { root });
        assertEquals(chunks, [
          {
            item: {
              input: inputA,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
            dependencyItems: [],
            output: await typescriptPlugin.createOutput(inputA, root, ".js"),
          },
          {
            item: {
              input: inputB,
              type: DependencyType.Fetch,
              format: DependencyFormat.Script,
            },
            dependencyItems: [],
            output: await typescriptPlugin.createOutput(inputB, root, ".js"),
          },
        ]);
      },
    });

    await t.step({
      name: "importmap",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/importmap/a.ts"),
        ).href;
        const inputB = path.toFileUrl(
          path.join(testdataDir, "typescript/importmap/b.ts"),
        ).href;

        const importmapPath = path.join(
          testdataDir,
          "typescript/importmap/import_map.json",
        );

        const importMap = resolveImportMap(
          JSON.parse(await Deno.readTextFile(importmapPath)),
          path.toFileUrl(importmapPath),
        );

        const assets = await bundler.createAssets([inputA], { importMap });
        const chunks = await bundler.createChunks([inputA], assets, { root });

        assertEquals(chunks, [
          {
            item: {
              input: inputA,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
            dependencyItems: [
              {
                input: inputB,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
              },
            ],
            output: await typescriptPlugin.createOutput(inputA, root, ".js"),
          },
        ]);
      },
    });
  },
});

Deno.test({
  name: "createBundles",
  async fn(t) {
    await t.step({
      name: "linear",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/linear/a.ts"),
        ).href;

        const assets = await bundler.createAssets([inputA]);
        const chunks = await bundler.createChunks([inputA], assets, { root });
        const bundles = await bundler.createBundles(chunks, { root });

        assertEquals(bundles, [{
          output: await typescriptPlugin.createOutput(inputA, root, ".js"),
          source: `const b = "b";\nconsole.info(b);\n`,
        }]);
      },
    });

    await t.step({
      name: "css module",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/css_module/a.ts"),
        ).href;
        const assets = await bundler.createAssets([inputA]);
        const chunks = await bundler.createChunks([inputA], assets, { root });

        const bundles = await bundler.createBundles(chunks, { root });

        assertEquals(bundles, [
          {
            output: await typescriptPlugin.createOutput(inputA, root, ".js"),
            source:
              `const b = new CSSStyleSheet();\nb.replaceSync(\`h1 {\n  background-color: red;\n}\`);\nconsole.info(b);\n`,
          },
        ]);
      },
    });

    await t.step({
      name: "json module",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/json_module/a.ts"),
        ).href;
        const assets = await bundler.createAssets([inputA]);
        const chunks = await bundler.createChunks([inputA], assets, { root });

        const bundles = await bundler.createBundles(chunks, { root });

        assertEquals(bundles, [
          {
            output: await typescriptPlugin.createOutput(inputA, root, ".js"),
            source:
              `const b = JSON.parse(\`{"foo":"bar"}\`);\nconsole.info(b);\n`,
          },
        ]);
      },
    });

    await t.step({
      name: "webmanifest",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "html/webmanifest/index.html"),
        ).href;
        const output = await htmlPlugin.createOutput(inputA, root, ".html");
        const inputB = path.toFileUrl(path.join(
          testdataDir,
          "html/webmanifest/manifest.webmanifest",
        )).href;
        const manifestOutput = await webManifestPlugin.createOutput(
          inputB,
          root,
          ".webmanifest",
        );

        const assets = await bundler.createAssets([inputA]);
        const chunks = await bundler.createChunks([inputA], assets, { root });
        const bundles = await bundler.createBundles(chunks, { root });

        assertEquals(bundles[0], {
          output: output,
          source: `<html>\n  <head>\n    <link rel="manifest" href="/${
            path.relative(path.dirname(output), manifestOutput)
          }">\n  </head>\n  <body>\n  </body>\n</html>`,
        });

        const imageOutput1 = await filePlugin
          .createOutput(
            path.toFileUrl(
              path.join(testdataDir, "html/webmanifest/icon-192x192.png"),
            ).href,
            root,
            ".png",
          );
        const imageOutput2 = await filePlugin
          .createOutput(
            path.toFileUrl(
              path.join(testdataDir, "html/webmanifest/icon-256x256.png"),
            ).href,
            root,
            ".png",
          );
        const imageOutput3 = await filePlugin
          .createOutput(
            path.toFileUrl(
              path.join(testdataDir, "html/webmanifest/icon-384x384.png"),
            ).href,
            root,
            ".png",
          );
        const imageOutput4 = await filePlugin
          .createOutput(
            path.toFileUrl(
              path.join(testdataDir, "html/webmanifest/icon-512x512.png"),
            ).href,
            root,
            ".png",
          );

        assertEquals(bundles[1], {
          output: await webManifestPlugin.createOutput(
            inputB,
            root,
            ".webmanifest",
          ),
          source:
            `{\n "theme_color": "#0596fa",\n "background_color": "#0596fa",\n "display": "standalone",\n "scope": "/",\n "start_url": "/",\n "name": "Bundler",\n "short_name": "Bundler",\n "icons": [\n  {\n   "src": "/${
              path.relative(path.dirname(manifestOutput), imageOutput1)
            }",\n   "sizes": "192x192",\n   "type": "image/png"\n  },\n  {\n   "src": "/${
              path.relative(path.dirname(manifestOutput), imageOutput2)
            }",\n   "sizes": "256x256",\n   "type": "image/png"\n  },\n  {\n   "src": "/${
              path.relative(path.dirname(manifestOutput), imageOutput3)
            }",\n   "sizes": "384x384",\n   "type": "image/png"\n  },\n  {\n   "src": "/${
              path.relative(path.dirname(manifestOutput), imageOutput4)
            }",\n   "sizes": "512x512",\n   "type": "image/png"\n  }\n ]\n}`,
        });
      },
    });

    await t.step({
      name: "chain",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/chain/a.ts"),
        ).href;

        const assets = await bundler.createAssets([inputA]);
        const chunks = await bundler.createChunks([inputA], assets, { root });
        const bundles = await bundler.createBundles(chunks, { root });

        assertEquals(bundles, [{
          output: await typescriptPlugin.createOutput(inputA, root, ".js"),
          source:
            `const c = "c";\nconsole.info(c);\nconst b = "b";\nconsole.info(b);\n`,
        }]);
      },
    });

    await t.step({
      name: "chain fetch",
      async fn() {
        const root = "dist";
        const inputA =
          path.toFileUrl(path.join(testdataDir, "typescript/chain_fetch/a.ts"))
            .href;
        const inputC =
          path.toFileUrl(path.join(testdataDir, "typescript/chain_fetch/c.ts"))
            .href;

        const assets = await bundler.createAssets([inputA]);

        const chunks = await bundler.createChunks([inputA], assets, { root });
        const bundles = await bundler.createBundles(chunks, { root });

        assertEquals(bundles, [
          {
            output: await typescriptPlugin.createOutput(inputA, root, ".js"),
            source: `const c = await fetch("${
              path.posix.fromFileUrl(
                await typescriptPlugin.createOutput(inputC, "", ".js"),
              )
            }");\nconsole.info(c);\n`,
          },
          {
            output: await typescriptPlugin.createOutput(inputC, root, ".js"),
            source: `const c = "c";\nexport { c };\n`,
          },
        ]);
      },
    });

    await t.step({
      name: "chain chain fetch",
      async fn() {
        const root = "dist";
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/chain_chain_fetch/a.ts"),
        ).href;
        const inputD = path.toFileUrl(
          path.join(testdataDir, "typescript/chain_chain_fetch/d.ts"),
        ).href;

        const assets = await bundler.createAssets([inputA]);

        const chunks = await bundler.createChunks([inputA], assets, { root });
        const bundles = await bundler.createBundles(chunks, { root });

        assertEquals(bundles, [
          {
            output: await typescriptPlugin.createOutput(inputA, root, ".js"),
            source: `const d = await fetch("${
              path.posix.fromFileUrl(
                await typescriptPlugin.createOutput(inputD, "", ".js"),
              )
            }");\nconsole.info(d);\n`,
          },
          {
            output: await typescriptPlugin.createOutput(inputD, root, ".js"),
            source: `const d = "d";\nexport { d };\n`,
          },
        ]);
      },
    });

    await t.step({
      name: "css inline chain",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/css_chain/a.ts"),
        ).href;

        const assets = await bundler.createAssets([inputA]);
        const chunks = await bundler.createChunks([inputA], assets, { root });
        const bundles = await bundler.createBundles(chunks, { root });

        assertEquals(bundles, [{
          output: await typescriptPlugin.createOutput(inputA, root, ".js"),
          source:
            `const b = new CSSStyleSheet();\nb.replaceSync(\`h1 {\n  background-color: red;\n}\n\nh1 {\n  color: red;\n}\`);\nconsole.info(b);\n`,
        }]);
      },
    });

    await t.step({
      name: "double import",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/double/import.ts"),
        ).href;

        const assets = await bundler.createAssets([inputA]);
        const chunks = await bundler.createChunks([inputA], assets, { root });
        const bundles = await bundler.createBundles(chunks, { root });

        assertEquals(bundles, [{
          output: await typescriptPlugin.createOutput(inputA, root, ".js"),
          source: `const b = "b";\nconsole.info(b, b);\n`,
        }]);
      },
    });
    await t.step({
      name: "double export",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/double/export.ts"),
        ).href;

        const assets = await bundler.createAssets([inputA]);
        const chunks = await bundler.createChunks([inputA], assets, { root });
        const bundles = await bundler.createBundles(chunks, { root });

        assertEquals(bundles, [{
          output: await typescriptPlugin.createOutput(inputA, root, ".js"),
          source: `const b = "b";\nexport { b, b as c };\n`,
        }]);
      },
    });
    await t.step({
      name: "double mixed",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/double/mixed.ts"),
        ).href;

        const assets = await bundler.createAssets([inputA]);
        const chunks = await bundler.createChunks([inputA], assets, { root });
        const bundles = await bundler.createBundles(chunks, { root });

        assertEquals(bundles, [{
          output: await typescriptPlugin.createOutput(inputA, root, ".js"),
          source: `const b = "b";\nconsole.info(b);\nexport { b as c };\n`,
        }]);
      },
    });

    await t.step({
      name: "importmap",
      async fn() {
        const inputA = path.toFileUrl(
          path.join(testdataDir, "typescript/importmap/a.ts"),
        ).href;
        const importmapPath = path.join(
          testdataDir,
          "typescript/importmap/import_map.json",
        );

        const importMap = resolveImportMap(
          JSON.parse(await Deno.readTextFile(importmapPath)),
          path.toFileUrl(importmapPath),
        );
        const assets = await bundler.createAssets([inputA], { importMap });
        const chunks = await bundler.createChunks([inputA], assets, { root });
        const bundles = await bundler.createBundles(chunks, { importMap });

        assertEquals(bundles, [{
          output: await typescriptPlugin.createOutput(inputA, root, ".js"),
          source: `const b = "b";\nconsole.info(b);\n`,
        }]);
      },
    });
  },
});
