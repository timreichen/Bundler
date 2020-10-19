import { cssLoader } from "./css.ts";
import { assertEquals } from "https://deno.land/std@0.74.0/testing/asserts.ts";

Deno.test("loader css test", async () => {
  assertEquals(await cssLoader().test("testdata/src/styles.css"), true);
  assertEquals(await cssLoader().test("testdata/src/a.ts"), false);
});

Deno.test("loader css fn", async () => {
  const input = "testdata/src/a.ts";
  const source = `
    @import "a.css";
    @import url("b.css");
  `;
  const { imports } = await cssLoader().fn(input, source);
  assertEquals(imports, {
    "testdata/src/a.css": { specifiers: ["default"] },
    "testdata/src/b.css": { specifiers: ["default"] },
  });
});
