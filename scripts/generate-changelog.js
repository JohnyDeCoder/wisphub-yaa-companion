const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const CHANGELOG_JSON_PATH = path.join(
  ROOT_DIR,
  "src",
  "app",
  "popup",
  "changelog.json",
);
const CHANGELOG_MD_PATH = path.join(ROOT_DIR, "CHANGELOG.md");
const MANIFEST_PATH = path.join(ROOT_DIR, "manifest.json");

function fail(message) {
  throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeText(filePath, value) {
  const output = value.endsWith("\n") ? value : `${value}\n`;
  fs.writeFileSync(filePath, output, "utf8");
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

function validateEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    fail("src/app/popup/changelog.json debe contener al menos una versión.");
  }

  entries.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") {
      fail(`Entrada inválida en changelog (índice ${index}).`);
    }
    if (typeof entry.version !== "string" || entry.version.trim() === "") {
      fail(`La versión es obligatoria en el índice ${index}.`);
    }
    if (typeof entry.date !== "string" || entry.date.trim() === "") {
      fail(`La fecha es obligatoria en el índice ${index}.`);
    }
    if (!Array.isArray(entry.changes) || entry.changes.length === 0) {
      fail(`La lista de cambios es obligatoria en la versión ${entry.version}.`);
    }
  });
}

function runGenerateChangelogCli() {
  const manifest = readJson(MANIFEST_PATH);
  const changelogEntries = readJson(CHANGELOG_JSON_PATH);
  validateEntries(changelogEntries);

  writeText(
    CHANGELOG_MD_PATH,
    createChangelogMarkdown(manifest.name, changelogEntries),
  );

  console.log("CHANGELOG.md generado correctamente desde src/app/popup/changelog.json");
}

if (require.main === module) {
  try {
    runGenerateChangelogCli();
  } catch (error) {
    console.error(`Error al generar CHANGELOG.md: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  runGenerateChangelogCli,
};
