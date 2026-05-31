import { createInterface } from "readline";
import { SIGNUP_URLS } from "@/constants/api";
import { loadConfigFile, writeConfigFile, getMissingKeys } from "@/lib/env-loader";

const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

function resetStdin(): void {
  if (process.stdin.isRaw) {
    process.stdin.setRawMode(false);
  }
}

function askQuestion(query: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function promptForKey(key: string): Promise<string | null> {
  const info = SIGNUP_URLS[key];
  if (!info) return null;

  console.log(`\n${BOLD}${info.name}${RESET}`);
  console.log(`  ${info.hint}`);
  console.log(`  ${CYAN}${info.url}${RESET}`);

  const value = await askQuestion(`  Enter ${key}: `);
  if (!value) return null;
  return value;
}

export async function runSetupIfNeeded(): Promise<boolean> {
  await loadConfigFile();

  const missing = getMissingKeys();
  if (missing.length === 0) return true;

  resetStdin();

  console.log(`\n${BOLD}${YELLOW}🔑 tui-ai-hub needs API keys${RESET}`);
  console.log("  Create a free account at each service and paste your keys below.\n");

  const collected: Record<string, string> = {};

  for (const key of missing) {
    const value = await promptForKey(key);
    if (value) {
      collected[key] = value;
    }
  }

  if (Object.keys(collected).length === 0) {
    console.log(`\n${YELLOW}No keys entered. Exiting.${RESET}`);
    return false;
  }

  await writeConfigFile(collected);

  for (const [key, value] of Object.entries(collected)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }

  const stillMissing = getMissingKeys();
  if (stillMissing.length > 0) {
    console.log(`\n${YELLOW}Some keys are still missing: ${stillMissing.join(", ")}${RESET}`);
    console.log("You can re-run the app or edit ~/.config/tui-ai-hub/.env manually.");
    return false;
  }

  console.log(`\n${GREEN}✓ Keys saved to ~/.config/tui-ai-hub/.env${RESET}`);
  console.log(`  Starting tui-ai-hub...\n`);
  return true;
}
