import { ts } from "../../../deps.ts";
import { assertEquals, assertStringIncludes } from "../../../test_deps.ts";
import { typescriptInjectInstanceNameTransformer } from "./inject_instance_name.ts";

const defaultCompilerOptions: ts.CompilerOptions = {
  jsx: ts.JsxEmit.React,
  jsxFactory: "React.createElement",
  jsxFragmentFactory: "React.Fragment",
  allowJs: false,
  allowUmdGlobalAccess: false,
  allowUnreachableCode: false,
  allowUnusedLabels: false,
  alwaysStrict: true,
  assumeChangesOnlyAffectDirectDependencies: false,
  checkJs: false,
  disableSizeLimit: false,
  generateCpuProfile: "profile.cpuprofile",
  lib: [],
  noFallthroughCasesInSwitch: false,
  noImplicitAny: true,
  noImplicitReturns: true,
  noImplicitThis: true,
  noImplicitUseStrict: false,
  noStrictGenericChecks: false,
  noUnusedLocals: false,
  noUnusedParameters: false,
  preserveConstEnums: false,
  removeComments: false,
  // resolveJsonModule: true,
  strict: true,
  strictBindCallApply: true,
  strictFunctionTypes: true,
  strictNullChecks: true,
  strictPropertyInitialization: true,
  suppressExcessPropertyErrors: false,
  suppressImplicitAnyIndexErrors: false,
  useDefineForClassFields: false,
};

const compilerOptions: ts.CompilerOptions = {
  ...defaultCompilerOptions,
  target: ts.ScriptTarget.Latest,
  module: ts.ModuleKind.System,
};

Deno.test({
  name: "[typescript instance name transformer] inject",
  fn() {
    const source = `export const a = "a"`;
    const transformers = {
      after: [
        typescriptInjectInstanceNameTransformer("foo/bar.ts"),
      ],
    };

    const { diagnostics, outputText } = ts.transpileModule(
      source,
      {
        compilerOptions,
        transformers,
        reportDiagnostics: true,
      },
    );
    assertEquals(diagnostics, []);
    assertStringIncludes(
      outputText,
      `System.register("foo/bar.ts", [], function (exports_1, context_1) {`,
    );
  },
});
