import { DependencyFormat, DependencyType, Source } from "./_util.ts";

export class SourceMap {
  #sourceMap: Map<string, Source>;

  constructor(sourceMap: Map<string, Source> = new Map()) {
    this.#sourceMap = sourceMap;
  }

  #createSourceKey(
    input: string,
    type: DependencyType,
    format: DependencyFormat,
  ) {
    return `${format} ${type} ${input}`;
  }

  has(input: string, type: DependencyType, format: DependencyFormat) {
    const key = this.#createSourceKey(input, type, format);
    return this.#sourceMap.has(key);
  }
  get(input: string, type: DependencyType, format: DependencyFormat) {
    const key = this.#createSourceKey(input, type, format);
    return this.#sourceMap.get(key);
  }
  set(
    input: string,
    type: DependencyType,
    format: DependencyFormat,
    source: Source,
  ) {
    const key = this.#createSourceKey(input, type, format);
    return this.#sourceMap.set(key, source);
  }
  delete(input: string, type: DependencyType, format: DependencyFormat) {
    const key = this.#createSourceKey(input, type, format);
    return this.#sourceMap.delete(key);
  }
}
