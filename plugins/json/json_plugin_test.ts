import { assertEquals } from "../../test_deps.ts";
import { Bundler } from "../../bundler.ts";
import { JSONPlugin } from "./json_plugin.ts";
import { path } from "../../deps.ts";
import { Asset, DependencyFormat, DependencyType } from "../plugin.ts";

const plugin = new JSONPlugin();
const bundler = new Bundler({ plugins: [plugin], quiet: true });

const moduleDir = path.dirname(path.fromFileUrl(import.meta.url));
const testdataDir = path.resolve(moduleDir, "../../testdata");

Deno.test({
  name: "test",
  fn() {
    assertEquals(
      plugin.test(
        "file.json",
        DependencyType.ImportExport,
        DependencyFormat.Unknown,
      ),
      true,
    );
    assertEquals(
      plugin.test(
        "file.jsonc",
        DependencyType.ImportExport,
        DependencyFormat.Unknown,
      ),
      false,
    );
    assertEquals(
      plugin.test(
        "file.json",
        DependencyType.WebManifest,
        DependencyFormat.Unknown,
      ),
      false,
    );
    assertEquals(
      plugin.test(
        "file.json",
        DependencyType.WebManifest,
        DependencyFormat.Json,
      ),
      false,
    );
    assertEquals(
      plugin.test("file.jsonc", DependencyType.Fetch, DependencyFormat.Json),
      true,
    );
  },
});

Deno.test({
  name: "createAsset",
  async fn() {
    const a = path.toFileUrl(path.join(testdataDir, "/json/a.json")).href;
    const asset = await bundler.createAsset(a, DependencyType.ImportExport);
    assertEquals(asset, {
      input: a,
      type: DependencyType.ImportExport,
      format: DependencyFormat.Json,
      dependencies: [],
    });
  },
});

Deno.test({
  name: "createChunk",
  async fn() {
    const a = path.toFileUrl(path.join(testdataDir, "/json/a.json")).href;
    const asset = await bundler.createAsset(a, DependencyType.ImportExport);
    const chunkAssets: Set<Asset> = new Set();
    const chunk = await bundler.createChunk(asset, chunkAssets, undefined, {
      root: "dist",
    });
    assertEquals(chunk, {
      dependencyItems: [],
      item: {
        input: a,
        type: DependencyType.ImportExport,
        format: DependencyFormat.Json,
      },
      output: await plugin.createOutput(a, "dist", ".json"),
    });
  },
});

Deno.test({
  name: "createBundle",
  async fn(t) {
    await t.step("bundle", async () => {
      const root = "dist";

      const a = path.toFileUrl(path.join(testdataDir, "/json/a.json")).href;
      const asset = await bundler.createAsset(a, DependencyType.ImportExport);
      const chunkAssets: Set<Asset> = new Set();
      const chunk = await bundler.createChunk(asset, chunkAssets, undefined, {
        root,
      });
      const { input, type, format } = chunk.item;
      const json = await bundler.createSource(input, type, format);
      const bundle = await bundler.createBundle(chunk, json, undefined, {
        root,
      });
      assertEquals(bundle, {
        source: `{\n "foo": "bar"\n}`,
        output: await plugin.createOutput(a, root, ".json"),
      });
    });

    await t.step("optimize", async () => {
      const root = "dist";

      const a = path.toFileUrl(path.join(testdataDir, "/json/a.json")).href;

      const asset = await bundler.createAsset(a, DependencyType.ImportExport);
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
        output: await plugin.createOutput(a, "dist", ".json"),
      });
    });
  },
});
