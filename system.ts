import { xts } from "./deps.ts";

const printer: xts.Printer = xts.createPrinter(
  { newLine: xts.NewLineKind.LineFeed, removeComments: false },
);

export function createInstantiate(path: string): string {
  const __exp = xts.createVariableStatement(
    undefined,
    xts.createVariableDeclarationList(
      [xts.createVariableDeclaration(
        xts.createIdentifier("__exp"),
        undefined,
        xts.createCall(
          xts.createIdentifier("__instantiate"),
          undefined,
          [
            xts.createStringLiteral(path),
            xts.createFalse(),
          ],
        ),
      )],
      xts.NodeFlags.Const,
    ),
  );
  return printer.printNode(xts.EmitHint.Unspecified, __exp, undefined);
}

function exportString(key: string, value: string) {
  const statement = xts.createVariableStatement(
    [xts.createModifier(xts.SyntaxKind.ExportKeyword)],
    xts.createVariableDeclarationList(
      [xts.createVariableDeclaration(
        xts.createIdentifier(key),
        undefined,
        xts.createElementAccess(
          xts.createIdentifier("__exp"),
          xts.createStringLiteral(value),
        ),
      )],
      xts.NodeFlags.Const,
    ),
  );

  return printer.printNode(xts.EmitHint.Unspecified, statement, undefined);
}

function defaultExportString(value: string) {
  const assignment = xts.createExportAssignment(
    undefined,
    undefined,
    undefined,
    xts.createElementAccess(
      xts.createIdentifier("__exp"),
      xts.createStringLiteral(value),
    ),
  );
  return printer.printNode(xts.EmitHint.Unspecified, assignment, undefined);
}

export function createSystemExports(exports: string[]): string {
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

export async function createSystemLoader() {
  // return await fetch(
  //   "https://raw.githubusercontent.com/denoland/deno/master/cli/system_loader.js",
  // ).then((data) => data.text());

  // content of https://raw.githubusercontent.com/denoland/deno/master/cli/system_loader.js
  return `// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.

  // This is a specialised implementation of a System module loader.
  
  "use strict";
  
  // @ts-nocheck
  /* eslint-disable */
  let System, __instantiate;
  (() => {
    const r = new Map();
  
    System = {
      register(id, d, f) {
        r.set(id, { d, f, exp: {} });
      },
    };
    async function dI(mid, src) {
      let id = mid.replace(/\.\w+$/i, "");
      if (id.includes("./")) {
        const [o, ...ia] = id.split("/").reverse(),
          [, ...sa] = src.split("/").reverse(),
          oa = [o];
        let s = 0,
          i;
        while ((i = ia.shift())) {
          if (i === "..") s++;
          else if (i === ".") break;
          else oa.push(i);
        }
        if (s < sa.length) oa.push(...sa.slice(s));
        id = oa.reverse().join("/");
      }
      return r.has(id) ? gExpA(id) : import(mid);
    }
  
    function gC(id, main) {
      return {
        id,
        import: (m) => dI(m, id),
        meta: { url: id, main },
      };
    }
  
    function gE(exp) {
      return (id, v) => {
        v = typeof id === "string" ? { [id]: v } : id;
        for (const [id, value] of Object.entries(v)) {
          Object.defineProperty(exp, id, {
            value,
            writable: true,
            enumerable: true,
          });
        }
      };
    }
  
    function rF(main) {
      for (const [id, m] of r.entries()) {
        const { f, exp } = m;
        const { execute: e, setters: s } = f(gE(exp), gC(id, id === main));
        delete m.f;
        m.e = e;
        m.s = s;
      }
    }
  
    async function gExpA(id) {
      if (!r.has(id)) return;
      const m = r.get(id);
      if (m.s) {
        const { d, e, s } = m;
        delete m.s;
        delete m.e;
        for (let i = 0; i < s.length; i++) s[i](await gExpA(d[i]));
        const r = e();
        if (r) await r;
      }
      return m.exp;
    }
  
    function gExp(id) {
      if (!r.has(id)) return;
      const m = r.get(id);
      if (m.s) {
        const { d, e, s } = m;
        delete m.s;
        delete m.e;
        for (let i = 0; i < s.length; i++) s[i](gExp(d[i]));
        e();
      }
      return m.exp;
    }
    __instantiate = (m, a) => {
      System = __instantiate = undefined;
      rF(m);
      return a ? gExpA(m) : gExp(m);
    };
  })();`;
}

export function injectInstantiateNameTransformer(specifier: string) {
  return (context: xts.TransformationContext) => {
    const visit: xts.Visitor = (node: xts.Node) => {
      if (
        xts.isCallExpression(node) &&
        node.expression?.expression?.escapedText === "System" &&
        node.expression?.name?.escapedText === "register"
      ) {
        node.arguments = [xts.createLiteral(specifier), ...node.arguments];
        return node;
      }
      return xts.visitEachChild(node, visit, context);
    };
    return (node: xts.Node) => {
      return xts.visitNode(node, visit);
    };
  };
}
