import { DependencyFormat, DependencyType, Source } from "./_util.ts";
export class CacheMap<T> {
  #cache: Map<string, T>;

  constructor(cache: Map<string, T> = new Map()) {
    this.#cache = cache;
  }

  #createKey(
    input: string,
    type: DependencyType,
    format: DependencyFormat,
  ) {
    return `${format} ${type} ${input}`;
  }

  has(input: string, type: DependencyType, format: DependencyFormat) {
    const key = this.#createKey(input, type, format);
    return this.#cache.has(key);
  }
  get(input: string, type: DependencyType, format: DependencyFormat) {
    const key = this.#createKey(input, type, format);
    return this.#cache.get(key);
  }
  set(
    input: string,
    type: DependencyType,
    format: DependencyFormat,
    source: Source,
  ) {
    const key = this.#createKey(input, type, format);
    return this.#cache.set(key, source);
  }
  delete(input: string, type: DependencyType, format: DependencyFormat) {
    const key = this.#createKey(input, type, format);
    return this.#cache.delete(key);
  }
  keys() {
    return this.#cache.keys();
  }
  values() {
    return this.#cache.values();
  }
  entries() {
    return this.#cache.entries();
  }
}
