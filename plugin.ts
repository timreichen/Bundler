export type Include = (path: string) => boolean;
export type Exclude = (path: string) => boolean;
export type Transform = (path: string, source: string) => Promise<string>;

export type Plugin = (path: string, source: string) => Promise<string>;

export function plugin({ name, include, exclude, transform }: {
  name: string;
  include?: Include;
  exclude?: Exclude;
  transform: Transform;
}): Plugin {
  return async (path: string, source: string) => {
    if (include && !include(path)) return source;
    if (exclude && exclude(path)) return source;
    return await transform(source, path);
  };
}
