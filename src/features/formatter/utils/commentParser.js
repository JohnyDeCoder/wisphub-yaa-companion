export function parseRegimenFiscal(text) {
  const match = text.match(/R[EÉ]GIMEN\s+FISCAL:\s*(\d{3})\s*[-–—]\s*(.+?)(?:\n|===|$)/i);
  if (!match) {
    return null;
  }
  return {
    code: match[1],
    description: `${match[1]} - ${match[2].trim()}`,
  };
}

export function parseInstallCost(text) {
  const match = text.match(
    /(?:EQUIPO|COMODATO|INSTALACI[OÓ]N)[^\n]*\$\s*([\d,]+)/i,
  );
  if (!match) {
    return null;
  }
  return match[1].replace(/,/g, "");
}

export function parsePackagePrice(text) {
  const match = text.match(/PAQUETE[^\n]*\$\s*([\d,]+)/i);
  if (!match) {
    return null;
  }
  return match[1].replace(/,/g, "");
}

function extractLabelValue(text, labelPattern) {
  const re = new RegExp(labelPattern + "\\s*([^\\n]*)", "i");
  const section = re.exec(text);
  if (!section) {
    return null;
  }
  const labelBoundary = /\b[A-ZÁÉÍÓÚÑÜ]{2,}(?:\s+[A-ZÁÉÍÓÚÑÜ]+)*\s*:|---+|===+/;
  const content = section[1].split(labelBoundary)[0].trim();
  return content || null;
}

function parseMentionField(text, labelPattern) {
  const content = extractLabelValue(text, labelPattern);
  if (!content) {
    return null;
  }
  const mentionMatch = content.match(/\(@?([^@\s)]+)@/);
  if (mentionMatch) {
    return mentionMatch[1].toLowerCase();
  }

  const atMatch = content.match(/\b([a-z0-9._-]+)@/i);
  if (atMatch) {
    return atMatch[1].toLowerCase();
  }

  const plain = content.trim();
  return /^[a-z0-9._-]+$/i.test(plain) ? plain.toLowerCase() : null;
}

export function parseAsesor(text) {
  return parseMentionField(text, "ASESORA?:");
}

export function parseTecnico(text) {
  return parseMentionField(text, "T[E\u00c9]CNICO(?:S)?:");
}

export function parseInstallNumber() {
  const titleMatch = document.title.match(/(\d+)@/);
  if (titleMatch) {
    return titleMatch[1];
  }

  const urlMatch = window.location.pathname.match(/\/(\d+)(?:@|\/)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  const h1 = document.querySelector(".page-header h1 span");
  if (h1) {
    const h1Match = h1.textContent.match(/(\d+)@/);
    if (h1Match) {
      return h1Match[1];
    }
  }

  return null;
}

export function canRemoveDatosFiscalesSection(text) {
  const sectionMatch = text.match(/===+\s*DATOS\s+FISCALES\s*([\s\S]*?)===+/i);
  if (!sectionMatch) {
    return false;
  }

  const lines = sectionMatch[1]
    .trim()
    .split(/\n/)
    .filter((l) => l.trim().length > 0);

  return lines.length > 0 && lines.every((l) => /R[EÉ]GIMEN\s+FISCAL/i.test(l));
}

export function removeDatosFiscalesSection(text) {
  return text.replace(/\s*===+\s*DATOS\s+FISCALES\s*[\s\S]*?===+\s*/gi, " ").trim();
}

export function parseCommentData(text) {
  const regimenFiscal = parseRegimenFiscal(text);
  return {
    regimenFiscal,
    installCost: parseInstallCost(text),
    packagePrice: parsePackagePrice(text),
    asesor: parseAsesor(text),
    tecnico: parseTecnico(text),
    installNumber: parseInstallNumber(),
    canRemoveFiscalSection: regimenFiscal ? canRemoveDatosFiscalesSection(text) : false,
  };
}
