import { assertEquals } from "./test_deps.ts";
import { getImportExports } from "./_import_export.ts";

Deno.test({
  name: "type import",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `import type { A } from "./b.ts";`;
    const { imports, exports } = getImportExports(fileName, sourceText);
    assertEquals(imports, {});
    assertEquals(exports, {});
  },
});

Deno.test({
  name: "namespace import",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `import * as A from "./b.ts";`;
    const { imports, exports } = getImportExports(fileName, sourceText);
    assertEquals(imports, {
      "foo/b.ts": {
        specifiers: ["*"],
      },
    });
    assertEquals(exports, {});
  },
});

Deno.test({
  name: "named import",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `import { A, B } from "./b.ts";`;
    const { imports, exports } = getImportExports(fileName, sourceText);
    assertEquals(imports, {
      "foo/b.ts": {
        specifiers: ["A", "B"],
      },
    });
    assertEquals(exports, {});
  },
});

Deno.test({
  name: "default import",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `import A from "./b.ts";`;
    const { imports, exports } = getImportExports(fileName, sourceText);
    assertEquals(imports, {
      "foo/b.ts": {
        specifiers: ["default"],
      },
    });
    assertEquals(exports, {});
  },
});

Deno.test({
  name: "module specifier import",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `import "./b.ts";`;
    const { imports, exports } = getImportExports(fileName, sourceText);
    assertEquals(imports, {
      "foo/b.ts": {
        specifiers: [],
      },
    });
    assertEquals(exports, {});
  },
});

Deno.test({
  name: "dynamic import",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `import("./b.ts");`;
    const { imports, exports } = getImportExports(fileName, sourceText);
    assertEquals(imports, {
      "foo/b.ts": {
        dynamic: true,
      },
    });
    assertEquals(exports, {});
  },
});

Deno.test({
  name: "dynamic import warn",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `import("./" + "b.ts");`;
    const { imports, exports } = getImportExports(fileName, sourceText);
    assertEquals(imports, {});
    assertEquals(exports, {});
  },
});

Deno.test({
  name: "type export",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `export type { A } from "./b.ts";`;
    const { imports, exports } = getImportExports(fileName, sourceText);
    assertEquals(imports, {});
    assertEquals(exports, {});
  },
});

Deno.test({
  name: "export interface",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `export interface A { };`;
    const { imports, exports } = getImportExports(fileName, sourceText);
    assertEquals(imports, {});
    assertEquals(exports, {});
  },
});

Deno.test({
  name: "namespace export",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `export * from "./b.ts";`;
    const { imports, exports } = getImportExports(fileName, sourceText);
    assertEquals(imports, {});
    assertEquals(exports, {
      "foo/b.ts": { specifiers: ["*"] },
    });
  },
});

Deno.test({
  name: "namespace alias export",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `export * as b from "./b.ts";`;
    const { imports, exports } = getImportExports(fileName, sourceText);
    assertEquals(imports, {});
    assertEquals(exports, {
      "foo/b.ts": { specifiers: ["b"] },
    });
  },
});

Deno.test({
  name: "forward named export",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `export { a, b } from "./b.ts"`;
    const { imports, exports } = getImportExports(fileName, sourceText);
    assertEquals(imports, {});
    assertEquals(exports, {
      "foo/b.ts": { specifiers: ["a", "b"] },
    });
  },
});

Deno.test({
  name: "named export",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `const a = "abc"; const b = "bcd"; export { a, b };`;
    const { imports, exports } = getImportExports(fileName, sourceText);
    assertEquals(imports, {});
    assertEquals(exports, {
      "foo/a.ts": { specifiers: ["a", "b"] },
    });
  },
});

Deno.test({
  name: "variable export",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `export const a = "abc";`;
    const { imports, exports } = getImportExports(fileName, sourceText);
    assertEquals(imports, {});
    assertEquals(exports, {
      "foo/a.ts": { specifiers: ["a"] },
    });
  },
});

Deno.test({
  name: "class export",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `export class A {}`;
    const { imports, exports } = getImportExports(fileName, sourceText);
    assertEquals(imports, {});
    assertEquals(exports, {
      "foo/a.ts": { specifiers: ["A"] },
    });
  },
});

Deno.test({
  name: "function export",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `export function a() {};`;
    const { imports, exports } = getImportExports(fileName, sourceText);
    assertEquals(imports, {});
    assertEquals(exports, {
      "foo/a.ts": { specifiers: ["a"] },
    });
  },
});

Deno.test({
  name: "default assignment export",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `export default "abc";`;
    const { imports, exports } = getImportExports(fileName, sourceText);
    assertEquals(imports, {});
    assertEquals(exports, {
      "foo/a.ts": { specifiers: ["default"] },
    });
  },
});

Deno.test({
  name: "default function export",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `export default function x() {};`;
    const { imports, exports } = getImportExports(fileName, sourceText);
    assertEquals(imports, {});
    assertEquals(exports, {
      "foo/a.ts": { specifiers: ["default"] },
    });
  },
});

Deno.test({
  name: "default class export",
  fn() {
    const fileName = "foo/a.ts";
    const sourceText = `export default class X{};`;
    const { imports, exports } = getImportExports(fileName, sourceText);
    assertEquals(imports, {});
    assertEquals(exports, {
      "foo/a.ts": { specifiers: ["default"] },
    });
  },
});
