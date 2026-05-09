import path from 'node:path';

import type { MageHubConfig, SkillEntry } from '../types/config.js';
import type { Skill } from '../types/skill.js';
import { readUtf8, writeUtf8 } from '../utils/fs.js';
import { warn } from '../utils/logger.js';
import { getGlobalConfigDir } from './global-config.js';
import { getPackageVersion } from './runtime-assets.js';

const NPM_REGISTRY_URL = 'https://registry.npmjs.org/magehub/latest';
const CACHE_FILE_NAME = 'update-check.json';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface UpdateCheckCache {
  latest_version: string;
  checked_at: string;
}

export interface OutdatedSkill {
  id: string;
  installed: string;
  available: string;
}

export interface UpgradeCheckResult {
  magehubOutdated: boolean;
  currentVersion: string;
  latestVersion: string | undefined;
  outdatedSkills: OutdatedSkill[];
}

function getCachePath(): string {
  return path.join(getGlobalConfigDir(), CACHE_FILE_NAME);
}

async function readCache(): Promise<UpdateCheckCache | undefined> {
  const content = await readUtf8(getCachePath()).catch(() => undefined);
  if (content === undefined) {
    return undefined;
  }

  const parsed: unknown = JSON.parse(content);
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('latest_version' in parsed) ||
    !('checked_at' in parsed)
  ) {
    return undefined;
  }

  const cache = parsed as UpdateCheckCache;
  const age = Date.now() - new Date(cache.checked_at).getTime();
  if (age > CACHE_TTL_MS) {
    return undefined;
  }

  return cache;
}

async function writeCache(latestVersion: string): Promise<void> {
  const cache: UpdateCheckCache = {
    latest_version: latestVersion,
    checked_at: new Date().toISOString(),
  };
  await writeUtf8(getCachePath(), JSON.stringify(cache, null, 2)).catch(
    () => {},
  );
}

async function fetchLatestVersion(): Promise<string | undefined> {
  const cached = await readCache();
  if (cached !== undefined) {
    return cached.latest_version;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  const response = await fetch(NPM_REGISTRY_URL, {
    signal: controller.signal,
    headers: { accept: 'application/json' },
  }).catch(() => undefined);

  clearTimeout(timeout);

  if (response === undefined || !response.ok) {
    return undefined;
  }

  const data = (await response.json().catch(() => undefined)) as
    | { version?: string }
    | undefined;
  if (data?.version === undefined) {
    return undefined;
  }

  void writeCache(data.version);
  return data.version;
}

export function findOutdatedSkills(
  entries: SkillEntry[],
  getSkill: (id: string) => Skill | undefined,
): OutdatedSkill[] {
  const outdated: OutdatedSkill[] = [];

  for (const entry of entries) {
    const skill = getSkill(entry.id);
    if (skill === undefined) {
      continue;
    }

    const installed = entry.installed_version;
    if (installed === undefined || installed === skill.version) {
      continue;
    }

    outdated.push({
      id: entry.id,
      installed,
      available: skill.version,
    });
  }

  return outdated;
}

export async function checkForUpgrades(
  config: MageHubConfig,
  getSkill: (id: string) => Skill | undefined,
): Promise<UpgradeCheckResult> {
  const currentVersion = getPackageVersion();
  const latestVersion = await fetchLatestVersion();

  const magehubOutdated =
    latestVersion !== undefined && latestVersion !== currentVersion;

  const outdatedSkills = magehubOutdated
    ? []
    : findOutdatedSkills(config.skills, getSkill);

  return {
    magehubOutdated,
    currentVersion,
    latestVersion,
    outdatedSkills,
  };
}

export async function printUpgradeHint(
  config: MageHubConfig,
  getSkill: (id: string) => Skill | undefined,
): Promise<void> {
  const result = await checkForUpgrades(config, getSkill);

  if (result.magehubOutdated && result.latestVersion !== undefined) {
    warn(
      `MageHub ${result.currentVersion} → ${result.latestVersion} available. Run \`npm update -g magehub\` to upgrade.`,
    );
    return;
  }

  if (result.outdatedSkills.length > 0) {
    warn(
      `${result.outdatedSkills.length} installed skill(s) have updates available. Run \`magehub skill:outdated\` for details.`,
    );
  }
}

export async function printSkillUpgradeHint(
  config: MageHubConfig,
  skillId: string,
  getSkill: (id: string) => Skill | undefined,
): Promise<void> {
  const result = await checkForUpgrades(config, getSkill);

  if (result.magehubOutdated && result.latestVersion !== undefined) {
    warn(
      `MageHub ${result.currentVersion} → ${result.latestVersion} available. Run \`npm update -g magehub\` to upgrade.`,
    );
    return;
  }

  const match = result.outdatedSkills.find((s) => s.id === skillId);
  if (match !== undefined) {
    warn(
      `${match.id} ${match.installed} → ${match.available} available. Run \`magehub skill:upgrade ${match.id}\``,
    );
  }
}
