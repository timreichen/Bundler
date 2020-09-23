import type { Imports, Exports } from "../graph.ts";
import type { ImportMap } from "../deps.ts";

interface LoaderResult {
  path?: string;
  output?: string;
  imports?: Imports;
  exports?: Exports;
}

export type LoaderTest = (path: string) => boolean;
export type LoaderFunction = (
  input: string,
  source: string,
  { importMap }: { importMap?: ImportMap },
) => Promise<LoaderResult>;

export class Loader {
  test: LoaderTest;
  fn: LoaderFunction;
  constructor({ test, fn }: {
    test: LoaderTest;
    fn: LoaderFunction;
  }) {
    this.test = test;
    this.fn = fn;
  }
}
