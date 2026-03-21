import { normalizeText } from "./tableHelpers.js";

export const CLIENT_TEMPLATE_PLACEHOLDERS = Object.freeze({
  STAGE: "*{{POR LLENAR / ETAPA }}*",
});

export const CLIENT_TEMPLATE_TARGET_LABELS = Object.freeze({
  STAGE: "ETAPA",
  NAME: "NOMBRE CLIENTE",
  SERVICE: "SERVICIO",
  SERVICE_PASSWORD: "PASSWORD HOTSPOT",
  ROUTER: "ROUTER",
  LOCALITY: "LOCALIDAD",
  IP: "IP",
  STATUS: "ESTADO",
  PLAN: "PLAN INTERNET",
  EQUIPMENT: "EQUIPOS",
});

const EQUIPMENT_TYPE_RULES = Object.freeze([
  {
    pattern: /\bequipo(s)?\s+comodato\b/i,
    label: "EQUIPO COMODATO",
  },
  {
    pattern: /\bequipo(s)?\s+comprado(s)?\b/i,
    label: "EQUIPO COMPRADO",
  },
  {
    pattern: /\bequipo(s)?\s+prestado(s)?\b/i,
    label: "EQUIPOS PRESTADOS",
  },
]);

function normalizeUpperNoAccents(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

export function extractCommentLines(rawComment) {
  const source = String(rawComment || "");
  if (!source.trim()) {
    return [];
  }

  const plainText = source
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, "");

  return plainText
    .split(/\r?\n+/)
    .map((line) => normalizeText(line))
    .filter(Boolean);
}

export function extractStageFromCommentLines(commentLines) {
  if (!Array.isArray(commentLines) || commentLines.length === 0) {
    return CLIENT_TEMPLATE_PLACEHOLDERS.STAGE;
  }

  const firstLine = normalizeUpperNoAccents(commentLines[0]);
  if (firstLine.includes("MIGRACION")) {
    return "MIGRACION";
  }
  if (firstLine.includes("CLIENTE NUEVO")) {
    return "CLIENTE NUEVO";
  }

  const migrationLine = commentLines.find((line) => {
    const normalized = normalizeUpperNoAccents(line);
    return normalized.includes("MIGRACION");
  });
  if (migrationLine) {
    return "MIGRACION";
  }

  const newClientLine = commentLines.find((line) => {
    const normalized = normalizeUpperNoAccents(line);
    return normalized.includes("CLIENTE NUEVO");
  });
  if (newClientLine) {
    return "CLIENTE NUEVO";
  }

  return CLIENT_TEMPLATE_PLACEHOLDERS.STAGE;
}

export function extractEquipmentLineFromCommentLines(commentLines) {
  if (!Array.isArray(commentLines) || commentLines.length === 0) {
    return "";
  }

  const equipmentLine = commentLines.find((line) =>
    /\bequipo(s)?\b/i.test(normalizeText(line)),
  );
  if (!equipmentLine) {
    return "";
  }

  const normalized = normalizeText(equipmentLine);
  if (!normalized) {
    return "";
  }

  const compactLine = normalized.replace(/\s+/g, " ").trim();
  for (const rule of EQUIPMENT_TYPE_RULES) {
    if (rule.pattern.test(compactLine)) {
      return rule.label;
    }
  }

  const candidate = compactLine
    .split(/\s+\+\s+|\s*=\s*|\s*\$\s*/)[0]
    .replace(/[,:;]+$/, "")
    .trim();

  if (!/\bequipo(s)?\b/i.test(candidate)) {
    return "";
  }
  return candidate.toUpperCase();
}

export function buildMissingValuePlaceholder(label) {
  const normalizedLabel = normalizeText(label).toUpperCase();
  if (!normalizedLabel) {
    return "*{{POR LLENAR }}*";
  }
  return `*{{POR LLENAR / ${normalizedLabel} }}*`;
}
