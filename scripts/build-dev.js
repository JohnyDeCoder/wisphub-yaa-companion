const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const WEBPACK_CLI = path.join(
  ROOT_DIR,
  "node_modules",
  "webpack",
  "bin",
  "webpack.js",
);
const ALLOWED_TARGETS = new Set(["all", "chrome", "firefox"]);

function fail(message) {
  throw new Error(message);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removePath(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function runProcess(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    stdio: "inherit",
  });

  if (result.error) {
    fail(`Failed to start "${command}": ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`Command failed (${result.status}): ${command} ${args.join(" ")}`);
  }
}

function runWebpack(args) {
  runProcess(process.execPath, [WEBPACK_CLI, ...args]);
}

function parseArgs(argv) {
  const args = {
    target: "firefox",
    watch: false,
    skipClean: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }
    if (token === "--watch") {
      args.watch = true;
      continue;
    }
    if (token === "--skip-clean") {
      args.skipClean = true;
      continue;
    }

    if (!token.startsWith("--")) {
      fail(`Unknown argument: ${token}`);
    }

    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      fail(`Missing value for --${key}.`);
    }
    args[key] = value;
    index += 1;
  }

  if (!ALLOWED_TARGETS.has(args.target)) {
    fail('Invalid --target value. Allowed: "all", "chrome", "firefox".');
  }

  return args;
}

function printHelp() {
  console.log("Build extension in development mode.");
  console.log("");
  console.log("Usage:");
  console.log(
    "  node scripts/build-dev.js [--target all|chrome|firefox] [--watch] [--skip-clean]",
  );
}

function runBuildDevCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }

  if (args.watch && args.target === "all") {
    fail('Use one target at a time with --watch. Example: --target firefox --watch');
  }

  if (!args.skipClean && !args.watch) {
    removePath(DIST_DIR);
  }
  ensureDir(DIST_DIR);

  const webpackBaseArgs = ["--mode=development"];
  if (args.watch) {
    webpackBaseArgs.push("--watch");
  }

  const needsChrome = args.target === "all" || args.target === "chrome";
  const needsFirefox = args.target === "all" || args.target === "firefox";

  if (needsChrome) {
    runWebpack([...webpackBaseArgs]);
  }
  if (needsFirefox) {
    runWebpack([...webpackBaseArgs, "--env", "target=firefox"]);
  }

  console.log("Development build completed.");
  if (needsChrome) {
    console.log("- dist/chrome");
  }
  if (needsFirefox) {
    console.log("- dist/firefox");
  }
}

if (require.main === module) {
  try {
    runBuildDevCli();
  } catch (error) {
    console.error(`Development build failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  runBuildDevCli,
};
