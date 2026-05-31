import { createInterface } from "readline";
import { SIGNUP_URLS } from "@/constants/api";
import { loadConfigFile, writeConfigFile } from "@/lib/env-loader";

const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

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

  const newsMissing = !process.env.NEWS_API_KEY;
  const needsAi = !process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY;

  if (!newsMissing && !needsAi) return true;

  console.log(`\n${BOLD}${YELLOW}🔑 tui-ai-hub needs API keys${RESET}\n`);

  const collected: Record<string, string> = {};

  if (needsAi) {
    console.log("Choose an AI provider:");
    console.log("  1) Google Gemini (default)");
    console.log("  2) Groq");
    const choice = await askQuestion("Enter choice [1]: ");

    if (choice === "2") {
      const key = await promptForKey("GROQ_API_KEY");
      if (key) {
        collected.GROQ_API_KEY = key;
        if (!process.env.AI_PROVIDER) collected.AI_PROVIDER = "groq";
      }
    } else {
      const key = await promptForKey("GEMINI_API_KEY");
      if (key) collected.GEMINI_API_KEY = key;
    }
  }

  if (newsMissing) {
    const key = await promptForKey("NEWS_API_KEY");
    if (key) collected.NEWS_API_KEY = key;
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

  if (!process.env.NEWS_API_KEY) {
    console.log(`\n${YELLOW}NEWS_API_KEY is required. Edit ~/.config/tui-ai-hub/.env and re-run.${RESET}`);
    return false;
  }

  console.log(`\n${GREEN}✓ Keys saved to ~/.config/tui-ai-hub/.env${RESET}`);
  console.log(`  Starting tui-ai-hub...\n`);
  return true;
}
