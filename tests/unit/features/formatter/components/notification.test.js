/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { showNotification } from "../../../../../src/features/formatter/components/notification.js";

describe("showNotification dismiss behavior", () => {
  beforeEach(() => {
    document.body.textContent = "";
  });

  it("dismiss returned by showNotification does not call onClose", () => {
    const onClose = vi.fn();
    const dismiss = showNotification(
      "Perfil incorrecto detectado.",
      "error",
      Number.POSITIVE_INFINITY,
      onClose,
    );
    dismiss();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("clicking the close button calls onClose", () => {
    const onClose = vi.fn();
    showNotification(
      "Perfil incorrecto detectado.",
      "error",
      Number.POSITIVE_INFINITY,
      onClose,
    );
    document.querySelector(".wisphub-yaa-notification-close").click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calling dismiss then clicking close button does not call onClose", () => {
    const onClose = vi.fn();
    const dismiss = showNotification(
      "Cerrando sesión...",
      "info",
      Number.POSITIVE_INFINITY,
      onClose,
    );
    dismiss();
    const closeBtn = document.querySelector(".wisphub-yaa-notification-close");
    if (closeBtn) { closeBtn.click(); }
    expect(onClose).not.toHaveBeenCalled();
  });
});
