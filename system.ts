import { ts } from "./deps.ts";

const printer: ts.Printer = ts.createPrinter(
  { newLine: ts.NewLineKind.LineFeed, removeComments: false },
);

export function instantiateString(path: string) {
  const __exp = ts.createVariableStatement(
    undefined,
    ts.createVariableDeclarationList(
      [ts.createVariableDeclaration(
        ts.createIdentifier("__exp"),
        undefined,
        ts.createCall(
          ts.createIdentifier("__instantiate"),
          undefined,
          [
            ts.createStringLiteral(path),
            ts.createFalse(),
          ],
        ),
      )],
      ts.NodeFlags.Const,
    ),
  );
  return printer.printNode(ts.EmitHint.Unspecified, __exp, undefined);
}

function exportString(key: string, value: string) {
  const statement = ts.createVariableStatement(
    [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.createVariableDeclarationList(
      [ts.createVariableDeclaration(
        ts.createIdentifier(key),
        undefined,
        ts.createElementAccess(
          ts.createIdentifier("__exp"),
          ts.createStringLiteral(value),
        ),
      )],
      ts.NodeFlags.Const,
    ),
  );

  return printer.printNode(ts.EmitHint.Unspecified, statement, undefined);
}

function defaultExportString(value: string) {
  const assignment = ts.createExportAssignment(
    undefined,
    undefined,
    undefined,
    ts.createElementAccess(
      ts.createIdentifier("__exp"),
      ts.createStringLiteral(value),
    ),
  );
  return printer.printNode(ts.EmitHint.Unspecified, assignment, undefined);
}

export function createSystemExports(exports: string[]) {
  let string = "";
  for (const key of exports) {
    string += `\n`;
    switch (key) {
      case "default": {
        string += defaultExportString(key);
        break;
      }
      default: {
        string += exportString(key, key);
        break;
      }
    }
  }
  return string;
}

export async function systemLoader() {
  // return await fetch(
  //   "https://raw.githubusercontent.com/denoland/deno/master/cli/system_loader.js",
  // ).then((data) => data.text());

  // minified content of https://raw.githubusercontent.com/denoland/deno/master/cli/system_loader.js
  return `"use strict";let System,__instantiate;(()=>{const e=new Map;function t(t,n){return{id:t,import:n=>async function(t,n){let r=t.replace(/\.\w+$/i,"");if(r.includes("./")){const[e,...t]=r.split("/").reverse(),[,...s]=n.split("/").reverse(),i=[e];let o,f=0;for(;o=t.shift();)if(".."===o)f++;else{if("."===o)break;i.push(o)}f<s.length&&i.push(...s.slice(f)),r=i.reverse().join("/")}return e.has(r)?s(r):import(t)}(n,t),meta:{url:t,main:n}}}function n(e){return(t,n)=>{n="string"==typeof t?{[t]:n}:t;for(const[t,s]of Object.entries(n))Object.defineProperty(e,t,{value:s,writable:!0,enumerable:!0})}}async function s(t){if(!e.has(t))return;const n=e.get(t);if(n.s){const{d:e,e:t,s:r}=n;delete n.s,delete n.e;for(let t=0;t<r.length;t++)r[t](await s(e[t]));const i=t();i&&await i}return n.exp}System={register(t,n,s){e.set(t,{d:n,f:s,exp:{}})}},__instantiate=(r,i)=>(System=__instantiate=void 0,function(s){for(const[r,i]of e.entries()){const{f:e,exp:o}=i,{execute:f,setters:c}=e(n(o),t(r,r===s));delete i.f,i.e=f,i.s=c}}(r),i?s(r):function t(n){if(!e.has(n))return;const s=e.get(n);if(s.s){const{d:e,e:n,s:r}=s;delete s.s,delete s.e;for(let n=0;n<r.length;n++)r[n](t(e[n]));n()}return s.exp}(r))})();`;
}

export function systemLoaderWrapperInit() {
  const systemLoaderWrapperInit = [
    ts.createImportDeclaration(
      undefined,
      undefined,
      ts.createImportClause(
        ts.createIdentifier("init"),
        undefined,
        false,
      ),
      ts.createStringLiteral("./loader.js"),
    ),
    ts.createVariableStatement(
      undefined,
      ts.createVariableDeclarationList(
        [ts.createVariableDeclaration(
          ts.createObjectBindingPattern([
            ts.createBindingElement(
              undefined,
              undefined,
              ts.createIdentifier("System"),
              undefined,
            ),
            ts.createBindingElement(
              undefined,
              undefined,
              ts.createIdentifier("__instantiate"),
              undefined,
            ),
          ]),
          undefined,
          ts.createCall(
            ts.createIdentifier("init"),
            undefined,
            [],
          ),
        )],
        ts.NodeFlags.Let,
      ),
    ),
  ];
  return printer.printNode(
    ts.EmitHint.Unspecified,
    systemLoaderWrapperInit,
    undefined,
  );
}

export function injectInstantiateName(specifier: string) {
  return (context: ts.TransformationContext) => {
    const visit: ts.Visitor = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        node.expression?.expression?.escapedText === "System" &&
        node.expression?.name?.escapedText === "register"
      ) {
        node.arguments = [ts.createLiteral(specifier), ...node.arguments];
        return node;
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (node: ts.Node) => {
      return ts.visitNode(node, visit);
    };
  };
}
