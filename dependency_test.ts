import { resolve } from "./dependency.ts";
import { assertEquals } from "./test_deps.ts";

Deno.test({
  name: "[typescript extract dependencies transfomer] resolve path",
  fn: async () => {
    const importMap = {
      imports: {
        "directory/": "my/path/",
      },
    };
    const path = "directory/parent.ts";
    const specifier = "./child.ts";
    const resolvedInput = resolve(path, specifier, importMap);
    assertEquals(resolvedInput, "my/path/child.ts");
  },
});

Deno.test({
  name: "[typescript extract dependencies transfomer] resolve url",
  fn: async () => {
    const importMap = {
      imports: {
        "directory/":
          "https://raw.githubusercontent.com/timreichen/Bundler/master/",
      },
    };
    const path = "directory/parent.ts";
    const specifier = "./child.ts";
    const resolvedInput = resolve(path, specifier, importMap);
    assertEquals(
      resolvedInput,
      "https://raw.githubusercontent.com/timreichen/Bundler/master/child.ts",
    );
  },
});
