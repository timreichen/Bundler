import { ts } from "../../../../deps.ts";
import { DependencyFormat } from "../../../plugin.ts";
import { Exports } from "../modifiers/remove_modifiers.ts";

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
