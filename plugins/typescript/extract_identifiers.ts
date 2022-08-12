import { ts } from "../../deps.ts";

export function extractIdentifiersTransformer(
  identifiers: Set<string>,
): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => {
    const visitor: ts.Visitor = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node)) {
        let name = node.name;
        if (ts.isIdentifier(name)) {
          // const x, let x, var x
          const text = name.text;
          identifiers.add(text);
        } else {
          name = ts.visitNode(node.name, visitor);
        }
        return ts.factory.updateVariableDeclaration(
          node,
          name,
          node.exclamationToken,
          node.type,
          ts.visitNode(node.initializer, visitor),
        );
      } else if (ts.isFunctionDeclaration(node)) {
        const name = node.name;
        if (name) {
          const text = name.text;
          identifiers.add(text);
        }
      } else if (ts.isClassDeclaration(node)) {
        const name = node.name;
        if (name) {
          const text = name.text;
          identifiers.add(text);
        }
      } else if (ts.isEnumDeclaration(node)) {
        const name = node.name;
        if (ts.isIdentifier(name)) {
          const text = name.text;
          identifiers.add(text);
        }
      } else if (ts.isArrayBindingPattern(node)) {
        // const [x] = y;
        // const [[x]] = y;
        const elements = node.elements.map((element) => {
          if (
            ts.isBindingElement(element)
          ) {
            const name = element.name;
            if (ts.isIdentifier(name)) {
              const text = name.text;
              identifiers.add(text);
            } else {
              element = ts.visitNode(
                element,
                visitor,
              );
            }
          }
          return element;
        });
        return ts.factory.updateArrayBindingPattern(
          node,
          elements,
        );
      } else if (ts.isObjectBindingPattern(node)) {
        // const { a } = y;
        // const { x: { a } } = y;
        const elements = node.elements.map((element) => {
          if (
            ts.isBindingElement(element)
          ) {
            const name = element.name;
            if (ts.isIdentifier(name)) {
              const text = name.text;
              identifiers.add(text);
            } else {
              element = ts.visitNode(element, visitor);
            }
          }
          return element;
        });
        return ts.factory.updateObjectBindingPattern(
          node,
          elements,
        );
      }
      return ts.visitEachChild(
        node,
        visitor,
        context,
      );
    };

    return (sourceFile: ts.SourceFile) => {
      return ts.visitNode(
        sourceFile,
        (child: ts.Node) => visitor(child),
      );
    };
  };
}

export function extractIdentifiersFromSourceFile(
  sourceFile: ts.SourceFile,
  compilerOptions?: ts.CompilerOptions,
) {
  const identifiers: Set<string> = new Set();
  ts.transform(sourceFile, [
    extractIdentifiersTransformer(identifiers),
  ], compilerOptions);
  return identifiers;
}
export function extractIdentifiers(
  fileName: string,
  sourceText: string,
  compilerOptions?: ts.CompilerOptions,
) {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.ESNext,
    undefined,
    ts.ScriptKind.Unknown,
  );

  return extractIdentifiersFromSourceFile(
    sourceFile,
    compilerOptions,
  );
}
