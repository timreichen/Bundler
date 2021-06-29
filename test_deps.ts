import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrowsAsync,
} from "https://deno.land/std@0.97.0/testing/asserts.ts";

export { assert, assertEquals, assertStringIncludes, assertThrowsAsync };
export { tests } from "https://deno.land/x/tests@0.1.0/mod.ts";

const trim = (value: string) => value.replace(/\s+/g, " ").trim();

export function assertEqualsIgnoreWhitespace(actual: string, expected: string) {
  return assertEquals(trim(actual), trim(expected));
}

export function assertStringIncludesIgnoreWhitespace(
  actual: string,
  expected: string,
) {
  return assertStringIncludes(trim(actual), trim(expected));
}
