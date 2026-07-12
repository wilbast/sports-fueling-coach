import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const python = process.env.GARMIN_PYTHON_BIN || "python3";
const script = path.join(process.cwd(), "scripts", "garmin_bridge.py");

const child = spawn(python, [script, "registry-drift"], {
  stdio: ["pipe", "pipe", "pipe"],
  env: { ...process.env, PYTHONUNBUFFERED: "1" }
});

let stdout = "";
let stderr = "";
child.stdout.on("data", (chunk) => {
  stdout += String(chunk);
});
child.stderr.on("data", (chunk) => {
  stderr += String(chunk);
});
child.stdin.end("{}");

child.on("close", (code) => {
  if (code !== 0) {
    console.error(stderr || `Garmin registry drift check failed with ${code}`);
    process.exit(1);
  }

  const result = JSON.parse(stdout);
  if (!result.ok) {
    console.error(result.message || "Garmin registry drift check failed.");
    process.exit(1);
  }

  const candidates = result.unclassifiedReadCandidates || [];
  if (candidates.length > 0) {
    console.warn("Unclassified Garmin public methods:");
    candidates.forEach((name) => console.warn(`- ${name}`));
  }

  console.log(JSON.stringify({
    classified: result.classifiedMethods?.length ?? 0,
    dangerous: result.dangerousMethods?.length ?? 0,
    unclassifiedReadCandidates: candidates.length
  }, null, 2));
});
