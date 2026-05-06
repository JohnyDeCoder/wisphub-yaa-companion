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

// KaC category order as specified in keepachangelog.com/es-ES/1.1.0/
const CATEGORY_ORDER = ["Agregado", "Cambiado", "Obsoleto", "Eliminado", "Corregido", "Seguridad"];
const VALID_CATEGORIES = new Set(CATEGORY_ORDER);

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
    "Todos los cambios notables de este proyecto se documentan en este archivo.",
    "",
    "El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).",
    "El versionado sigue [Semantic Versioning](https://semver.org/lang/es/).",
    "",
    "## [Sin publicar]",
    "",
  ];

  entries.forEach((entry) => {
    lines.push(`## [${entry.version}] - ${entry.date}`);
    lines.push("");

    CATEGORY_ORDER.forEach((cat) => {
      const items = entry.categories[cat];
      if (!Array.isArray(items) || items.length === 0) {
        return;
      }
      lines.push(`### ${cat}`);
      lines.push("");
      items.forEach((item) => lines.push(`- ${item}`));
      lines.push("");
    });
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
    if (typeof entry.version !== "string" || !entry.version.trim()) {
      fail(`La versión es obligatoria en el índice ${index}.`);
    }
    if (typeof entry.date !== "string" || !entry.date.trim()) {
      fail(`La fecha es obligatoria en el índice ${index}.`);
    }
    if (!entry.categories || typeof entry.categories !== "object" || Array.isArray(entry.categories)) {
      fail(`El campo 'categories' (objeto) es obligatorio en la versión ${entry.version}.`);
    }

    const unknownCats = Object.keys(entry.categories).filter((cat) => !VALID_CATEGORIES.has(cat));
    if (unknownCats.length > 0) {
      fail(
        `Categoría(s) inválida(s) en v${entry.version}: ${unknownCats.join(", ")}. ` +
        `Válidas: ${CATEGORY_ORDER.join(", ")}.`,
      );
    }

    const hasItems = Object.values(entry.categories).some(
      (items) => Array.isArray(items) && items.length > 0,
    );
    if (!hasItems) {
      fail(`La versión ${entry.version} no tiene cambios en ninguna categoría.`);
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
