import { ImportMap, resolveImportMapModuleSpecifier, ts } from "../../deps.ts";
import { DependencyFormat, DependencyType, Item } from "../plugin.ts";
import { getDependencyFormat, resolveModuleSpecifier } from "../_util.ts";
import { getDepdendencyFormatFromAssertType, walk } from "./_util.ts";

export async function extractDependencies(
  input: string,
  ast: ts.SourceFile,
  { importMap }: { importMap?: ImportMap } = {},
) {
  function resolveSpecifier(
    input: string,
    moduleSpecifier: string,
    importMap?: ImportMap,
  ) {
    let resolvedModuleSpecifier = moduleSpecifier;

    if (importMap) {
      resolvedModuleSpecifier = resolveImportMapModuleSpecifier(
        moduleSpecifier,
        importMap,
        new URL(input, "file://"),
      );
    }

    resolvedModuleSpecifier = resolveModuleSpecifier(
      input,
      resolvedModuleSpecifier,
    );

    return resolvedModuleSpecifier;
  }

  const dependencies: Item[] = [];

  await walk(ast, (node) => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      // const importClause = node.importClause;
      // if (importClause && importClause.isTypeOnly) return;
      const moduleSpecifier = node.moduleSpecifier.text;
      const resolvedModuleSpecifier = resolveSpecifier(
        input,
        moduleSpecifier,
        importMap,
      );

      const typeName = (node.assertClause?.elements.find((element) =>
        element.name.text === "type"
      )?.value as ts.StringLiteral)?.text;

      const format = typeName
        ? getDepdendencyFormatFromAssertType(typeName)
        : DependencyFormat.Script;

      const dependency = {
        input: resolvedModuleSpecifier,
        type: DependencyType.ImportExport,
        format,
      };

      dependencies.push(dependency);
    } else if (
      ts.isExportDeclaration(node)
    ) {
      if (
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const moduleSpecifier = node.moduleSpecifier.text;
        const typeName = (node.assertClause?.elements.find((element) =>
          element.name.text === "type"
        )?.value as ts.StringLiteral)?.text;

        const format = typeName
          ? getDepdendencyFormatFromAssertType(typeName)
          : DependencyFormat.Script;

        const resolvedModuleSpecifier = resolveSpecifier(
          input,
          moduleSpecifier,
          importMap,
        );

        const dependency = {
          input: resolvedModuleSpecifier,
          type: DependencyType.ImportExport,
          format,
        };
        dependencies.push(dependency);
      }
    } else if (
      ts.isCallExpression(node)
    ) {
      if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === "fetch" &&
        ts.isStringLiteral(node.arguments?.[0])
      ) {
        const moduleSpecifier = node.arguments[0].text;
        const resolvedModuleSpecifier = resolveSpecifier(
          input,
          moduleSpecifier,
          importMap,
        );
        const format = getDependencyFormat(resolvedModuleSpecifier) ||
          DependencyFormat.Script;
        dependencies.push({
          input: resolvedModuleSpecifier,
          type: DependencyType.Fetch,
          format,
        });
      } else if (
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        ts.isStringLiteral(node.arguments?.[0])
      ) {
        const moduleSpecifier = node.arguments?.[0].text;
        let format = DependencyFormat.Script;
        const assertion = node.arguments[1];
        if (assertion && ts.isObjectLiteralExpression(assertion)) {
          const assertProperty = assertion.properties.find((property) =>
            property.name && ts.isIdentifier(property.name) &&
            property.name.text === "assert"
          );
          if (assertProperty && ts.isPropertyAssignment(assertProperty)) {
            if (ts.isObjectLiteralExpression(assertProperty.initializer)) {
              const typeProperty = assertProperty.initializer.properties
                .find((property) =>
                  property.name && ts.isIdentifier(property.name) &&
                  property.name.text === "type"
                );
              if (typeProperty && ts.isPropertyAssignment(typeProperty)) {
                if (ts.isStringLiteral(typeProperty.initializer)) {
                  const typeName = typeProperty.initializer.text;
                  format = getDepdendencyFormatFromAssertType(typeName);
                }
              }
            }
          }
        }
        const resolvedModuleSpecifier = resolveSpecifier(
          input,
          moduleSpecifier,
          importMap,
        );
        dependencies.push({
          input: resolvedModuleSpecifier,
          type: DependencyType.DynamicImport,
          format,
        });
      } else if (
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "register" &&
        ts.isPropertyAccessExpression(node.expression.expression) &&
        node.expression.expression.name.text === "serviceWorker"
      ) {
        const argument = node.arguments?.[0];
        if (argument && ts.isStringLiteral(argument)) {
          const moduleSpecifier = argument.text;
          const resolvedModuleSpecifier = resolveSpecifier(
            input,
            moduleSpecifier,
            importMap,
          );
          dependencies.push({
            input: resolvedModuleSpecifier,
            format: DependencyFormat.Script,
            type: DependencyType.ServiceWorker,
          });
        }
      }
    } else if (
      ts.isNewExpression(node) && ts.isIdentifier(node.expression)
    ) {
      const argument = node.arguments?.[0];
      if (argument && ts.isStringLiteral(argument)) {
        const moduleSpecifier = argument.text;
        const resolvedModuleSpecifier = resolveSpecifier(
          input,
          moduleSpecifier,
          importMap,
        );
        switch (node.expression.text) {
          case "Worker": {
            dependencies.push({
              input: resolvedModuleSpecifier,
              type: DependencyType.WebWorker,
              format: DependencyFormat.Script,
            });
            break;
          }
          case "Audio": {
            dependencies.push({
              input: resolvedModuleSpecifier,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Binary,
            });
            break;
          }
        }
      }
    }
  });

  return dependencies;
}
