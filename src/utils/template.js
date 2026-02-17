// Shared template generator — used by both the template copy button and auto-fill feature.
import { MONTH_NAMES } from "../config/constants.js";
import { formatPrice } from "./formatting.js";
import { getCurrentUserName } from "./currentUser.js";

function getMexicoDate() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
}

// Generates the installation comment template.
// calcFn (optional): () => { installCost, monthPrice, monthLabel, total } | null
export function generateTemplate(calcFn) {
  const date = getMexicoDate();
  const day = date.getDate();
  const monthName = MONTH_NAMES[date.getMonth()];
  const isProrated = day > 5 && day < 26;
  const monthLabel = isProrated ? `RESTANTE DE MES ${monthName}` : `MES ${monthName}`;

  // Try to include calculated prices from form data (plan selector, date, install cost)
  const calc = typeof calcFn === "function" ? calcFn() : null;
  let priceLine;

  if (calc) {
    const installPart =
      calc.installCost > 0
        ? `EQUIPO PRESTADO/COMPRADO/COMODATO ${formatPrice(calc.installCost)}`
        : "EQUIPO PRESTADO/COMPRADO/COMODATO $";
    priceLine = `${installPart} + ${calc.monthLabel} ${formatPrice(calc.monthPrice)} = ${formatPrice(calc.total)} MXN`;
  } else {
    priceLine = `EQUIPO PRESTADO/COMPRADO/COMODATO $ + ${monthLabel} $ = $`;
  }

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
    "",
    `ASESOR: ${getCurrentUserName() || ""}`,
  ].join("\n");
}
