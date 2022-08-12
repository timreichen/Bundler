import { ts } from "../../deps.ts";
import { createNextIdentifier } from "./_util.ts";

function hasNodeModifier(
  modifiers: ts.ModifiersArray,
  modifier: ts.SyntaxKind,
) {
  return modifiers.find((moduleSpecifier: ts.Modifier) =>
    moduleSpecifier.kind === modifier
  );
}
function removeNodeModifiers(
  modifiers: ts.ModifiersArray,
  removeModifiers: ts.SyntaxKind[],
): ts.NodeArray<ts.Modifier> {
  return ts.factory.createNodeArray(
    modifiers?.filter((moduleSpecifier: ts.Modifier) =>
      !removeModifiers.includes(moduleSpecifier.kind)
    ),
  );
}

export function removeModifiers(
  fileName: string,
  source: string,
  exportMap: Record<string, string>,
  denyListIdentifiers: Set<string>,
  compilerOptions?: ts.CompilerOptions,
) {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.ESNext,
    false,
    ts.ScriptKind.Unknown,
  );
  const { transformed } = ts.transform(
    sourceFile,
    [removeModifiersTransformer(exportMap, denyListIdentifiers)],
    compilerOptions,
  );
  const printer: ts.Printer = ts.createPrinter({
    removeComments: false,
    newLine: compilerOptions?.newLine,
  });

  return printer.printFile(transformed[0] as ts.SourceFile);
}

export function removeModifiersFromSourceFile(
  sourceFile: ts.SourceFile,
  exportMap: Record<string, string>,
  denyListIdentifiers: Set<string>,
  compilerOptions?: ts.CompilerOptions,
) {
  const { transformed } = ts.transform(
    sourceFile,
    [removeModifiersTransformer(exportMap, denyListIdentifiers)],
    compilerOptions,
  );
  return transformed[0] as ts.SourceFile;
}

export function removeModifiersSourceFile(
  fileName: string,
  source: string,
  exportMap: Record<string, string>,
  denyListIdentifiers: Set<string>,
  compilerOptions?: ts.CompilerOptions,
) {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.ESNext,
    false,
    ts.ScriptKind.Unknown,
  );
  return removeModifiersFromSourceFile(
    sourceFile,
    exportMap,
    denyListIdentifiers,
    compilerOptions,
  );
}

export const defaultKeyword = "default";

export interface Exports {
  namespaces: string[];
  specifiers: Record<string, string>;
}
/**
 * remove `export` and `export default` keywords
 */
export function removeModifiersTransformer(
  exportMap: Record<string, string>,
  denyListIdentifiers: Set<string>,
): ts.TransformerFactory<
  ts.SourceFile
> {
  return (context: ts.TransformationContext) => {
    const visitor: ts.Visitor = (node: ts.Node) => {
      if (ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier) return node;
        if (node.isTypeOnly) return;
        const exportClause = node.exportClause;
        if (exportClause) {
          if (ts.isNamedExports(exportClause)) {
            for (const element of exportClause.elements) {
              const name = element.name.text;
              const propertyName = element.propertyName?.text || name;
              exportMap[name] = propertyName;
            }
          }
        }
        return; // remove export statement;
      } else if (ts.isExportAssignment(node)) {
        if (ts.isIdentifier(node.expression)) {
          exportMap.default = node.expression.text;
          return;
        } else {
          // export default "abc" -> const _default = "abc"
          const expression = node.expression;
          if (
            ts.isVariableDeclaration(expression) &&
            ts.isIdentifier(expression.name)
          ) {
            exportMap.default = expression.name.text;
          } else {
            const defaultIdentifier = createNextIdentifier(
              "_default",
              denyListIdentifiers,
            );
            exportMap.default = defaultIdentifier;
            return ts.factory.createVariableStatement(
              undefined,
              ts.factory.createVariableDeclarationList(
                [ts.factory.createVariableDeclaration(
                  ts.factory.createIdentifier(defaultIdentifier),
                  undefined,
                  undefined,
                  node.expression,
                )],
                ts.NodeFlags.Const,
              ),
            );
          }
          return;
        }
      } else if (ts.isVariableStatement(node)) {
        // export const x = "x"
        if (
          node.modifiers &&
          hasNodeModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
        ) {
          for (const declaration of node.declarationList.declarations) {
            if (ts.isIdentifier(declaration.name)) {
              exportMap[declaration.name.text] = declaration.name.text;
            } else if (ts.isObjectBindingPattern(declaration.name)) {
              for (const element of declaration.name.elements) {
                if (ts.isIdentifier(element.name)) {
                  const name = element.name.text;
                  const propertyName = element.propertyName &&
                      ts.isIdentifier(element.propertyName) &&
                      element.propertyName.text || name;
                  exportMap[name] = propertyName;
                }
              }
            }
          }
          return ts.factory.createVariableStatement(
            removeNodeModifiers(node.modifiers, [ts.SyntaxKind.ExportKeyword]),
            node.declarationList,
          );
        }
      } else if (ts.isFunctionDeclaration(node) && node.name) {
        if (
          node.modifiers &&
          hasNodeModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
        ) {
          const isDefault = hasNodeModifier(
            node.modifiers,
            ts.SyntaxKind.DefaultKeyword,
          );
          const name = isDefault ? defaultKeyword : node.name.text;
          exportMap[name] = node.name.text;
          node = ts.factory.updateFunctionDeclaration(
            node,
            node.decorators,
            removeNodeModifiers(node.modifiers, [
              ts.SyntaxKind.ExportKeyword,
              ts.SyntaxKind.DefaultKeyword,
            ]),
            node.asteriskToken,
            node.name,
            node.typeParameters,
            node.parameters,
            node.type,
            node.body,
          );
        }
      } else if (ts.isClassDeclaration(node) && node.name) {
        if (
          node.modifiers &&
          hasNodeModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
        ) {
          const isDefault = hasNodeModifier(
            node.modifiers,
            ts.SyntaxKind.DefaultKeyword,
          );
          const name = isDefault ? defaultKeyword : node.name.text;
          exportMap[name] = node.name.text;
          node = ts.factory.updateClassDeclaration(
            node,
            node.decorators,
            removeNodeModifiers(node.modifiers, [
              ts.SyntaxKind.ExportKeyword,
              ts.SyntaxKind.DefaultKeyword,
            ]),
            node.name,
            node.typeParameters,
            node.heritageClauses,
            node.members,
          );
        }
      } else if (
        ts.isEnumDeclaration(node) && node.modifiers &&
        hasNodeModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
      ) {
        exportMap[node.name.text] = node.name.text;
        node = ts.factory.updateEnumDeclaration(
          node,
          node.decorators,
          removeNodeModifiers(node.modifiers, [
            ts.SyntaxKind.ExportKeyword,
          ]),
          node.name,
          node.members,
        );
      } else if (
        ts.isInterfaceDeclaration(node) && node.modifiers &&
        hasNodeModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
      ) {
        exportMap[node.name.text] = node.name.text;
        node = ts.factory.updateInterfaceDeclaration(
          node,
          node.decorators,
          removeNodeModifiers(node.modifiers, [
            ts.SyntaxKind.ExportKeyword,
          ]),
          node.name,
          node.typeParameters,
          node.heritageClauses,
          node.members,
        );
      } else if (
        ts.isTypeAliasDeclaration(node) && node.modifiers &&
        hasNodeModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
      ) {
        exportMap[node.name.text] = node.name.text;
        node = ts.factory.updateTypeAliasDeclaration(
          node,
          node.decorators,
          removeNodeModifiers(node.modifiers, [
            ts.SyntaxKind.ExportKeyword,
          ]),
          node.name,
          node.typeParameters,
          node.type,
        );
      }
      return ts.visitEachChild(node, visitor, context);
    };
    return (node: ts.SourceFile) =>
      ts.visitNode(node, (child: ts.Node) => visitor(child));
  };
}
