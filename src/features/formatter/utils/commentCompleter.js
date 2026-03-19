import { getCurrentUserName, isAdminUser } from "../../../utils/currentUser.js";
import { MONTH_NAMES } from "../../../config/constants.js";
import { isCommentCompleterPath } from "../../../config/pagePatterns.js";
import { getMexicoDate, getMexicoMonthName } from "../../../utils/date.js";
import { formatPrice } from "../../../utils/formatting.js";
import { parsePackagePrice } from "./commentParser.js";

const INSTALL_COMMENT_HINT_RE =
  /(CLIENTE\s+NUEVO|EQUIPO|EQUIPOS|HORARIO|FORMA\s+DE\s+PAGO|PAGO:|T[ÉE]CNICO|ASESORA?:)/i;

const HEADER_RE = /CLIENTE\s+NUEVO\b/i;
const EQUIP_TYPES = "COMODATO|DATO|COMO\\s+DATO|PRESTADO|PROPIO|COMPRADO";
const MONTH_LABELS = "RESTANTE|RESTO|MES\\s+COMPLETO|MES";
const PRICE_LINE_RE = new RegExp(
  `(?:EQUIPO\\S*\\s+(?:${EQUIP_TYPES})[^\\n]*\\+\\s*(?:${MONTH_LABELS})\\b` +
    "|CAMBIO\\s+DE\\s+COMPA[ÑN][IÍ]A)",
  "i",
);
const EQUIP_LINE_RE = new RegExp(`EQUIPO\\S*\\s+(${EQUIP_TYPES})`, "i");
const HORARIO_RE = /HORARIO\b/i;
const FORM_PAYMENT_RE = /FORMA\s+DE\s+PAGO\b/i;
const ALT_PAYMENT_RE = /(M[ÉE]TODO\s+DE\s+PAGO|PAGO\s+EN\s+|PAGO)\s*:?/i;
const TECNICO_RE = /T[ÉE]CNICO\b/i;
const ASESOR_RE = /ASESORA?\s*:/i;
const PRE_INSTALL_FORM_RE =
  /---+\s*HECHO CON (?:EL )?FORMULARIO DE PRE-INSTALACI[OÓ]N/i;

function normalizeSpaces(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function isInstallPath(pathname) {
  return isCommentCompleterPath(pathname || "");
}

function shouldCompleteComment(text) {
  const pathname = window?.location?.pathname || "";
  return isInstallPath(pathname) || INSTALL_COMMENT_HINT_RE.test(text);
}

function textContains(text, regex) {
  return regex.test(text);
}

function splitLines(text) {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim());
}

function findLine(lines, regex) {
  return lines.find((line) => regex.test(line));
}

function appendLine(lines, line) {
  if (lines.length && lines[lines.length - 1] !== "") {
    lines.push("");
  }
  lines.push(line);
}

function getPaymentValue(line) {
  const idx = line.indexOf(":");
  if (idx === -1) {
    return "";
  }
  return normalizeSpaces(line.slice(idx + 1));
}

function getAsesorValueFromDom() {
  const groups = Array.from(document.querySelectorAll(".form-group"));

  for (const group of groups) {
    const title = group.querySelector("label.control-label");
    if (!title || !/asesor/i.test(title.textContent || "")) {
      continue;
    }

    const valueLabel = group.querySelector(".controls label");
    const value = normalizeSpaces(valueLabel?.textContent || "")
      .replace(/@.*$/i, "")
      .trim();
    if (value && !isAdminUser(value)) {
      return value;
    }
    if (value && isAdminUser(value)) {
      return "";
    }
  }

  const asesorSelect = document.getElementById("id_cliente-creado_por");
  const selectedText = normalizeSpaces(
    asesorSelect?.options?.[asesorSelect.selectedIndex]?.text || "",
  );
  if (selectedText) {
    const username = selectedText.replace(/@.*$/, "").trim();
    if (!isAdminUser(username)) {
      return username;
    }
    return "";
  }

  const sidebarName = getCurrentUserName() || "";
  if (isAdminUser(sidebarName)) {
    return "";
  }
  return sidebarName;
}

function computeProration(monthlyPrice, date) {
  const day = date.getDate();
  const totalDays = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  ).getDate();
  const isProrated = day > 5 && day < 26;

  if (!isProrated) {
    const target =
      day > 25 ? new Date(date.getFullYear(), date.getMonth() + 1, 1) : date;
    const name = MONTH_NAMES[target.getMonth()];
    return { price: monthlyPrice, label: `MES ${name}` };
  }

  const name = MONTH_NAMES[date.getMonth()];
  const remaining = totalDays - day;
  const price = Math.round((monthlyPrice / totalDays) * remaining);
  return { price, label: `RESTANTE DE MES ${name}` };
}

function truncateAtFormDelimiter(text) {
  const match = text.match(PRE_INSTALL_FORM_RE);
  if (!match) {
    return text;
  }
  const endIndex = match.index + match[0].length;
  return text.slice(0, endIndex).trim();
}

function ensureRequiredSections(lines, fullText) {
  const hasPreInstallForm = PRE_INSTALL_FORM_RE.test(fullText);

  if (hasPreInstallForm) {
    return lines;
  }

  const completed = [...lines];
  const monthName = getMexicoMonthName();

  if (!textContains(fullText, HEADER_RE)) {
    completed.unshift("CLIENTE NUEVO", "");
  }

  if (!textContains(fullText, PRICE_LINE_RE)) {
    const equipMatch = fullText.match(EQUIP_LINE_RE);
    const equipType = equipMatch
      ? equipMatch[1].toUpperCase().replace(/\s+/g, " ")
      : "COMODATO";
    const pkgPrice = parsePackagePrice(fullText);
    if (pkgPrice && parseInt(pkgPrice, 10) > 0) {
      const proration = computeProration(
        parseInt(pkgPrice, 10),
        getMexicoDate(),
      );

      if (equipMatch) {
        // Replace existing EQUIPO line with full price template
        const idx = completed.findIndex((l) => EQUIP_LINE_RE.test(l));
        if (idx !== -1) {
          completed[idx] =
            `EQUIPO ${equipType} $ + ` +
            `${proration.label} ` +
            `${formatPrice(proration.price)} = ` +
            `${formatPrice(proration.price)} MXN`;
        } else {
          appendLine(
            completed,
            `EQUIPO ${equipType} $ + ` +
              `${proration.label} ` +
              `${formatPrice(proration.price)} = ` +
              `${formatPrice(proration.price)} MXN`,
          );
        }
      } else {
        appendLine(
          completed,
          `EQUIPO ${equipType} $ + ` +
            `${proration.label} ` +
            `${formatPrice(proration.price)} = ` +
            `${formatPrice(proration.price)} MXN`,
        );
      }
    } else if (!equipMatch) {
      appendLine(
        completed,
        `EQUIPO COMODATO $ + RESTANTE DE MES ${monthName} $ = $`,
      );
    } else {
      // Has equipment line but no package price
      const idx = completed.findIndex((l) => EQUIP_LINE_RE.test(l));
      if (idx !== -1) {
        completed[idx] =
          `EQUIPO ${equipType} $ + ` + `RESTANTE DE MES ${monthName} $ = $`;
      }
    }
  }

  if (!textContains(fullText, HORARIO_RE)) {
    appendLine(completed, "HORARIO: POR CONFIRMAR");
  }

  if (!textContains(fullText, FORM_PAYMENT_RE)) {
    const altPaymentLine = findLine(completed, ALT_PAYMENT_RE);
    const paymentValue = altPaymentLine ? getPaymentValue(altPaymentLine) : "";
    const nextLine = `FORMA DE PAGO: ${paymentValue || "POR CONFIRMAR"}`;

    if (altPaymentLine) {
      const idx = completed.indexOf(altPaymentLine);
      completed[idx] = nextLine;
    } else {
      appendLine(completed, nextLine);
    }
  }

  if (!textContains(fullText, TECNICO_RE)) {
    appendLine(completed, "TECNICO: ");
  }

  if (!textContains(fullText, ASESOR_RE)) {
    const asesor = getAsesorValueFromDom();
    if (asesor) {
      appendLine(completed, `ASESOR: ${asesor}`);
    }
  }

  return completed;
}

export function completeCommentStructure(text) {
  if (!text || typeof text !== "string") {
    return "";
  }

  if (!shouldCompleteComment(text)) {
    return text;
  }

  const truncated = truncateAtFormDelimiter(text);
  const lines = splitLines(truncated);
  const completedLines = ensureRequiredSections(lines, truncated);

  return completedLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
