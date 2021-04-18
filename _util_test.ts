import { assertEquals, tests } from "./test_deps.ts";
import {
  addRelativePrefix,
  ensureExtension,
  isURL,
  removeExtension,
  removeRelativePrefix,
} from "./_util.ts";

tests({
  name: "_util",
  tests: () => [
    {
      name: "isURL",
      fn: () => {
        assertEquals(isURL("http://url.com"), true);
        assertEquals(isURL("http://url.com/path"), true);
        assertEquals(isURL("https://url.com"), true);
        assertEquals(isURL("https://url.com/path"), true);

        assertEquals(isURL("file://path"), true);
        assertEquals(isURL("."), false);
        assertEquals(isURL("./"), false);
        assertEquals(isURL("./relative/path"), false);
        assertEquals(isURL("/absolute/path"), false);
      },
    },

    {
      name: "addRelativePrefix",
      fn: () => {
        assertEquals(addRelativePrefix("a.ts"), "./a.ts");
        assertEquals(addRelativePrefix("./a.ts"), "./a.ts");
        assertEquals(removeRelativePrefix("http://url.com"), "http://url.com");
        assertEquals(
          removeRelativePrefix("https://url.com"),
          "https://url.com",
        );
        assertEquals(removeRelativePrefix("file://url.com"), "file://url.com");
      },
    },

    {
      name: "removeRelativePrefix",
      fn: () => {
        assertEquals(removeRelativePrefix("a.ts"), "a.ts");
        assertEquals(removeRelativePrefix("./a.ts"), "a.ts");
        assertEquals(removeRelativePrefix("http://url.com"), "http://url.com");
        assertEquals(
          removeRelativePrefix("https://url.com"),
          "https://url.com",
        );
        assertEquals(removeRelativePrefix("file://url.com"), "file://url.com");
      },
    },

    {
      name: "removeExtension",
      fn: () => {
        assertEquals(removeExtension("a.ts"), "a");
        assertEquals(removeExtension("./a.ts"), "./a");
        assertEquals(removeExtension("a.js"), "a");
        assertEquals(
          removeExtension("http://url.com/a.ts"),
          "http://url.com/a",
        );
        assertEquals(
          removeExtension("https://url.com/a.ts"),
          "https://url.com/a",
        );
        assertEquals(
          removeExtension("file://url.com/a.ts"),
          "file://url.com/a",
        );
      },
    },

    {
      name: "ensureExtension",
      fn: () => {
        assertEquals(ensureExtension("a.ts", ".ts"), "a.ts");
        assertEquals(ensureExtension("a", ".js"), "a.js");
        assertEquals(ensureExtension("a.ts", ".js"), "a.ts");
        assertEquals(ensureExtension("a", ".ts"), "a.ts");
        assertEquals(ensureExtension(".", ".ts"), ".");
        assertEquals(ensureExtension("./", ".ts"), "./");
        assertEquals(
          ensureExtension("http://url.com", ".ts"),
          "http://url.com",
        );
        assertEquals(
          ensureExtension("https://url.com", ".ts"),
          "https://url.com",
        );
        assertEquals(
          ensureExtension("file://url.com", ".ts"),
          "file://url.com",
        );
        assertEquals(
          ensureExtension("./relative/path", ".ts"),
          "./relative/path.ts",
        );
        assertEquals(
          ensureExtension("/absolute/path", ".ts"),
          "/absolute/path",
        );
      },
    },
  ],
});
