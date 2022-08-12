import { assertEquals } from "../../test_deps.ts";
import { Bundler } from "../../bundler.ts";
import { WebManifestPlugin } from "./webmanifest_plugin.ts";
import { path } from "../../deps.ts";
import { Asset, Chunk, DependencyFormat, DependencyType } from "../plugin.ts";

const moduleDir = path.dirname(path.fromFileUrl(import.meta.url));
const testdataDir = path.resolve(moduleDir, "../../testdata");

Deno.test({
  name: "test",
  fn() {
    const plugin = new WebManifestPlugin();

    assertEquals(plugin.test("file.json", DependencyType.WebManifest), true);
    assertEquals(
      plugin.test("file.webmanifest", DependencyType.WebManifest),
      true,
    );
    assertEquals(
      plugin.test("file.webmanifest", DependencyType.ImportExport),
      false,
    );
    assertEquals(plugin.test("file.json", DependencyType.ImportExport), false);
  },
});

Deno.test({
  name: "createAsset",
  async fn() {
    const a =
      path.toFileUrl(path.join(testdataDir, "json/webmanifest.json")).href;

    const plugin = new WebManifestPlugin();
    const bundler = new Bundler({ plugins: [plugin], quiet: true });

    const asset = await bundler.createAsset(
      a,
      DependencyType.WebManifest,
    );

    assertEquals(asset, {
      input: a,
      type: DependencyType.WebManifest,
      format: DependencyFormat.Json,
      dependencies: [
        {
          format: DependencyFormat.Binary,
          input: new URL(
            "../../testdata/json/images/touch/homescreen48.png",
            import.meta.url,
          ).href,
          type: DependencyType.Fetch,
        },
        {
          format: DependencyFormat.Binary,
          input: new URL(
            "../../testdata/json/images/touch/homescreen72.png",
            import.meta.url,
          ).href,
          type: DependencyType.Fetch,
        },
        {
          format: DependencyFormat.Binary,
          input: new URL(
            "../../testdata/json/images/touch/homescreen96.png",
            import.meta.url,
          ).href,
          type: DependencyType.Fetch,
        },
        {
          format: DependencyFormat.Binary,
          input: new URL(
            "../../testdata/json/images/touch/homescreen144.png",
            import.meta.url,
          ).href,
          type: DependencyType.Fetch,
        },
        {
          format: DependencyFormat.Binary,
          input: new URL(
            "../../testdata/json/images/touch/homescreen168.png",
            import.meta.url,
          ).href,
          type: DependencyType.Fetch,
        },
        {
          format: DependencyFormat.Binary,
          input: new URL(
            "../../testdata/json/images/touch/homescreen192.png",
            import.meta.url,
          ).href,
          type: DependencyType.Fetch,
        },
      ],
    });
  },
});

Deno.test({
  name: "createChunk",
  async fn() {
    const root = "dist";

    const a =
      path.toFileUrl(path.join(testdataDir, "json/webmanifest.json")).href;

    const plugin = new WebManifestPlugin();
    const bundler = new Bundler({ plugins: [plugin], quiet: true });

    const asset = await bundler.createAsset(
      a,
      DependencyType.WebManifest,
    );
    const chunkAssets: Set<Asset> = new Set();
    const chunk = await bundler.createChunk(asset, chunkAssets, undefined, {
      root,
    });
    assertEquals(chunk, {
      dependencyItems: [],
      item: {
        format: DependencyFormat.Json,
        input: a,
        type: DependencyType.WebManifest,
      },
      output: await plugin.createOutput(a, root, ".json"),
    });
  },
});

Deno.test({
  name: "createBundle",
  async fn(t) {
    await t.step("bundle", async () => {
      const root = "dist";
      const a =
        path.toFileUrl(path.join(testdataDir, "json/webmanifest.json")).href;

      const plugin = new WebManifestPlugin();
      const bundler = new Bundler({ plugins: [plugin], quiet: true });

      const asset = await bundler.createAsset(a, DependencyType.WebManifest);
      const chunkAssets: Set<Asset> = new Set();
      const chunk = await bundler.createChunk(asset, chunkAssets, undefined, {
        root,
      });
      const chunks: Chunk[] = [
        {
          item: {
            format: DependencyFormat.Binary,
            input: new URL(
              "../../testdata/json/images/touch/homescreen48.png",
              import.meta.url,
            ).href,
            type: DependencyType.Fetch,
          },
          output: "file:///dist/homescreen48.png",
          dependencyItems: [],
        },
        {
          item: {
            format: DependencyFormat.Binary,
            input: new URL(
              "../../testdata/json/images/touch/homescreen72.png",
              import.meta.url,
            ).href,
            type: DependencyType.Fetch,
          },
          output: "file:///dist/homescreen72.png",
          dependencyItems: [],
        },
        {
          item: {
            format: DependencyFormat.Binary,
            input: new URL(
              "../../testdata/json/images/touch/homescreen96.png",
              import.meta.url,
            ).href,
            type: DependencyType.Fetch,
          },
          output: "file:///dist/homescreen96.png",
          dependencyItems: [],
        },
        {
          item: {
            format: DependencyFormat.Binary,
            input: new URL(
              "../../testdata/json/images/touch/homescreen144.png",
              import.meta.url,
            ).href,
            type: DependencyType.Fetch,
          },
          output: "file:///dist/homescreen144.png",
          dependencyItems: [],
        },
        {
          item: {
            format: DependencyFormat.Binary,
            input: new URL(
              "../../testdata/json/images/touch/homescreen168.png",
              import.meta.url,
            ).href,
            type: DependencyType.Fetch,
          },
          output: "file:///dist/homescreen168.png",
          dependencyItems: [],
        },
        {
          item: {
            format: DependencyFormat.Binary,
            input: new URL(
              "../../testdata/json/images/touch/homescreen192.png",
              import.meta.url,
            ).href,
            type: DependencyType.Fetch,
          },
          output: "file:///dist/homescreen192.png",
          dependencyItems: [],
        },
      ];
      const { input, type, format } = chunk.item;
      const json = await bundler.createSource(input, type, format);
      const bundle = await bundler.createBundle(chunk, json, undefined, {
        chunks,
        root,
      });

      assertEquals(bundle, {
        source:
          `{\n "name": "HackerWeb",\n "short_name": "HackerWeb",\n "start_url": ".",\n "display": "standalone",\n "background_color": "#fff",\n "description": "Eine einfach lesbare Hacker News App.",\n "icons": [\n  {\n   "src": "/homescreen48.png",\n   "sizes": "48x48",\n   "type": "image/png"\n  },\n  {\n   "src": "/homescreen72.png",\n   "sizes": "72x72",\n   "type": "image/png"\n  },\n  {\n   "src": "/homescreen96.png",\n   "sizes": "96x96",\n   "type": "image/png"\n  },\n  {\n   "src": "/homescreen144.png",\n   "sizes": "144x144",\n   "type": "image/png"\n  },\n  {\n   "src": "/homescreen168.png",\n   "sizes": "168x168",\n   "type": "image/png"\n  },\n  {\n   "src": "/homescreen192.png",\n   "sizes": "192x192",\n   "type": "image/png"\n  }\n ],\n "related_applications": [\n  {\n   "platform": "Web"\n  },\n  {\n   "platform": "play",\n   "url": "https://play.google.com/store/apps/details?id=cheeaun.hackerweb"\n  }\n ]\n}`,
        output: await plugin.createOutput(a, root, ".json"),
      });
    });
    await t.step("optimize", async () => {
      const root = "dist";
      const a = path.toFileUrl(path.join(testdataDir, "json/a.json")).href;

      const plugin = new WebManifestPlugin();
      const bundler = new Bundler({ plugins: [plugin], quiet: true });

      const asset = await bundler.createAsset(a, DependencyType.WebManifest);
      const chunkAssets: Set<Asset> = new Set();
      const chunk = await bundler.createChunk(asset, chunkAssets, undefined, {
        root,
      });
      const { input, type, format } = chunk.item;
      const json = await bundler.createSource(input, type, format);
      const bundle = await bundler.createBundle(chunk, json, undefined, {
        root,
        optimize: true,
      });

      assertEquals(bundle, {
        source: `{"foo":"bar"}`,
        output: await plugin.createOutput(a, root, ".json"),
      });
    });
  },
});
