import { Exports, Imports } from "./dependency.ts";

export interface Asset {
  input: string;
  output: string;
  filePath: string;
  imports: Imports;
  exports: Exports;
  type: string;
}

export type Graph = Record<string, Asset>;
