import { colors, fs, Sha256 } from "./deps.ts";
import { Logger } from "./logger.ts";
import { isURL, readFile } from "./_util.ts";

export class Watcher {
  logger: Logger;
  hashes: Record<string, string>;
  constructor({ logger }: { logger: Logger }) {
    this.logger = logger;
    this.hashes = {};
  }
  async watch(filePaths: string[]) {
    const set = filePaths.reduce((set, input) => {
      if (!isURL(input) && fs.existsSync(input)) set.add(input);
      return set;
    }, new Set() as Set<string>);
    const paths: string[] = [...set];

    for (const path of paths) {
      if (!this.hashes[path]) {
        this.hashes[path] = new Sha256().update(await readFile(path))
          .hex();
      }
    }

    const watcher = Deno.watchFs(paths);
    // only reload on first time when watched
    this.logger.info(
      colors.brightBlue(`Watcher`),
      `Process terminated! Restarting on file change...`,
    );

    loop:
    for await (const { kind, paths } of watcher) {
      // checks if actual file content changed
      if (kind === "modify") {
        for (const filePath of paths) {
          const hash = new Sha256().update(await readFile(filePath))
            .hex();
          if (this.hashes[filePath] !== hash) {
            this.hashes[filePath] = hash;
            break loop;
          }
        }
      } else {
        break loop;
      }
    }

    this.logger.info(
      colors.brightBlue(`Watcher`),
      `File change detected! Restarting!`,
    );
  }
}
