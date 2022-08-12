import { path } from "../deps.ts";
import { cache, resolve } from "./cache.ts";

import { assertEquals, assertRejects } from "../test_deps.ts";

Deno.test({
  name: "cache",
  async fn(t) {
    await t.step({
      name: "resolve",
      fn() {
        const input = "https://deno.land/std/path/mod.ts";
        assertEquals(
          path.basename(resolve(input)),
          "72ee5916977ca9d8801c801f642353d811373786e51e3d7574cca966634b4f97",
        );
      },
    });
    await t.step({
      name: "cache file",
      async fn() {
        const input = "https://deno.land/std/path/mod.ts";
        const cachePath = resolve(input);
        let exists = true;
        try {
          Deno.removeSync(cachePath);
        } catch {
          exists = false;
          //
        }
        await cache(input);

        assertEquals(Deno.lstatSync(cachePath).isFile, true);

        if (!exists) {
          Deno.removeSync(cachePath);
        }
      },
    });
    await t.step({
      name: "cache failed",
      async fn() {
        await assertRejects(async () => {
          const input = "http://httpstat.us/404";
          await cache(input);
          const cachePath = resolve(input);
          Deno.lstatSync(cachePath);
        });
      },
    });
  },
});
