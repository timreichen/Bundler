import { createSystemExports } from "./system.ts";
import { assertEquals } from "../../test_deps.ts";

Deno.test({
  name: "createSystemExports",
  fn: async () => {
    const ExportStrings = createSystemExports(["a", "b"]);
    assertEquals(ExportStrings[0], `export const a = __exp["a"];`);
    assertEquals(ExportStrings[1], `export const b = __exp["b"];`);
  },
});
