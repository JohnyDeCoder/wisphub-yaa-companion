const fs = require("fs");
const path = require("path");

const CHANGELOG_JSON = path.resolve(
  __dirname,
  "../src/app/popup/changelog.json",
);
const CHANGELOG_MD = path.resolve(__dirname, "../CHANGELOG.md");
const MANIFEST = path.resolve(__dirname, "../manifest.json");

function run() {
  const entries = JSON.parse(fs.readFileSync(CHANGELOG_JSON, "utf-8"));
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf-8"));

  const lines = [
    `# Changelog — ${manifest.name}\n`,
    "Todos los cambios notables de este proyecto se documentan aquí.\n",
  ];

  for (const entry of entries) {
    lines.push(`## v${entry.version} — ${entry.date}\n`);
    for (const change of entry.changes) {
      lines.push(`- ${change}`);
    }
    lines.push("");
  }

  fs.writeFileSync(CHANGELOG_MD, lines.join("\n"), "utf-8");
  console.log(`CHANGELOG.md generado (${entries.length} versión(es))`);
}

run();
