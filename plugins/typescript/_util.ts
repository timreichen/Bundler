import { ts } from "../../deps.ts";
import { DependencyFormat } from "../plugin.ts";
import { Exports } from "./remove_modifiers.ts";

const regex = /^(?<identifier>.+?)(?<number>\d+)?$/;
export function createNextIdentifier(
  identifier: string,
  denyListIdentifiers: Set<string>,
) {
  const groups = regex.exec(identifier)?.groups || {};
  let number = groups.number ? parseInt(groups.number) : 0;
  const rawIdentifier = groups.identifier;
  let newIdentifier = groups.identifier;

  while (denyListIdentifiers.has(newIdentifier)) {
    number += 1;
    newIdentifier = rawIdentifier + number;
  }

  return newIdentifier;
}

export function getAssertTypeFromAssertClause(assertClause: ts.AssertClause) {
  const typeValue = assertClause.elements.find((element) =>
    element.name.text === "type"
  )?.value;

  let typeName;
  if (typeValue && ts.isStringLiteral(typeValue)) {
    typeName = typeValue.text;
  }

  return typeName;
}

export function getDepdendencyFormatFromAssertClause(
  assertClause: ts.AssertClause,
): DependencyFormat | undefined {
  const assertType = assertClause &&
    getAssertTypeFromAssertClause(assertClause);
  return assertType
    ? getDepdendencyFormatFromAssertType(assertType)
    : undefined;
}

export function getDepdendencyFormatFromAssertType(assertType: string) {
  switch (assertType) {
    case "css": {
      return DependencyFormat.Style;
    }
    case "json": {
      return DependencyFormat.Json;
    }
    default:
      throw new Error(`assert type not supported: ${assertType}`);
  }
}

/**
 * create object
 *
 * `
 * { … }
 * `
 */
export function createObjectExpression(exports: Exports) {
  const properties = [
    ...Object.entries(exports.specifiers).map(([key, value]) => {
      if (key === value) {
        return ts.factory.createShorthandPropertyAssignment(
          ts.factory.createIdentifier(key),
          undefined,
        );
      }
      return ts.factory.createPropertyAssignment(
        ts.factory.createIdentifier(key),
        ts.factory.createIdentifier(value),
      );
    }),
    ...exports.namespaces.map((namespace) => {
      return ts.factory.createSpreadAssignment(
        ts.factory.createIdentifier(namespace),
      );
    }),
  ];

  return ts.factory.createObjectLiteralExpression(
    properties,
    false,
  );
}
/**
 * create named export declaration
 *
 * `
 * export { … }
 * `
 */
export function createExportDeclaration(specifiers: Record<string, string>) {
  const exportSpecifiers = [
    ...Object.entries(specifiers).map(([key, value]) => {
      if (key === value) {
        return ts.factory.createExportSpecifier(
          false,
          undefined,
          ts.factory.createIdentifier(key),
        );
      }
      return ts.factory.createExportSpecifier(
        false,
        ts.factory.createIdentifier(value),
        ts.factory.createIdentifier(key),
      );
    }),
  ];

  return ts.factory.createExportDeclaration(
    undefined,
    undefined,
    false,
    ts.factory.createNamedExports(exportSpecifiers),
    undefined,
    undefined,
  );
}

export function createModName(
  modNameMap: Record<string, string>,
  input: string,
) {
  if (!modNameMap[input]) {
    const length = Object.keys(modNameMap).length;
    const modName = `mod${length === 0 ? "" : length}`;
    modNameMap[input] = modName;
  }
  return modNameMap[input];
}

/**
 * create inline css style sheet
 *
 * `
 * const name = new CSSStyleSheet(source)
 * name.replaceSync(source)
 * `
 */
export function createCssSourceStatements(
  name: string,
  source: string,
): ts.Statement[] {
  const variableStatement = ts.factory.createVariableStatement(
    undefined,
    ts.factory.createVariableDeclarationList(
      [ts.factory.createVariableDeclaration(
        ts.factory.createIdentifier(name),
        undefined,
        undefined,
        ts.factory.createNewExpression(
          ts.factory.createIdentifier("CSSStyleSheet"),
          undefined,
          [],
        ),
      )],
      ts.NodeFlags.Const,
    ),
  );
  const expressionStatement = ts.factory
    .createExpressionStatement(ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(
        ts.factory.createIdentifier(name),
        ts.factory.createIdentifier("replaceSync"),
      ),
      undefined,
      [ts.factory.createNoSubstitutionTemplateLiteral(source)],
    ));
  return [variableStatement, expressionStatement];
}

/**
 * create inline json object
 *
 * `
 * const name = JSON.parse(source);
 * `
 */
export function createJsonSourceStatement(name: string, source: string) {
  return ts.factory
    .createVariableStatement(
      undefined,
      ts.factory.createVariableDeclarationList(
        [ts.factory.createVariableDeclaration(
          ts.factory.createIdentifier(name),
          undefined,
          undefined,
          ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
              ts.factory.createIdentifier("JSON"),
              ts.factory.createIdentifier("parse"),
            ),
            undefined,
            [ts.factory.createNoSubstitutionTemplateLiteral(source)],
          ),
        )],
        ts.NodeFlags.Const,
      ),
    );
}

function readFile(filePath: string) {
  return Deno.readTextFileSync(filePath);
}
function fileExists(filePath: string) {
  try {
    Deno.lstatSync(filePath);
    return true;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return false;
    }
    throw err;
  }
}

export function transpile(
  input: string,
  ast: ts.SourceFile,
  options: ts.CompilerOptions = {},
) {
  let outputText: string | undefined;
  // let sourceMapText: string | undefined

  function getSourceFile(filePath: string, languageVersion: ts.ScriptTarget) {
    if (filePath === input) return ast;
    const sourceText = ts.sys.readFile(filePath);

    return sourceText !== undefined
      ? ts.createSourceFile(filePath, sourceText, languageVersion)
      : undefined;
  }

  const compilerHost: ts.CompilerHost = {
    getSourceFile,
    getDefaultLibFileName() {
      return ts.getDefaultLibFilePath(ts.getDefaultCompilerOptions());
    },
    writeFile(_name, content) {
      outputText = content;
    },
    getCurrentDirectory() {
      return ts.sys.getCurrentDirectory();
    },
    getDirectories(path) {
      return ts.sys.getDirectories(path);
    },
    getCanonicalFileName(filePath) {
      return ts.sys.useCaseSensitiveFileNames
        ? filePath
        : filePath.toLowerCase();
    },
    getNewLine() {
      return ts.sys.newLine;
    },
    useCaseSensitiveFileNames() {
      return ts.sys.useCaseSensitiveFileNames;
    },
    fileExists,
    directoryExists() {
      return true;
    },
    readFile,
  };

  const program = ts.createProgram([input], options, compilerHost);

  program.emit();

  if (outputText === undefined) {
    throw new Error(
      ts.formatDiagnostics(
        [
          ...program.getGlobalDiagnostics(),
          ...program.getOptionsDiagnostics(),
          ...program.getSemanticDiagnostics(),
          ...program.getSyntacticDiagnostics(),
          ...program.getDeclarationDiagnostics(),
          ...program.getConfigFileParsingDiagnostics(),
        ],
        compilerHost,
      ),
    );
  }

  return outputText;
}

export function parse(source: string) {
  return ts.createSourceFile(
    "file.ts",
    source,
    ts.ScriptTarget.ESNext,
    false,
    ts.ScriptKind.Unknown,
  );
}

export function stringify(
  ast: ts.SourceFile,
  { newLine = ts.NewLineKind.LineFeed }: { newLine?: ts.NewLineKind } = {},
) {
  const printer: ts.Printer = ts.createPrinter({
    removeComments: false,
    newLine,
  });
  return printer.printFile(ast);
}

export async function walk(
  sourceFile: ts.SourceFile,
  reviver: (node: ts.Node) => Promise<void> | void,
) {
  async function visit(
    node: ts.Node,
    reviver: (node: ts.Node) => Promise<void> | void,
  ) {
    await reviver(node);
    const children = node.getChildren(sourceFile);
    for (const child of children) {
      await visit(child, reviver);
    }
  }
  await visit(sourceFile, reviver);
}
