import { createCli } from './cli.js';
import { CliError } from './utils/cli-error.js';
import { error } from './utils/logger.js';

async function main(): Promise<void> {
  const program = createCli();
  await program.parseAsync(process.argv);
}

void main().catch((reason: unknown) => {
  if (reason instanceof CliError) {
    error(reason.message);
    process.exitCode = reason.exitCode;
    return;
  }

  const message =
    reason instanceof Error ? reason.message : 'Unknown CLI failure';
  error(message);
  process.exitCode = 1;
});
