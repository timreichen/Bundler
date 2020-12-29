import { Data, Plugin, Source, TestFunction } from "../plugin.ts";
import { addRelativePrefix } from "../../_util.ts";
import { path, ts } from "../../deps.ts";

const printer = ts.createPrinter(
  { removeComments: false },
);
const sourceFile = ts.createSourceFile("x.ts", "", ts.ScriptTarget.Latest);

export class InstanciateImagePlugin extends Plugin {
  constructor(
    { test = (input: string) => /\.(png|jpe?g|ico)$/.test(input) }: {
      test?: TestFunction;
    } = {},
  ) {
    super({ test });
  }
  async transform(
    input: string,
    source: Source,
    bundleInput: string,
    data: Data,
  ) {
    const { graph } = data;

    const { output: outputFilePath } = graph[input];
    const { output: bundleOutput } = graph[bundleInput];
    const relativeOutputFilePath = addRelativePrefix(
      path.relative(path.dirname(bundleOutput), outputFilePath),
    );
    const declarations = [
      ts.factory.createVariableStatement(
        undefined,
        ts.factory.createVariableDeclarationList(
          [ts.factory.createVariableDeclaration(
            ts.factory.createIdentifier("i"),
            undefined,
            undefined,
            ts.factory.createNewExpression(
              ts.factory.createIdentifier("Image"),
              undefined,
              [],
            ),
          )],
          ts.NodeFlags.Const,
        ),
      ),
      ts.factory.createExpressionStatement(ts.factory.createBinaryExpression(
        ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier("i"),
          ts.factory.createIdentifier("src"),
        ),
        ts.factory.createToken(ts.SyntaxKind.EqualsToken),
        ts.factory.createStringLiteral(relativeOutputFilePath),
      )),
      ts.factory.createExportAssignment(
        undefined,
        undefined,
        undefined,
        ts.factory.createIdentifier("i"),
      ),
    ];

    return printer.printList(
      ts.ListFormat.SourceFileStatements,
      ts.factory.createNodeArray(declarations),
      sourceFile,
    );
    return `
    const image = new Image();
    image.src = "${relativeOutputFilePath}";
    export default image;
    `;
  }
}
