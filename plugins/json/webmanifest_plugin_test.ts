import { assertEquals } from "../../test_deps.ts";
import { Bundler } from "../../bundler.ts";
import { Asset, Chunk, DependencyFormat, DependencyType } from "../plugin.ts";
import { WebManifestPlugin } from "./webmanifest_plugin.ts";
import { path } from "../../deps.ts";
import { isWindows } from "../../_util.ts";

const plugin = new WebManifestPlugin();
const bundler = new Bundler({ plugins: [plugin], quiet: true });

const moduleDir = path.dirname(path.fromFileUrl(import.meta.url));
const testdataDir = path.resolve(moduleDir, "../../testdata");

const newline = isWindows ? "\r\n" : "\n";

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
        `{${newline}  "name": "HackerWeb",${newline}  "short_name": "HackerWeb",${newline}  "start_url": ".",${newline}  "display": "standalone",${newline}  "background_color": "#fff",${newline}  "description": "Eine einfach lesbare Hacker News App.",${newline}  "icons": [{${newline}    "src": "images/touch/homescreen48.png",${newline}    "sizes": "48x48",${newline}    "type": "image/png"${newline}  }, {${newline}    "src": "images/touch/homescreen72.png",${newline}    "sizes": "72x72",${newline}    "type": "image/png"${newline}  }, {${newline}    "src": "images/touch/homescreen96.png",${newline}    "sizes": "96x96",${newline}    "type": "image/png"${newline}  }, {${newline}    "src": "images/touch/homescreen144.png",${newline}    "sizes": "144x144",${newline}    "type": "image/png"${newline}  }, {${newline}    "src": "images/touch/homescreen168.png",${newline}    "sizes": "168x168",${newline}    "type": "image/png"${newline}  }, {${newline}    "src": "images/touch/homescreen192.png",${newline}    "sizes": "192x192",${newline}    "type": "image/png"${newline}  }],${newline}  "related_applications": [{${newline}    "platform": "Web"${newline}  }, {${newline}    "platform": "play",${newline}    "url": "https://play.google.com/store/apps/details?id=cheeaun.hackerweb"${newline}  }]${newline}}${newline}`,
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
          `{${newline}  "name": "HackerWeb",${newline}  "short_name": "HackerWeb",${newline}  "start_url": ".",${newline}  "display": "standalone",${newline}  "background_color": "#fff",${newline}  "description": "Eine einfach lesbare Hacker News App.",${newline}  "icons": [{${newline}    "src": "images/touch/homescreen48.png",${newline}    "sizes": "48x48",${newline}    "type": "image/png"${newline}  }, {${newline}    "src": "images/touch/homescreen72.png",${newline}    "sizes": "72x72",${newline}    "type": "image/png"${newline}  }, {${newline}    "src": "images/touch/homescreen96.png",${newline}    "sizes": "96x96",${newline}    "type": "image/png"${newline}  }, {${newline}    "src": "images/touch/homescreen144.png",${newline}    "sizes": "144x144",${newline}    "type": "image/png"${newline}  }, {${newline}    "src": "images/touch/homescreen168.png",${newline}    "sizes": "168x168",${newline}    "type": "image/png"${newline}  }, {${newline}    "src": "images/touch/homescreen192.png",${newline}    "sizes": "192x192",${newline}    "type": "image/png"${newline}  }],${newline}  "related_applications": [{${newline}    "platform": "Web"${newline}  }, {${newline}    "platform": "play",${newline}    "url": "https://play.google.com/store/apps/details?id=cheeaun.hackerweb"${newline}  }]${newline}}${newline}`,
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
          `{${newline} "name": "HackerWeb",${newline} "short_name": "HackerWeb",${newline} "start_url": ".",${newline} "display": "standalone",${newline} "background_color": "#fff",${newline} "description": "Eine einfach lesbare Hacker News App.",${newline} "icons": [${newline}  {${newline}   "src": "/homescreen48.png",${newline}   "sizes": "48x48",${newline}   "type": "image/png"${newline}  },${newline}  {${newline}   "src": "/homescreen72.png",${newline}   "sizes": "72x72",${newline}   "type": "image/png"${newline}  },${newline}  {${newline}   "src": "/homescreen96.png",${newline}   "sizes": "96x96",${newline}   "type": "image/png"${newline}  },${newline}  {${newline}   "src": "/homescreen144.png",${newline}   "sizes": "144x144",${newline}   "type": "image/png"${newline}  },${newline}  {${newline}   "src": "/homescreen168.png",${newline}   "sizes": "168x168",${newline}   "type": "image/png"${newline}  },${newline}  {${newline}   "src": "/homescreen192.png",${newline}   "sizes": "192x192",${newline}   "type": "image/png"${newline}  }${newline} ],${newline} "related_applications": [${newline}  {${newline}   "platform": "Web"${newline}  },${newline}  {${newline}   "platform": "play",${newline}   "url": "https://play.google.com/store/apps/details?id=cheeaun.hackerweb"${newline}  }${newline} ]${newline}}`,
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
