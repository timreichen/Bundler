import { assertEquals } from "https://deno.land/std@0.74.0/testing/asserts.ts";

import { json } from "./json.ts";

Deno.test("transformer json test", async () => {
  assertEquals(await json().test("testdata/src/data.json"), true);
  assertEquals(await json().test("testdata/src/a.ts"), false);
});

Deno.test("transformer json fn", async () => {
  const input = "testdata/src/data.json";
  const source = JSON.stringify({ foo: "bar" });
  const output = await json().fn(
    input,
    source,
    {
      graph: {
        [input]: { path: input, output: "x.ts", imports: {}, exports: {} },
      },
      fileMap: {},
      importMap: {},
      depsDir: "deps",
      outDir: "dist",
    },
  );
  assertEquals(output, `export default {"foo":"bar"};`);
});

Deno.test("transformer json optimize", async () => {
  const input = "testdata/src/data.json";
  const source = `{
    "foo": "bar"
  }`;
  const output = await json({ optimize: true }).fn(
    input,
    source,
    {
      graph: {
        [input]: { path: input, output: "x.ts", imports: {}, exports: {} },
      },
      fileMap: {},
      importMap: {},
      depsDir: "deps",
      outDir: "dist",
    },
  );
  assertEquals(output, `export default {"foo":"bar"};`);
});
