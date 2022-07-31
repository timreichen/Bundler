import { ts } from "../../../../deps.ts";
import { createNextIdentifier } from "../_util.ts";

export function injectIdentifiersTransformer(
  identifierMap: Map<string, string>,
  blacklistIdentifiers: Set<string>,
): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => {
    const visitor = (
      identifierMap: Map<string, string>,
      blacklistIdentifiers: Set<string>,
    ): ts.Visitor =>
    (node: ts.Node) => {
      if (ts.isVariableDeclaration(node)) {
        let name = node.name;
        if (ts.isIdentifier(name)) {
          // const x, let x, var x
          const text = name.text;
          if (blacklistIdentifiers.has(text)) {
            const nextIdentifier = createNextIdentifier(
              text,
              blacklistIdentifiers,
            );
            blacklistIdentifiers.add(nextIdentifier);
            name = ts.factory.createIdentifier(nextIdentifier);
            identifierMap.set(text, nextIdentifier);
          } else {
            identifierMap.delete(text);
            blacklistIdentifiers.add(text);
          }
        } else if (ts.isArrayBindingPattern(name)) {
          // const [x] = y;
          const elements = name.elements.map((element) => {
            if (
              ts.isBindingElement(element) && ts.isIdentifier(element.name)
            ) {
              let name = element.name;
              const text = name.text;
              if (blacklistIdentifiers.has(text)) {
                const nextIdentifier = createNextIdentifier(
                  text,
                  blacklistIdentifiers,
                );

                blacklistIdentifiers.add(nextIdentifier);
                name = ts.factory.createIdentifier(nextIdentifier);
                identifierMap.set(text, nextIdentifier);

                element = ts.factory.updateBindingElement(
                  element,
                  element.dotDotDotToken,
                  element.propertyName,
                  name,
                  element.initializer,
                );
              } else {
                identifierMap.delete(text);
                blacklistIdentifiers.add(text);
              }
            }
            return element;
          });
          name = ts.factory.updateArrayBindingPattern(
            name,
            elements,
          );
        } else if (ts.isObjectBindingPattern(name)) {
          const elements = name.elements.map((element) => {
            if (
              ts.isBindingElement(element) && ts.isIdentifier(element.name)
            ) {
              const text = element.name.text;
              if (blacklistIdentifiers.has(text)) {
                const nextIdentifier = createNextIdentifier(
                  text,
                  blacklistIdentifiers,
                );

                blacklistIdentifiers.add(nextIdentifier);
                name = ts.factory.createIdentifier(nextIdentifier);
                identifierMap.set(text, nextIdentifier);

                element = ts.factory.updateBindingElement(
                  element,
                  element.dotDotDotToken,
                  element.propertyName,
                  name,
                  element.initializer,
                );
              } else {
                identifierMap.delete(text);
                blacklistIdentifiers.add(text);
              }
            }
            return element;
          });
          name = ts.factory.updateObjectBindingPattern(
            name,
            elements,
          );
        }

        return ts.factory.updateVariableDeclaration(
          node,
          name,
          node.exclamationToken,
          node.type,
          ts.visitNode(
            node.initializer,
            visitor(identifierMap, blacklistIdentifiers),
          ),
        );
      } else if (ts.isFunctionDeclaration(node)) {
        const newBlacklistIdentifiers = new Set(blacklistIdentifiers);
        const newIdentifierMap = new Map(identifierMap);
        let name = node.name;
        if (name) {
          const text = name.text;
          if (newBlacklistIdentifiers.has(text)) {
            const nextIdentifier = createNextIdentifier(
              text,
              newBlacklistIdentifiers,
            );
            newBlacklistIdentifiers.add(nextIdentifier);
            blacklistIdentifiers.add(nextIdentifier);
            name = ts.factory.createIdentifier(nextIdentifier);
            newIdentifierMap.set(text, nextIdentifier);
            identifierMap.set(text, nextIdentifier);
          } else {
            newIdentifierMap.delete(text);
            newBlacklistIdentifiers.add(text);
            blacklistIdentifiers.add(text);
          }
        }

        const parameters = node.parameters.map((parameter) => {
          let name = parameter.name;
          if (ts.isIdentifier(name)) {
            const text = name.text;
            if (newBlacklistIdentifiers.has(text)) {
              const nextIdentifier = createNextIdentifier(
                text,
                newBlacklistIdentifiers,
              );
              newBlacklistIdentifiers.add(nextIdentifier);
              name = ts.factory.createIdentifier(nextIdentifier);
              newIdentifierMap.set(text, nextIdentifier);

              parameter = ts.factory.updateParameterDeclaration(
                parameter,
                parameter.decorators,
                parameter.modifiers,
                parameter.dotDotDotToken,
                name,
                parameter.questionToken,
                parameter.type,
                parameter.initializer,
              );
            } else {
              newIdentifierMap.delete(text);
              newBlacklistIdentifiers.add(text);
            }
          }
          return parameter;
        });
        const decorators = node.decorators?.map((decorator) =>
          ts.visitNode(
            decorator,
            visitor(identifierMap, blacklistIdentifiers),
          )
        );

        return ts.factory.updateFunctionDeclaration(
          node,
          decorators,
          node.modifiers,
          node.asteriskToken,
          name,
          node.typeParameters,
          parameters,
          node.type,
          ts.visitNode(
            node.body,
            visitor(newIdentifierMap, newBlacklistIdentifiers),
          ),
        );
      } else if (ts.isArrowFunction(node)) {
        const newBlacklistIdentifiers = new Set(blacklistIdentifiers);
        const newIdentifierMap = new Map(identifierMap);
        const parameters = node.parameters.map((parameter) => {
          let name = parameter.name;
          if (ts.isIdentifier(name)) {
            const text = name.text;
            if (newBlacklistIdentifiers.has(text)) {
              const nextIdentifier = createNextIdentifier(
                text,
                newBlacklistIdentifiers,
              );
              newBlacklistIdentifiers.add(nextIdentifier);
              name = ts.factory.createIdentifier(nextIdentifier);
              newIdentifierMap.set(text, nextIdentifier);

              parameter = ts.factory.updateParameterDeclaration(
                parameter,
                parameter.decorators,
                parameter.modifiers,
                parameter.dotDotDotToken,
                name,
                parameter.questionToken,
                parameter.type,
                parameter.initializer,
              );
            } else {
              newIdentifierMap.delete(text);
              newBlacklistIdentifiers.add(text);
            }
          }
          return parameter;
        });

        let body = node.body;
        if (ts.isIdentifier(body)) {
          const text = body.text;
          const identifier = newIdentifierMap.get(text) || text;
          body = ts.factory.createIdentifier(identifier);
        }

        return ts.factory.updateArrowFunction(
          node,
          node.modifiers,
          node.typeParameters,
          parameters,
          node.type,
          node.equalsGreaterThanToken,
          ts.visitNode(
            body,
            visitor(newIdentifierMap, newBlacklistIdentifiers),
          ),
        );
      } else if (ts.isClassDeclaration(node)) {
        let name = node.name;
        if (name) {
          const text = name.text;
          if (blacklistIdentifiers.has(text)) {
            const nextIdentifier = createNextIdentifier(
              text,
              blacklistIdentifiers,
            );
            blacklistIdentifiers.add(nextIdentifier);
            name = ts.factory.createIdentifier(nextIdentifier);
            identifierMap.set(text, nextIdentifier);
          } else {
            identifierMap.delete(text);
            blacklistIdentifiers.add(text);
          }
        }

        const decorators = node.decorators?.map((decorator) =>
          ts.visitNode(
            decorator,
            visitor(identifierMap, blacklistIdentifiers),
          )
        );

        node = ts.factory.updateClassDeclaration(
          node,
          decorators,
          node.modifiers,
          name,
          node.typeParameters,
          node.heritageClauses,
          node.members,
        );
      } else if (ts.isEnumDeclaration(node)) {
        let name = node.name;
        if (ts.isIdentifier(name)) {
          const text = name.text;
          if (blacklistIdentifiers.has(text)) {
            const nextIdentifier = createNextIdentifier(
              text,
              blacklistIdentifiers,
            );
            blacklistIdentifiers.add(nextIdentifier);
            name = ts.factory.createIdentifier(nextIdentifier);
            identifierMap.set(text, nextIdentifier);
          } else {
            identifierMap.delete(text);
            blacklistIdentifiers.add(text);
          }
        }
        const decorators = node.decorators?.map((decorator) =>
          ts.visitNode(
            decorator,
            visitor(identifierMap, blacklistIdentifiers),
          )
        );
        node = ts.factory.updateEnumDeclaration(
          node,
          decorators,
          node.modifiers,
          name,
          node.members,
        );
      } else if (ts.isConstructorDeclaration(node)) {
        const newIdentifierMap: Map<string, string> = new Map(identifierMap);
        const newBlacklistIdentifiers = new Set(blacklistIdentifiers);

        const parameters = node.parameters.map((parameter) => {
          let name = parameter.name;
          if (ts.isIdentifier(name)) {
            const text = name.text;
            if (newBlacklistIdentifiers.has(text)) {
              const nextIdentifier = createNextIdentifier(
                text,
                newBlacklistIdentifiers,
              );
              newBlacklistIdentifiers.add(nextIdentifier);
              name = ts.factory.createIdentifier(nextIdentifier);
              newIdentifierMap.set(text, nextIdentifier);

              parameter = ts.factory.updateParameterDeclaration(
                parameter,
                parameter.decorators,
                parameter.modifiers,
                parameter.dotDotDotToken,
                name,
                parameter.questionToken,
                parameter.type,
                parameter.initializer,
              );
            } else {
              newIdentifierMap.delete(text);
              newBlacklistIdentifiers.add(text);
            }
          }
          return parameter;
        });
        const decorators = node.decorators?.map((decorator) => {
          return ts.visitNode(
            decorator,
            visitor(identifierMap, blacklistIdentifiers),
          );
        });

        return ts.factory.updateConstructorDeclaration(
          node,
          decorators,
          node.modifiers,
          parameters,
          ts.visitNode(
            node.body,
            visitor(newIdentifierMap, newBlacklistIdentifiers),
          ),
        );
      } else if (ts.isMethodDeclaration(node)) {
        const newIdentifierMap: Map<string, string> = new Map(identifierMap);
        const newBlacklistIdentifiers = new Set(blacklistIdentifiers);

        const parameters = node.parameters.map((parameter) => {
          let name = parameter.name;
          if (ts.isIdentifier(name)) {
            const text = name.text;
            if (newBlacklistIdentifiers.has(text)) {
              const nextIdentifier = createNextIdentifier(
                text,
                newBlacklistIdentifiers,
              );
              newBlacklistIdentifiers.add(nextIdentifier);
              name = ts.factory.createIdentifier(nextIdentifier);
              newIdentifierMap.set(text, nextIdentifier);

              parameter = ts.factory.updateParameterDeclaration(
                parameter,
                parameter.decorators,
                parameter.modifiers,
                parameter.dotDotDotToken,
                name,
                parameter.questionToken,
                parameter.type,
                parameter.initializer,
              );
            } else {
              newIdentifierMap.delete(text);
              newBlacklistIdentifiers.add(text);
            }
          }
          return parameter;
        });

        const decorators = node.decorators?.map((decorator) =>
          ts.visitNode(
            decorator,
            visitor(identifierMap, blacklistIdentifiers),
          )
        );

        return ts.factory.updateMethodDeclaration(
          node,
          decorators,
          node.modifiers,
          node.asteriskToken,
          node.name,
          node.questionToken,
          node.typeParameters,
          parameters,
          node.type,
          ts.visitNode(
            node.body,
            visitor(newIdentifierMap, newBlacklistIdentifiers),
          ),
        );
      } else if (ts.isPropertyDeclaration(node)) {
        const decorators = node.decorators?.map((decorator) =>
          ts.visitNode(
            decorator,
            visitor(identifierMap, blacklistIdentifiers),
          )
        );

        return ts.factory.updatePropertyDeclaration(
          node,
          decorators,
          node.modifiers,
          node.name,
          node.questionToken,
          node.type,
          ts.visitNode(
            node.initializer,
            visitor(identifierMap, blacklistIdentifiers),
          ),
        );
      } else if (ts.isGetAccessor(node)) {
        const newIdentifierMap: Map<string, string> = new Map(identifierMap);
        const newBlacklistIdentifiers = new Set(blacklistIdentifiers);

        const parameters = node.parameters.map((parameter) => {
          let name = parameter.name;
          if (ts.isIdentifier(name)) {
            const text = name.text;
            if (newBlacklistIdentifiers.has(text)) {
              const nextIdentifier = createNextIdentifier(
                text,
                newBlacklistIdentifiers,
              );
              newBlacklistIdentifiers.add(nextIdentifier);
              name = ts.factory.createIdentifier(nextIdentifier);
              newIdentifierMap.set(text, nextIdentifier);

              parameter = ts.factory.updateParameterDeclaration(
                parameter,
                parameter.decorators,
                parameter.modifiers,
                parameter.dotDotDotToken,
                name,
                parameter.questionToken,
                parameter.type,
                parameter.initializer,
              );
            } else {
              newIdentifierMap.delete(text);
              newBlacklistIdentifiers.add(text);
            }
          }
          return parameter;
        });

        const decorators = node.decorators?.map((decorator) =>
          ts.visitNode(
            decorator,
            visitor(identifierMap, blacklistIdentifiers),
          )
        );

        return ts.factory.updateGetAccessorDeclaration(
          node,
          decorators,
          node.modifiers,
          node.name,
          parameters,
          node.type,
          ts.visitNode(
            node.body,
            visitor(newIdentifierMap, newBlacklistIdentifiers),
          ),
        );
      } else if (ts.isSetAccessor(node)) {
        const newIdentifierMap: Map<string, string> = new Map(identifierMap);
        const newBlacklistIdentifiers = new Set(blacklistIdentifiers);

        const parameters = node.parameters.map((parameter) => {
          let name = parameter.name;
          if (ts.isIdentifier(name)) {
            const text = name.text;
            if (newBlacklistIdentifiers.has(text)) {
              const nextIdentifier = createNextIdentifier(
                text,
                newBlacklistIdentifiers,
              );
              newBlacklistIdentifiers.add(nextIdentifier);
              name = ts.factory.createIdentifier(nextIdentifier);
              newIdentifierMap.set(text, nextIdentifier);

              parameter = ts.factory.updateParameterDeclaration(
                parameter,
                parameter.decorators,
                parameter.modifiers,
                parameter.dotDotDotToken,
                name,
                parameter.questionToken,
                parameter.type,
                parameter.initializer,
              );
            } else {
              newIdentifierMap.delete(text);
              newBlacklistIdentifiers.add(text);
            }
          }
          return parameter;
        });
        const decorators = node.decorators?.map((decorator) =>
          ts.visitNode(
            decorator,
            visitor(identifierMap, blacklistIdentifiers),
          )
        );

        return ts.factory.updateSetAccessorDeclaration(
          node,
          decorators,
          node.modifiers,
          node.name,
          parameters,
          ts.visitNode(
            node.body,
            visitor(newIdentifierMap, newBlacklistIdentifiers),
          ),
        );
      } else if (ts.isFunctionExpression(node)) {
        const newBlacklistIdentifiers = new Set(blacklistIdentifiers);
        const newIdentifierMap = new Map(identifierMap);
        const parameters = node.parameters.map((parameter) => {
          let name = parameter.name;
          if (ts.isIdentifier(name)) {
            const text = name.text;
            if (newBlacklistIdentifiers.has(text)) {
              const nextIdentifier = createNextIdentifier(
                text,
                newBlacklistIdentifiers,
              );
              newBlacklistIdentifiers.add(nextIdentifier);
              name = ts.factory.createIdentifier(nextIdentifier);
              newIdentifierMap.set(text, nextIdentifier);

              parameter = ts.factory.updateParameterDeclaration(
                parameter,
                parameter.decorators,
                parameter.modifiers,
                parameter.dotDotDotToken,
                name,
                parameter.questionToken,
                parameter.type,
                parameter.initializer,
              );
            } else {
              newIdentifierMap.delete(text);
              newBlacklistIdentifiers.add(text);
            }
          }
          return parameter;
        });
        return ts.factory.updateFunctionExpression(
          node,
          node.modifiers,
          node.asteriskToken,
          node.name,
          node.typeParameters,
          parameters,
          node.type,
          ts.visitNode(
            node.body,
            visitor(newIdentifierMap, newBlacklistIdentifiers),
          ),
        );
      } else if (ts.isPropertyAccessExpression(node)) {
        // x.a
        return ts.factory.updatePropertyAccessExpression(
          node,
          ts.visitNode(
            node.expression,
            visitor(identifierMap, blacklistIdentifiers),
          ),
          node.name,
        );
      } else if (ts.isIdentifier(node)) {
        const text = node.text;
        const identifier = identifierMap.get(text) || text;
        return ts.factory.createIdentifier(identifier);
      }

      return ts.visitEachChild(
        node,
        visitor(identifierMap, blacklistIdentifiers),
        context,
      );
    };

    return (node: ts.SourceFile) =>
      ts.visitNode(
        node,
        (child: ts.Node) => visitor(identifierMap, blacklistIdentifiers)(child),
      );
  };
}

export function injectIdentifiersFromSourceFile(
  sourceFile: ts.SourceFile,
  identifierMap: Map<string, string>,
  blacklistIdentifiers: Set<string>,
  compilerOptions?: ts.CompilerOptions,
) {
  const { transformed } = ts.transform(sourceFile, [
    injectIdentifiersTransformer(
      identifierMap,
      blacklistIdentifiers,
    ),
  ], compilerOptions);
  const printer: ts.Printer = ts.createPrinter({
    removeComments: false,
    newLine: compilerOptions?.newLine,
  });
  return printer.printFile(transformed[0] as ts.SourceFile);
}
export function injectIdentifiers(
  fileName: string,
  sourceText: string,
  identifierMap: Map<string, string>,
  blacklistIdentifiers: Set<string>,
  compilerOptions?: ts.CompilerOptions,
) {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.ESNext,
  );

  return injectIdentifiersFromSourceFile(
    sourceFile,
    identifierMap,
    blacklistIdentifiers,
    compilerOptions,
  );
}
