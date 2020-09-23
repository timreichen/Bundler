import { TypeScriptLoader } from "./typescript.ts";
import { assertEquals } from "https://deno.land/std@0.70.0/testing/asserts.ts";

const typescriptLoader = new TypeScriptLoader();

Deno.test("imports", async () => {
  const input = "testdata/src/a.ts";
  const source = `
    import a from "./a.css"
    import * as b from "./b.css"
    const c = await import("./c.css")
  `;
  const { imports } = await typescriptLoader.fn(input, source);
  assertEquals(imports, {
    "testdata/src/a.css": { dynamic: false },
    "testdata/src/b.css": { dynamic: false },
    "testdata/src/c.css": { dynamic: true },
  });
});

Deno.test("exports", async () => {
  const input = "testdata/src/a.ts";
  const source = `
    export * as test from "./b.ts"
    export function test1() {}
    export const test2 = "test"
    export class test3 {}
    export {
      test1 as test4,
      test2 as test5
    }
  `;
  const { exports } = await typescriptLoader.fn(input, source);
  assertEquals(exports, {
    "test": { input: "testdata/src/b.ts" },
    "test1": { input: "testdata/src/a.ts" },
    "test2": { input: "testdata/src/a.ts" },
    "test3": { input: "testdata/src/a.ts" },
    "test4": { input: "testdata/src/a.ts" },
    "test5": { input: "testdata/src/a.ts" },
  });
});
