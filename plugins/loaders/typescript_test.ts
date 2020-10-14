import { typescriptLoader } from "./typescript.ts";
import { assertEquals } from "https://deno.land/std@0.74.0/testing/asserts.ts";

Deno.test({
  name: "typescriptLoader imports",
  fn: async () => {
    const input = "testdata/src/a.ts";
    const source = `
    import a from "./a.css"
    import * as b from "./b.css"
  `;
    const { imports } = await typescriptLoader().fn(input, source);
    assertEquals(imports, {
      "testdata/src/a.css": {},
      "testdata/src/b.css": {},
    });
  },
});

Deno.test({
  name: "typescriptLoader dynamic imports",
  fn: async () => {
    const input = "testdata/src/a.ts";
    const source = `
    const c = await import("./c.css")

    const imports = {
      en: () => import("./localisation/en.ts"),
      de: () => import("./localisation/de.ts"),
    }
  `;
    const { imports } = await typescriptLoader().fn(input, source);
    assertEquals(imports, {
      "testdata/src/c.css": { dynamic: true },
      "testdata/src/localisation/en.ts": { dynamic: true },
      "testdata/src/localisation/de.ts": { dynamic: true },
    });
  },
});

Deno.test({
  name: "typescriptLoader exports",
  fn: async () => {
    const input = "testdata/src/a.ts";
    const source = `
  export * from "./b.ts"
  export * as test from "./b.ts"
  export function test1() {}
    export const test2 = "test"
    export class test3 {}
    export {
      test1 as test4,
      test2 as test5
    }
    const test6 = "a"
    export { test6 }
  `;
    const { exports } = await typescriptLoader().fn(input, source);
    assertEquals(exports, {
      "testdata/src/b.ts": {
        specifiers: [
          "*",
          "test",
        ],
      },
      "testdata/src/a.ts": {
        specifiers: [
          "test1",
          "test2",
          "test3",
          "test4",
          "test5",
          "test6",
        ],
      },
    });
  },
});
