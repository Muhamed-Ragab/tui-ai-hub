#!/usr/bin/env bun
import { runSetupIfNeeded } from "./src/lib/setup";

if (!(await runSetupIfNeeded())) process.exit(1);

const { createCliRenderer } = await import("@opentui/core");
const { createRoot } = await import("@opentui/react");
const { App } = await import("./src/App");

const renderer = await createCliRenderer({
  exitOnCtrlC: false,
});

createRoot(renderer).render(<App />);
