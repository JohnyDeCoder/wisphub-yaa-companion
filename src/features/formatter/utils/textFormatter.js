import {
  DOUBLE_BREAK_PATTERNS,
  SINGLE_BREAK_PATTERNS,
  URL_PATTERN,
  PRESERVE_CASE_PATTERN,
  SECTION_DELIMITER_PATTERN,
  PRE_INSTALL_FORM_PATTERN,
  ADDRESS_LABEL_PATTERN,
  MAP_LABEL_PATTERN,
  buildPattern,
} from './patterns.js';

function extractWithPlaceholders(text, pattern, tag) {
  const items = [];
  const replaced = text.replace(pattern, (match) => {
    items.push(match);
    return `__${tag}_${items.length - 1}__`;
  });
  return { text: replaced, items };
}

function restorePlaceholders(text, tag, items, transform) {
  const re = new RegExp(`__${tag}_(\\d+)__`, 'g');
  return text.replace(re, (_, idx) => {
    const val = items[parseInt(idx)];
    return transform ? transform(val) : val;
  });
}

function applyKeywordBreaks(text) {
  let result = text;

  const doublePattern = buildPattern(DOUBLE_BREAK_PATTERNS);
  result = result.replace(doublePattern, '\n$1');

  const singlePattern = buildPattern(SINGLE_BREAK_PATTERNS);
  result = result.replace(singlePattern, '\n$1');

  result = result.replace(/\s*(¡?VERIFICAR DETENIDAMENTE!?)/gi, '\n\n═════ $1 ═════');

  result = result.replace(/(DIRECCI[OÓ]N CONFIRMADA[^:]*:)\s*/gi, '\n$1\n');
  result = result.replace(/(DIRECCI[OÓ]N SELECCIONADA[^:]*:)\s*/gi, '\n$1\n');
  result = result.replace(/(UBICACI[OÓ]N EN MAPA:)\s*/gi, '\n$1\n');

  return result;
}

function applySectionDelimiterBreaks(text) {
  return text.replace(SECTION_DELIMITER_PATTERN, '\n$1');
}

function applyPreInstallTransform(text) {
  if (!PRE_INSTALL_FORM_PATTERN.test(text)) {
    return text;
  }
  return text.replace(/FORMA DE CONTRATACI[OÓ]N\s*:/gi, 'Página Internet:');
}

function buildHtmlParts(lines, urls) {
  let isAddressContent = false;
  const parts = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0) {
      continue;
    }

    const isAddrLabel = ADDRESS_LABEL_PATTERN.test(line);
    const isMapLabel = MAP_LABEL_PATTERN.test(line);
    const hasUrl = /__URL_\d+__/.test(line);

    if (isAddrLabel) {
      isAddressContent = true;
      parts.push(line);
      continue;
    }

    if (isMapLabel) {
      isAddressContent = false;
      parts.push(line);
      continue;
    }

    if (isAddressContent && !hasUrl) {
      const singlePat = buildPattern(SINGLE_BREAK_PATTERNS);
      if (line.includes('═════') || singlePat.test(line)) {
        isAddressContent = false;
      }
      parts.push(`</strong>${line}<strong>`);
      continue;
    }

    if (hasUrl) {
      isAddressContent = false;
      const processedLine = restorePlaceholders(
        line,
        'URL',
        urls,
        (url) => `<a href="${url}" target="_blank"` + ` rel="noopener">${url}</a>`,
      );
      parts.push(`</strong>${processedLine}<strong>`);
      continue;
    }

    parts.push(line);
  }

  return parts;
}

function cleanHtml(html) {
  return html
    .replace(/<strong><\/strong>/g, '')
    .replace(/<strong><br><br>/g, '<strong>')
    .replace(/<strong><br>/g, '<strong>')
    .replace(/<br><br><\/strong>/g, '</strong>')
    .replace(/<br><\/strong>/g, '</strong>');
}

export function formatText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let formatted = text.replace(/[ \t]+/g, ' ').trim();

  const mentions = extractWithPlaceholders(formatted, PRESERVE_CASE_PATTERN, 'MENTION');
  formatted = mentions.text;

  const urlData = extractWithPlaceholders(formatted, URL_PATTERN, 'URL');
  formatted = urlData.text;
  const urls = urlData.items.map((u) => u.toLowerCase());

  formatted = applySectionDelimiterBreaks(formatted);

  formatted = applyKeywordBreaks(formatted);

  formatted = formatted.toUpperCase();
  formatted = formatted.replace(/\n{5,}/g, '\n\n\n\n');
  formatted = formatted.replace(/^\n+/, '');

  formatted = restorePlaceholders(formatted, 'MENTION', mentions.items);

  formatted = applyPreInstallTransform(formatted);

  const lines = formatted.split('\n');
  const parts = buildHtmlParts(lines, urls);

  const raw = '<strong>' + parts.join('<br><br>') + '</strong>';
  return cleanHtml(raw);
}
