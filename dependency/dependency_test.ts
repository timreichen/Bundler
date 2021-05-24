import { resolve } from "./dependency.ts";
import { assertEquals, tests } from "../test_deps.ts";

tests({
  name: "dependency",
  tests: () => [
    {
      name: "resolve path",
      fn: () => {
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
    },

    {
      name: "resolve url",
      fn: () => {
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
    },
  ],
});
