import { flags } from "../deps.ts";

export interface Option {
  name: string;
  description?: string;
  alias?: string;
  args?: Argument[];
  boolean?: boolean;
}

export interface Argument {
  name: string;
  description?: string;
  optional?: boolean;
  multiple?: boolean;
}

export interface Command {
  name: string;
  description?: string;
  arguments?: Argument[];
  options?: Option[];
  commands?: Command[];
  fn: (args: flags.Args) => void;
}

export interface Program {
  name: string;
  description?: string;
  commands: Command[];
  version?: string;
  fn?: (args: flags.Args) => void;
}

export async function parse(program: Program, args: string[]) {
  args = [...args];
  const commandName = args.shift();
  if (!commandName && !program.fn) {
    throw new Error(`choose a subcommand`);
  }
  const command = program.commands.find((command) =>
    command.name === commandName
  );
  if (!command) throw new Error(`command not found: ${commandName}`);
  const options = command.options || [];

  const parsed: flags.Args = flags.parse(args, {
    boolean: options
      .filter(({ boolean }) => boolean)
      .map(({ name }) => name),
    alias: Object.fromEntries(
      options
        .filter((option) => option.alias)
        .map((option) => [option.name, option.alias as string]),
    ),
  });

  for (const key of Object.keys(parsed)) {
    if (key === "_") continue;
    if (options.some((option) => option.alias === key)) continue;
    const option = command.options?.find((option) => option.name === key);
    if (!option) throw new Error(`option not found: ${key}`);
  }

  await command.fn(parsed);
}
