import type { ImportMap } from "../../deps.ts"
import type { Imports } from "../../graph.ts"
import { Loader, LoaderTest } from "../loader.ts"
import { encode } from "https://deno.land/std@0.74.0/encoding/base64.ts"

export function imageLoader(
  { test = (input: string) => /\.(png|svg)$/.test(input) }: {
    test?: LoaderTest
  } = {},
) {

  return new Loader({
    test,
    fn: async (
      input: string,
      source: string,
    ) => {
      const s = await Deno.readFile(input)
      const a = [...s]
      await Deno.writeTextFile("a.json", JSON.stringify(a))
      
      // let imageData = new ImageData(s, 200);

      return {
        imports: {},
        exports: {},
      }
    },
  })
}
