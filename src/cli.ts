import { Command } from 'commander';

import { registerGenerateCommand } from './commands/generate.js';
import { registerConfigShowCommand } from './commands/config/show.js';
import { registerConfigValidateCommand } from './commands/config/validate.js';
import { registerSetupInitCommand } from './commands/setup/init.js';
import { registerSkillInstallCommand } from './commands/skill/install.js';
import { registerSkillListCommand } from './commands/skill/list.js';
import { registerSkillOutdatedCommand } from './commands/skill/outdated.js';
import { registerSkillRemoveCommand } from './commands/skill/remove.js';
import { registerSkillSearchCommand } from './commands/skill/search.js';
import { registerSkillShowCommand } from './commands/skill/show.js';
import { registerSkillUpgradeCommand } from './commands/skill/upgrade.js';
import { registerSkillVerifyCommand } from './commands/skill/verify.js';
import { getPackageVersion } from './core/runtime-assets.js';

export function createCli(): Command {
  const program = new Command();

  program
    .name('magehub')
    .description('Magento 2 AI coding skills CLI')
    .version(getPackageVersion());

  registerSetupInitCommand(program);
  registerSkillListCommand(program);
  registerSkillSearchCommand(program);
  registerSkillShowCommand(program);
  registerSkillInstallCommand(program);
  registerSkillRemoveCommand(program);
  registerSkillOutdatedCommand(program);
  registerSkillUpgradeCommand(program);
  registerSkillVerifyCommand(program);
  registerConfigShowCommand(program);
  registerConfigValidateCommand(program);
  registerGenerateCommand(program);

  return program;
}
