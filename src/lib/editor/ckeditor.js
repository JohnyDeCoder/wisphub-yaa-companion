export function isCKEditorAvailable() {
  return typeof CKEDITOR !== "undefined" && CKEDITOR.instances;
}

export function getEditorInstance() {
  if (!isCKEditorAvailable()) {
    return null;
  }

  const names = Object.keys(CKEDITOR.instances);
  if (names.length === 0) {
    return null;
  }

  for (const name of names) {
    const editor = CKEDITOR.instances[name];
    if (editor && editor.status === "ready") {
      return editor;
    }
  }

  return CKEDITOR.instances[names[0]] || null;
}

export function isEditorReady(editor) {
  return editor && editor.status === "ready";
}

export function getEditorText(editor) {
  if (!editor) {
    return "";
  }

  try {
    let html = editor.getData();
    if (!html) {
      return "";
    }

    html = html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>\s*<p>/gi, "\n\n")
      .replace(/<\/div>\s*<div>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<p[^>]*>/gi, "")
      .replace(/<div[^>]*>/gi, "")
      .replace(/<[^>]+>/g, "");

    const doc = new DOMParser().parseFromString(html, "text/html");
    const text = doc.body.textContent || "";

    return text.replace(/\n{3,}/g, "\n\n").trim();
  } catch (err) {
    console.warn("[CKEditor] getEditorText failed:", err?.message);
    return "";
  }
}

export function getEditorContent(editor) {
  if (!editor) {
    return "";
  }
  return editor.getData() || "";
}

export function setEditorContent(editor, html) {
  if (!editor) {
    return;
  }
  editor.setData(html);
}
