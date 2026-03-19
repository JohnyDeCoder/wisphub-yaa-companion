const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");

function fail(message) {
  throw new Error(message);
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeText(filePath, text) {
  const output = text.endsWith("\n") ? text : `${text}\n`;
  fs.writeFileSync(filePath, output, "utf8");
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    skipVerify: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }
    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (token === "--skip-verify") {
      args.skipVerify = true;
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

  return args;
}

function printHelp() {
  console.log("Publish signed Firefox update (.xpi + updates.json).");
  console.log("");
  console.log("Usage:");
  console.log(
    "  node scripts/publish-firefox-update.js [--xpi-file <path>] [--base-url <https-url>] [--ssh-host <user@host>] [--remote-dir <path>] [--ssh-key <path>] [--ssh-port <port>] [--dry-run] [--skip-verify]",
  );
  console.log("");
  console.log("Environment fallback:");
  console.log("  FIREFOX_UPDATES_BASE_URL=https://<public-host>/<path>");
  console.log("  UPDATE_REMOTE_SSH=<user@host>");
  console.log("  UPDATE_REMOTE_DIR=<remote-directory>");
  console.log("  UPDATE_SSH_KEY=<optional-private-key-path>");
  console.log("  UPDATE_SSH_PORT=<optional-port>");
}

function sha256ForFile(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return `sha256:${hash.digest("hex")}`;
}

function listXpiFiles(dirPath) {
  if (!fileExists(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".xpi"))
    .map((entry) => {
      const fullPath = path.join(dirPath, entry.name);
      return {
        fullPath,
        name: entry.name,
        mtimeMs: fs.statSync(fullPath).mtimeMs,
      };
    });
}

function pickSignedXpiFile(version) {
  const candidates = [
    ...listXpiFiles(path.join(ROOT_DIR, "tmp")),
    ...listXpiFiles(path.join(ROOT_DIR, "signed")),
  ];

  if (candidates.length === 0) {
    fail("No signed .xpi found in tmp/ or signed/. Use --xpi-file.");
  }

  const matchingVersion = candidates.filter((item) => item.name.includes(version));
  const pool = matchingVersion.length > 0 ? matchingVersion : candidates;
  pool.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return pool[0].fullPath;
}

function createUpdatesManifest(options) {
  const manifest = readJson(path.join(ROOT_DIR, "manifest.json"));
  const packageJson = readJson(path.join(ROOT_DIR, "package.json"));

  const addonId =
    options.addonId || manifest.browser_specific_settings?.gecko?.id;
  const strictMinVersion =
    options.strictMinVersion ||
    manifest.browser_specific_settings?.gecko?.strict_min_version;
  const version = options.version || packageJson.version;
  const outFile = options.outFile;

  if (!addonId) {
    fail("Could not resolve Firefox add-on ID.");
  }

  if (!/^https:\/\//i.test(options.updateLink || "")) {
    fail("update_link must use HTTPS.");
  }

  if (options.updateInfoUrl && !/^https:\/\//i.test(options.updateInfoUrl)) {
    fail("update_info_url must use HTTPS.");
  }

  if (!fileExists(options.xpiFile)) {
    fail(`Signed .xpi not found: ${options.xpiFile}`);
  }

  const updateEntry = {
    version,
    update_link: options.updateLink,
    update_hash: sha256ForFile(options.xpiFile),
  };

  if (options.updateInfoUrl) {
    updateEntry.update_info_url = options.updateInfoUrl;
  }

  if (strictMinVersion) {
    updateEntry.applications = {
      gecko: {
        strict_min_version: strictMinVersion,
      },
    };
  }

  const output = {
    addons: {
      [addonId]: {
        updates: [updateEntry],
      },
    },
  };

  ensureDir(path.dirname(outFile));
  writeText(outFile, JSON.stringify(output, null, 2));
}

function runCommand(filePath, args, options = {}) {
  const commandLine = `${filePath} ${args.join(" ")}`.trim();
  if (options.dryRun) {
    console.log(`[dry-run] ${commandLine}`);
    return;
  }

  const result = spawnSync(filePath, args, {
    cwd: ROOT_DIR,
    stdio: "inherit",
  });

  if (result.error) {
    fail(`Failed to start "${filePath}": ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(`Command failed (${result.status}): ${commandLine}`);
  }
}

async function verifyHead(url) {
  const response = await fetch(url, {
    method: "HEAD",
    redirect: "follow",
  });

  if (!response.ok) {
    fail(`HEAD ${url} returned ${response.status}.`);
  }

  return response.status;
}

async function runUpdatePublishCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }

  const packageJson = readJson(path.join(ROOT_DIR, "package.json"));
  const version = args.version || packageJson.version;
  const baseUrl =
    args["base-url"] ||
    process.env.FIREFOX_UPDATES_BASE_URL ||
    process.env.FX_BASE_URL;
  const sshHost = args["ssh-host"] || process.env.UPDATE_REMOTE_SSH;
  const remoteDir = args["remote-dir"] || process.env.UPDATE_REMOTE_DIR;
  const sshKey = args["ssh-key"] || process.env.UPDATE_SSH_KEY || "";
  const sshPort = args["ssh-port"] || process.env.UPDATE_SSH_PORT || "";

  if (!/^https:\/\//i.test(baseUrl || "")) {
    fail("Missing or invalid base URL. Set FIREFOX_UPDATES_BASE_URL or --base-url.");
  }
  if (!sshHost) {
    fail("Missing SSH host. Set UPDATE_REMOTE_SSH or --ssh-host.");
  }
  if (!remoteDir) {
    fail("Missing remote directory. Set UPDATE_REMOTE_DIR or --remote-dir.");
  }

  const signedXpiPath = args["xpi-file"]
    ? path.resolve(ROOT_DIR, args["xpi-file"])
    : pickSignedXpiFile(version);

  if (path.extname(signedXpiPath).toLowerCase() !== ".xpi") {
    fail("Selected file must be a .xpi.");
  }

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const xpiName = path.basename(signedXpiPath);
  const updateLink = `${normalizedBaseUrl}/${xpiName}`;
  const updatesOut = path.resolve(
    ROOT_DIR,
    args.out || path.join("dist", "firefox", "updates.json"),
  );

  createUpdatesManifest({
    addonId: args["addon-id"],
    version,
    updateLink,
    updateInfoUrl: args["update-info-url"],
    strictMinVersion: args["strict-min-version"],
    xpiFile: signedXpiPath,
    outFile: updatesOut,
  });

  const scpArgs = [];
  if (sshPort) {
    scpArgs.push("-P", sshPort);
  }
  if (sshKey) {
    scpArgs.push("-i", path.resolve(ROOT_DIR, sshKey));
  }
  scpArgs.push(
    signedXpiPath,
    updatesOut,
    `${sshHost}:${remoteDir.replace(/\/+$/, "")}/`,
  );

  console.log("Publishing Firefox private update...");
  console.log(`- version: ${version}`);
  console.log(`- xpi: ${path.relative(ROOT_DIR, signedXpiPath)}`);
  console.log(`- update_link: ${updateLink}`);
  console.log(`- updates.json: ${path.relative(ROOT_DIR, updatesOut)}`);

  runCommand("scp", scpArgs, { dryRun: args.dryRun });

  if (!args.skipVerify) {
    const updatesUrl = `${normalizedBaseUrl}/updates.json`;
    if (args.dryRun) {
      console.log(`[dry-run] HEAD ${updatesUrl}`);
      console.log(`[dry-run] HEAD ${updateLink}`);
    } else {
      const updatesStatus = await verifyHead(updatesUrl);
      const xpiStatus = await verifyHead(updateLink);
      console.log(`- updates.json status: ${updatesStatus}`);
      console.log(`- xpi status: ${xpiStatus}`);
    }
  }

  console.log("Update publish completed.");
}

if (require.main === module) {
  runUpdatePublishCli().catch((error) => {
    console.error(`Update publish failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runUpdatePublishCli,
};
