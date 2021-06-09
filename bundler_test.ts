import { Bundler } from "./bundler.ts";
import { createDefaultPlugins } from "./defaults.ts";
import { assertEquals, assertThrowsAsync, tests } from "./test_deps.ts";

tests({
  name: "bundler",
  tests: () => [
    {
      name: "circular dependency",
      fn: async () => {
        const bundler = new Bundler(createDefaultPlugins());
        bundler.logger.quiet = true;
        await assertThrowsAsync(async () => {
          await bundler.bundle([
            "testdata/a.ts",
          ]);
        });
      },
    },
  ],
});
