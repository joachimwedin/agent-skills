/**
 * Pulls a `--flag <value>` pair out of `argv` wherever it appears, returning
 * that value alongside every remaining argument with the flag and its value
 * removed. Shared by every CLI entry point that accepts `--flag value`-style
 * options ahead of its own positional arguments (`board-step report`,
 * `land-child`) -- each strips every recognized flag with this before
 * handing the rest on to its own positional parsing.
 */
export function extractFlag(argv: string[], flag: string): { value: string | undefined; rest: string[] } {
  const index = argv.indexOf(flag);
  if (index === -1) {
    return { value: undefined, rest: argv };
  }
  const value = argv[index + 1];
  return { value, rest: [...argv.slice(0, index), ...argv.slice(index + 2)] };
}
