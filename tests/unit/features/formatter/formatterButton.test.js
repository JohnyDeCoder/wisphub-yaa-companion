const mocks = vi.hoisted(() => ({
  createToolbarButton: vi.fn(),
  injectIntoToolbar: vi.fn(),
  addKeyboardShortcut: vi.fn(),
  setIsFormatted: vi.fn(),
  getIsFormatted: vi.fn(),
  updateButtonVisual: vi.fn(),
}));

vi.mock("../../../../src/utils/toolbar.js", () => ({
  createToolbarButton: mocks.createToolbarButton,
  injectIntoToolbar: mocks.injectIntoToolbar,
  addKeyboardShortcut: mocks.addKeyboardShortcut,
}));

vi.mock("../../../../src/features/formatter/stores/toggleState.js", () => ({
  setIsFormatted: mocks.setIsFormatted,
  getIsFormatted: mocks.getIsFormatted,
  updateButtonVisual: mocks.updateButtonVisual,
}));

describe("formatter button no-op handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="cke_editor1">
        <div class="cke_toolbox"></div>
      </div>
    `;
    mocks.getIsFormatted.mockReturnValue(false);
    mocks.injectIntoToolbar.mockReturnValue(true);
    mocks.createToolbarButton.mockImplementation((config) => {
      const button = document.createElement("button");
      button.id = config.id;
      button.addEventListener("click", config.onClick);
      return button;
    });
  });

  it("keeps button in off state when toggle returns success without changes", async () => {
    const { injectButtonIntoToolbar } = await import(
      "../../../../src/features/formatter/components/formatterButton.js"
    );
    const onToggle = vi.fn().mockReturnValue({ success: true, changed: false });

    const injected = injectButtonIntoToolbar({ name: "editor1" }, onToggle);
    expect(injected).toBe(true);

    const buttonConfig = mocks.createToolbarButton.mock.calls[0][0];
    buttonConfig.onClick();

    expect(onToggle).toHaveBeenCalledWith(true, { fillFields: false });
    expect(mocks.setIsFormatted).toHaveBeenCalledWith(false);
    expect(mocks.updateButtonVisual).toHaveBeenCalledWith(false);
  });
});
