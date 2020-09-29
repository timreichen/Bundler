import { cssLoader } from "./css.ts";
import { assertEquals } from "https://deno.land/std@0.70.0/testing/asserts.ts";

Deno.test("cssLoader imports", async () => {
  const input = "testdata/src/a.ts";
  const source = `
    @import "a.css";
    @import url("b.css");
  `;
  const { imports } = await cssLoader().fn(input, source);
  assertEquals(imports, {
    "testdata/src/a.css": { dynamic: false },
    "testdata/src/b.css": { dynamic: false },
  });
});
