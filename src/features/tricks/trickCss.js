import { KAWAII_FACE_W, KAWAII_FACE_H } from "../../config/tricks.js";

function buildThemeAccentCss(accent, accentDark, darkText) {
  let css =
    `:root {` +
    ` --wyc-btn-color: ${accent} !important;` +
    ` --wyc-btn-color-light: ${accent} !important;` +
    ` --wyc-btn-hover: ${accentDark} !important;` +
    ` --wyc-btn-hover-dark: ${accentDark} !important;` +
    ` --wyc-diag-btn-color: ${accentDark} !important;` +
    ` --wyc-diag-btn-hover: ${accentDark} !important;` +
    ` --wyc-scroll-color: ${accent} !important;` +
    ` --wyc-scroll-dark: ${accentDark} !important;` +
    ` --wyc-link-color: ${accentDark} !important;` +
    ` }` +
    ` .btn-success, .btn-success:focus, .btn-success:active, .btn-success.active,` +
    ` .open .dropdown-toggle.btn-success {` +
    ` background-color: ${accentDark} !important; border-color: ${accentDark} !important; }` +
    ` .btn-success:hover { background-color: ${accent} !important; border-color: ${accent} !important; }` +
    ` .label-success, .badge-success { background-color: ${accentDark} !important; }` +
    ` .text-success, .text-green { color: ${accentDark} !important; }` +
    ` .green-background, .event-green { background-color: ${accentDark} !important; }` +
    ` .contrato-vigente { color: ${accentDark} !important; }` +
    ` .bootstrap-switch-success .bootstrap-switch-handle-on.bootstrap-switch-success` +
    ` { background-color: ${accentDark} !important; }` +
    ` .progress-bar-success { background-color: ${accentDark} !important; }` +
    ` .accordion.accordion-green .panel-heading` +
    ` { background-color: ${accentDark} !important; border-color: ${accentDark} !important; }` +
    ` .fuelux .wizard ul.steps li.complete { background-color: ${accentDark} !important; }` +
    ` .nav-tabs > li.active > a,` +
    ` .nav-tabs > li.active > a:hover,` +
    ` .nav-tabs > li.active > a:focus` +
    ` { border-top-color: ${accent} !important; }` +
    // Login page submit button
    ` body.contrast-dark .btn.btn-block[type="submit"]` +
    ` { background-color: ${accent} !important; border-color: ${accentDark} !important; }`;

  if (darkText) {
    css +=
      ` .btn-success, .btn-success:hover, .btn-success:focus, .btn-success:active` +
      ` { color: #000 !important; }` +
      ` a.wisphub-yaa-action-btn, button.wisphub-yaa-action-btn,` +
      ` a.wisphub-yaa-action-btn:hover, button.wisphub-yaa-action-btn:hover,` +
      ` a.wisphub-yaa-action-btn:active, button.wisphub-yaa-action-btn:active,` +
      ` .wisphub-yaa-diagnostic-header-btn, .wisphub-yaa-diagnostic-header-btn:hover,` +
      ` .wisphub-yaa-diagnostic-header-btn:active,` +
      ` .wisphub-yaa-nav-special-tickets, .wisphub-yaa-nav-special-tickets:hover,` +
      ` #wisphub-yaa-scroll-top-btn, #wisphub-yaa-scroll-top-btn:hover,` +
      ` body.contrast-dark .btn.btn-block[type="submit"]` +
      ` { color: #000 !important; }`;
  }

  return css;
}

function buildLsdCss() {
  return (
    "@keyframes wyc-hue { from { filter: hue-rotate(0deg) saturate(1.5); }" +
    " to { filter: hue-rotate(360deg) saturate(1.5); } }" +
    " html { animation: wyc-hue 4s linear infinite; }"
  );
}

function buildMirrorCss() {
  return " html { transform: scaleX(-1); }";
}

function buildStripeCss(r, g, b) {
  return (
    ` table.dataTable tbody tr.even td { background-color: rgba(${r},${g},${b},0.08) !important; }` +
    ` table.dataTable tbody tr.odd td { background-color: transparent !important; }`
  );
}

function buildRetroCss() {
  return (
    "@keyframes wyc-crt-flicker{" +
    " 0%{opacity:0.167} 5%{opacity:0.209} 10%{opacity:0.142} 15%{opacity:0.544}" +
    " 20%{opacity:0.109} 25%{opacity:0.503} 30%{opacity:0.393} 35%{opacity:0.407}" +
    " 40%{opacity:0.159} 45%{opacity:0.508} 50%{opacity:0.576} 55%{opacity:0.052}" +
    " 60%{opacity:0.122} 65%{opacity:0.432} 70%{opacity:0.321} 75%{opacity:0.224}" +
    " 80%{opacity:0.429} 85%{opacity:0.423} 90%{opacity:0.420} 95%{opacity:0.217}" +
    " 100%{opacity:0.146}" +
    "}" +
    "@keyframes wyc-crt-text{" +
    " 0%{text-shadow:0.439px 0 1px rgba(0,30,255,0.1),-0.439px 0 1px rgba(255,0,80,0.07),0 0 1px}" +
    " 5%{text-shadow:2.793px 0 1px rgba(0,30,255,0.1),-2.793px 0 1px rgba(255,0,80,0.07),0 0 1px}" +
    " 10%{text-shadow:0.03px 0 1px rgba(0,30,255,0.1),-0.03px 0 1px rgba(255,0,80,0.07),0 0 1px}" +
    " 15%{text-shadow:0.402px 0 1px rgba(0,30,255,0.1),-0.402px 0 1px rgba(255,0,80,0.07),0 0 1px}" +
    " 20%{text-shadow:3.479px 0 1px rgba(0,30,255,0.1),-3.479px 0 1px rgba(255,0,80,0.07),0 0 1px}" +
    " 25%{text-shadow:1.613px 0 1px rgba(0,30,255,0.1),-1.613px 0 1px rgba(255,0,80,0.07),0 0 1px}" +
    " 30%{text-shadow:0.702px 0 1px rgba(0,30,255,0.1),-0.702px 0 1px rgba(255,0,80,0.07),0 0 1px}" +
    " 35%{text-shadow:3.897px 0 1px rgba(0,30,255,0.1),-3.897px 0 1px rgba(255,0,80,0.07),0 0 1px}" +
    " 40%{text-shadow:3.871px 0 1px rgba(0,30,255,0.1),-3.871px 0 1px rgba(255,0,80,0.07),0 0 1px}" +
    " 45%{text-shadow:2.231px 0 1px rgba(0,30,255,0.1),-2.231px 0 1px rgba(255,0,80,0.07),0 0 1px}" +
    " 50%{text-shadow:0.081px 0 1px rgba(0,30,255,0.1),-0.081px 0 1px rgba(255,0,80,0.07),0 0 1px}" +
    " 55%{text-shadow:2.376px 0 1px rgba(0,30,255,0.1),-2.376px 0 1px rgba(255,0,80,0.07),0 0 1px}" +
    " 60%{text-shadow:2.202px 0 1px rgba(0,30,255,0.1),-2.202px 0 1px rgba(255,0,80,0.07),0 0 1px}" +
    " 65%{text-shadow:2.864px 0 1px rgba(0,30,255,0.1),-2.864px 0 1px rgba(255,0,80,0.07),0 0 1px}" +
    " 70%{text-shadow:0.489px 0 1px rgba(0,30,255,0.1),-0.489px 0 1px rgba(255,0,80,0.07),0 0 1px}" +
    " 75%{text-shadow:1.895px 0 1px rgba(0,30,255,0.1),-1.895px 0 1px rgba(255,0,80,0.07),0 0 1px}" +
    " 80%{text-shadow:0.083px 0 1px rgba(0,30,255,0.1),-0.083px 0 1px rgba(255,0,80,0.07),0 0 1px}" +
    " 85%{text-shadow:0.098px 0 1px rgba(0,30,255,0.1),-0.098px 0 1px rgba(255,0,80,0.07),0 0 1px}" +
    " 90%{text-shadow:3.443px 0 1px rgba(0,30,255,0.1),-3.443px 0 1px rgba(255,0,80,0.07),0 0 1px}" +
    " 95%{text-shadow:2.184px 0 1px rgba(0,30,255,0.1),-2.184px 0 1px rgba(255,0,80,0.07),0 0 1px}" +
    " 100%{text-shadow:2.621px 0 1px rgba(0,30,255,0.1),-2.621px 0 1px rgba(255,0,80,0.07),0 0 1px}" +
    "}" +
    " #wyc-retro{position:fixed;inset:0;z-index:2147483647;pointer-events:none;" +
    "box-shadow:inset 0 0 100px rgba(0,0,0,0.32);}" +
    " #wyc-retro::before{content:' ';display:block;position:absolute;top:0;left:0;bottom:0;right:0;" +
    "background:linear-gradient(rgba(18,16,16,0) 50%,rgba(0,0,0,0.14) 50%)," +
    "linear-gradient(90deg,rgba(255,0,0,0.035),rgba(0,255,0,0.012),rgba(0,0,255,0.035));" +
    "z-index:2;background-size:100% 2px,3px 100%;pointer-events:none;}" +
    " #wyc-retro::after{content:' ';display:block;position:absolute;top:0;left:0;bottom:0;right:0;" +
    "background:rgba(18,16,16,0.06);opacity:0;z-index:2;pointer-events:none;" +
    "animation:wyc-crt-flicker 0.15s infinite;}" +
    " body.wyc-crt{animation:wyc-crt-text 1.6s infinite;}" +
    " @media(prefers-reduced-motion:reduce){" +
    "#wyc-retro::after,body.wyc-crt{animation:none;}" +
    "}"
  );
}

function buildMatrixPageCss() {
  return (
    // Top navbar
    " body.contrast-dark .menu-top," +
    " body.contrast-dark .menu-top .navbar { background-color: #000 !important; }" +
    " body.contrast-dark .menu-top .navbar { border-bottom: 2px solid #00ff41 !important; }" +
    " body.contrast-dark .menu-top .navbar .toggle-nav," +
    " body.contrast-dark .menu-top .navbar .nav > li > a { color: #00ff41 !important; }" +
    " body.contrast-dark .menu-top .navbar .dropdown-menu {" +
    " background-color: #000 !important; border: 1px solid rgba(0,255,65,0.25) !important; }" +
    " body.contrast-dark .menu-top .navbar .dropdown-menu > li > a { color: #00ff41 !important; }" +
    " body.contrast-dark .menu-top .navbar .dropdown-menu > li > a:hover," +
    " body.contrast-dark .menu-top .navbar .dropdown-menu > li.active > a {" +
    " background-color: rgba(0,255,65,0.1) !important; }" +
    " body.contrast-dark .menu-top .navbar .dropdown-menu .divider {" +
    " background-color: rgba(0,255,65,0.15) !important; }" +
    // Left sidebar — target both ID containers and the Bootstrap nav-stacked list directly
    " body.contrast-dark #main-nav-bg { background-color: #000 !important; }" +
    " body.contrast-dark #main-nav { background-color: #000 !important; }" +
    " body.contrast-dark ul.nav.nav-stacked { background-color: #000 !important; }" +
    " body.contrast-dark ul.nav.nav-stacked ul { background-color: #181818 !important; }" +
    // Nav links — white by default; expanded category header (.in) is green
    " body.contrast-dark #main-nav .nav a { color: #fff !important; background-color: #000 !important; }" +
    " body.contrast-dark #main-nav .nav a i { color: inherit !important; }" +
    " body.contrast-dark #main-nav .nav a.dropdown-collapse.in," +
    " body.contrast-dark #main-nav .nav a.dropdown-collapse.in i { color: #00ff41 !important; }" +
    // Sub-menu links — slightly dimmed white so they read as secondary
    " body.contrast-dark #main-nav .nav .nav a { color: rgba(255,255,255,0.75) !important; }" +
    // Hover — visible green tint, replaces WispHub's dark gray hover
    " body.contrast-dark #main-nav .nav a:hover {" +
    " color: #00ff41 !important; background-color: rgba(0,255,65,0.15) !important; }" +
    " body.contrast-dark #main-nav .navigation > .nav > li:hover > a .fa," +
    " body.contrast-dark #main-nav .navigation > .nav > li:focus > a .fa { color: #00ff41 !important; }" +
    " body.contrast-dark #main-nav .navigation > .nav > li .nav > li > a:hover .fa," +
    " body.contrast-dark #main-nav .navigation > .nav > li .nav > li > a:focus .fa { color: #00ff41 !important; }" +
    " body.contrast-dark #main-nav .nav li.active > a {" +
    " color: #00ff41 !important; background-color: rgba(0,255,65,0.1) !important; }" +
    // Login page — black bg, hide random image, center form, white text
    " body.contrast-dark #fondoAleatorio { display: none !important; }" +
    " body.contrast-dark.login { background-color: #000 !important; }" +
    " body.contrast-dark.login .login-container {" +
    " background: none !important; background-color: transparent !important;" +
    " display: flex !important; align-items: center !important;" +
    " justify-content: center !important; min-height: 100vh !important; }" +
    " body.contrast-dark.login .form-login {" +
    " background: transparent !important; box-shadow: none !important;" +
    " padding: 8px 12px !important; }" +
    " body.contrast-dark.login h1.title { color: #fff !important; }" +
    " body.contrast-dark.login label { color: #fff !important; }" +
    " body.contrast-dark.login .checkbox label { color: #fff !important; }" +
    " body.contrast-dark.login a { color: rgba(255,255,255,0.85) !important; }" +
    " body.contrast-dark.login .form-control {" +
    " background-color: rgba(0,0,0,0.6) !important;" +
    " border-color: rgba(0,255,65,0.4) !important; color: #fff !important; }" +
    " body.contrast-dark.login .form-control::placeholder {" +
    " color: rgba(255,255,255,0.5) !important; }" +
    " body.contrast-dark.login i.text-muted { color: rgba(255,255,255,0.5) !important; }" +
    // Special tickets nav button → black bg, green text
    " body.contrast-dark .wisphub-yaa-nav-special-tickets {" +
    " background-color: #000 !important; color: #00ff41 !important; }" +
    " body.contrast-dark .wisphub-yaa-nav-special-tickets:hover {" +
    " background-color: rgba(0,255,65,0.15) !important; color: #00ff41 !important; }" +
    // WispHub #49bf67 elements → #00DB38 (base) / #00BA30 (hover, slightly darker)
    " body.contrast-dark .btn-success," +
    " body.contrast-dark .btn-success:focus," +
    " body.contrast-dark .btn-success:active," +
    " body.contrast-dark .btn-success.active," +
    " body.contrast-dark .open .dropdown-toggle.btn-success" +
    " { background-color: #00DB38 !important; border-color: #00DB38 !important; }" +
    " body.contrast-dark .btn-success:hover" +
    " { background-color: #00BA30 !important; border-color: #00BA30 !important; }" +
    " body.contrast-dark .label-success," +
    " body.contrast-dark .badge-success { background-color: #00DB38 !important; }" +
    " body.contrast-dark .text-success," +
    " body.contrast-dark .text-green { color: #00DB38 !important; }" +
    " body.contrast-dark .green-background," +
    " body.contrast-dark .event-green { background-color: #00DB38 !important; }" +
    " body.contrast-dark .contrato-vigente { color: #00DB38 !important; }" +
    " body.contrast-dark .progress-bar-success { background-color: #00DB38 !important; }" +
    " body.contrast-dark .bootstrap-switch-success" +
    " .bootstrap-switch-handle-on.bootstrap-switch-success" +
    " { background-color: #00DB38 !important; }" +
    " body.contrast-dark .accordion.accordion-green .panel-heading" +
    " { background-color: #00DB38 !important; border-color: #00DB38 !important; }" +
    " body.contrast-dark .fuelux .wizard ul.steps li.complete" +
    " { background-color: #00DB38 !important; }" +
    " body.contrast-dark .nav-tabs > li.active > a," +
    " body.contrast-dark .nav-tabs > li.active > a:hover," +
    " body.contrast-dark .nav-tabs > li.active > a:focus" +
    " { border-top-color: #00DB38 !important; }" +
    " body.contrast-dark" +
    ' { font-family: monospace, "Helvetica Neue", Helvetica, Arial, sans-serif !important; }'
  );
}

function buildKawaiiCss() {
  return (
    // Gentle levitation — keyframes include the vertical-center offset so the
    // animation owns the full transform and the base property doesn't conflict.
    "@keyframes wyc-k-float {" +
    " 0%, 100% { transform: translateY(-50%); }" +
    " 50% { transform: translateY(calc(-50% - 6px)); }" +
    "}" +
    // Kawaii face: transparent container — only the gradient features are visible.
    // Scaling KAWAII_FACE_W / KAWAII_FACE_H in tricks.js resizes everything uniformly.
    ` #wyc-kawaii-face {` +
    ` position: absolute; right: 20px; top: 50%;` +
    ` width: ${KAWAII_FACE_W}px; height: ${KAWAII_FACE_H}px;` +
    ` pointer-events: none;` +
    ` animation: wyc-k-float 2.5s ease-in-out infinite;` +
    ` background:` +
    // Eye shines — sit on top of pupils (left, right)
    ` radial-gradient(circle at 29.5% 48.5%, #fff 2.5%, #0000 2.75%),` +
    ` radial-gradient(circle at 69.5% 48.5%, #fff 2.5%, #0000 2.75%),` +
    // Lower highlight dots
    ` radial-gradient(circle at 28% 52%, #fff 1%, #0000 1.25%),` +
    ` radial-gradient(circle at 68% 52%, #fff 1%, #0000 1.25%),` +
    // Pupils (left, right)
    ` radial-gradient(circle at 30% 50%, #000 5%, #0000 5.25%),` +
    ` radial-gradient(circle at 70% 50%, #000 5%, #0000 5.25%),` +
    // Smile arc — tile sized 15%×7.5% placed at 50% 60%
    ` radial-gradient(farthest-side at 50% 0, #0000 74%, #000 75% 99%, #0000 99.9%) 50% 60% / 15% 7.5% no-repeat,` +
    // Cheek blushes (left, right)
    ` radial-gradient(80% 40% at 25% 57%, #f003 10%, #0000 10.25%),` +
    ` radial-gradient(80% 40% at 75% 57%, #f003 10%, #0000 10.25%); }` +
    // Honour reduced-motion preference
    ` @media (prefers-reduced-motion: reduce) {` +
    ` #wyc-kawaii-face { animation: none; transform: translateY(-50%); } }` +
    // page-header must be a positioning context for the absolutely-placed face
    " body.contrast-pink .page-header { position: relative !important; }" +
    // Top navbar
    " body.contrast-pink .menu-top," +
    " body.contrast-pink .menu-top .navbar { background: linear-gradient(90deg, #f9e4ff, #e5e4ff) !important; }" +
    " body.contrast-pink .menu-top .navbar { border-bottom: 2px solid rgba(201,160,245,0.6) !important; }" +
    " body.contrast-pink .menu-top .navbar .toggle-nav," +
    " body.contrast-pink .menu-top .navbar .nav > li > a { color: #3d1570 !important; }" +
    // Remove text shadows and item borders/separators
    " body.contrast-pink .menu-top .navbar .nav > li > a { text-shadow: none !important; }" +
    " body.contrast-pink .menu-top .navbar .nav > li { border: none !important; }" +
    // Normalize hamburger button
    " body.contrast-pink .menu-top .navbar .toggle-nav.btn {" +
    " background: transparent !important; border: none !important; box-shadow: none !important; }" +
    // Override li.dark user-menu (has dark bg by default in WispHub)
    " body.contrast-pink .menu-top .navbar .nav > li.dark," +
    " body.contrast-pink .menu-top .navbar .nav > li.dark > a {" +
    " background-color: rgba(221,180,254,0.2) !important; color: #3d1570 !important; }" +
    // li.light and li.medium — keep transparent, uniform color
    " body.contrast-pink .menu-top .navbar .nav > li.light > a," +
    " body.contrast-pink .menu-top .navbar .nav > li.medium > a {" +
    " background-color: transparent !important; color: #3d1570 !important;" +
    " text-shadow: none !important; }" +
    " body.contrast-pink .menu-top .navbar .dropdown-menu {" +
    " background-color: #f9e4ff !important; border: 1px solid rgba(201,160,245,0.3) !important; }" +
    " body.contrast-pink .menu-top .navbar .dropdown-menu > li > a { color: #3d1570 !important; }" +
    " body.contrast-pink .menu-top .navbar .dropdown-menu > li > a:hover," +
    " body.contrast-pink .menu-top .navbar .dropdown-menu > li.active > a {" +
    " background-color: rgba(201,160,245,0.2) !important; }" +
    " body.contrast-pink .menu-top .navbar .dropdown-menu .divider {" +
    " background-color: rgba(201,160,245,0.2) !important; }" +
    // Left sidebar
    " body.contrast-pink #main-nav-bg {" +
    " background: linear-gradient(180deg, #f9e4ff 0%, #e5e4ff 50%, #e4fffe 100%) !important; }" +
    " body.contrast-pink #main-nav { background: transparent !important; }" +
    " body.contrast-pink ul.nav.nav-stacked { background: transparent !important; }" +
    " body.contrast-pink ul.nav.nav-stacked ul { background: rgba(229,228,255,0.5) !important; }" +
    // nav li separators — soft lavender, overrides WispHub's default gray border
    " body.contrast-pink ul.nav.nav-stacked > li { border-color: rgba(139,92,246,0.2) !important; }" +
    // user profile area — inline style="color:#fff" is overridden by !important
    " body.contrast-pink .user-sidebar .info p { color: #4c1d95 !important; }" +
    " body.contrast-pink .user-sidebar .info small { color: rgba(76,29,149,0.65) !important; }" +
    // Nav links — muted purple ("bajito") on light pastel bg
    " body.contrast-pink #main-nav .nav a" +
    " { color: rgba(76,29,149,0.82) !important; background-color: transparent !important; }" +
    " body.contrast-pink #main-nav .nav a i { color: inherit !important; }" +
    " body.contrast-pink #main-nav .nav a.dropdown-collapse.in," +
    " body.contrast-pink #main-nav .nav a.dropdown-collapse.in i { color: #8b2fc9 !important; }" +
    " body.contrast-pink #main-nav .nav .nav a { color: rgba(76,29,149,0.62) !important; }" +
    " body.contrast-pink #main-nav .nav a:hover {" +
    " color: #8b2fc9 !important; background-color: rgba(201,160,245,0.2) !important; }" +
    " body.contrast-pink #main-nav .navigation > .nav > li:hover > a .fa," +
    " body.contrast-pink #main-nav .navigation > .nav > li:focus > a .fa { color: #8b2fc9 !important; }" +
    " body.contrast-pink #main-nav .navigation > .nav > li .nav > li > a:hover .fa," +
    " body.contrast-pink #main-nav .navigation > .nav > li .nav > li > a:focus .fa { color: #8b2fc9 !important; }" +
    " body.contrast-pink #main-nav .nav li.active > a {" +
    " color: #8b2fc9 !important; background-color: rgba(201,160,245,0.15) !important; }" +
    // WispHub applies border-top/bottom directly on <a>, not on <li>,
    // so the li { border-color } rule above does not reach these.
    " body.contrast-pink #main-nav .navigation > .nav > li > a {" +
    " border-bottom-color: rgba(139,92,246,0.25) !important;" +
    " border-top-color: rgba(139,92,246,0.15) !important; }" +
    " body.contrast-pink #main-nav .navigation > .nav > li .nav > li > a {" +
    " border-top-color: rgba(139,92,246,0.15) !important; }" +
    // WispHub sets color directly on <span> inside nav <a>; a parent color rule
    // (even !important) loses to a direct child rule — must target span explicitly.
    " body.contrast-pink #main-nav .navigation > .nav > li > a span {" +
    " color: rgba(76,29,149,0.82) !important; text-shadow: none !important; }" +
    // .in state: WispHub writes color:#c3c6ca on the span directly — near-invisible
    // on our light sidebar. Override to the active purple.
    " body.contrast-pink #main-nav .navigation > .nav > li > a.in span {" +
    " color: #8b2fc9 !important; }" +
    // Login page — pastel rainbow bg, white form card
    " body.contrast-pink #fondoAleatorio { display: none !important; }" +
    " body.contrast-pink.login {" +
    " background: linear-gradient(135deg," +
    " #f9e4ff 0%, #e5e4ff 30%, #e4fffe 60%, #f7ffe4 80%, #e5ffe4 100%) !important; }" +
    " body.contrast-pink.login .login-container {" +
    " background: none !important; display: flex !important; align-items: center !important;" +
    " justify-content: center !important; min-height: 100vh !important; }" +
    " body.contrast-pink.login .form-login {" +
    " background: rgba(255,255,255,0.88) !important;" +
    " box-shadow: 0 8px 32px rgba(180,100,220,0.18) !important;" +
    " border-radius: 12px !important; padding: 28px 24px !important; }" +
    " body.contrast-pink.login h1.title { color: #3d1570 !important; }" +
    " body.contrast-pink.login label { color: #3d1570 !important; }" +
    " body.contrast-pink.login .checkbox label { color: #3d1570 !important; }" +
    " body.contrast-pink.login a { color: rgba(61,21,112,0.85) !important; }" +
    " body.contrast-pink.login .form-control {" +
    " background-color: rgba(249,228,255,0.45) !important;" +
    " border-color: rgba(201,160,245,0.55) !important; color: #3d1570 !important; }" +
    " body.contrast-pink.login .form-control::placeholder { color: rgba(61,21,112,0.45) !important; }" +
    " body.contrast-pink.login i.text-muted { color: rgba(61,21,112,0.5) !important; }" +
    // Special tickets nav button
    " body.contrast-pink .wisphub-yaa-nav-special-tickets {" +
    " background-color: rgba(249,228,255,0.9) !important; color: #8b2fc9 !important; }" +
    " body.contrast-pink .wisphub-yaa-nav-special-tickets:hover {" +
    " background-color: rgba(201,160,245,0.3) !important; color: #8b2fc9 !important; }" +
    // btn-success → pastel lavender with dark text
    " body.contrast-pink .btn-success," +
    " body.contrast-pink .btn-success:focus," +
    " body.contrast-pink .btn-success:active," +
    " body.contrast-pink .btn-success.active," +
    " body.contrast-pink .open .dropdown-toggle.btn-success" +
    " { background-color: #ddb4fe !important; border-color: #ddb4fe !important; color: #3d1570 !important; }" +
    " body.contrast-pink .btn-success:hover" +
    " { background-color: #c084fc !important; border-color: #c084fc !important; color: #1a0038 !important; }" +
    " body.contrast-pink .label-success," +
    " body.contrast-pink .badge-success { background-color: #c084fc !important; }" +
    " body.contrast-pink .text-success," +
    " body.contrast-pink .text-green { color: #8b2fc9 !important; }" +
    " body.contrast-pink .green-background," +
    " body.contrast-pink .event-green { background-color: #ddb4fe !important; }" +
    " body.contrast-pink .contrato-vigente { color: #8b2fc9 !important; }" +
    " body.contrast-pink .progress-bar-success { background-color: #c084fc !important; }" +
    " body.contrast-pink .bootstrap-switch-success" +
    " .bootstrap-switch-handle-on.bootstrap-switch-success { background-color: #c084fc !important; }" +
    " body.contrast-pink .accordion.accordion-green .panel-heading" +
    " { background-color: #ddb4fe !important; border-color: #ddb4fe !important; }" +
    " body.contrast-pink .fuelux .wizard ul.steps li.complete { background-color: #c084fc !important; }" +
    " body.contrast-pink .nav-tabs > li.active > a," +
    " body.contrast-pink .nav-tabs > li.active > a:hover," +
    " body.contrast-pink .nav-tabs > li.active > a:focus { border-top-color: #ddb4fe !important; }" +
    // Extension's own action buttons — dark text since accent is light
    " body.contrast-pink a.wisphub-yaa-action-btn, body.contrast-pink button.wisphub-yaa-action-btn," +
    " body.contrast-pink a.wisphub-yaa-action-btn:hover, body.contrast-pink button.wisphub-yaa-action-btn:hover," +
    " body.contrast-pink a.wisphub-yaa-action-btn:active, body.contrast-pink button.wisphub-yaa-action-btn:active," +
    " body.contrast-pink .wisphub-yaa-diagnostic-header-btn," +
    " body.contrast-pink .wisphub-yaa-diagnostic-header-btn:hover," +
    " body.contrast-pink .wisphub-yaa-diagnostic-header-btn:active," +
    " body.contrast-pink #wisphub-yaa-scroll-top-btn," +
    " body.contrast-pink #wisphub-yaa-scroll-top-btn:hover { color: #1a0038 !important; }" +
    // Login submit button
    " body.contrast-pink .btn.btn-block[type='submit']" +
    " { background-color: #ddb4fe !important; border-color: #c084fc !important; color: #3d1570 !important; }" +
    // Remove bottom border on the nav-stacked group separator
    " body.contrast-pink #main-nav .navigation > .nav { border-bottom: none !important; }" +
    " body.contrast-pink" +
    ' { font-family: cursive, "Helvetica Neue", Helvetica, Arial, sans-serif !important; }'
  );
}

function buildOceanCss() {
  return (
    " body.contrast-blue #fondoAleatorio { display: none !important; }" +
    " body.contrast-blue.login {" +
    " background: linear-gradient(135deg," +
    " #e0f4ff 0%, #c8eeff 30%, #d4f5ff 60%, #e8f8ff 100%) !important; }" +
    " body.contrast-blue.login .login-container {" +
    " background: none !important; display: flex !important; align-items: center !important;" +
    " justify-content: center !important; min-height: 100vh !important; }" +
    " body.contrast-blue.login .form-login {" +
    " background: rgba(255,255,255,0.88) !important;" +
    " box-shadow: 0 8px 32px rgba(0,172,236,0.18) !important;" +
    " border-radius: 12px !important; padding: 28px 24px !important; }" +
    " body.contrast-blue.login h1.title { color: #0c4a6e !important; }" +
    " body.contrast-blue.login label { color: #0c4a6e !important; }" +
    " body.contrast-blue.login .checkbox label { color: #0c4a6e !important; }" +
    " body.contrast-blue.login a { color: rgba(12,74,110,0.85) !important; }" +
    " body.contrast-blue.login .form-control {" +
    " background-color: rgba(224,245,255,0.45) !important;" +
    " border-color: rgba(0,172,236,0.55) !important; color: #0c4a6e !important; }" +
    " body.contrast-blue.login .form-control::placeholder { color: rgba(12,74,110,0.45) !important; }" +
    " body.contrast-blue.login i.text-muted { color: rgba(12,74,110,0.5) !important; }"
  );
}

function buildFireCss() {
  return (
    " body.contrast-red #fondoAleatorio { display: none !important; }" +
    " body.contrast-red.login {" +
    " background: linear-gradient(135deg," +
    " #fff1ee 0%, #ffe4e0 30%, #fff4ee 60%, #ffede8 100%) !important; }" +
    " body.contrast-red.login .login-container {" +
    " background: none !important; display: flex !important; align-items: center !important;" +
    " justify-content: center !important; min-height: 100vh !important; }" +
    " body.contrast-red.login .form-login {" +
    " background: rgba(255,255,255,0.88) !important;" +
    " box-shadow: 0 8px 32px rgba(243,69,65,0.18) !important;" +
    " border-radius: 12px !important; padding: 28px 24px !important; }" +
    " body.contrast-red.login h1.title { color: #7f1d1d !important; }" +
    " body.contrast-red.login label { color: #7f1d1d !important; }" +
    " body.contrast-red.login .checkbox label { color: #7f1d1d !important; }" +
    " body.contrast-red.login a { color: rgba(127,29,29,0.85) !important; }" +
    " body.contrast-red.login .form-control {" +
    " background-color: rgba(255,240,236,0.45) !important;" +
    " border-color: rgba(243,69,65,0.55) !important; color: #7f1d1d !important; }" +
    " body.contrast-red.login .form-control::placeholder { color: rgba(127,29,29,0.45) !important; }" +
    " body.contrast-red.login i.text-muted { color: rgba(127,29,29,0.5) !important; }"
  );
}

export function buildTrickCss(tricks, colors, hasActiveTheme) {
  const { accent, accentDark, rgb, darkText } = colors;
  const [r, g, b] = rgb.split(",").map(Number);
  let css = "";

  if (hasActiveTheme) {
    css += buildThemeAccentCss(accent, accentDark, darkText);
  }
  if (tricks.includes("LSD")) { css += buildLsdCss(); }
  if (tricks.includes("MIRROR")) { css += buildMirrorCss(); }
  if (tricks.includes("STRIPE")) { css += buildStripeCss(r, g, b); }
  if (tricks.includes("RETRO")) { css += buildRetroCss(); }
  if (tricks.includes("MATRIX")) { css += buildMatrixPageCss(); }
  if (tricks.includes("KAWAII")) { css += buildKawaiiCss(); }
  if (tricks.includes("OCEAN")) { css += buildOceanCss(); }
  if (tricks.includes("FIRE")) { css += buildFireCss(); }

  return css;
}
