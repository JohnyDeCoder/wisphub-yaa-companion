import { PROFILE_SWITCH_STORAGE_KEY } from "../../../../src/config/sessionProfiles.js";
import {
  clearPendingProfileSwitch,
  readPendingProfileSwitch,
  resumeProfileSwitchFlow,
  savePendingProfileSwitch,
  startProfileSwitchFlow,
} from "../../../../src/features/session-switcher/profileSwitch.js";

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

function createLocation(pathname = "/clientes/ver/10313/") {
  return {
    hostname: "wisphub.io",
    pathname,
    assign: vi.fn(),
  };
}

function savePending(storage, overrides = {}) {
  savePendingProfileSwitch(
    {
      id: "switch-test",
      domainKey: "wisphub.io",
      sourceUsername: "johny@yaa-internet-by-vw",
      targetUsername: "johny@vwinternetnetworks",
      targetLabel: "Michoacán",
      basePath: "/clientes/",
      createdAt: Date.now(),
      ...overrides,
    },
    storage,
  );
}

describe("profileSwitch flow", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("cancels when user rejects confirmation", () => {
    const storage = createMemoryStorage();
    const locationObj = createLocation();
    const result = startProfileSwitchFlow(
      {
        targetUsername: "johny@vwinternetnetworks",
        targetLabel: "Michoacán",
      },
      {
        context: {
          domainKey: "wisphub.io",
          pathname: "/clientes/ver/10313/",
          loggedIn: true,
          username: "johny@yaa-internet-by-vw",
        },
        confirmFn: () => false,
        locationObj,
        storage,
      },
    );

    expect(result).toMatchObject({
      success: false,
      started: false,
      cancelled: true,
    });
    expect(readPendingProfileSwitch(storage)).toBeNull();
    expect(locationObj.assign).not.toHaveBeenCalled();
  });

  it("stores pending switch, shows spaced copy and redirects to logout when confirmed", () => {
    const storage = createMemoryStorage();
    const locationObj = createLocation("/clientes/ver/10313/");
    let confirmationText = "";

    const result = startProfileSwitchFlow(
      {
        targetUsername: "johny@vwinternetnetworks",
        targetLabel: "Michoacán",
      },
      {
        context: {
          domainKey: "wisphub.io",
          pathname: "/clientes/ver/10313/",
          loggedIn: true,
          username: "johny@yaa-internet-by-vw",
        },
        confirmFn: (text) => {
          confirmationText = text;
          return true;
        },
        locationObj,
        storage,
      },
    );

    expect(result).toMatchObject({
      success: true,
      started: true,
      targetUsername: "johny@vwinternetnetworks",
      switchStrategy: "login-assist",
    });
    expect(confirmationText).toContain("(vwinternetnetworks)");
    expect(confirmationText).toContain("(yaa-internet-by-vw)");
    expect(confirmationText).toContain("\n\n");
    expect(confirmationText).not.toContain("Perfil actual: Colima (johny@");
    expect(locationObj.assign).toHaveBeenCalledTimes(1);
    expect(readPendingProfileSwitch(storage)).toMatchObject({
      targetUsername: "johny@vwinternetnetworks",
      targetLabel: "Michoacán",
      domainKey: "wisphub.io",
      basePath: "/clientes/",
    });
  });

  it("uses cookie-swap strategy when target session snapshot is available", () => {
    const storage = createMemoryStorage();
    const locationObj = createLocation("/Clientes/ver/10313@yaa-internet-by-vw/");

    const result = startProfileSwitchFlow(
      {
        targetUsername: "johny@vwinternetnetworks",
        targetLabel: "Michoacán",
        preferCookieSwitch: true,
      },
      {
        context: {
          domainKey: "wisphub.io",
          pathname: "/Clientes/ver/10313@yaa-internet-by-vw/",
          loggedIn: true,
          username: "johny@yaa-internet-by-vw",
        },
        confirmFn: () => true,
        locationObj,
        storage,
      },
    );

    expect(result).toMatchObject({
      success: true,
      started: true,
      switchStrategy: "cookie-swap",
      requiresLogin: false,
      redirectUrl: "/Clientes/",
      fallbackRedirectUrl:
        "/accounts/logout/?next=%2Faccounts%2Flogin%2F%3Fnext%3D%252FClientes%252F",
    });
    expect(locationObj.assign).toHaveBeenCalledWith("/Clientes/");
  });

  it("auto-submits logout confirmation and keeps tracking with persistent notification", () => {
    const storage = createMemoryStorage();
    savePending(storage);
    document.body.innerHTML = `
      <form action="/accounts/logout/" method="post">
        <input type="hidden" name="next" value="/accounts/login/?next=%2Fclientes%2F" />
      </form>
    `;
    const form = document.querySelector('form[action="/accounts/logout/"]');
    form.requestSubmit = vi.fn();
    const notify = vi.fn(() => vi.fn());
    const locationObj = createLocation("/accounts/logout/");

    const state = resumeProfileSwitchFlow({
      storage,
      locationObj,
      documentObj: document,
      notify,
    });

    expect(state).toMatchObject({ active: true, state: "logging-out" });
    expect(form.requestSubmit).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(
      "Cerrando sesión actual para continuar con Michoacán...",
      "info",
      Number.POSITIVE_INFINITY,
      expect.any(Function),
    );
  });

  it("auto-submits logout form when form has no action attribute", () => {
    const storage = createMemoryStorage();
    savePending(storage);
    const form = document.createElement("form");
    form.method = "post";
    const csrf = document.createElement("input");
    csrf.type = "hidden";
    csrf.name = "csrfmiddlewaretoken";
    csrf.value = "abc123";
    form.appendChild(csrf);
    form.requestSubmit = vi.fn();
    document.body.appendChild(form);
    const notify = vi.fn(() => vi.fn());
    const locationObj = createLocation("/accounts/logout/");

    const state = resumeProfileSwitchFlow({
      storage,
      locationObj,
      documentObj: document,
      notify,
    });

    expect(state).toMatchObject({ active: true, state: "logging-out" });
    expect(form.requestSubmit).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(
      "Cerrando sesión actual para continuar con Michoacán...",
      "info",
      Number.POSITIVE_INFINITY,
      expect.any(Function),
    );
  });

  it("auto-submits logout form when action includes query string", () => {
    const storage = createMemoryStorage();
    savePending(storage);
    const form = document.createElement("form");
    form.action = "/accounts/logout/?next=%2Faccounts%2Flogin%2F%3Fnext%3D%252Fclientes%252F";
    form.method = "post";
    form.requestSubmit = vi.fn();
    document.body.appendChild(form);
    const notify = vi.fn(() => vi.fn());
    const locationObj = createLocation("/accounts/logout/");

    const state = resumeProfileSwitchFlow({
      storage,
      locationObj,
      documentObj: document,
      notify,
    });

    expect(state).toMatchObject({ active: true, state: "logging-out" });
    expect(form.requestSubmit).toHaveBeenCalledTimes(1);
  });

  it("does not show wrong-profile when on logout page but no form found", () => {
    const storage = createMemoryStorage();
    savePending(storage);
    const userMenu = document.createElement("div");
    userMenu.className = "user-menu";
    const userNameEl = document.createElement("span");
    userNameEl.className = "user-name";
    userNameEl.textContent = "johny@yaa-internet-by-vw";
    userMenu.appendChild(userNameEl);
    document.body.appendChild(userMenu);
    const notify = vi.fn(() => vi.fn());
    const locationObj = createLocation("/accounts/logout/");

    const state = resumeProfileSwitchFlow({
      storage,
      locationObj,
      documentObj: document,
      notify,
    });

    expect(state).not.toMatchObject({ state: "wrong-profile" });
    expect(state).toMatchObject({ active: true });
    expect(notify).not.toHaveBeenCalledWith(
      expect.stringContaining("Perfil incorrecto"),
      "error",
      expect.any(Number),
      expect.any(Function),
    );
  });

  it("prefills login input and shows persistent tracking notification", () => {
    const storage = createMemoryStorage();
    savePending(storage);
    document.body.innerHTML = `
      <form>
        <input type="text" id="id_login" value="" />
      </form>
    `;
    const notify = vi.fn(() => vi.fn());
    const locationObj = createLocation("/accounts/login/");

    const state = resumeProfileSwitchFlow({
      storage,
      locationObj,
      documentObj: document,
      notify,
    });

    expect(state).toMatchObject({ active: true, state: "awaiting-login" });
    expect(document.getElementById("id_login").value).toBe("johny@vwinternetnetworks");
    expect(notify).toHaveBeenCalledWith(
      "Inicia sesión con johny@vwinternetnetworks.",
      "info",
      Number.POSITIVE_INFINITY,
      expect.any(Function),
    );
  });

  it("shows persistent error when wrong profile is detected and allows closing tracking", () => {
    const storage = createMemoryStorage();
    savePending(storage);
    document.body.innerHTML = `
      <div class="user-menu">
        <span class="user-name">johny@yaa-internet-by-vw</span>
      </div>
    `;
    const notify = vi.fn(() => vi.fn());
    const locationObj = createLocation("/clientes/");

    const state = resumeProfileSwitchFlow({
      storage,
      locationObj,
      documentObj: document,
      notify,
    });

    expect(state).toMatchObject({ active: true, state: "wrong-profile" });
    expect(notify).toHaveBeenCalledWith(
      "Perfil incorrecto detectado. Iniciaste como johny@yaa-internet-by-vw. Debes iniciar con johny@vwinternetnetworks.",
      "error",
      Number.POSITIVE_INFINITY,
      expect.any(Function),
    );

    const onClose = notify.mock.calls[0][3];
    onClose();
    expect(storage.getItem(PROFILE_SWITCH_STORAGE_KEY)).toBeNull();
  });

  it("completes when logged-in user has matching accountDomain but different localPart", () => {
    // pending.targetUsername was built from origin localPart + target domain = "pina@vwinternetnetworks"
    // but the actual user that logged in is "kevin@vwinternetnetworks" (same domain, different local)
    const storage = createMemoryStorage();
    savePendingProfileSwitch(
      {
        id: "switch-mich",
        domainKey: "wisphub.io",
        targetUsername: "pina@vwinternetnetworks",
        targetLabel: "Michoacán",
        createdAt: Date.now(),
      },
      storage,
    );
    document.body.innerHTML = `
      <div class="user-menu">
        <span class="user-name">kevin@vwinternetnetworks</span>
      </div>
    `;
    const notify = vi.fn();
    const locationObj = createLocation("/clientes/");

    const state = resumeProfileSwitchFlow({
      storage,
      locationObj,
      documentObj: document,
      notify,
    });

    expect(state).toMatchObject({ active: false, reason: "completed" });
    expect(storage.getItem(PROFILE_SWITCH_STORAGE_KEY)).toBeNull();
    expect(notify).toHaveBeenCalledWith(
      "Sesión cambiada correctamente a Michoacán.",
      "success",
      5000,
    );
  });

  it("completes and clears pending record after successful target login", () => {
    const storage = createMemoryStorage();
    savePending(storage);
    document.body.innerHTML = `
      <div class="user-menu">
        <span class="user-name">johny@vwinternetnetworks</span>
      </div>
    `;
    const notify = vi.fn();
    const locationObj = createLocation("/clientes/");

    const state = resumeProfileSwitchFlow({
      storage,
      locationObj,
      documentObj: document,
      notify,
    });

    expect(state).toMatchObject({ active: false, reason: "completed" });
    expect(storage.getItem(PROFILE_SWITCH_STORAGE_KEY)).toBeNull();
    expect(notify).toHaveBeenCalledWith(
      "Sesión cambiada correctamente a Michoacán.",
      "success",
      5000,
    );
  });

  it("can clear pending switch explicitly", () => {
    const storage = createMemoryStorage();
    savePendingProfileSwitch({ id: "switch-3", createdAt: Date.now() }, storage);
    clearPendingProfileSwitch(storage);
    expect(readPendingProfileSwitch(storage)).toBeNull();
  });
});
