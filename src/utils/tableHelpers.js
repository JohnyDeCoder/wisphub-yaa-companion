export function normalizeText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Pass excludeIndices to skip columns already claimed by a prior field.
export function findColumnIndex(table, keywords, excludeIndices, logTag) {
  if (!table) {
    return -1;
  }

  const skip = excludeIndices || [];
  const tag = logTag || "Table";

  // Prefer DataTables API — enumerates ALL columns including hidden ones
  // and returns the logical index that dt.cell() expects.
  const $ = window.jQuery;
  if ($ && $.fn?.DataTable && $.fn.DataTable.isDataTable($(table))) {
    try {
      const dt = $(table).DataTable();
      const hdrs = dt.columns().header().toArray();
      const normalized = hdrs.map((h) =>
        normalizeText($(h).text()).toLowerCase(),
      );

      // Pass 1: exact match (keyword === full header text)
      for (const kw of keywords) {
        const idx = normalized.indexOf(kw);
        if (idx !== -1 && !skip.includes(idx)) {
          return idx;
        }
      }

      // Pass 2: partial match (header text includes keyword)
      for (const kw of keywords) {
        for (let i = 0; i < normalized.length; i++) {
          if (!skip.includes(i) && normalized[i].includes(kw)) {
            return i;
          }
        }
      }
    } catch (err) {
      console.warn(`[WYC][${tag}] DataTable header scan error:`, err?.message);
    }
  }

  // Fallback: DOM <th> scan (may miss hidden columns)
  const thElements = table.querySelectorAll("thead th");
  const thTexts = Array.from(thElements).map((h) =>
    normalizeText(h.textContent).toLowerCase(),
  );

  for (const kw of keywords) {
    const idx = thTexts.indexOf(kw);
    if (idx !== -1 && !skip.includes(idx)) {
      return idx;
    }
  }
  for (const kw of keywords) {
    for (let i = 0; i < thTexts.length; i++) {
      if (!skip.includes(i) && thTexts[i].includes(kw)) {
        return i;
      }
    }
  }

  return -1;
}

export function getDataTableCellText(tableSelector, row, colIndex, logTag) {
  if (!row || colIndex < 0) {
    return "";
  }

  const $ = window.jQuery;
  if (!$ || !$.fn?.DataTable) {
    return "";
  }

  const tableEl = $(tableSelector);
  if (!tableEl.length || !$.fn.DataTable.isDataTable(tableEl)) {
    return "";
  }

  const tag = logTag || "Table";

  try {
    const dt = tableEl.DataTable();
    const raw = dt.cell(row, colIndex).data();
    const normalized = normalizeText(raw);
    if (normalized) {
      return normalized;
    }

    const rowData = dt.row(row).data();
    if (Array.isArray(rowData)) {
      return normalizeText(rowData[colIndex]);
    }

    return "";
  } catch (err) {
    try {
      const dt = tableEl.DataTable();
      const rowData = dt.row(row).data();
      if (Array.isArray(rowData)) {
        return normalizeText(rowData[colIndex]);
      }
    } catch {
      // noop: keep original warning below
    }

    console.warn(
      `[WYC][${tag}] DataTable cell read error (col ${colIndex}):`,
      err?.message,
    );
    return "";
  }
}

export function matchesKeywords(text, keywords) {
  const lower = normalizeText(text).toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

// Returns { $, tableEl, dt } or null when jQuery/DataTable is unavailable or
// the element is not initialized as a DataTable.
export function getJQueryDataTable(selector) {
  const $ = window.jQuery;
  if (!$ || !$.fn?.DataTable) {
    return null;
  }
  const tableEl = $(selector);
  if (!tableEl.length || !$.fn.DataTable.isDataTable(tableEl)) {
    return null;
  }
  return { $, tableEl, dt: tableEl.DataTable() };
}
