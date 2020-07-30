import { parse } from "https://deno.land/std/flags/mod.ts";

const PADDING = " ".repeat(4);

function rquiredValue(name: string) {
  return `<${name}>`;
}
function optionalValue(name: string) {
  return `[${name}]`;
}
function stringifyFlag({ name, value, alias, description }: Flag) {
  const valueString = value &&
    (value.optional ? optionalValue(value.name) : rquiredValue(value.name));
  const aliasString = `${alias ? `-${alias},` : ``}`;
  let string = "";
  string += `${PADDING}${aliasString.padEnd(4, " ")} --${name}${
    value ? value.equal ? `=${valueString}` : ` ${valueString}` : ""
  }`;
  string += `\n`;
  string += `${
    description.split(/\n/).map((line) => `${PADDING.repeat(3)}${line}`).join(
      `\n`,
    )
  }`;
  return string;
}
function stringifyArgument({ name, optional, multiple }: Argument) {
  return `${
    optional ? optionalValue(name) : rquiredValue(name)
  }${(multiple && "...") || ""}`;
}

export interface Value {
  name: string;
  optional?: boolean;
  equal?: boolean;
}

export class Flag {
  name: string;
  value?: Value;
  alias?: string;
  boolean?: boolean;
  description: string;
  constructor(
    { name, value, boolean, alias, description }: {
      name: string;
      value?: Value;
      boolean?: boolean;
      alias?: string;
      description: string;
    },
  ) {
    this.name = name;
    this.alias = alias;
    this.boolean = boolean;
    this.value = value;
    this.description = description;
  }
}

export interface Argument {
  name: string;
  optional?: boolean;
  multiple?: boolean;
}

export class Command {
  name: string;
  description: string;
  flags: { [name: string]: Flag };
  args: { [name: string]: Argument };
  _fn: Function;
  constructor({ name, description }: { name: string; description: string }) {
    this.name = name;
    this.description = description;
    this.flags = {};
    this.args = {};
    this._fn = () => {};
  }
  flag(flag: Flag) {
    this.flags[flag.name] = flag;
    return this;
  }
  argument(argument: Argument) {
    this.args[argument.name] = argument;
    return this;
  }
  help() {
    const args = Object.values(this.args);
    const argsStrings = args.map((argument) => stringifyArgument(argument));
    let string = "";
    string += (`${this.name}`);
    string += (`\n`);
    string += (`${this.description}`);
    string += (`\n`);
    string += (`\n`);
    string += (`USAGE:`);
    string += (`\n`);
    string += (`${PADDING}${this.name} [OPTIONS] ${argsStrings.join(" ")}`);
    string += (`\n`);
    string += (`\n`);
    string += (`OPTIONS:`);
    string += (`\n`);
    string += Object.values(this.flags).sort((a, b) =>
      a.name.localeCompare(b.name)
    ).map((flag) => stringifyFlag(flag)).join(`\n`);
    string += (`\n`);
    string += (`ARGS:`);
    string += (`\n`);
    string += argsStrings.map((argString) => `${PADDING.repeat(2)}${argString}`)
      .join(`\n`);
    return string;
  }
  run(args: string[]) {
    const flags = Object.values(this.flags);
    const argParsingOptions = {
      boolean: flags.filter((flag) => flag.boolean).map((flag) => flag.name),
      alias: flags.reduce((object, flag) => {
        if (flag.alias) object[flag.name] = flag.alias;
        return object;
      }, {} as { [name: string]: string }),
    };

    const parsedArgs = parse(args, argParsingOptions);

    parsedArgs._.shift(); // remove cmd

    if (parsedArgs.help) return console.log(this.help());

    this._fn(parsedArgs);
  }
  fn(fn: Function) {
    this._fn = fn;
    return this;
  }
}

export class Program {
  commands: { [name: string]: Command };
  constructor() {
    this.commands = {};
  }
  command(name: string, description: string) {
    const command = new Command({ name, description });
    this.commands[name] = command;
    return command;
  }
  help() {
  }
  parse(args: string[]) {
    const parsedArgs = parse(args);
    const cmd = parsedArgs._.shift() as string;
    const command = this.commands[cmd];
    if (!command) return this.help();
    return command.run(args);
  }
}
