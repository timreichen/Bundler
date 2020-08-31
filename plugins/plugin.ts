export type Include = (path: string) => boolean;
export type Exclude = (path: string) => boolean;
export type Transform = (path: string, source: string) => Promise<string>;

export enum PluginType {
  transformer,
  optimizer,
}

export class Plugin {
  type: PluginType;
  name: string;
  include: Include | undefined;
  exclude: Exclude | undefined;
  transform: Transform;
  constructor({ type, name, include, exclude, transform }: {
    type: PluginType;
    name: string;
    include?: Include;
    exclude?: Exclude;
    transform: Transform;
  }) {
    this.type = type;
    this.name = name;
    this.include = include;
    this.exclude = exclude;
    this.transform = transform;
  }
  async run(source: string, path: string) {
    if (this.include && !this.include(path)) return source;
    if (this.exclude && this.exclude(path)) return source;
    return await this.transform(source, path);
  }
}
