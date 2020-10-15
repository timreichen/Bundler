import { assertEquals } from "https://deno.land/std@0.74.0/testing/asserts.ts";

import { jsonLoader } from "./json.ts";

Deno.test("jsonLoader test", async () => {
  assertEquals(await jsonLoader().test("testdata/src/data.json"), true);
  assertEquals(await jsonLoader().test("testdata/src/a.ts"), false);
});


Deno.test("jsonLoader fn", async () => {
  const input = "testdata/src/data.json";
  const source = JSON.stringify({ foo: "bar" })
  const { imports, exports } = await jsonLoader().fn(input, source);
  assertEquals(imports, {});
  assertEquals(exports, {});
});
