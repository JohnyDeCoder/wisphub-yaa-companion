// Shared template generator — used by both the template copy button and auto-fill feature.
import { MONTH_NAMES } from "../config/constants.js";
import { formatPrice } from "./formatting.js";
import { getCurrentUserName } from "./currentUser.js";

const ADMIN_NAMES = ["admin", "administrador"];

function getMexicoDate() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }),
  );
}

function isAdminUser(name) {
  const lower = (name || "").trim().toLowerCase();
  return ADMIN_NAMES.includes(lower);
}

// Generates the installation comment template.
// calcFn (optional): () => { installCost, monthPrice, monthLabel, total } | null
export function generateTemplate(calcFn) {
  const date = getMexicoDate();
  const day = date.getDate();
  const monthName = MONTH_NAMES[date.getMonth()];
  const isProrated = day > 5 && day < 26;
  const monthLabel = isProrated
    ? `RESTANTE DE MES ${monthName}`
    : `MES ${monthName}`;

  // Try to include calculated prices from form data (plan selector, date, install cost)
  const calc = typeof calcFn === "function" ? calcFn() : null;
  let priceLine;

  if (calc) {
    const installPart =
      calc.installCost > 0
        ? `EQUIPO COMODATO ${formatPrice(calc.installCost)}`
        : "EQUIPO COMODATO $";
    priceLine = `${installPart} + ${calc.monthLabel} ${formatPrice(calc.monthPrice)} = ${formatPrice(calc.total)} MXN`;
  } else {
    priceLine = `EQUIPO COMODATO $ + ${monthLabel} $ = $`;
  }

  const userName = getCurrentUserName();
  const asesorLine = isAdminUser(userName) ? [] : ["", `ASESOR: ${userName}`];

  return [
    "CLIENTE NUEVO",
    "",
    priceLine,
    "",
    "HORARIO: POR CONFIRMAR",
    "",
    "FORMA DE PAGO: POR CONFIRMAR",
    "",
    "TECNICO: ",
    ...asesorLine,
  ].join("\n");
}
