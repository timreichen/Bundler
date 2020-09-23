import { ts } from "./deps.ts";

const printer: ts.Printer = ts.createPrinter(
  { newLine: ts.NewLineKind.LineFeed, removeComments: false },
);

export function createInstantiateString(path: string) {
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
