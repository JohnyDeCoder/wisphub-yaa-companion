import { ACTIONS, MESSAGE_TYPES } from "../../../../src/config/messages.js";

const mocks = vi.hoisted(() => ({
  runtimeListener: null,
  isBridgeMessage: vi.fn(() => false),
  isMessageTokenValid: vi.fn(() => true),
  postBridgeMessage: vi.fn(() => true),
  runtimeSendMessage: vi.fn(async () => ({})),
  storageGet: vi.fn(async () => ({})),
  storageSet: vi.fn(async () => {}),
}));

vi.mock("../../../../src/utils/browser.js", () => ({
  browserAPI: {
    runtime: {
      onMessage: {
        addListener: (handler) => {
          mocks.runtimeListener = handler;
        },
      },
      sendMessage: (...args) => mocks.runtimeSendMessage(...args),
    },
    storage: {
      local: {
        get: mocks.storageGet,
        set: mocks.storageSet,
      },
    },
  },
}));

vi.mock("../../../../src/config/domains.js", () => ({
  getDomainKey: vi.fn(() => "wisphub"),
  getApiBaseUrl: vi.fn(() => "https://api.wisphub.test"),
}));

vi.mock("../../../../src/utils/pageBridge.js", () => ({
  generateBridgeToken: vi.fn(() => "1234567890abcdef"),
  isBridgeMessage: (...args) => mocks.isBridgeMessage(...args),
  isMessageTokenValid: (...args) => mocks.isMessageTokenValid(...args),
  postBridgeMessage: (...args) => mocks.postBridgeMessage(...args),
}));

import {
  listenToExtensionMessages,
  listenToPageMessages,
} from "../../../../src/lib/messaging/bridge.js";

describe("bridge diagnostic startup ack", () => {
  let locationObj;

  beforeEach(() => {
    locationObj = { assign: vi.fn() };
    mocks.runtimeListener = null;
    mocks.isBridgeMessage.mockReset();
    mocks.isBridgeMessage.mockReturnValue(false);
    mocks.isMessageTokenValid.mockReset();
    mocks.isMessageTokenValid.mockReturnValue(true);
    mocks.postBridgeMessage.mockReset();
    mocks.postBridgeMessage.mockImplementation(() => true);
    mocks.runtimeSendMessage.mockReset();
    mocks.runtimeSendMessage.mockResolvedValue({});
    window.__WISPHUB_LAST_DIAGNOSTIC_ACK__ = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("responds with page ack payload instead of immediate success", async () => {
    listenToExtensionMessages({ locationObj });

    expect(typeof mocks.runtimeListener).toBe("function");

    let resolveResponse;
    const responsePromise = new Promise((resolve) => {
      resolveResponse = resolve;
    });

    const returned = mocks.runtimeListener(
      {
        action: ACTIONS.RUN_CLIENT_DIAGNOSTIC,
        fromPopup: true,
        clientContext: { serviceSlug: "10313@yaa-internet-by-vw", serviceId: "10313" },
      },
      {},
      (payload) => resolveResponse(payload),
    );

    expect(returned).toBe(true);
    expect(mocks.postBridgeMessage).toHaveBeenCalledWith(
      MESSAGE_TYPES.DIAGNOSTIC_RUN_REQUEST,
      expect.objectContaining({
        fromPopup: true,
      }),
      expect.objectContaining({
        includeToken: true,
      }),
    );

    window.__WISPHUB_LAST_DIAGNOSTIC_ACK__ = {
      success: false,
      started: false,
      error: "Ya existe un diagnóstico en curso",
    };

    await expect(responsePromise).resolves.toEqual({
      success: false,
      started: false,
      error: "Ya existe un diagnóstico en curso",
    });
  });

  it("returns a startup error when no page ack is received within timeout", async () => {
    vi.useFakeTimers();
    listenToExtensionMessages({ locationObj });

    let resolveResponse;
    const responsePromise = new Promise((resolve) => {
      resolveResponse = resolve;
    });

    mocks.runtimeListener(
      {
        action: ACTIONS.RUN_CLIENT_DIAGNOSTIC,
        fromPopup: true,
        clientContext: { serviceSlug: "10313@yaa-internet-by-vw", serviceId: "10313" },
      },
      {},
      (payload) => resolveResponse(payload),
    );

    await vi.advanceTimersByTimeAsync(1250);

    await expect(responsePromise).resolves.toEqual({
      success: false,
      started: false,
      error: "No se recibió confirmación de inicio del diagnóstico en la página activa",
    });
  });
});

describe("bridge session capture requests", () => {
  beforeEach(() => {
    mocks.isBridgeMessage.mockReset();
    mocks.isBridgeMessage.mockImplementation(
      (data) => data?.type === MESSAGE_TYPES.SESSION_CAPTURE_REQUEST,
    );
    mocks.isMessageTokenValid.mockReset();
    mocks.isMessageTokenValid.mockReturnValue(true);
    mocks.runtimeSendMessage.mockReset();
    mocks.runtimeSendMessage.mockResolvedValue({ success: true });
    document.body.innerHTML = `
      <div class="user-menu">
        <span class="user-name">kevin@vwinternetnetworks</span>
      </div>
    `;
  });

  it("forces a fresh cookie capture each time the page reports a completed profile switch", async () => {
    listenToPageMessages();

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: MESSAGE_TYPES.SESSION_CAPTURE_REQUEST },
        source: window,
      }),
    );
    await vi.waitFor(() => {
      expect(mocks.runtimeSendMessage).toHaveBeenCalledTimes(1);
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: MESSAGE_TYPES.SESSION_CAPTURE_REQUEST },
        source: window,
      }),
    );
    await vi.waitFor(() => {
      expect(mocks.runtimeSendMessage).toHaveBeenCalledTimes(2);
    });

    expect(mocks.runtimeSendMessage).toHaveBeenLastCalledWith({
      action: ACTIONS.SESSION_CAPTURE_COOKIES,
      domainKey: "wisphub",
      username: "kevin@vwinternetnetworks",
    });
  });

  it("captures every detected logged-in page load so a fresh login replaces stale cookies", async () => {
    mocks.isBridgeMessage.mockImplementation(
      (data) => data?.type === MESSAGE_TYPES.CHANNEL_HELLO,
    );

    listenToPageMessages();
    const initialCalls = mocks.runtimeSendMessage.mock.calls.length;

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: MESSAGE_TYPES.CHANNEL_HELLO },
        source: window,
      }),
    );
    await vi.waitFor(() => {
      expect(mocks.runtimeSendMessage.mock.calls.length).toBeGreaterThan(initialCalls);
    });
    const callsAfterFirstLoad = mocks.runtimeSendMessage.mock.calls.length;

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: MESSAGE_TYPES.CHANNEL_HELLO },
        source: window,
      }),
    );
    await vi.waitFor(() => {
      expect(mocks.runtimeSendMessage.mock.calls.length).toBeGreaterThan(callsAfterFirstLoad);
    });
  });
});

describe("bridge profile switch actions", () => {
  let locationObj;

  beforeEach(() => {
    locationObj = { assign: vi.fn() };
    mocks.runtimeListener = null;
    mocks.isBridgeMessage.mockReset();
    mocks.isBridgeMessage.mockReturnValue(false);
    mocks.isMessageTokenValid.mockReset();
    mocks.isMessageTokenValid.mockReturnValue(true);
    mocks.postBridgeMessage.mockReset();
    mocks.postBridgeMessage.mockImplementation(() => true);
    mocks.runtimeSendMessage.mockReset();
    mocks.runtimeSendMessage.mockImplementation(async (payload) => {
      if (payload?.action === ACTIONS.SESSION_CAPTURE_COOKIES) {
        return { success: true };
      }
      if (payload?.action === ACTIONS.SESSION_HAS_COOKIES) {
        return { success: true, hasSnapshot: false };
      }
      return {};
    });
    window.__WISPHUB_LAST_PROFILE_SWITCH_ACK__ = null;
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns current session context from DOM username", () => {
    document.body.innerHTML = `
      <div class="user-menu">
        <span class="user-name">johny@yaa-internet-by-vw</span>
      </div>
    `;

    listenToExtensionMessages({ locationObj });
    const response = {};
    mocks.runtimeListener(
      { action: ACTIONS.GET_SESSION_CONTEXT },
      {},
      (payload) => Object.assign(response, payload),
    );

    expect(response).toMatchObject({
      success: true,
      context: expect.objectContaining({
        loggedIn: true,
        username: "johny@yaa-internet-by-vw",
      }),
    });
  });

  it("waits page ack before resolving profile switch start", async () => {
    mocks.postBridgeMessage.mockImplementation((type) => {
      if (type === MESSAGE_TYPES.PROFILE_SWITCH_REQUEST) {
        window.__WISPHUB_LAST_PROFILE_SWITCH_ACK__ = {
          success: true,
          started: true,
          switchStrategy: "login-assist",
          redirectUrl: "/clientes/",
          fallbackRedirectUrl:
            "/accounts/logout/?next=%2Faccounts%2Flogin%2F%3Fnext%3D%252Fclientes%252F",
          requiresLogin: true,
        };
      }
      return true;
    });

    listenToExtensionMessages({ locationObj });

    let resolveResponse;
    const responsePromise = new Promise((resolve) => {
      resolveResponse = resolve;
    });

    const returned = mocks.runtimeListener(
      {
        action: ACTIONS.START_PROFILE_SWITCH,
        targetUsername: "johny@vwinternetnetworks",
        targetLabel: "Michoacán",
      },
      {},
      (payload) => resolveResponse(payload),
    );

    expect(returned).toBe(true);

    await expect(responsePromise).resolves.toEqual({
      success: true,
      started: true,
      cancelled: false,
      info: "",
      error: "",
      switchStrategy: "login-assist",
      redirectUrl: "/clientes/",
      fallbackRedirectUrl: "/accounts/logout/?next=%2Faccounts%2Flogin%2F%3Fnext%3D%252Fclientes%252F",
      requiresLogin: true,
    });

    expect(mocks.postBridgeMessage).toHaveBeenCalledWith(
      MESSAGE_TYPES.PROFILE_SWITCH_REQUEST,
      expect.objectContaining({
        targetUsername: "johny@vwinternetnetworks",
      }),
      expect.objectContaining({
        includeToken: true,
      }),
    );
  });

  it("does not start profile switch when current session cannot be captured", async () => {
    document.body.innerHTML = `
      <div class="user-menu">
        <span class="user-name">johny@yaa-internet-by-vw</span>
      </div>
    `;
    mocks.runtimeSendMessage.mockImplementation(async (payload) => {
      if (payload?.action === ACTIONS.SESSION_CAPTURE_COOKIES) {
        return {
          success: false,
          error: "No se encontró una cookie de sesión restaurable para este perfil",
        };
      }
      if (payload?.action === ACTIONS.SESSION_HAS_COOKIES) {
        return { success: true, hasSnapshot: false };
      }
      return {};
    });
    mocks.postBridgeMessage.mockImplementation((type) => {
      if (type === MESSAGE_TYPES.PROFILE_SWITCH_REQUEST) {
        window.__WISPHUB_LAST_PROFILE_SWITCH_ACK__ = {
          success: true,
          started: true,
          switchStrategy: "login-assist",
          redirectUrl: "/clientes/",
          fallbackRedirectUrl:
            "/accounts/logout/?next=%2Faccounts%2Flogin%2F%3Fnext%3D%252Fclientes%252F",
          requiresLogin: true,
        };
      }
      return true;
    });

    listenToExtensionMessages({ locationObj });

    let resolveResponse;
    const responsePromise = new Promise((resolve) => {
      resolveResponse = resolve;
    });

    const returned = mocks.runtimeListener(
      {
        action: ACTIONS.START_PROFILE_SWITCH,
        targetUsername: "johny@vwinternetnetworks",
        targetLabel: "Michoacán",
      },
      {},
      (payload) => resolveResponse(payload),
    );

    expect(returned).toBe(true);

    await expect(responsePromise).resolves.toEqual({
      success: false,
      started: false,
      cancelled: false,
      info: "",
      error: "No se encontró una cookie de sesión restaurable para este perfil",
      switchStrategy: "",
      redirectUrl: "",
      fallbackRedirectUrl: "",
      requiresLogin: false,
    });
    expect(mocks.postBridgeMessage).not.toHaveBeenCalledWith(
      MESSAGE_TYPES.PROFILE_SWITCH_REQUEST,
      expect.anything(),
      expect.anything(),
    );
    expect(locationObj.assign).not.toHaveBeenCalled();
  });

  it("applies cookie switch when snapshot exists and strategy requests cookie-swap", async () => {
    mocks.runtimeSendMessage.mockImplementation(async (payload) => {
      if (payload?.action === ACTIONS.SESSION_CAPTURE_COOKIES) {
        return { success: true };
      }
      if (payload?.action === ACTIONS.SESSION_HAS_COOKIES) {
        return { success: true, hasSnapshot: true };
      }
      if (payload?.action === ACTIONS.SESSION_SWITCH_COOKIES) {
        return { success: true, requiresLogin: false, appliedCount: 12 };
      }
      return {};
    });
    mocks.postBridgeMessage.mockImplementation((type) => {
      if (type === MESSAGE_TYPES.PROFILE_SWITCH_REQUEST) {
        window.__WISPHUB_LAST_PROFILE_SWITCH_ACK__ = {
          success: true,
          started: true,
          switchStrategy: "cookie-swap",
          redirectUrl: "/clientes/",
          fallbackRedirectUrl:
            "/accounts/logout/?next=%2Faccounts%2Flogin%2F%3Fnext%3D%252Fclientes%252F",
          requiresLogin: false,
        };
      }
      return true;
    });

    listenToExtensionMessages({ locationObj });

    let resolveResponse;
    const responsePromise = new Promise((resolve) => {
      resolveResponse = resolve;
    });

    mocks.runtimeListener(
      {
        action: ACTIONS.START_PROFILE_SWITCH,
        targetUsername: "johny@vwinternetnetworks",
        targetLabel: "Michoacán",
      },
      {},
      (payload) => resolveResponse(payload),
    );

    await expect(responsePromise).resolves.toEqual({
      success: true,
      started: true,
      cancelled: false,
      info: "",
      error: "",
      switchStrategy: "cookie-swap",
      redirectUrl: "/clientes/",
      fallbackRedirectUrl: "/accounts/logout/?next=%2Faccounts%2Flogin%2F%3Fnext%3D%252Fclientes%252F",
      requiresLogin: false,
    });
    expect(locationObj.assign).toHaveBeenCalledWith("/clientes/");

    expect(mocks.runtimeSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        action: ACTIONS.SESSION_SWITCH_COOKIES,
        targetUsername: "johny@vwinternetnetworks",
      }),
    );
  });

  it("does not remove source session snapshot when login-assist is used, allowing fallback on return", async () => {
    const menu = document.createElement("div");
    menu.className = "user-menu";
    const span = document.createElement("span");
    span.className = "user-name";
    span.textContent = "johny@yaa-internet-by-vw";
    menu.append(span);
    document.body.append(menu);

    mocks.postBridgeMessage.mockImplementation((type) => {
      if (type === MESSAGE_TYPES.PROFILE_SWITCH_REQUEST) {
        window.__WISPHUB_LAST_PROFILE_SWITCH_ACK__ = {
          success: true,
          started: true,
          switchStrategy: "login-assist",
          redirectUrl: "/accounts/logout/?next=%2Fclientes%2F",
          fallbackRedirectUrl: "/accounts/logout/?next=%2Fclientes%2F",
          requiresLogin: true,
        };
      }
      return true;
    });

    listenToExtensionMessages({ locationObj });

    await new Promise((resolve) => {
      mocks.runtimeListener(
        {
          action: ACTIONS.START_PROFILE_SWITCH,
          targetUsername: "johny@vwinternetnetworks",
          targetLabel: "Michoacán",
        },
        {},
        resolve,
      );
    });

    expect(mocks.runtimeSendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({
        action: "SESSION_REMOVE_SNAPSHOT",
      }),
    );
  });

  it("returns timeout error when profile switch ack is missing", async () => {
    vi.useFakeTimers();
    listenToExtensionMessages({ locationObj });

    let resolveResponse;
    const responsePromise = new Promise((resolve) => {
      resolveResponse = resolve;
    });

    mocks.runtimeListener(
      {
        action: ACTIONS.START_PROFILE_SWITCH,
        targetUsername: "johny@vwinternetnetworks",
        targetLabel: "Michoacán",
      },
      {},
      (payload) => resolveResponse(payload),
    );

    await vi.advanceTimersByTimeAsync(120100);

    await expect(responsePromise).resolves.toEqual({
      success: false,
      started: false,
      cancelled: false,
      error: "No se recibió confirmación para el cambio de perfil en la página activa",
      info: "",
      switchStrategy: "",
      redirectUrl: "",
      fallbackRedirectUrl: "",
      requiresLogin: false,
    });
  });
});
