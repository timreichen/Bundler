import { ts } from "../../deps.ts";
import { createNextIdentifier } from "./_util.ts";

export function injectIdentifiersTransformer(
  identifierMap: Map<string, string>,
  denyListIdentifiers: Set<string>,
): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {
      return ts.visitNode(
        sourceFile,
        (child: ts.Node) => {
          const visitor = (
            identifierMap: Map<string, string>,
            denyListIdentifiers: Set<string>,
          ): ts.Visitor =>
          (node: ts.Node) => {
            if (ts.isVariableDeclaration(node)) {
              let name = node.name;

              if (ts.isIdentifier(name)) {
                // const x, let x, var x
                const text = name.text;
                if (denyListIdentifiers.has(text)) {
                  const nextIdentifier = createNextIdentifier(
                    text,
                    denyListIdentifiers,
                  );
                  denyListIdentifiers.add(nextIdentifier);
                  name = ts.factory.createIdentifier(nextIdentifier);
                  identifierMap.set(text, nextIdentifier);
                } else {
                  identifierMap.delete(text);
                  denyListIdentifiers.add(text);
                }
              } else {
                name = ts.visitNode(
                  name,
                  visitor(identifierMap, denyListIdentifiers),
                );
              }

              return ts.factory.updateVariableDeclaration(
                node,
                name,
                node.exclamationToken,
                node.type,
                ts.visitNode(
                  node.initializer,
                  visitor(identifierMap, denyListIdentifiers),
                ),
              );
            } else if (ts.isFunctionDeclaration(node)) {
              const newDenyListIdentifiers = new Set(denyListIdentifiers);
              const newIdentifierMap = new Map(identifierMap);
              let name = node.name;
              if (name) {
                const text = name.text;
                if (newDenyListIdentifiers.has(text)) {
                  const nextIdentifier = createNextIdentifier(
                    text,
                    newDenyListIdentifiers,
                  );
                  newDenyListIdentifiers.add(nextIdentifier);
                  denyListIdentifiers.add(nextIdentifier);
                  name = ts.factory.createIdentifier(nextIdentifier);
                  newIdentifierMap.set(text, nextIdentifier);
                  identifierMap.set(text, nextIdentifier);
                } else {
                  newIdentifierMap.delete(text);
                  newDenyListIdentifiers.add(text);
                  denyListIdentifiers.add(text);
                }
              }

              const parameters = node.parameters.map((parameter) => {
                let name = parameter.name;

                if (ts.isIdentifier(name)) {
                  const text = name.text;
                  if (newDenyListIdentifiers.has(text)) {
                    const nextIdentifier = createNextIdentifier(
                      text,
                      newDenyListIdentifiers,
                    );
                    newDenyListIdentifiers.add(nextIdentifier);
                    name = ts.factory.createIdentifier(nextIdentifier);
                    newIdentifierMap.set(text, nextIdentifier);

                    parameter = ts.factory.updateParameterDeclaration(
                      parameter,
                      parameter.modifiers,
                      parameter.dotDotDotToken,
                      name,
                      parameter.questionToken,
                      parameter.type,
                      parameter.initializer,
                    );
                  } else {
                    newIdentifierMap.delete(text);
                    newDenyListIdentifiers.add(text);
                  }
                  return parameter;
                }
                return ts.visitNode(
                  parameter,
                  visitor(newIdentifierMap, newDenyListIdentifiers),
                );
              });
              const modifiers = node.modifiers?.map((modifier) =>
                ts.visitNode(
                  modifier,
                  visitor(identifierMap, denyListIdentifiers),
                )
              );

              return ts.factory.updateFunctionDeclaration(
                node,
                modifiers,
                node.asteriskToken,
                name,
                node.typeParameters,
                parameters,
                node.type,
                ts.visitNode(
                  node.body,
                  visitor(newIdentifierMap, newDenyListIdentifiers),
                ),
              );
            } else if (ts.isArrowFunction(node)) {
              const newDenyListIdentifiers = new Set(denyListIdentifiers);
              const newIdentifierMap = new Map(identifierMap);
              const parameters = node.parameters.map((parameter) => {
                let name = parameter.name;
                if (ts.isIdentifier(name)) {
                  const text = name.text;
                  if (newDenyListIdentifiers.has(text)) {
                    const nextIdentifier = createNextIdentifier(
                      text,
                      newDenyListIdentifiers,
                    );
                    newDenyListIdentifiers.add(nextIdentifier);
                    name = ts.factory.createIdentifier(nextIdentifier);
                    newIdentifierMap.set(text, nextIdentifier);

                    parameter = ts.factory.updateParameterDeclaration(
                      parameter,
                      parameter.modifiers,
                      parameter.dotDotDotToken,
                      name,
                      parameter.questionToken,
                      parameter.type,
                      parameter.initializer,
                    );
                  } else {
                    newIdentifierMap.delete(text);
                    newDenyListIdentifiers.add(text);
                  }
                  return parameter;
                }
                return ts.visitNode(
                  parameter,
                  visitor(newIdentifierMap, newDenyListIdentifiers),
                );
              });

              let body = node.body;
              if (ts.isIdentifier(body)) {
                const text = body.text;
                const identifier = newIdentifierMap.get(text) ?? text;
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
                  visitor(newIdentifierMap, newDenyListIdentifiers),
                ),
              );
            } else if (ts.isClassDeclaration(node)) {
              let name = node.name;
              if (name) {
                const text = name.text;
                if (denyListIdentifiers.has(text)) {
                  const nextIdentifier = createNextIdentifier(
                    text,
                    denyListIdentifiers,
                  );
                  denyListIdentifiers.add(nextIdentifier);
                  name = ts.factory.createIdentifier(nextIdentifier);
                  identifierMap.set(text, nextIdentifier);
                } else {
                  identifierMap.delete(text);
                  denyListIdentifiers.add(text);
                }
              }

              const modifiers = node.modifiers?.map((modifier) =>
                ts.visitNode(
                  modifier,
                  visitor(identifierMap, denyListIdentifiers),
                )
              );

              node = ts.factory.updateClassDeclaration(
                node,
                modifiers,
                name,
                node.typeParameters,
                node.heritageClauses,
                node.members,
              );
            } else if (ts.isEnumDeclaration(node)) {
              let name = node.name;
              if (ts.isIdentifier(name)) {
                const text = name.text;
                if (denyListIdentifiers.has(text)) {
                  const nextIdentifier = createNextIdentifier(
                    text,
                    denyListIdentifiers,
                  );
                  denyListIdentifiers.add(nextIdentifier);
                  name = ts.factory.createIdentifier(nextIdentifier);
                  identifierMap.set(text, nextIdentifier);
                } else {
                  identifierMap.delete(text);
                  denyListIdentifiers.add(text);
                }
              }
              const modifiers = node.modifiers?.map((modifier) =>
                ts.visitNode(
                  modifier,
                  visitor(identifierMap, denyListIdentifiers),
                )
              );
              node = ts.factory.updateEnumDeclaration(
                node,
                modifiers,
                name,
                node.members,
              );
            } else if (ts.isConstructorDeclaration(node)) {
              const newIdentifierMap: Map<string, string> = new Map(
                identifierMap,
              );
              const newDenyListIdentifiers = new Set(denyListIdentifiers);

              const parameters = node.parameters.map((parameter) => {
                let name = parameter.name;
                if (ts.isIdentifier(name)) {
                  const text = name.text;
                  if (newDenyListIdentifiers.has(text)) {
                    const nextIdentifier = createNextIdentifier(
                      text,
                      newDenyListIdentifiers,
                    );
                    newDenyListIdentifiers.add(nextIdentifier);
                    name = ts.factory.createIdentifier(nextIdentifier);
                    newIdentifierMap.set(text, nextIdentifier);

                    parameter = ts.factory.updateParameterDeclaration(
                      parameter,
                      parameter.modifiers,
                      parameter.dotDotDotToken,
                      name,
                      parameter.questionToken,
                      parameter.type,
                      parameter.initializer,
                    );
                  } else {
                    newIdentifierMap.delete(text);
                    newDenyListIdentifiers.add(text);
                  }
                  return parameter;
                }
                return ts.visitNode(
                  parameter,
                  visitor(newIdentifierMap, newDenyListIdentifiers),
                );
              });
              const modifiers = node.modifiers?.map((modifier) => {
                return ts.visitNode(
                  modifier,
                  visitor(identifierMap, denyListIdentifiers),
                );
              });

              return ts.factory.updateConstructorDeclaration(
                node,
                modifiers,
                parameters,
                ts.visitNode(
                  node.body,
                  visitor(newIdentifierMap, newDenyListIdentifiers),
                ),
              );
            } else if (ts.isMethodDeclaration(node)) {
              const newIdentifierMap: Map<string, string> = new Map(
                identifierMap,
              );
              const newDenyListIdentifiers = new Set(denyListIdentifiers);

              const parameters = node.parameters.map((parameter) => {
                let name = parameter.name;
                if (ts.isIdentifier(name)) {
                  const text = name.text;
                  if (newDenyListIdentifiers.has(text)) {
                    const nextIdentifier = createNextIdentifier(
                      text,
                      newDenyListIdentifiers,
                    );
                    newDenyListIdentifiers.add(nextIdentifier);
                    name = ts.factory.createIdentifier(nextIdentifier);
                    newIdentifierMap.set(text, nextIdentifier);

                    parameter = ts.factory.updateParameterDeclaration(
                      parameter,
                      parameter.modifiers,
                      parameter.dotDotDotToken,
                      name,
                      parameter.questionToken,
                      parameter.type,
                      parameter.initializer,
                    );
                  } else {
                    newIdentifierMap.delete(text);
                    newDenyListIdentifiers.add(text);
                  }
                  return parameter;
                }
                return ts.visitNode(
                  parameter,
                  visitor(newIdentifierMap, newDenyListIdentifiers),
                );
              });

              const modifiers = node.modifiers?.map((modifier) =>
                ts.visitNode(
                  modifier,
                  visitor(identifierMap, denyListIdentifiers),
                )
              );

              return ts.factory.updateMethodDeclaration(
                node,
                modifiers,
                node.asteriskToken,
                node.name,
                node.questionToken,
                node.typeParameters,
                parameters,
                node.type,
                ts.visitNode(
                  node.body,
                  visitor(newIdentifierMap, newDenyListIdentifiers),
                ),
              );
            } else if (ts.isPropertyDeclaration(node)) {
              const modifiers = node.modifiers?.map((modifier) =>
                ts.visitNode(
                  modifier,
                  visitor(identifierMap, denyListIdentifiers),
                )
              );

              return ts.factory.updatePropertyDeclaration(
                node,
                modifiers,
                node.name,
                node.questionToken,
                node.type,
                ts.visitNode(
                  node.initializer,
                  visitor(identifierMap, denyListIdentifiers),
                ),
              );
            } else if (ts.isGetAccessor(node)) {
              const newIdentifierMap: Map<string, string> = new Map(
                identifierMap,
              );
              const newDenyListIdentifiers = new Set(denyListIdentifiers);

              const parameters = node.parameters.map((parameter) => {
                let name = parameter.name;
                if (ts.isIdentifier(name)) {
                  const text = name.text;
                  if (newDenyListIdentifiers.has(text)) {
                    const nextIdentifier = createNextIdentifier(
                      text,
                      newDenyListIdentifiers,
                    );
                    newDenyListIdentifiers.add(nextIdentifier);
                    name = ts.factory.createIdentifier(nextIdentifier);
                    newIdentifierMap.set(text, nextIdentifier);

                    parameter = ts.factory.updateParameterDeclaration(
                      parameter,
                      parameter.modifiers,
                      parameter.dotDotDotToken,
                      name,
                      parameter.questionToken,
                      parameter.type,
                      parameter.initializer,
                    );
                  } else {
                    newIdentifierMap.delete(text);
                    newDenyListIdentifiers.add(text);
                  }
                  return parameter;
                }
                return ts.visitNode(
                  parameter,
                  visitor(newIdentifierMap, newDenyListIdentifiers),
                );
              });

              const modifiers = node.modifiers?.map((modifier) =>
                ts.visitNode(
                  modifier,
                  visitor(identifierMap, denyListIdentifiers),
                )
              );

              return ts.factory.updateGetAccessorDeclaration(
                node,
                modifiers,
                node.name,
                parameters,
                node.type,
                ts.visitNode(
                  node.body,
                  visitor(newIdentifierMap, newDenyListIdentifiers),
                ),
              );
            } else if (ts.isSetAccessor(node)) {
              const newIdentifierMap: Map<string, string> = new Map(
                identifierMap,
              );
              const newDenyListIdentifiers = new Set(denyListIdentifiers);

              const parameters = node.parameters.map((parameter) => {
                let name = parameter.name;
                if (ts.isIdentifier(name)) {
                  const text = name.text;
                  if (newDenyListIdentifiers.has(text)) {
                    const nextIdentifier = createNextIdentifier(
                      text,
                      newDenyListIdentifiers,
                    );
                    newDenyListIdentifiers.add(nextIdentifier);
                    name = ts.factory.createIdentifier(nextIdentifier);
                    newIdentifierMap.set(text, nextIdentifier);

                    parameter = ts.factory.updateParameterDeclaration(
                      parameter,
                      parameter.modifiers,
                      parameter.dotDotDotToken,
                      name,
                      parameter.questionToken,
                      parameter.type,
                      parameter.initializer,
                    );
                  } else {
                    newIdentifierMap.delete(text);
                    newDenyListIdentifiers.add(text);
                  }
                  return parameter;
                }
                return ts.visitNode(
                  parameter,
                  visitor(newIdentifierMap, newDenyListIdentifiers),
                );
              });
              const modifiers = node.modifiers?.map((modifier) =>
                ts.visitNode(
                  modifier,
                  visitor(identifierMap, denyListIdentifiers),
                )
              );

              return ts.factory.updateSetAccessorDeclaration(
                node,
                modifiers,
                node.name,
                parameters,
                ts.visitNode(
                  node.body,
                  visitor(newIdentifierMap, newDenyListIdentifiers),
                ),
              );
            } else if (ts.isFunctionExpression(node)) {
              const newDenyListIdentifiers = new Set(denyListIdentifiers);
              const newIdentifierMap = new Map(identifierMap);
              const parameters = node.parameters.map((parameter) => {
                let name = parameter.name;
                if (ts.isIdentifier(name)) {
                  const text = name.text;
                  if (newDenyListIdentifiers.has(text)) {
                    const nextIdentifier = createNextIdentifier(
                      text,
                      newDenyListIdentifiers,
                    );
                    newDenyListIdentifiers.add(nextIdentifier);
                    name = ts.factory.createIdentifier(nextIdentifier);
                    newIdentifierMap.set(text, nextIdentifier);

                    parameter = ts.factory.updateParameterDeclaration(
                      parameter,
                      parameter.modifiers,
                      parameter.dotDotDotToken,
                      name,
                      parameter.questionToken,
                      parameter.type,
                      parameter.initializer,
                    );
                  } else {
                    newIdentifierMap.delete(text);
                    newDenyListIdentifiers.add(text);
                  }
                  return parameter;
                }
                return ts.visitNode(
                  parameter,
                  visitor(newIdentifierMap, newDenyListIdentifiers),
                );
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
                  visitor(newIdentifierMap, newDenyListIdentifiers),
                ),
              );
            } else if (ts.isPropertyAccessExpression(node)) {
              // x.a
              return ts.factory.updatePropertyAccessExpression(
                node,
                ts.visitNode(
                  node.expression,
                  visitor(identifierMap, denyListIdentifiers),
                ),
                node.name,
              );
            } else if (ts.isArrayBindingPattern(node)) {
              // const [x] = y;
              const elements = node.elements.map((element) => {
                if (
                  ts.isBindingElement(element)
                ) {
                  let name = element.name;
                  if (ts.isIdentifier(name)) {
                    const text = name.text;
                    if (denyListIdentifiers.has(text)) {
                      const nextIdentifier = createNextIdentifier(
                        text,
                        denyListIdentifiers,
                      );
                      denyListIdentifiers.add(nextIdentifier);
                      name = ts.factory.createIdentifier(nextIdentifier);

                      identifierMap.set(text, nextIdentifier);
                    } else {
                      identifierMap.delete(text);
                      denyListIdentifiers.add(text);
                    }
                    element = ts.factory.updateBindingElement(
                      element,
                      element.dotDotDotToken,
                      element.propertyName,
                      name,
                      ts.visitNode(
                        element.initializer,
                        visitor(identifierMap, denyListIdentifiers),
                      ),
                    );
                  } else {
                    element = ts.visitNode(
                      element,
                      visitor(identifierMap, denyListIdentifiers),
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
              const elements = node.elements.map((element) => {
                if (
                  ts.isBindingElement(element)
                ) {
                  let propertyName = element.propertyName;
                  let name = element.name;

                  if (ts.isIdentifier(name)) {
                    const text = name.text;

                    if (denyListIdentifiers.has(text)) {
                      const nextIdentifier = createNextIdentifier(
                        text,
                        denyListIdentifiers,
                      );

                      denyListIdentifiers.add(nextIdentifier);
                      if (!propertyName && !element.dotDotDotToken) {
                        // add propertyName { propertyName: name } but ignore { ...name }
                        propertyName = ts.factory.createIdentifier(text);
                      }
                      name = ts.factory.createIdentifier(nextIdentifier);

                      identifierMap.set(text, nextIdentifier);
                    } else {
                      identifierMap.delete(text);
                      denyListIdentifiers.add(text);
                    }

                    element = ts.factory.updateBindingElement(
                      element,
                      element.dotDotDotToken,
                      propertyName,
                      name,
                      ts.visitNode(
                        element.initializer,
                        visitor(identifierMap, denyListIdentifiers),
                      ),
                    );
                  } else {
                    element = ts.visitNode(
                      element,
                      visitor(identifierMap, denyListIdentifiers),
                    );
                  }
                }
                return element;
              });
              return ts.factory.updateObjectBindingPattern(
                node,
                elements,
              );
            } else if (ts.isShorthandPropertyAssignment(node)) {
              if (ts.isIdentifier(node.name)) {
                const text = node.name.text;
                const identifier = identifierMap.get(text) ?? text;
                if (identifier !== text) {
                  return ts.factory.createPropertyAssignment(
                    node.name,
                    ts.factory.createIdentifier(identifier),
                  );
                }
              }
            } else if (ts.isPropertyAssignment(node)) {
              // prevents object key to change if it is an identifier
              if (ts.isIdentifier(node.name)) {
                return ts.factory.updatePropertyAssignment(
                  node,
                  node.name,
                  ts.visitNode(
                    node.initializer,
                    visitor(identifierMap, denyListIdentifiers),
                  ),
                );
              }
            } else if (ts.isBlock(node)) {
              const newIdentifierMap = new Map(identifierMap);
              const newDenyListIdentifiers = new Set(denyListIdentifiers);
              return ts.visitEachChild(
                node,
                visitor(newIdentifierMap, newDenyListIdentifiers),
                context,
              );
            } else if (ts.isIdentifier(node)) {
              const text = node.text;
              const identifier = identifierMap.get(text) ?? text;
              return ts.factory.createIdentifier(identifier);
            }

            return ts.visitEachChild(
              node,
              visitor(identifierMap, denyListIdentifiers),
              context,
            );
          };

          return visitor(identifierMap, denyListIdentifiers)(child);
        },
      );
    };
  };
}

export function injectIdentifiersFromSourceFile(
  sourceFile: ts.SourceFile,
  identifierMap: Map<string, string>,
  denyListIdentifiers: Set<string>,
  compilerOptions?: ts.CompilerOptions,
) {
  const { transformed } = ts.transform(sourceFile, [
    injectIdentifiersTransformer(
      identifierMap,
      denyListIdentifiers,
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
  denyListIdentifiers: Set<string>,
  compilerOptions?: ts.CompilerOptions,
) {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.ESNext,
    undefined,
    ts.ScriptKind.Unknown,
  );

  return injectIdentifiersFromSourceFile(
    sourceFile,
    identifierMap,
    denyListIdentifiers,
    compilerOptions,
  );
}
