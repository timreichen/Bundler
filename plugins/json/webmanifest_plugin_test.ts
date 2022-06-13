import { assertEquals } from "../../test_deps.ts";
import { Bundler } from "../../bundler.ts";
import { Asset, Chunk, DependencyFormat, DependencyType } from "../plugin.ts";
import { WebManifestPlugin } from "./webmanifest_plugin.ts";
import { path } from "../../deps.ts";

const plugin = new WebManifestPlugin();
const bundler = new Bundler({ plugins: [plugin], quiet: true });

const moduleDir = path.dirname(path.fromFileUrl(import.meta.url));
const testdataDir = path.resolve(moduleDir, "../../testdata");

Deno.test({
  name: "test",
  fn() {
    assertEquals(plugin.test(".json", DependencyType.WebManifest), true);
    assertEquals(plugin.test(".webmanifest", DependencyType.WebManifest), true);
    assertEquals(plugin.test(".json", DependencyType.ImportExport), false);
  },
});

Deno.test({
  name: "createAsset",
  async fn() {
    const a =
      path.toFileUrl(path.join(testdataDir, "json/webmanifest.json")).href;

    const asset = await bundler.createAsset(a, DependencyType.WebManifest);

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
      exports: {},
      source:
        `{\n  "name": "HackerWeb",\n  "short_name": "HackerWeb",\n  "start_url": ".",\n  "display": "standalone",\n  "background_color": "#fff",\n  "description": "Eine einfach lesbare Hacker News App.",\n  "icons": [{\n    "src": "images/touch/homescreen48.png",\n    "sizes": "48x48",\n    "type": "image/png"\n  }, {\n    "src": "images/touch/homescreen72.png",\n    "sizes": "72x72",\n    "type": "image/png"\n  }, {\n    "src": "images/touch/homescreen96.png",\n    "sizes": "96x96",\n    "type": "image/png"\n  }, {\n    "src": "images/touch/homescreen144.png",\n    "sizes": "144x144",\n    "type": "image/png"\n  }, {\n    "src": "images/touch/homescreen168.png",\n    "sizes": "168x168",\n    "type": "image/png"\n  }, {\n    "src": "images/touch/homescreen192.png",\n    "sizes": "192x192",\n    "type": "image/png"\n  }],\n  "related_applications": [{\n    "platform": "Web"\n  }, {\n    "platform": "play",\n    "url": "https://play.google.com/store/apps/details?id=cheeaun.hackerweb"\n  }]\n}\n`,
    });
  },
});

Deno.test({
  name: "createChunk",
  async fn() {
    const a =
      path.toFileUrl(path.join(testdataDir, "json/webmanifest.json")).href;

    const asset = await bundler.createAsset(a, DependencyType.WebManifest);
    const chunkAssets: Set<Asset> = new Set();
    const chunk = await bundler.createChunk(asset, chunkAssets);
    assertEquals(chunk, {
      dependencyItems: [],
      item: {
        format: DependencyFormat.Json,
        input: a,
        source:
          `{\n  "name": "HackerWeb",\n  "short_name": "HackerWeb",\n  "start_url": ".",\n  "display": "standalone",\n  "background_color": "#fff",\n  "description": "Eine einfach lesbare Hacker News App.",\n  "icons": [{\n    "src": "images/touch/homescreen48.png",\n    "sizes": "48x48",\n    "type": "image/png"\n  }, {\n    "src": "images/touch/homescreen72.png",\n    "sizes": "72x72",\n    "type": "image/png"\n  }, {\n    "src": "images/touch/homescreen96.png",\n    "sizes": "96x96",\n    "type": "image/png"\n  }, {\n    "src": "images/touch/homescreen144.png",\n    "sizes": "144x144",\n    "type": "image/png"\n  }, {\n    "src": "images/touch/homescreen168.png",\n    "sizes": "168x168",\n    "type": "image/png"\n  }, {\n    "src": "images/touch/homescreen192.png",\n    "sizes": "192x192",\n    "type": "image/png"\n  }],\n  "related_applications": [{\n    "platform": "Web"\n  }, {\n    "platform": "play",\n    "url": "https://play.google.com/store/apps/details?id=cheeaun.hackerweb"\n  }]\n}\n`,
        type: DependencyType.WebManifest,
      },
      output: await plugin.createOutput(a, "dist", ".json"),
    });
  },
});

Deno.test({
  name: "createBundle",
  async fn(t) {
    await t.step("bundle", async () => {
      const a =
        path.toFileUrl(path.join(testdataDir, "json/webmanifest.json")).href;
      const asset = await bundler.createAsset(a, DependencyType.WebManifest);
      const chunkAssets: Set<Asset> = new Set();
      const chunk = await bundler.createChunk(asset, chunkAssets);
      const chunks: Chunk[] = [
        {
          item: {
            format: DependencyFormat.Binary,
            input: new URL(
              "../../testdata/json/images/touch/homescreen48.png",
              import.meta.url,
            ).href,
            type: DependencyType.Fetch,
            source: new ArrayBuffer(0),
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
            source: new ArrayBuffer(0),
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
            source: new ArrayBuffer(0),
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
            source: new ArrayBuffer(0),
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
            source: new ArrayBuffer(0),
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
            source: new ArrayBuffer(0),
          },
          output: "file:///dist/homescreen192.png",
          dependencyItems: [],
        },
      ];
      const bundle = await bundler.createBundle(chunk, { chunks });

      assertEquals(bundle, {
        source:
          `{\n "name": "HackerWeb",\n "short_name": "HackerWeb",\n "start_url": ".",\n "display": "standalone",\n "background_color": "#fff",\n "description": "Eine einfach lesbare Hacker News App.",\n "icons": [\n  {\n   "src": "/homescreen48.png",\n   "sizes": "48x48",\n   "type": "image/png"\n  },\n  {\n   "src": "/homescreen72.png",\n   "sizes": "72x72",\n   "type": "image/png"\n  },\n  {\n   "src": "/homescreen96.png",\n   "sizes": "96x96",\n   "type": "image/png"\n  },\n  {\n   "src": "/homescreen144.png",\n   "sizes": "144x144",\n   "type": "image/png"\n  },\n  {\n   "src": "/homescreen168.png",\n   "sizes": "168x168",\n   "type": "image/png"\n  },\n  {\n   "src": "/homescreen192.png",\n   "sizes": "192x192",\n   "type": "image/png"\n  }\n ],\n "related_applications": [\n  {\n   "platform": "Web"\n  },\n  {\n   "platform": "play",\n   "url": "https://play.google.com/store/apps/details?id=cheeaun.hackerweb"\n  }\n ]\n}`,
        output: await plugin.createOutput(a, "dist", ".json"),
      });
    });
    await t.step("optimize", async () => {
      const a =
        path.toFileUrl(path.join(testdataDir, "json/webmanifest.json")).href;

      const asset = await bundler.createAsset(a, DependencyType.WebManifest);
      const chunkAssets: Set<Asset> = new Set();
      const chunk = await bundler.createChunk(asset, chunkAssets);
      const chunks: Chunk[] = [
        {
          item: {
            format: DependencyFormat.Binary,
            input: new URL(
              "../../testdata/json/images/touch/homescreen48.png",
              import.meta.url,
            ).href,
            type: DependencyType.Fetch,
            source: new ArrayBuffer(0),
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
            source: new ArrayBuffer(0),
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
            source: new ArrayBuffer(0),
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
            source: new ArrayBuffer(0),
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
            source: new ArrayBuffer(0),
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
            source: new ArrayBuffer(0),
          },
          output: "file:///dist/homescreen192.png",
          dependencyItems: [],
        },
      ];
      const bundle = await bundler.createBundle(chunk, {
        chunks,
        optimize: true,
      });

      assertEquals(bundle, {
        source:
          `{"name":"HackerWeb","short_name":"HackerWeb","start_url":".","display":"standalone","background_color":"#fff","description":"Eine einfach lesbare Hacker News App.","icons":[{"src":"/homescreen48.png","sizes":"48x48","type":"image/png"},{"src":"/homescreen72.png","sizes":"72x72","type":"image/png"},{"src":"/homescreen96.png","sizes":"96x96","type":"image/png"},{"src":"/homescreen144.png","sizes":"144x144","type":"image/png"},{"src":"/homescreen168.png","sizes":"168x168","type":"image/png"},{"src":"/homescreen192.png","sizes":"192x192","type":"image/png"}],"related_applications":[{"platform":"Web"},{"platform":"play","url":"https://play.google.com/store/apps/details?id=cheeaun.hackerweb"}]}`,
        output: await plugin.createOutput(a, "dist", ".json"),
      });
    });
  },
});
