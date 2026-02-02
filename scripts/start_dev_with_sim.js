const { spawn } = require("child_process");
const path = require("path");

// Colors for output
const colors = {
  next: "\x1b[36m", // Cyan
  sim: "\x1b[32m", // Green
  reset: "\x1b[0m",
};

function runProcess(name, command, args, color) {
  console.log(`${color}[${name}] Starting...${colors.reset}`);

  const proc = spawn(command, args, {
    stdio: "pipe",
    shell: true,
    env: { ...process.env, FORCE_COLOR: "true" },
  });

  proc.stdout.on("data", (data) => {
    process.stdout.write(`${color}[${name}]${colors.reset} ${data}`);
  });

  proc.stderr.on("data", (data) => {
    process.stderr.write(`${color}[${name}] ERROR:${colors.reset} ${data}`);
  });

  proc.on("close", (code) => {
    console.log(`${color}[${name}] Exited with code ${code}${colors.reset}`);
    // If one fails, kill the other to prevent stale locks
    if (!process.killed) {
      console.log("Shutting down all processes...");
      process.kill(process.pid, "SIGINT");
    }
  });

  return proc;
}

// Start Simulator
const simPath = path.join(__dirname, "../lib/vtpMdg/src/main.js");
const sim = runProcess("SIMULATOR", "node", [simPath], colors.sim);

// Start Next.js
const next = runProcess("NEXT.JS", "npm", ["run", "dev"], colors.next);

function cleanup() {
  process.killed = true;
  console.log("\nStopping processes...");
  try {
    sim.kill();
  } catch (e) {}
  try {
    next.kill();
  } catch (e) {}
  process.exit();
}

// Handle signals
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);
