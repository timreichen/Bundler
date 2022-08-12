import { fs, path } from "./deps.ts";
import { assertArrayIncludes, assertEquals } from "./test_deps.ts";

const moduleDir = path.dirname(path.fromFileUrl(import.meta.url));
const testdataDir = path.resolve(moduleDir, "testdata");
const testDir = path.join(testdataDir, ".cli_test");

function runBundle(...cmds: string[]) {
  fs.ensureDirSync(testDir);
  const process = Deno.run({
    cwd: testDir,
    cmd: [
      "deno",
      "run",
      "--allow-env",
      "--allow-read",
      "--allow-write",
      path.join(Deno.cwd(), "cli.ts"),
      "bundle",
      "--quiet",
      ...cmds,
    ],
    stdout: "piped",
    stderr: "piped",
  });
  return process;
}

Deno.test({
  name: "empty",
  async fn() {
    const process = runBundle();

    const [_, stdout, stderr] = await Promise.all([
      process.status(),
      process.output(),
      process.stderrOutput(),
    ]);

    process.close();

    assertEquals(
      new TextDecoder().decode(stdout),
      ``,
    );
    assertEquals(
      new TextDecoder().decode(stderr),
      ``,
    );
  },
});

Deno.test({
  name: "custom output",
  async fn() {
    fs.emptyDirSync(testDir);

    const projectDir = path.resolve(
      testdataDir,
      path.join("cli", "hello_world"),
    );

    const indexHtmlFilePath = path.join(projectDir, "index.html");
    const indexTypescriptFilePath = path.join(
      projectDir,
      "index.ts",
    );

    const process = runBundle(
      `${indexHtmlFilePath}=index.html`,
      `${indexTypescriptFilePath}=index.js`,
    );

    await Promise.all([
      process.status(),
      process.output(),
      process.stderrOutput(),
    ]);
    process.close();

    const distDir = path.join(testDir, "dist");

    const entries = [...Deno.readDirSync(distDir)]
      .map((entry) => entry.name);

    assertEquals(
      entries,
      [
        "index.html",
        "index.js",
      ],
    );

    Deno.removeSync(testDir, { recursive: true });
  },
});

Deno.test({
  name: "custom output split",
  async fn() {
    fs.emptyDirSync(testDir);

    const projectDir = path.resolve(
      testdataDir,
      path.join("cli", "hello_world"),
    );

    const indexHtmlFilePath = path.join(projectDir, "index.html");
    const worldTypescriptFilePath = path.join(
      projectDir,
      "world.ts",
    );

    const process = runBundle(
      `${indexHtmlFilePath}=index.html`,
      `${worldTypescriptFilePath}=world.js`,
    );

    await Promise.all([
      process.status(),
      process.output(),
      process.stderrOutput(),
    ]);
    process.close();

    const distDir = path.join(testDir, "dist");

    const entries = [...Deno.readDirSync(distDir)]
      .map((entry) => entry.name);

    assertArrayIncludes(
      entries,
      [
        "index.html",
        "world.js",
      ],
    );
    assertEquals(entries.length, 3);

    Deno.removeSync(testDir, { recursive: true });
  },
});

Deno.test({
  name: "watch",
  async fn() {
    // wait instead of using Deno.watchFs (issue https://github.com/denoland/deno/issues/14684)

    fs.emptyDirSync(testDir);

    const indexTypescriptFilePath = path.join(
      testDir,
      "index.ts",
    );

    const indexJavascriptFilePath = path.join(
      testDir,
      "index.js",
    );

    Deno.writeTextFileSync(
      indexTypescriptFilePath,
      `console.info("initial");`,
    );

    const process = runBundle(
      "--watch",
      `--out-dir=${testDir}`,
      `${indexTypescriptFilePath}=index.js`,
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    Deno.writeTextFileSync(
      indexTypescriptFilePath,
      `console.info("overwrite");`,
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    assertEquals(
      await Deno.readTextFile(indexJavascriptFilePath),
      `console.info("overwrite");\n`,
    );

    await process.stdout?.close();
    await process.stderr?.close();
    await process.close();

    Deno.removeSync(testDir, { recursive: true });
  },
});

Deno.test({
  name: "importmap",
  async fn() {
    fs.emptyDirSync(testDir);

    const projectDir = path.resolve(
      testdataDir,
      path.join("cli", "importmap"),
    );

    const indexTypescriptFilePath = path.join(
      projectDir,
      "index.ts",
    );
    const importMapFilePath = path.join(
      projectDir,
      "import_map.json",
    );

    const process = runBundle(
      `--import-map=${importMapFilePath}`,
      `--out-dir=${testDir}`,
      `${indexTypescriptFilePath}=index.js`,
    );

    await process.output();
    await process.stderrOutput();
    await process.status();

    assertEquals(
      Deno.readTextFileSync(path.join(testDir, "index.js")),
      `const world = "World";\nconsole.info(world);\n`,
    );

    await process.close();

    Deno.removeSync(testDir, { recursive: true });
  },
});
Deno.test({
  name: "importmap not found",
  async fn() {
    fs.emptyDirSync(testDir);
    const notFoundPath = "/not/found/import_map.json";
    const process = runBundle(
      `--import-map=${notFoundPath}`,
      "index.html",
    );
    await process.output();
    const error = await process.stderrOutput();
    await process.status();
    await process.close();

    assertEquals(
      new TextDecoder().decode(error),
      `\x1B[31merror\x1B[39m could not find import map file: /not/found/import_map.json\n`,
    );

    Deno.removeSync(testDir, { recursive: true });
  },
});

Deno.test({
  name: "config file",
  async fn() {
    fs.emptyDirSync(testDir);

    const projectDir = path.resolve(
      testdataDir,
      path.join("cli", "config"),
    );

    const configFilePath = path.join(
      projectDir,
      "deno.json",
    );

    const indexTypescriptFilePath = path.join(
      projectDir,
      "index.ts",
    );

    const process = runBundle(
      `--config=${configFilePath}`,
      `--out-dir=${testDir}`,
      `${indexTypescriptFilePath}=index.js`,
    );

    await Promise.all([
      process.status(),
      process.output(),
      process.stderrOutput(),
    ]);
    process.close();

    assertEquals(
      Deno.readTextFileSync(path.join(testDir, "index.js")),
      `const world = "World";\nconsole.info(world);\n`,
    );

    Deno.removeSync(testDir, { recursive: true });
  },
});
Deno.test({
  name: "config file not found",
  async fn() {
    fs.emptyDirSync(testDir);
    const notFoundPath = "/not/found/deno.json";
    const process = runBundle(
      `--config=${notFoundPath}`,
      "index.html",
    );
    await process.output();
    const error = await process.stderrOutput();
    await process.status();
    await process.close();

    assertEquals(
      new TextDecoder().decode(error),
      `\x1B[31merror\x1B[39m could not find the config file: /not/found/deno.json\n`,
    );
    Deno.removeSync(testDir, { recursive: true });
  },
});
