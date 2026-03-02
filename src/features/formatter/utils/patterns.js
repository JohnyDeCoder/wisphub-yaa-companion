// Regex building blocks for Spanish text with accents
const S = "\\s+";
const ACCENT_O = "[OÓ]";
const ACCENT_E = "[EÉ]";
const ACCENT_I = "[IÍ]";
const ACCENT_A = "[AÁ]";
const ACCENT_N = "[NÑ]";
const PLURAL = "S?";

// Keywords that get a double line break before them
export const DOUBLE_BREAK_PATTERNS = [
  `CLIENTE${S}NUEVO${PLURAL}`,
  `MIGRACI${ACCENT_O}N`,
  `EQUIPO${PLURAL}${S}COMODATO${PLURAL}`,
  `EQUIPO${PLURAL}${S}PRESTADO${PLURAL}`,
  `EQUIPO${PLURAL}${S}PROPIO${PLURAL}`,
  `EQUIPO${PLURAL}${S}DATO${PLURAL}`,
  `EQUIPO${PLURAL}${S}COMO${S}DATO${PLURAL}`,
  `EQUIPO${PLURAL}${S}COMPRADO${PLURAL}`,
  `PRESTADO${PLURAL}${S}\\$`,
  `CAMBIO${S}DE${S}COMPA${ACCENT_N}${ACCENT_I}A`,
];

// Keywords that get a single line break before them
export const SINGLE_BREAK_PATTERNS = [
  `PAQUETE${PLURAL}:`,
  `FECHA${S}DE${S}INSTALACI${ACCENT_O}N${S}SOLICITADA:`,
  `HORARIO${PLURAL}:`,
  `FORMA${S}DE${S}PAGO:`,
  `M${ACCENT_E}TODO${PLURAL}${S}DE${S}PAGO:`,
  `FORMA${S}DE${S}CONTRATACI${ACCENT_O}N:`,
  `T${ACCENT_E}CNICO${PLURAL}:`,
  "ASESORA?:",
  "CELULAR:",
  `REFERENCIA${PLURAL}:`,
  `COMENTARIOS(${S}ADICIONALES)?:`,
  `R${ACCENT_E}GIMEN${S}FISCAL:`,
  `P${ACCENT_A}GINA${S}INTERNET:`,
];

export const URL_PATTERN = /(https?:\/\/[^\s]+)/gi;

export const PRESERVE_CASE_PATTERN = /\([^)]*@[^)]*\)/g;

export const SECTION_DELIMITER_PATTERN = /\s*(---+|===+)/g;

export const PRE_INSTALL_FORM_PATTERN =
  /---+\s*HECHO CON (?:EL )?FORMULARIO DE PRE-INSTALACI[OÓ]N/i;

export const ADDRESS_LABEL_PATTERN =
  /DIRECCI[OÓ]N\s+(CONFIRMADA|SELECCIONADA)[^:]*/i;

export const MAP_LABEL_PATTERN = /UBICACI[OÓ]N\s+EN\s+MAPA:/i;

export function buildPattern(patterns) {
  return new RegExp(`(${patterns.join("|")})`, "gi");
}
