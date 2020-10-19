import { assertEquals } from "https://deno.land/std@0.74.0/testing/asserts.ts";
import postcssPresetEnv from "https://jspm.dev/postcss-preset-env";

import { css } from "./css.ts";

const postCSSPlugins = [
  (postcssPresetEnv as Function)({
    stage: 2,
    features: {
      "nesting-rules": true,
    },
  }),
];
Deno.test("transformer css test", async () => {
  assertEquals(await css().test("testdata/src/a.css"), true);
  assertEquals(await css().test("testdata/src/a.ts"), false);
  assertEquals(await css().test("testdata/src/a.js"), false);
  assertEquals(await css().test("testdata/src/a.png"), false);
});


Deno.test("transformer css fn", async () => {
  const input = "testdata/src/a.css";
  const source = `article { & > p { color: red; } }`
  const output = await css({
    use: postCSSPlugins
  }).fn(input, source, { graph: { [input]: { path: input, output: "x.ts", imports: {}, exports: {} } } , fileMap: {}, importMap: {}, depsDir: "deps", outDir: "dist"});

  assertEquals(output, `\nexport default \`article>p{${String.fromCharCode(160)}color:red}\`;`);
});
