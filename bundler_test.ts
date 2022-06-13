import { assertEquals } from "./test_deps.ts";
import { Bundler } from "./bundler.ts";
import { CSSPlugin } from "./plugins/css/css_plugin.ts";
import { JSONPlugin } from "./plugins/json/json_plugin.ts";
import { DependencyFormat, DependencyType } from "./plugins/plugin.ts";
import { TypescriptPlugin } from "./plugins/typescript/typescript_plugin.ts";
import { WebManifestPlugin } from "./plugins/json/webmanifest_plugin.ts";
import { HTMLPlugin } from "./plugins/html/html_plugin.ts";
import { FilePlugin } from "./plugins/file/file.ts";
import { path, resolveImportMap } from "./deps.ts";

const moduleDir = path.dirname(path.fromFileUrl(import.meta.url));
const testdataDir = path.resolve(moduleDir, "testdata");

const typescriptPlugin = new TypescriptPlugin();

const bundler = new Bundler({
  plugins: [
    new TypescriptPlugin(),
    new CSSPlugin(),
    new JSONPlugin(),
    new HTMLPlugin(),
    new WebManifestPlugin(),
    new FilePlugin(),
  ],
  quiet: true,
});

Deno.test({
  name: "createAssets",
  async fn(t) {
    await t.step({
      name: "simple",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/simple/a.ts"),
        ).href;
        const assets = await bundler.createAssets([a]);

        assertEquals(assets, [
          {
            input: a,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            dependencies: [],
            exports: {},
            source: 'console.log("hello world");\n',
          },
        ]);
      },
    });

    await t.step({
      name: "linear",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/linear/a.ts"),
        ).href;
        const b = path.toFileUrl(
          path.join(testdataDir, "typescript/linear/b.ts"),
        ).href;
        const assets = await bundler.createAssets([a]);
        assertEquals(assets, [
          {
            input: a,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            dependencies: [
              {
                input: b,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
                specifiers: { b: "b" },
              },
            ],
            exports: {},
            source: 'import { b } from "./b.ts";\nconsole.log(b);\n',
          },
          {
            dependencies: [],
            exports: {
              specifiers: {
                b: "b",
              },
            },
            input: b,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            source: 'export const b = "b";\n',
          },
        ]);
      },
    });

    await t.step({
      name: "circular a to b",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/circular/a.ts"),
        ).href;
        const b = path.toFileUrl(
          path.join(testdataDir, "typescript/circular/b.ts"),
        ).href;
        const assets = await bundler.createAssets([a]);

        assertEquals(assets, [
          {
            dependencies: [
              {
                input: b,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
                specifiers: { b: "b" },
              },
            ],
            exports: {
              specifiers: {
                a: "a",
              },
            },
            input: a,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            source:
              'import { b } from "./b.ts";\nconsole.log(b);\nexport const a = "a";\n',
          },
          {
            dependencies: [
              {
                input: a,
                type: DependencyType.ImportExport,
                specifiers: { a: "a" },
                format: DependencyFormat.Script,
              },
            ],
            exports: {
              specifiers: {
                b: "b",
              },
            },
            input: b,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            source:
              'import { a } from "./a.ts";\nconsole.log(a);\nexport const b = "b";\n',
          },
        ]);
      },
    });

    await t.step({
      name: "circular b to a",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/circular/a.ts"),
        ).href;
        const b = path.toFileUrl(
          path.join(testdataDir, "typescript/circular/b.ts"),
        ).href;
        const assets = await bundler.createAssets([b]);

        assertEquals(assets, [
          {
            dependencies: [
              {
                input: a,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
                specifiers: { a: "a" },
              },
            ],
            exports: {
              specifiers: {
                b: "b",
              },
            },
            input: b,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            source:
              'import { a } from "./a.ts";\nconsole.log(a);\nexport const b = "b";\n',
          },
          {
            dependencies: [
              {
                input: b,
                type: DependencyType.ImportExport,
                specifiers: { b: "b" },
                format: DependencyFormat.Script,
              },
            ],
            exports: {
              specifiers: {
                a: "a",
              },
            },
            input: a,
            source:
              'import { b } from "./b.ts";\nconsole.log(b);\nexport const a = "a";\n',

            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
          },
        ]);
      },
    });

    await t.step({
      name: "json module",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/json_module/a.ts"),
        ).href;
        const b = path.toFileUrl(
          path.join(testdataDir, "typescript/json_module/b.json"),
        ).href;
        const assets = await bundler.createAssets([a]);

        assertEquals(assets, [
          {
            dependencies: [
              {
                input: b,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Json,
                default: "b",
              },
            ],
            input: a,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            exports: {},
            source:
              'import b from "./b.json" assert { type: "json" };\nconsole.log(b);\n',
          },
          {
            dependencies: [],
            input: b,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Json,
            exports: {},
            source: '{\n  "foo": "bar"\n}\n',
          },
        ]);
      },
    });

    await t.step({
      name: "css module",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/css_module/a.ts"),
        ).href;
        const b = path.toFileUrl(
          path.join(testdataDir, "typescript/css_module/b.css"),
        ).href;
        const assets = await bundler.createAssets([a]);

        assertEquals(assets, [
          {
            dependencies: [
              {
                input: b,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Style,
                default: "b",
              },
            ],
            input: a,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            exports: {},
            source:
              'import b from "./b.css" assert { type: "css" };\nconsole.log(b);\n',
          },
          {
            dependencies: [],
            input: b,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Style,
            exports: {},
            source: "h1 {\n  font-family: Helvetica;\n}",
          },
        ]);
      },
    });

    await t.step({
      name: "importmap",
      async fn() {
        const a =
          path.toFileUrl(path.join(testdataDir, "typescript/importmap/a.ts"))
            .href;
        const b = path.toFileUrl(
          path.join(testdataDir, "typescript/importmap/b.ts"),
        ).href;
        const importmapPath = path.join(
          testdataDir,
          "typescript/importmap/import_map.json",
        );

        const importMap = resolveImportMap(
          JSON.parse(await Deno.readTextFile(importmapPath)),
          new URL(importmapPath, "file://"),
        );

        const asset = await bundler.createAssets([a], { importMap });
        assertEquals(asset, [
          {
            input: a,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            dependencies: [
              {
                input: b,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
                specifiers: { b: "b" },
              },
            ],
            exports: {},
            source: 'import { b } from "b";\nconsole.log(b);\n',
          },
          {
            dependencies: [],
            exports: {
              specifiers: {
                b: "b",
              },
            },
            input: b,
            type: DependencyType.ImportExport,
            format: DependencyFormat.Script,
            source: 'export const b = "b";\n',
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
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/linear/a.ts"),
        ).href;
        const b = path.toFileUrl(
          path.join(testdataDir, "typescript/linear/b.ts"),
        ).href;
        const assets = await bundler.createAssets([a]);
        const chunks = await bundler.createChunks([a], assets);

        assertEquals(chunks, [
          {
            item: {
              input: a,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
              source: 'import { b } from "./b.ts";\nconsole.log(b);\n',
            },
            dependencyItems: [
              {
                input: b,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
                source: `export const b = "b";\n`,
              },
            ],
            output: await typescriptPlugin.createOutput(a, "dist", ".js"),
          },
        ]);
      },
    });

    await t.step({
      name: "linear split",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/linear/a.ts"),
        ).href;
        const b = path.toFileUrl(
          path.join(testdataDir, "typescript/linear/b.ts"),
        ).href;
        const assets = await bundler.createAssets([a]);
        const chunks = await bundler.createChunks([a, b], assets);
        assertEquals(chunks, [
          {
            item: {
              input: a,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
              source: 'import { b } from "./b.ts";\nconsole.log(b);\n',
            },
            dependencyItems: [],
            output: await typescriptPlugin.createOutput(a, "dist", ".js"),
          },
          {
            item: {
              format: DependencyFormat.Script,
              input: b,
              source: 'export const b = "b";\n',
              type: DependencyType.ImportExport,
            },
            dependencyItems: [],
            output: await typescriptPlugin.createOutput(b, "dist", ".js"),
          },
        ]);
      },
    });

    await t.step({
      name: "circular a to b",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/circular/a.ts"),
        ).href;
        const b = path.toFileUrl(
          path.join(testdataDir, "typescript/circular/b.ts"),
        ).href;
        const assets = await bundler.createAssets([a]);
        const chunks = await bundler.createChunks([a], assets);
        assertEquals(chunks, [
          {
            item: {
              format: DependencyFormat.Script,
              input: a,
              source:
                'import { b } from "./b.ts";\nconsole.log(b);\nexport const a = "a";\n',
              type: DependencyType.ImportExport,
            },
            dependencyItems: [
              {
                source:
                  'import { a } from "./a.ts";\nconsole.log(a);\nexport const b = "b";\n',
                format: DependencyFormat.Script,
                input: b,
                type: DependencyType.ImportExport,
              },
            ],
            output: await typescriptPlugin.createOutput(a, "dist", ".js"),
          },
        ]);
      },
    });

    await t.step({
      name: "circular b to a",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/circular/a.ts"),
        ).href;
        const b = path.toFileUrl(
          path.join(testdataDir, "typescript/circular/b.ts"),
        ).href;
        const assets = await bundler.createAssets([b]);
        const chunks = await bundler.createChunks([b], assets);
        assertEquals(chunks, [
          {
            item: {
              format: DependencyFormat.Script,
              input: b,
              source:
                'import { a } from "./a.ts";\nconsole.log(a);\nexport const b = "b";\n',
              type: DependencyType.ImportExport,
            },
            dependencyItems: [
              {
                source:
                  'import { b } from "./b.ts";\nconsole.log(b);\nexport const a = "a";\n',
                format: DependencyFormat.Script,
                input: a,
                type: DependencyType.ImportExport,
              },
            ],
            output: await typescriptPlugin.createOutput(b, "dist", ".js"),
          },
        ]);
      },
    });

    await t.step({
      name: "circular split",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/circular/a.ts"),
        ).href;
        const b = path.toFileUrl(
          path.join(testdataDir, "typescript/circular/b.ts"),
        ).href;
        const assets = await bundler.createAssets([a]);
        const chunks = await bundler.createChunks([a, b], assets);
        assertEquals(chunks, [
          {
            item: {
              input: a,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
              source:
                'import { b } from "./b.ts";\nconsole.log(b);\nexport const a = "a";\n',
            },
            dependencyItems: [],
            output: await typescriptPlugin.createOutput(a, "dist", ".js"),
          },
          {
            dependencyItems: [],
            item: {
              input: b,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
              source:
                'import { a } from "./a.ts";\nconsole.log(a);\nexport const b = "b";\n',
            },
            output: await typescriptPlugin.createOutput(b, "dist", ".js"),
          },
        ]);
      },
    });

    await t.step({
      name: "double import",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/double/import.ts"),
        ).href;
        const b = path.toFileUrl(
          path.join(testdataDir, "typescript/double/b.ts"),
        ).href;
        const assets = await bundler.createAssets([a]);
        const chunks = await bundler.createChunks([a], assets);

        assertEquals(chunks, [
          {
            item: {
              format: DependencyFormat.Script,
              input: a,
              source:
                'import { b } from "./b.ts";\nimport { b as c } from "./b.ts";\nconsole.log(b, c);\n',
              type: DependencyType.ImportExport,
            },
            dependencyItems: [
              {
                input: b,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
                source: 'export const b = "b";\n',
              },
            ],
            output: await typescriptPlugin.createOutput(a, "dist", ".js"),
          },
        ]);
      },
    });
    await t.step({
      name: "double export",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/double/export.ts"),
        ).href;
        const b = path.toFileUrl(
          path.join(testdataDir, "typescript/double/b.ts"),
        ).href;
        const assets = await bundler.createAssets([a]);
        const chunks = await bundler.createChunks([a], assets);
        assertEquals(chunks, [
          {
            item: {
              input: a,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
              source:
                'export { b } from "./b.ts";\nexport { b as c } from "./b.ts";\n',
            },
            dependencyItems: [
              {
                input: b,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
                source: 'export const b = "b";\n',
              },
            ],
            output: await typescriptPlugin.createOutput(a, "dist", ".js"),
          },
        ]);
      },
    });
    await t.step({
      name: "double mixed",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/double/mixed.ts"),
        ).href;
        const b = path.toFileUrl(
          path.join(testdataDir, "typescript/double/b.ts"),
        ).href;
        const assets = await bundler.createAssets([a]);
        const chunks = await bundler.createChunks([a], assets);
        assertEquals(chunks, [
          {
            item: {
              input: a,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
              source:
                'import { b } from "./b.ts";\nexport { b as c } from "./b.ts";\nconsole.log(b);\n',
            },
            dependencyItems: [
              {
                input: b,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
                source: 'export const b = "b";\n',
              },
            ],
            output: await typescriptPlugin.createOutput(a, "dist", ".js"),
          },
        ]);
      },
    });

    await t.step({
      name: "chain",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/chain/a.ts"),
        ).href;
        const b = path.toFileUrl(
          path.join(testdataDir, "typescript/chain/b.ts"),
        ).href;
        const c = path.toFileUrl(
          path.join(testdataDir, "typescript/chain/c.ts"),
        ).href;
        const assets = await bundler.createAssets([a]);
        const chunks = await bundler.createChunks([a], assets);
        assertEquals(chunks, [
          {
            item: {
              format: DependencyFormat.Script,
              input: a,
              source: 'import { b } from "./b.ts";\nconsole.log(b);\n',
              type: DependencyType.ImportExport,
            },
            dependencyItems: [
              {
                input: b,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
                source:
                  'import { c } from "./c.ts";\nconsole.log(c);\nexport const b = "b";\n',
              },
              {
                input: c,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
                source: 'export const c = "c";\n',
              },
            ],
            output: await typescriptPlugin.createOutput(a, "dist", ".js"),
          },
        ]);
      },
    });

    await t.step({
      name: "shared inline",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/shared/a.ts"),
        ).href;
        const b = path.toFileUrl(
          path.join(testdataDir, "typescript/shared/b.ts"),
        ).href;
        const c = path.toFileUrl(
          path.join(testdataDir, "typescript/shared/c.ts"),
        ).href;
        const assets = await bundler.createAssets([a]);
        const chunks = await bundler.createChunks([a], assets);
        assertEquals(chunks, [
          {
            item: {
              input: a,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
              source:
                'import { b } from "./b.ts";\nimport { c } from "./c.ts";\nconsole.log(b, c);\n',
            },
            dependencyItems: [
              {
                input: b,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
                source:
                  'import { c } from "./c.ts";\nconsole.log(c);\nexport const b = "b";\n',
              },
              {
                input: c,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
                source: 'export const c = "c";\n',
              },
            ],
            output: await typescriptPlugin.createOutput(a, "dist", ".js"),
          },
        ]);
      },
    });

    await t.step({
      name: "shared split",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/shared/a.ts"),
        ).href;
        const b = path.toFileUrl(
          path.join(testdataDir, "typescript/shared/b.ts"),
        ).href;
        const c = path.toFileUrl(
          path.join(testdataDir, "typescript/shared/c.ts"),
        ).href;
        const assets = await bundler.createAssets([a]);
        const chunks = await bundler.createChunks([a, b], assets);
        assertEquals(chunks, [
          {
            item: {
              input: a,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
              source:
                'import { b } from "./b.ts";\nimport { c } from "./c.ts";\nconsole.log(b, c);\n',
            },
            dependencyItems: [],
            output: await typescriptPlugin.createOutput(a, "dist", ".js"),
          },
          {
            item: {
              input: b,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
              source:
                'import { c } from "./c.ts";\nconsole.log(c);\nexport const b = "b";\n',
            },
            dependencyItems: [],
            output: await typescriptPlugin.createOutput(b, "dist", ".js"),
          },
          {
            item: {
              input: c,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
              source: 'export const c = "c";\n',
            },
            dependencyItems: [],
            output: await typescriptPlugin.createOutput(c, "dist", ".js"),
          },
        ]);
      },
    });

    await t.step({
      name: "manual split fetch dependencies",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/fetch/a.ts"),
        ).href;
        const b = path.toFileUrl(
          path.join(testdataDir, "typescript/fetch/b.ts"),
        ).href;
        const assets = await bundler.createAssets([a]);
        const chunks = await bundler.createChunks([a], assets);
        assertEquals(chunks, [
          {
            item: {
              input: a,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
              source: 'const b = await fetch("./b.ts");\nconsole.log(b);\n',
            },
            dependencyItems: [],
            output: await typescriptPlugin.createOutput(a, "dist", ".js"),
          },
          {
            item: {
              input: b,
              type: DependencyType.Fetch,
              format: DependencyFormat.Script,
              source: 'export const b = "b";\n',
            },
            dependencyItems: [],
            output: await typescriptPlugin.createOutput(b, "dist", ".js"),
          },
        ]);
      },
    });

    await t.step({
      name: "importmap",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/importmap/a.ts"),
        ).href;
        const b = path.toFileUrl(
          path.join(testdataDir, "typescript/importmap/b.ts"),
        ).href;

        const importmapPath = path.join(
          testdataDir,
          "typescript/importmap/import_map.json",
        );

        const importMap = resolveImportMap(
          JSON.parse(await Deno.readTextFile(importmapPath)),
          new URL(importmapPath, "file://"),
        );

        const assets = await bundler.createAssets([a], { importMap });
        const chunks = await bundler.createChunks([a], assets, { importMap });

        assertEquals(chunks, [
          {
            item: {
              input: a,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
              source: 'import { b } from "b";\nconsole.log(b);\n',
            },
            dependencyItems: [
              {
                input: b,
                type: DependencyType.ImportExport,
                format: DependencyFormat.Script,
                source: `export const b = "b";\n`,
              },
            ],
            output: await typescriptPlugin.createOutput(a, "dist", ".js"),
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
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/linear/a.ts"),
        ).href;

        const assets = await bundler.createAssets([a]);
        const chunks = await bundler.createChunks([a], assets);
        const bundles = await bundler.createBundles(chunks);

        assertEquals(bundles, [{
          output: await typescriptPlugin.createOutput(a, "dist", ".js"),
          source: 'const b = "b";\nconsole.log(b);\n',
        }]);
      },
    });

    await t.step({
      name: "css module",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/css_module/a.ts"),
        ).href;
        const assets = await bundler.createAssets([a]);
        const chunks = await bundler.createChunks([a], assets);

        const bundles = await bundler.createBundles(chunks);

        assertEquals(bundles, [
          {
            output: await typescriptPlugin.createOutput(a, "dist", ".js"),
            source:
              "const b = new CSSStyleSheet();\nb.replaceSync(`h1 {\n  font-family: Helvetica;\n}`);\nconsole.log(b);\n",
          },
        ]);
      },
    });

    await t.step({
      name: "json module",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/json_module/a.ts"),
        ).href;
        const assets = await bundler.createAssets([a]);
        const chunks = await bundler.createChunks([a], assets);

        const bundles = await bundler.createBundles(chunks);

        assertEquals(bundles, [
          {
            output: await typescriptPlugin.createOutput(a, "dist", ".js"),
            source:
              'const b = JSON.parse(`{\n  "foo": "bar"\n}\n`);\nconsole.log(b);\n',
          },
        ]);
      },
    });

    await t.step({
      name: "webmanifest",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "html/webmanifest/index.html"),
        ).href;
        const output = await typescriptPlugin.createOutput(a, "dist", ".html");
        const b = path.toFileUrl(path.join(
          testdataDir,
          "html/webmanifest/manifest.webmanifest",
        )).href;
        const manifestOutput = await typescriptPlugin.createOutput(
          b,
          "dist",
          ".webmanifest",
        );

        const assets = await bundler.createAssets([a]);

        const chunks = await bundler.createChunks([a], assets);

        const bundles = await bundler.createBundles(chunks);

        assertEquals(bundles[0], {
          output: output,
          source: `<html>\n  <head>\n    <link rel="manifest" href="/${
            path.relative(path.dirname(output), manifestOutput)
          }">\n  </head>\n  <body>\n  </body>\n</html>`,
        });

        const imageOutput1 = await typescriptPlugin
          .createOutput(
            path.toFileUrl(
              path.join(testdataDir, "html/webmanifest/icon-192x192.png"),
            ).href,
            "dist",
            ".png",
          );
        const imageOutput2 = await typescriptPlugin
          .createOutput(
            path.toFileUrl(
              path.join(testdataDir, "html/webmanifest/icon-256x256.png"),
            ).href,
            "dist",
            ".png",
          );
        const imageOutput3 = await typescriptPlugin
          .createOutput(
            path.toFileUrl(
              path.join(testdataDir, "html/webmanifest/icon-384x384.png"),
            ).href,
            "dist",
            ".png",
          );
        const imageOutput4 = await typescriptPlugin
          .createOutput(
            path.toFileUrl(
              path.join(testdataDir, "html/webmanifest/icon-512x512.png"),
            ).href,
            "dist",
            ".png",
          );

        assertEquals(bundles[1], {
          output: await typescriptPlugin.createOutput(
            b,
            "dist",
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
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/chain/a.ts"),
        ).href;

        const assets = await bundler.createAssets([a]);
        const chunks = await bundler.createChunks([a], assets);
        const bundles = await bundler.createBundles(chunks);

        assertEquals(bundles, [{
          output: await typescriptPlugin.createOutput(a, "dist", ".js"),
          source:
            `const c = "c";\nconsole.log(c);\nconst b = "b";\nconsole.log(b);\n`,
        }]);
      },
    });
    await t.step({
      name: "double import",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/double/import.ts"),
        ).href;

        const assets = await bundler.createAssets([a]);
        const chunks = await bundler.createChunks([a], assets);
        const bundles = await bundler.createBundles(chunks);

        assertEquals(bundles, [{
          output: await typescriptPlugin.createOutput(a, "dist", ".js"),
          source: 'const b = "b";\nconsole.log(b, b);\n',
        }]);
      },
    });
    await t.step({
      name: "double export",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/double/export.ts"),
        ).href;

        const assets = await bundler.createAssets([a]);
        const chunks = await bundler.createChunks([a], assets);
        const bundles = await bundler.createBundles(chunks);

        assertEquals(bundles, [{
          output: await typescriptPlugin.createOutput(a, "dist", ".js"),
          source: 'const b = "b";\nexport { b, b as c };\n',
        }]);
      },
    });
    await t.step({
      name: "double mixed",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/double/mixed.ts"),
        ).href;

        const assets = await bundler.createAssets([a]);
        const chunks = await bundler.createChunks([a], assets);
        const bundles = await bundler.createBundles(chunks);

        assertEquals(bundles, [{
          output: await typescriptPlugin.createOutput(a, "dist", ".js"),
          source: 'const b = "b";\nconsole.log(b);\nexport { b as c };\n',
        }]);
      },
    });

    await t.step({
      name: "importmap",
      async fn() {
        const a = path.toFileUrl(
          path.join(testdataDir, "typescript/importmap/a.ts"),
        ).href;
        const importmapPath = path.join(
          testdataDir,
          "typescript/importmap/import_map.json",
        );

        const importMap = resolveImportMap(
          JSON.parse(await Deno.readTextFile(importmapPath)),
          new URL(importmapPath, "file://"),
        );
        const assets = await bundler.createAssets([a], { importMap });
        const chunks = await bundler.createChunks([a], assets, { importMap });
        const bundles = await bundler.createBundles(chunks, { importMap });

        assertEquals(bundles, [{
          output: await typescriptPlugin.createOutput(a, "dist", ".js"),
          source: 'const b = "b";\nconsole.log(b);\n',
        }]);
      },
    });
  },
});
