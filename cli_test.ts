import { parsePaths } from "./_util.ts";
import { path } from "./deps.ts";
import { assertEquals } from "./test_deps.ts";

const root = "dist";
Deno.test({
  name: "outputMap",
  async fn(t) {
    await t.step({
      name: "relative input",
      fn() {
        const relativeInput = "src/index.html";
        const input =
          path.toFileUrl(path.resolve(Deno.cwd(), relativeInput)).href;
        const args = [`${relativeInput}`];
        assertEquals(parsePaths(args, root), {
          inputs: [input],
          outputMap: {},
        });
      },
    });

    await t.step({
      name: "filepath input",
      fn() {
        const relativeInput = "src/index.html";
        const input =
          path.toFileUrl(path.resolve(Deno.cwd(), relativeInput)).href;
        const args = [`${relativeInput}`];

        assertEquals(parsePaths(args, root), {
          inputs: [input],
          outputMap: {},
        });
      },
    });

    await t.step({
      name: "url input",
      fn() {
        const input = "https://deno.land/std/path/mod.ts";
        const args = [`${input}`];

        assertEquals(parsePaths(args, root), {
          inputs: [input],
          outputMap: {},
        });
      },
    });

    await t.step({
      name: "relative input and relative output",
      fn() {
        const relativeInput = "src/index.html";
        const relativeOutput = "index.html";
        const input =
          path.toFileUrl(path.resolve(Deno.cwd(), relativeInput)).href;
        const output =
          path.toFileUrl(path.resolve(Deno.cwd(), root, relativeOutput)).href;
        const args = [`${relativeInput}=${relativeOutput}`];

        assertEquals(parsePaths(args, root), {
          inputs: [input],
          outputMap: { [input]: output },
        });
      },
    });

    await t.step({
      name: "absolute input and absolute output",
      fn() {
        const relativeInput = "src/index.html";
        const relativeOutput = "index.html";
        const input =
          path.toFileUrl(path.resolve(Deno.cwd(), relativeInput)).href;
        const output =
          path.toFileUrl(path.resolve(Deno.cwd(), root, relativeOutput)).href;
        const args = [`${input}=${output}`];

        assertEquals(parsePaths(args, root), {
          inputs: [input],
          outputMap: { [input]: output },
        });
      },
    });

    await t.step({
      name: "multiple inputs and outputs",
      fn() {
        const relativeInput1 = "src/index.html";
        const relativeOutput1 = "index.html";
        const input1 =
          path.toFileUrl(path.resolve(Deno.cwd(), relativeInput1)).href;
        const output1 =
          path.toFileUrl(path.resolve(Deno.cwd(), root, relativeOutput1))
            .href;

        const relativeInput2 = "src/index.ts";
        const relativeOutput2 = "index.ts";
        const input2 =
          path.toFileUrl(path.resolve(Deno.cwd(), relativeInput2)).href;
        const output2 =
          path.toFileUrl(path.resolve(Deno.cwd(), root, relativeOutput2))
            .href;

        const args = [
          `${relativeInput1}=${output1}`,
          `${input2}=${relativeOutput2}`,
        ];

        assertEquals(parsePaths(args, root), {
          inputs: [input1, input2],
          outputMap: { [input1]: output1, [input2]: output2 },
        });
      },
    });
  },
});
