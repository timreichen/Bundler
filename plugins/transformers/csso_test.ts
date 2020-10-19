import { assertEquals } from "https://deno.land/std@0.74.0/testing/asserts.ts";

import { csso } from "./csso.ts";

Deno.test("transformer csso test", async () => {
  assertEquals(await csso().test("testdata/src/a.css"), true);
  assertEquals(await csso().test("testdata/src/a.ts"), false);
  assertEquals(await csso().test("testdata/src/a.js"), false);
  assertEquals(await csso().test("testdata/src/a.png"), false);
});


Deno.test("transformer csso fn", async () => {
  const input = "testdata/src/a.css";
  const source = `article > p { color: yellow; }`
  const output = await csso().fn(input, source, { graph: { [input]: { path: input, output: "x.ts", imports: {}, exports: {} } } , fileMap: {}, importMap: {}, depsDir: "deps", outDir: "dist"});

  assertEquals(output, `article>p{color:#ff0}`);
});
