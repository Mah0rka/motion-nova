import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const sourceRoot = join(root, "src");
const vitestEntry = join(root, "node_modules", "vitest", "vitest.mjs");
const MAX_ATTEMPTS = 2;
const TIMEOUT_MS = 45_000;

function collectTests(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) return collectTests(fullPath);
      return /\.test\.(ts|tsx)$/.test(entry.name) ? [relative(root, fullPath)] : [];
    })
    .sort();
}

function killProcessTree(child, signal = "SIGTERM") {
  if (!child.pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  try {
    process.kill(-child.pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      // Process already exited.
    }
  }
}

function runFile(testFile, index, total, attempt) {
  return new Promise((resolve) => {
    console.log(`\n[vitest-ci] ${index}/${total}: ${testFile}, attempt ${attempt}/${MAX_ATTEMPTS}`);
    const child = spawn(
      process.execPath,
      [
        vitestEntry,
        "run",
        testFile,
        "--pool=threads",
        "--no-file-parallelism",
        "--maxWorkers=1",
        "--reporter=dot"
      ],
      {
        cwd: root,
        env: process.env,
        stdio: "inherit",
        detached: process.platform !== "win32"
      }
    );

    let finished = false;
    const timeout = setTimeout(() => {
      if (finished) return;
      console.error(`[vitest-ci] ${testFile} exceeded ${TIMEOUT_MS / 1000}s; terminating.`);
      killProcessTree(child, "SIGTERM");
      setTimeout(() => killProcessTree(child, "SIGKILL"), 2_000).unref();
    }, TIMEOUT_MS);

    child.on("error", (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      console.error(`[vitest-ci] ${testFile} failed to start: ${error.message}`);
      resolve(false);
    });

    child.on("close", (code, signal) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      if (signal) console.error(`[vitest-ci] ${testFile} terminated by ${signal}.`);
      resolve(code === 0);
    });
  });
}

const tests = collectTests(sourceRoot);
if (!tests.length) {
  console.error("[vitest-ci] no tests found");
  process.exit(1);
}

for (const [index, testFile] of tests.entries()) {
  let passed = false;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    passed = await runFile(testFile, index + 1, tests.length, attempt);
    if (passed) break;
  }
  if (!passed) {
    console.error(`[vitest-ci] ${testFile} failed after ${MAX_ATTEMPTS} attempts.`);
    process.exit(1);
  }
}

console.log(`\n[vitest-ci] all ${tests.length} test files passed.`);
