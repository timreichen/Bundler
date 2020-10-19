import {
  assertEquals,
} from "../../test_deps.ts";
import { jsonLoader } from "./json.ts";

Deno.test("loader json test", async () => {
  assertEquals(await jsonLoader().test("testdata/src/data.json"), true);
  assertEquals(await jsonLoader().test("testdata/src/a.ts"), false);
});

Deno.test("loader json fn", async () => {
  const input = "testdata/src/data.json";
  const source = JSON.stringify({ foo: "bar" });
  const { imports, exports } = await jsonLoader().fn(input, source);
  assertEquals(imports, {});
  assertEquals(exports, {});
});
