import { assertEquals } from "../../test_deps.ts";

import { terser } from "./terser.ts";

Deno.test("transformer terser test", async () => {
  assertEquals(await terser().test("testdata/src/a.ts"), true);
  assertEquals(await terser().test("testdata/src/a.js"), true);
  assertEquals(await terser().test("testdata/src/a.css"), false);
  assertEquals(await terser().test("testdata/src/a.png"), false);
});

Deno.test("transformer terser fn", async () => {
  const input = "testdata/src/a.ts";
  const source = `import * from "./b.ts"`;
  const output = await terser().fn(
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
  assertEquals(output, `import*from"./b.ts";`);
});
