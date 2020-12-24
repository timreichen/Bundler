import { assertEquals } from "./test_deps.ts";
import { getDependencies, resolve } from "./dependency.ts";

Deno.test({
  name: "dependency resolve path",
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
  name: "dependency resolve url",
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

Deno.test({
  name: "dependency type import",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `import type { A } from "./b.ts";`;
    const { imports, exports } = getDependencies(
      fileName,
      sourceText,
    );
    assertEquals(imports, {});
    assertEquals(exports, {});
  },
});

Deno.test({
  name: "dependency namespace import",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `import * as A from "./b.ts";`;
    const { imports, exports } = getDependencies(
      fileName,
      sourceText,
    );
    assertEquals(imports, {
      "./b.ts": {
        specifiers: ["*"],
      },
    });
    assertEquals(exports, {});
  },
});

Deno.test({
  name: "dependency named import",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `import { A, B } from "./b.ts";`;
    const { imports, exports } = getDependencies(
      fileName,
      sourceText,
    );
    assertEquals(imports, {
      "./b.ts": {
        specifiers: ["A", "B"],
      },
    });
    assertEquals(exports, {});
  },
});

Deno.test({
  name: "dependency default import",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `import A from "./b.ts";`;
    const { imports, exports } = getDependencies(
      fileName,
      sourceText,
    );
    assertEquals(imports, {
      "./b.ts": {
        specifiers: ["default"],
      },
    });
    assertEquals(exports, {});
  },
});

Deno.test({
  name: "dependency module specifier import",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `import "./b.ts";`;
    const { imports, exports } = getDependencies(
      fileName,
      sourceText,
    );
    assertEquals(imports, {
      "./b.ts": {
        specifiers: [],
      },
    });
    assertEquals(exports, {});
  },
});

Deno.test({
  name: "dependency dynamic import",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `import("./b.ts");`;
    const { imports, exports } = getDependencies(
      fileName,
      sourceText,
    );
    assertEquals(imports, {
      "./b.ts": {
        dynamic: true,
      },
    });
    assertEquals(exports, {});
  },
});

Deno.test({
  name: "dependency dynamic import warn",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `import("./" + "b.ts");`;
    const { imports, exports } = getDependencies(
      fileName,
      sourceText,
    );
    assertEquals(imports, {});
    assertEquals(exports, {});
  },
});

Deno.test({
  name: "dependency type export",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `export type { A } from "./b.ts";`;
    const { imports, exports } = getDependencies(
      fileName,
      sourceText,
    );
    assertEquals(imports, {});
    assertEquals(exports, {});
  },
});

Deno.test({
  name: "dependency export interface",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `export interface A { };`;
    const { imports, exports } = getDependencies(
      fileName,
      sourceText,
    );
    assertEquals(imports, {});
    assertEquals(exports, {});
  },
});

Deno.test({
  name: "dependency namespace export",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `export * from "./b.ts";`;
    const { imports, exports } = getDependencies(
      fileName,
      sourceText,
    );
    assertEquals(imports, {});
    assertEquals(exports, {
      "./b.ts": { specifiers: ["*"] },
    });
  },
});

Deno.test({
  name: "dependency namespace alias export",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `export * as b from "./b.ts";`;
    const { imports, exports } = getDependencies(
      fileName,
      sourceText,
    );
    assertEquals(imports, {});
    assertEquals(exports, {
      "./b.ts": { specifiers: ["b"] },
    });
  },
});

Deno.test({
  name: "dependency forward named export",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `export { a, b } from "./b.ts"`;
    const { imports, exports } = getDependencies(
      fileName,
      sourceText,
    );
    assertEquals(imports, {});
    assertEquals(exports, {
      "./b.ts": { specifiers: ["a", "b"] },
    });
  },
});

Deno.test({
  name: "dependency named export",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `const a = "abc"; const b = "bcd"; export { a, b };`;
    const { imports, exports } = getDependencies(
      fileName,
      sourceText,
    );
    assertEquals(imports, {});
    assertEquals(exports, {
      ".": { specifiers: ["a", "b"] },
    });
  },
});

Deno.test({
  name: "dependency variable export",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `export const a = "abc";`;
    const { imports, exports } = getDependencies(
      fileName,
      sourceText,
    );
    assertEquals(imports, {});
    assertEquals(exports, {
      ".": { specifiers: ["a"] },
    });
  },
});

Deno.test({
  name: "dependency class export",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `export class A {}`;
    const { imports, exports } = getDependencies(
      fileName,
      sourceText,
    );
    assertEquals(imports, {});
    assertEquals(exports, {
      ".": { specifiers: ["A"] },
    });
  },
});

Deno.test({
  name: "dependency function export",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `export function a() {};`;
    const { imports, exports } = getDependencies(
      fileName,
      sourceText,
    );
    assertEquals(imports, {});
    assertEquals(exports, {
      ".": { specifiers: ["a"] },
    });
  },
});

Deno.test({
  name: "dependency default assignment export",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `export default "abc";`;
    const { imports, exports } = getDependencies(
      fileName,
      sourceText,
    );
    assertEquals(imports, {});
    assertEquals(exports, {
      ".": { specifiers: ["default"] },
    });
  },
});

Deno.test({
  name: "dependency default function export",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `export default function x() {};`;
    const { imports, exports } = getDependencies(
      fileName,
      sourceText,
    );
    assertEquals(imports, {});
    assertEquals(exports, {
      ".": { specifiers: ["default"] },
    });
  },
});

Deno.test({
  name: "dependency default class export",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `export default class X{};`;
    const { imports, exports } = getDependencies(
      fileName,
      sourceText,
    );
    assertEquals(imports, {});
    assertEquals(exports, {
      ".": { specifiers: ["default"] },
    });
  },
});
