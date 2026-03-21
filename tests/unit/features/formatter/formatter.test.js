const mocks = vi.hoisted(() => ({
  getEditorInstance: vi.fn(),
  getEditorText: vi.fn(),
  getEditorContent: vi.fn(),
  setEditorContent: vi.fn(),
  isEditorReady: vi.fn(),
  formatText: vi.fn(),
  parseCommentData: vi.fn(),
  removeDatosFiscalesSection: vi.fn(),
  completeCommentStructure: vi.fn(),
  autoFillFormFields: vi.fn(),
  clearAllFieldIndicators: vi.fn(),
  injectButtonIntoToolbar: vi.fn(),
  showNotification: vi.fn(),
  updateNotificationSettings: vi.fn(),
  getOriginalContent: vi.fn(),
  setOriginalContent: vi.fn(),
  getIsFormatted: vi.fn(),
  setIsFormatted: vi.fn(),
  resetToggleState: vi.fn(),
  updateButtonVisual: vi.fn(),
  postBridgeMessage: vi.fn(),
}));

vi.mock("../../../../src/lib/editor/ckeditor.js", () => ({
  getEditorInstance: mocks.getEditorInstance,
  getEditorText: mocks.getEditorText,
  getEditorContent: mocks.getEditorContent,
  setEditorContent: mocks.setEditorContent,
  isEditorReady: mocks.isEditorReady,
}));

vi.mock("../../../../src/features/formatter/utils/textFormatter.js", () => ({
  formatText: mocks.formatText,
}));

vi.mock("../../../../src/features/formatter/utils/commentParser.js", () => ({
  parseCommentData: mocks.parseCommentData,
  removeDatosFiscalesSection: mocks.removeDatosFiscalesSection,
}));

vi.mock("../../../../src/features/formatter/utils/commentCompleter.js", () => ({
  completeCommentStructure: mocks.completeCommentStructure,
}));

vi.mock("../../../../src/features/formatter/utils/formFiller.js", () => ({
  autoFillFormFields: mocks.autoFillFormFields,
  clearAllFieldIndicators: mocks.clearAllFieldIndicators,
}));

vi.mock("../../../../src/features/formatter/components/formatterButton.js", () => ({
  injectButtonIntoToolbar: mocks.injectButtonIntoToolbar,
}));

vi.mock("../../../../src/features/formatter/components/notification.js", () => ({
  showNotification: mocks.showNotification,
  updateNotificationSettings: mocks.updateNotificationSettings,
}));

vi.mock("../../../../src/features/formatter/stores/toggleState.js", () => ({
  getOriginalContent: mocks.getOriginalContent,
  setOriginalContent: mocks.setOriginalContent,
  getIsFormatted: mocks.getIsFormatted,
  setIsFormatted: mocks.setIsFormatted,
  resetToggleState: mocks.resetToggleState,
  updateButtonVisual: mocks.updateButtonVisual,
}));

vi.mock("../../../../src/utils/pageBridge.js", () => ({
  postBridgeMessage: mocks.postBridgeMessage,
}));

function setupNoOpScenario() {
  mocks.getEditorInstance.mockReturnValue({ name: "editor1", status: "ready" });
  mocks.isEditorReady.mockReturnValue(true);
  mocks.getEditorText.mockReturnValue(
    "CLIENTE NUEVO\n\nEQUIPO COMODATO $850 + RESTANTE DE MES MARZO $113= $963MXN",
  );
  mocks.getEditorContent.mockReturnValue(
    "<p>CLIENTE NUEVO</p><p>EQUIPO COMODATO $850 + RESTANTE DE MES MARZO $113= $963MXN</p>",
  );
  mocks.completeCommentStructure.mockImplementation((value) => value);
  mocks.parseCommentData.mockReturnValue({ canRemoveFiscalSection: false });
  mocks.removeDatosFiscalesSection.mockImplementation((value) => value);
  mocks.formatText.mockImplementation((value) =>
    `<p>${String(value).replace(/\n/g, "<br>")}</p>`,
  );
  mocks.autoFillFormFields.mockReturnValue({
    changed: false,
    changedCount: 0,
  });
  mocks.getIsFormatted.mockReturnValue(false);
}

describe("formatter no-op behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupNoOpScenario();
  });

  it("returns no-op when text and fields stay unchanged", async () => {
    const { handleToggle } = await import(
      "../../../../src/features/formatter/formatter.js"
    );

    const result = handleToggle(true, { silent: true, fillFields: true });

    expect(result).toMatchObject({
      success: true,
      changed: false,
      noOp: true,
      contentChanged: false,
      fieldsChanged: false,
    });
    expect(mocks.setEditorContent).not.toHaveBeenCalled();
    expect(mocks.setOriginalContent).not.toHaveBeenCalled();
    expect(mocks.showNotification).not.toHaveBeenCalled();
  });

  it("does not switch to formatted state when applyFormatting is no-op", async () => {
    const { applyFormatting } = await import(
      "../../../../src/features/formatter/formatter.js"
    );

    const result = applyFormatting({ silent: true, fillFields: true });

    expect(result).toMatchObject({
      success: true,
      changed: false,
      noOp: true,
    });
    expect(mocks.setIsFormatted).not.toHaveBeenCalled();
    expect(mocks.updateButtonVisual).not.toHaveBeenCalled();
  });

  it("skips auto-format notification when no changes were applied", async () => {
    vi.useFakeTimers();
    try {
      const { setOnAutoFormatComplete, updateSettings } = await import(
        "../../../../src/features/formatter/formatter.js"
      );
      const onComplete = vi.fn();
      setOnAutoFormatComplete(onComplete);

      updateSettings({ autoFormatEnabled: true });
      await vi.advanceTimersByTimeAsync(150);

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete.mock.calls[0][0]).toMatchObject({
        success: true,
        changed: false,
        noOp: true,
      });
      expect(mocks.showNotification).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
