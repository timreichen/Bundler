import { assertEquals, assertThrowsAsync } from "./test_deps.ts";
import { cache, resolve } from "./cache.ts";

import * as path from "https://deno.land/std@0.74.0/path/mod.ts";
import * as fs from "https://deno.land/std@0.74.0/fs/mod.ts";

Deno.test("cache resolve", async () => {
  const input = "https://deno.land/std@0.70.0/path/mod.ts";
  assertEquals(
    path.basename(resolve(input)),
    "19b929fe073c70f585b972cd5ad329ef4ffc4c961a57078c1dbd484c40959364",
  );
});

Deno.test("cache cache", async () => {
  const input = "https://deno.land/std@0.70.0/path/mod.ts";
  const cachePath = resolve(input);
  const exists = fs.existsSync(cachePath);
  if (exists) {
    Deno.removeSync(cachePath);
  }
  await cache(input);

  assertEquals(fs.existsSync(cachePath), true);
  if (!exists) {
    Deno.removeSync(cachePath);
  }
});

Deno.test("cache cache failed", async () => {
  const input = "https://deno.land/x/bundler/file_does_not_exist.ts";
  await assertThrowsAsync(async () => {
    await cache(input);
  }, Error);
});
