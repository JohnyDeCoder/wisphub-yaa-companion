const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");

const PATHS = {
  packageJson: path.join(ROOT_DIR, "package.json"),
  packageLock: path.join(ROOT_DIR, "package-lock.json"),
  manifest: path.join(ROOT_DIR, "manifest.json"),
  changelogJson: path.join(ROOT_DIR, "src", "app", "popup", "changelog.json"),
  changelogMd: path.join(ROOT_DIR, "CHANGELOG.md"),
  popupHtml: path.join(ROOT_DIR, "src", "app", "popup", "popup.html"),
  constants: path.join(ROOT_DIR, "src", "config", "constants.js"),
  readme: path.join(ROOT_DIR, "README.md"),
  buildInstructions: path.join(ROOT_DIR, "docs", "BUILD_INSTRUCTIONS.md"),
  chromeDist: path.join(DIST_DIR, "chrome"),
  firefoxDist: path.join(DIST_DIR, "firefox"),
};

const SOURCE_ARCHIVE_ITEMS = [
  ["src", "src"],
  ["assets", "assets"],
  ["scripts", "scripts"],
  ["package.json", "package.json"],
  ["package-lock.json", "package-lock.json"],
  ["webpack.config.js", "webpack.config.js"],
  ["manifest.json", "manifest.json"],
  ["eslint.config.mjs", "eslint.config.mjs"],
  ["README.md", "README.md"],
  ["CHANGELOG.md", "CHANGELOG.md"],
  ["LICENSE", "LICENSE"],
];

const ALLOWED_BUMP_TYPES = new Set(["none", "patch", "minor", "major"]);
const ALLOWED_ARCHIVES = new Set(["all", "chrome", "firefox", "source"]);

function fail(message) {
  throw new Error(message);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removePath(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(filePath, value) {
  const output = value.endsWith("\n") ? value : `${value}\n`;
  fs.writeFileSync(filePath, output, "utf8");
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    fail(`Invalid semantic version: ${version}`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function bumpSemver(version, bumpType) {
  const parsed = parseVersion(version);
  if (bumpType === "patch") {
    return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  }
  if (bumpType === "minor") {
    return `${parsed.major}.${parsed.minor + 1}.0`;
  }
  if (bumpType === "major") {
    return `${parsed.major + 1}.0.0`;
  }
  if (bumpType === "none") {
    return version;
  }
  fail(`Unsupported bump type: ${bumpType}`);
}

function getTodayDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

function replaceOrFail(text, pattern, replacement, label) {
  if (!pattern.test(text)) {
    fail(`${label} pattern not found.`);
  }
  return text.replace(pattern, replacement);
}

function updatePopupVersionBadge(popupHtml, version) {
  return replaceOrFail(
    popupHtml,
    /<span class="badge">v[^<]+<\/span>/,
    `<span class="badge">v${version}</span>`,
    "Popup version badge",
  );
}

function updateReadmeVersionBadge(readme, version) {
  const pattern =
    /^\[version-shield\]: https:\/\/img\.shields\.io\/badge\/version-[^\s]+$/m;

  if (!pattern.test(readme)) {
    return readme;
  }

  return readme.replace(
    pattern,
    `[version-shield]: https://img.shields.io/badge/version-${version}-blue?style=for-the-badge`,
  );
}

function updateConstantsVersion(constantsJs, version) {
  return replaceOrFail(
    constantsJs,
    /export const EXTENSION_VERSION = "[^"]+";/,
    `export const EXTENSION_VERSION = "${version}";`,
    "Constants EXTENSION_VERSION",
  );
}

function normalizeChangelogEntries(entries, targetVersion, bumpType) {
  if (!Array.isArray(entries) || entries.length === 0) {
    fail("src/app/popup/changelog.json must contain at least one entry.");
  }

  const top = entries[0];
  if (!top || typeof top !== "object") {
    fail("Invalid top changelog entry.");
  }

  if (bumpType !== "none" && top.version !== targetVersion) {
    entries.unshift({
      version: targetVersion,
      date: getTodayDateString(),
      changes: ["Describe los cambios principales de esta version."],
    });
  }

  if (entries[0].version !== targetVersion) {
    fail(
      `Top changelog entry (${entries[0].version}) must match version ${targetVersion}.`,
    );
  }

  if (!isValidDateString(entries[0].date)) {
    entries[0].date = getTodayDateString();
  }

  entries.forEach((entry, index) => {
    parseVersion(entry.version);
    if (!isValidDateString(entry.date)) {
      fail(`Invalid date in changelog entry index ${index}. Expected YYYY-MM-DD.`);
    }
    if (!Array.isArray(entry.changes) || entry.changes.length === 0) {
      fail(`Changelog entry v${entry.version} must include at least one change.`);
    }
  });
}

function createChangelogMarkdown(projectName, entries) {
  const lines = [
    `# Changelog - ${projectName}`,
    "",
    "Todos los cambios notables de este proyecto se documentan aqui.",
    "",
  ];

  entries.forEach((entry) => {
    lines.push(`## v${entry.version} - ${entry.date}`);
    lines.push("");
    entry.changes.forEach((change) => {
      lines.push(`- ${change}`);
    });
    lines.push("");
  });

  return lines.join("\n").trimEnd();
}

function createReleaseNotes(projectName, entry) {
  const lines = [
    `# ${projectName} v${entry.version}`,
    "",
    `Fecha: ${entry.date}`,
    "",
    "## Cambios",
    "",
  ];

  entry.changes.forEach((change) => {
    lines.push(`- ${change}`);
  });

  return lines.join("\n").trimEnd();
}

function syncReleaseMetadata(bumpType) {
  const packageJson = readJson(PATHS.packageJson);
  const packageLock = fs.existsSync(PATHS.packageLock)
    ? readJson(PATHS.packageLock)
    : null;
  const manifest = readJson(PATHS.manifest);
  const changelogEntries = readJson(PATHS.changelogJson);
  const popupHtml = readText(PATHS.popupHtml);
  const constantsJs = readText(PATHS.constants);
  const readme = readText(PATHS.readme);

  const currentVersion = packageJson.version;
  parseVersion(currentVersion);
  const nextVersion = bumpSemver(currentVersion, bumpType);

  normalizeChangelogEntries(changelogEntries, nextVersion, bumpType);

  packageJson.version = nextVersion;
  manifest.version = nextVersion;
  if (packageLock) {
    packageLock.version = nextVersion;
    if (packageLock.packages && packageLock.packages[""]) {
      packageLock.packages[""].version = nextVersion;
    }
  }

  writeJson(PATHS.packageJson, packageJson);
  writeJson(PATHS.manifest, manifest);
  if (packageLock) {
    writeJson(PATHS.packageLock, packageLock);
  }
  writeJson(PATHS.changelogJson, changelogEntries);
  writeText(PATHS.popupHtml, updatePopupVersionBadge(popupHtml, nextVersion));
  writeText(PATHS.constants, updateConstantsVersion(constantsJs, nextVersion));
  writeText(PATHS.readme, updateReadmeVersionBadge(readme, nextVersion));
  writeText(
    PATHS.changelogMd,
    createChangelogMarkdown(manifest.name, changelogEntries),
  );

  return {
    version: nextVersion,
    projectName: manifest.name,
    topEntry: changelogEntries[0],
  };
}

let crc32Table = null;

function getCrc32Table() {
  if (crc32Table) {
    return crc32Table;
  }

  crc32Table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value =
        (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    crc32Table[index] = value >>> 0;
  }
  return crc32Table;
}

function crc32(buffer) {
  const table = getCrc32Table();
  let value = 0xffffffff;
  for (const byte of buffer) {
    value = table[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function getZipDosDateTime(date) {
  const safeYear = Math.max(date.getFullYear(), 1980);
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((safeYear - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();

  return {
    date: dosDate & 0xffff,
    time: dosTime & 0xffff,
  };
}

function collectFilesForZip(baseDir, currentDir = baseDir) {
  const entries = [];
  for (const name of fs.readdirSync(currentDir)) {
    const fullPath = path.join(currentDir, name);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      entries.push(...collectFilesForZip(baseDir, fullPath));
      continue;
    }

    entries.push({
      data: fs.readFileSync(fullPath),
      modifiedAt: stat.mtime,
      relativePath: path.relative(baseDir, fullPath).split(path.sep).join("/"),
    });
  }

  return entries.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  );
}

function createZipFromDirectory(sourceDir, zipPath) {
  ensureDir(path.dirname(zipPath));
  removePath(zipPath);
  const files = collectFilesForZip(sourceDir);
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = Buffer.from(file.relativePath, "utf8");
    const fileData = file.data;
    const checksum = crc32(fileData);
    const { date, time } = getZipDosDateTime(file.modifiedAt);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(date, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(fileData.length, 18);
    localHeader.writeUInt32LE(fileData.length, 22);
    localHeader.writeUInt16LE(nameBytes.length, 26);
    localHeader.writeUInt16LE(0, 28);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(time, 12);
    centralHeader.writeUInt16LE(date, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(fileData.length, 20);
    centralHeader.writeUInt32LE(fileData.length, 24);
    centralHeader.writeUInt16LE(nameBytes.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    localParts.push(localHeader, nameBytes, fileData);
    centralParts.push(centralHeader, nameBytes);
    offset += localHeader.length + nameBytes.length + fileData.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endHeader = Buffer.alloc(22);
  endHeader.writeUInt32LE(0x06054b50, 0);
  endHeader.writeUInt16LE(0, 4);
  endHeader.writeUInt16LE(0, 6);
  endHeader.writeUInt16LE(files.length, 8);
  endHeader.writeUInt16LE(files.length, 10);
  endHeader.writeUInt32LE(centralSize, 12);
  endHeader.writeUInt32LE(offset, 16);
  endHeader.writeUInt16LE(0, 20);

  fs.writeFileSync(
    zipPath,
    Buffer.concat([...localParts, ...centralParts, endHeader]),
  );
}

function copyRecursive(sourcePath, targetPath) {
  const stat = fs.statSync(sourcePath);
  if (stat.isDirectory()) {
    ensureDir(targetPath);
    for (const child of fs.readdirSync(sourcePath)) {
      copyRecursive(path.join(sourcePath, child), path.join(targetPath, child));
    }
    return;
  }

  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
}

function packageSourceArchive(version) {
  const stageDir = path.join(DIST_DIR, `.source-stage-v${version}`);
  const zipPath = path.join(DIST_DIR, `wyac-source-v${version}.zip`);

  removePath(stageDir);
  ensureDir(stageDir);

  SOURCE_ARCHIVE_ITEMS.forEach(([from, to]) => {
    const sourcePath = path.join(ROOT_DIR, from);
    if (fs.existsSync(sourcePath)) {
      copyRecursive(sourcePath, path.join(stageDir, to));
    }
  });

  fs.copyFileSync(
    PATHS.buildInstructions,
    path.join(stageDir, "BUILD_INSTRUCTIONS.md"),
  );
  createZipFromDirectory(stageDir, zipPath);
  removePath(stageDir);

  return zipPath;
}

function assertBuiltOutput(dirPath, commandHint) {
  if (!fs.existsSync(dirPath)) {
    fail(`Missing build output directory: ${path.relative(ROOT_DIR, dirPath)}. Run "${commandHint}" first.`);
  }

  const queue = [dirPath];
  while (queue.length > 0) {
    const currentDir = queue.pop();
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
      } else if (entry.isFile()) {
        return;
      }
    }
  }

  fail(`Build output is empty: ${path.relative(ROOT_DIR, dirPath)}. Run "${commandHint}" first.`);
}

function parseArgs(argv) {
  const args = {
    bump: "none",
    archive: "all",
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      args.help = true;
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

  if (!ALLOWED_BUMP_TYPES.has(args.bump)) {
    fail('Invalid --bump value. Allowed: "none", "patch", "minor", "major".');
  }
  if (!ALLOWED_ARCHIVES.has(args.archive)) {
    fail('Invalid --archive value. Allowed: "all", "chrome", "firefox", "source".');
  }

  return args;
}

function printHelp() {
  console.log("Prepare release metadata and package artifacts for private Firefox updates.");
  console.log("");
  console.log("Usage:");
  console.log(
    "  node scripts/prepare-release.js [--bump none|patch|minor|major] [--archive all|chrome|firefox|source]",
  );
  console.log("");
  console.log("Expected workflow:");
  console.log("  1) npm run build:prod");
  console.log("  2) npm run release:prepare");
  console.log("  3) Sign dist/wyac-firefox-vX.Y.Z.zip with AMO (unlisted)");
  console.log("  4) npm run release:publish:firefox");
}

function runUpdatePrepareCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }

  const release = syncReleaseMetadata(args.bump);
  ensureDir(DIST_DIR);

  const needsChrome = args.archive === "all" || args.archive === "chrome";
  const needsFirefox = args.archive === "all" || args.archive === "firefox";
  const needsSource = args.archive === "all" || args.archive === "source";

  const releaseNotesPath = path.join(
    DIST_DIR,
    `release-notes-v${release.version}.md`,
  );
  const buildInstructionsPath = path.join(DIST_DIR, "BUILD_INSTRUCTIONS.md");
  writeText(
    releaseNotesPath,
    createReleaseNotes(release.projectName, release.topEntry),
  );
  fs.copyFileSync(PATHS.buildInstructions, buildInstructionsPath);

  const artifacts = [
    path.relative(ROOT_DIR, releaseNotesPath),
    path.relative(ROOT_DIR, buildInstructionsPath),
  ];

  if (needsChrome) {
    assertBuiltOutput(PATHS.chromeDist, "npm run build:prod");
    const zipPath = path.join(DIST_DIR, `wyac-chrome-v${release.version}.zip`);
    createZipFromDirectory(PATHS.chromeDist, zipPath);
    artifacts.push(path.relative(ROOT_DIR, zipPath));
  }

  if (needsFirefox) {
    assertBuiltOutput(PATHS.firefoxDist, "npm run build:prod");
    const zipPath = path.join(DIST_DIR, `wyac-firefox-v${release.version}.zip`);
    createZipFromDirectory(PATHS.firefoxDist, zipPath);
    artifacts.push(path.relative(ROOT_DIR, zipPath));
  }

  if (needsSource) {
    artifacts.push(path.relative(ROOT_DIR, packageSourceArchive(release.version)));
  }

  console.log("");
  console.log(`Update preparation completed for v${release.version}.`);
  artifacts.forEach((artifact) => {
    console.log(`- ${artifact}`);
  });
  console.log("- Next step: upload dist/wyac-firefox-vX.Y.Z.zip for AMO unlisted signing.");
  console.log("- Then place signed .xpi in tmp/ or signed/ and run npm run release:publish:firefox.");
}

if (require.main === module) {
  try {
    runUpdatePrepareCli();
  } catch (error) {
    console.error(`Update preparation failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  runUpdatePrepareCli,
};
