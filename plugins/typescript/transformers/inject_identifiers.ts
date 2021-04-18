import { ts } from "../../../deps.ts";

export function typescriptInjectIdentifiersTransformer(
  identifierMap: Map<string, string>,
  blacklistIdentifiers: Set<string>,
) {
  return (context: ts.TransformationContext) => {
    const visitor = (sourceFile: ts.SourceFile) =>
      (identifierMap: Map<string, string>): ts.Visitor =>
        (node: ts.Node) => {
          if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
            // const x = "x"
            const text = node.name.text;
            const identifier = identifierMap.get(text) || text;
            node = ts.factory.updateVariableDeclaration(
              node,
              ts.factory.createIdentifier(identifier),
              node.exclamationToken,
              node.type,
              node.initializer,
            );
          } else if (ts.isCallExpression(node)) {
            // console.log(x)
            let expression = node.expression;
            if (ts.isIdentifier(expression)) {
              const text = expression.text;
              const identifier = identifierMap.get(text) || text;
              expression = ts.factory.createIdentifier(identifier);
            }
            node = ts.factory.updateCallExpression(
              node,
              expression,
              node.typeArguments,
              node.arguments.map((arg) => {
                if (
                  ts.isIdentifier(arg)
                ) {
                  const text = arg.text;
                  const identifier = identifierMap.get(text) || text;
                  return ts.factory.createIdentifier(identifier);
                }
                return arg;
              }),
            );
          } else if (ts.isFunctionDeclaration(node)) {
            // function x() { }
            let name = node.name;
            if (name) {
              const text = name.text;
              const identifier = identifierMap.get(text) || text;
              name = ts.factory.createIdentifier(identifier);
            }

            const newIdentifierMap = new Map(identifierMap);
            node.parameters.forEach((parameter) => {
              if (
                ts.isIdentifier(parameter.name) &&
                !blacklistIdentifiers.has(parameter.name.text)
              ) {
                newIdentifierMap.delete(parameter.name.text);
              }
            });

            node = ts.factory.updateFunctionDeclaration(
              node,
              node.decorators,
              node.modifiers,
              node.asteriskToken,
              name,
              node.typeParameters,
              node.parameters,
              node.type,
              node.body,
            );
            return ts.visitEachChild(
              node,
              visitor(sourceFile)(newIdentifierMap),
              context,
            );
          } else if (ts.isClassDeclaration(node) && node.name) {
            const text = node.name.text;
            const identifier = identifierMap.get(text) || text;
            node = ts.factory.updateClassDeclaration(
              node,
              node.decorators,
              node.modifiers,
              ts.factory.createIdentifier(identifier),
              node.typeParameters,
              node.heritageClauses,
              node.members,
            );
          } else if (ts.isArrayLiteralExpression(node)) {
            // const a = [x, y, z]
            node = ts.factory.updateArrayLiteralExpression(
              node,
              node.elements.map((element) => {
                if (ts.isIdentifier(element)) {
                  const text = element.text;
                  const identifier = identifierMap.get(text) || text;
                  return ts.factory.createIdentifier(identifier);
                }
                return element;
              }),
            );
          } else if (ts.isObjectLiteralExpression(node)) {
            // const a = { x, y, z: x }
            node = ts.factory.updateObjectLiteralExpression(
              node,
              node.properties.map((property) => {
                if (
                  ts.isPropertyAssignment(property) &&
                  ts.isIdentifier(property.initializer)
                ) {
                  const text = property.initializer.text;
                  const identifier = identifierMap.get(text) || text;
                  property = ts.factory.updatePropertyAssignment(
                    property,
                    property.name,
                    ts.factory.createIdentifier(identifier),
                  );
                } else if (ts.isShorthandPropertyAssignment(property)) {
                  const text = property.name.text;
                  const identifier = identifierMap.get(text) || text;
                  property = ts.factory.updateShorthandPropertyAssignment(
                    property,
                    ts.factory.createIdentifier(identifier),
                    property.objectAssignmentInitializer,
                  );
                }
                return property;
              }),
            );
          } else if (
            // x.a
            ts.isPropertyAccessExpression(node) &&
            ts.isIdentifier(node.expression)
          ) {
            const text = node.expression.text;
            const identifier = identifierMap.get(text) || text;
            node = ts.factory.updatePropertyAccessExpression(
              node,
              ts.factory.createIdentifier(identifier),
              node.name,
            );
          } else if (
            // x["a"]
            ts.isElementAccessExpression(node) &&
            ts.isIdentifier(node.expression)
          ) {
            const text = node.expression.text;
            const identifier = identifierMap.get(text) || text;
            node = ts.factory.updateElementAccessExpression(
              node,
              ts.factory.createIdentifier(identifier),
              node.argumentExpression,
            );
          } else if (
            ts.isTypeOfExpression(node) && ts.isIdentifier(node.expression)
          ) {
            // typeof x
            const text = node.expression.text;
            const identifier = identifierMap.get(text) || text;
            node = ts.factory.updateTypeOfExpression(
              node,
              ts.factory.createIdentifier(identifier),
            );
          } else if (ts.isBinaryExpression(node)) {
            // x instanceof x
            //x += 1
            let left = node.left;
            let right = node.right;
            if (ts.isIdentifier(node.left)) {
              const text = node.left.text;
              const identifier = identifierMap.get(text) || text;
              left = ts.factory.createIdentifier(identifier);
            }
            if (ts.isIdentifier(node.right)) {
              const text = node.right.text;
              const identifier = identifierMap.get(text) || text;
              right = ts.factory.createIdentifier(identifier);
            }
            node = ts.factory.updateBinaryExpression(
              node,
              left,
              node.operatorToken,
              right,
            );
          } else if (
            ts.isPrefixUnaryExpression(node) && ts.isIdentifier(node.operand)
          ) {
            // ++x
            const text = node.operand.text;
            const identifier = identifierMap.get(text) || text;
            node = ts.factory.updatePrefixUnaryExpression(
              node,
              ts.factory.createIdentifier(identifier),
            );
          } else if (
            ts.isPostfixUnaryExpression(node) && ts.isIdentifier(node.operand)
          ) {
            // x++
            const text = node.operand.text;
            const identifier = identifierMap.get(text) || text;
            node = ts.factory.updatePostfixUnaryExpression(
              node,
              ts.factory.createIdentifier(identifier),
            );
          } else if (ts.isConditionalExpression(node)) {
            // x ? x : x
            let condition = node.condition;
            let whenTrue = node.whenTrue;
            let whenFalse = node.whenFalse;
            if (ts.isIdentifier(condition)) {
              const text = condition.text;
              const identifier = identifierMap.get(text) || text;
              condition = ts.factory.createIdentifier(identifier);
            }
            if (ts.isIdentifier(whenTrue)) {
              const text = whenTrue.text;
              const identifier = identifierMap.get(text) || text;
              whenTrue = ts.factory.createIdentifier(identifier);
            }
            if (ts.isIdentifier(whenFalse)) {
              const text = whenFalse.text;
              const identifier = identifierMap.get(text) || text;
              whenFalse = ts.factory.createIdentifier(identifier);
            }
            node = ts.factory.updateConditionalExpression(
              node,
              condition,
              node.questionToken,
              whenTrue,
              node.colonToken,
              whenFalse,
            );
          } else if (ts.isIfStatement(node)) {
            // if (x) { }
            let expression = node.expression;
            if (ts.isIdentifier(expression)) {
              const text = expression.text;
              const identifier = identifierMap.get(text) || text;
              expression = ts.factory.createIdentifier(identifier);
            }
            node = ts.factory.updateIfStatement(
              node,
              expression,
              node.thenStatement,
              node.elseStatement,
            );
          } else if (ts.isSwitchStatement(node)) {
            // switch (x) { }
            let expression = node.expression;
            if (ts.isIdentifier(expression)) {
              const text = expression.text;
              const identifier = identifierMap.get(text) || text;
              expression = ts.factory.createIdentifier(identifier);
            }
            node = ts.factory.updateSwitchStatement(
              node,
              expression,
              node.caseBlock,
            );
          } else if (ts.isCaseClause(node)) {
            let expression = node.expression;
            if (ts.isIdentifier(expression)) {
              const text = expression.text;
              const identifier = identifierMap.get(text) || text;
              expression = ts.factory.createIdentifier(identifier);
            }
            node = ts.factory.updateCaseClause(
              node,
              expression,
              node.statements,
            );
          } else if (ts.isWhileStatement(node)) {
            // while (x) { }
            let expression = node.expression;
            if (ts.isIdentifier(expression)) {
              const text = expression.text;
              const identifier = identifierMap.get(text) || text;
              expression = ts.factory.createIdentifier(identifier);
            }
            node = ts.factory.updateWhileStatement(
              node,
              expression,
              node.statement,
            );
          } else if (ts.isDoStatement(node)) {
            // do {} while (x) { }
            let expression = node.expression;
            if (ts.isIdentifier(expression)) {
              const text = expression.text;
              const identifier = identifierMap.get(text) || text;
              expression = ts.factory.createIdentifier(identifier);
            }
            node = ts.factory.updateDoStatement(
              node,
              node.statement,
              expression,
            );
          } else if (ts.isNewExpression(node)) {
            // new x()
            let expression = node.expression;
            if (ts.isIdentifier(expression)) {
              const text = expression.text;
              const identifier = identifierMap.get(text) || text;
              expression = ts.factory.createIdentifier(identifier);
            }
            node = ts.factory.updateNewExpression(
              node,
              expression,
              node.typeArguments,
              node.arguments,
            );
          } else if (ts.isEnumDeclaration(node)) {
            let name = node.name;
            if (ts.isIdentifier(name)) {
              const text = name.text;
              const identifier = identifierMap.get(text) || text;
              name = ts.factory.createIdentifier(identifier);
            }
            node = ts.factory.updateEnumDeclaration(
              node,
              node.decorators,
              node.modifiers,
              name,
              node.members,
            );
          }

          return ts.visitEachChild(
            node,
            visitor(sourceFile)(identifierMap),
            context,
          );
        };
    return (node: ts.SourceFile) =>
      ts.visitNode(
        node,
        (child: ts.Node) => visitor(node)(identifierMap)(child),
      );
  };
}
