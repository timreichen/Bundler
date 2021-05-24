import { posthtml } from "../../../deps.ts";
import { assertStringIncludes, tests } from "../../../test_deps.ts";
import { posthtmlInjectBase } from "./inject_base.ts";

tests({
  name: "posthtml plugin → inject base",
  tests: () => [
    {
      name: "add",
      async fn() {
        const plugin = posthtmlInjectBase("/");
        const processor = posthtml([plugin]);

        const source = `<html><head></head><body></body></html>`;
        const { html } = await processor.process(source);

        assertStringIncludes(
          html,
          `<html><head><base href="/"></head><body></body></html>`,
        );
      },
    },
    {
      name: "replace",
      async fn() {
        const plugin = posthtmlInjectBase("/");
        const processor = posthtml([plugin]);

        const source =
          `<html><head><base href="custom/"></head><body></body></html>`;
        const { html } = await processor.process(source);

        assertStringIncludes(
          html,
          `<html><head><base href="/"></head><body></body></html>`,
        );
      },
    },
  ],
});
