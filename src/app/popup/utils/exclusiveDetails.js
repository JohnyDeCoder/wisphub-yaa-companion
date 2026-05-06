import { prefersReducedMotion } from "../../../utils/dom.js";

function animatedClose(detail) {
  if (!detail || !detail.open || detail.classList.contains("is-closing")) { return; }

  const content = detail.querySelector(":scope > .advanced-content");
  if (!content || prefersReducedMotion()) {
    detail.open = false;
    return;
  }

  detail.classList.add("is-closing");

  let done = false;
  const timerRef = {};

  const finish = () => {
    if (done) { return; }
    done = true;
    clearTimeout(timerRef.id);
    content.removeEventListener("transitionend", onEnd);
    detail.classList.remove("is-closing");
    detail.open = false;
  };

  // Only complete when the grid row itself finishes — child transitions bubble too
  const onEnd = (e) => {
    if (e.target === content && e.propertyName === "grid-template-rows") {
      finish();
    }
  };

  content.addEventListener("transitionend", onEnd);
  timerRef.id = setTimeout(finish, 350);
}

function animatedOpen(detail) {
  const content = detail.querySelector(":scope > .advanced-content");
  detail.open = true;
  if (!content || prefersReducedMotion()) { return; }

  // Pin at 0fr so the browser records it as the "before" state,
  // then release so the CSS [open] rule (1fr) triggers the transition.
  content.style.gridTemplateRows = "0fr";
  content.getBoundingClientRect(); // flush — forces browser to compute 0fr layout
  content.style.gridTemplateRows = "";
}

export function bindDetailsAnimation(detail) {
  if (!detail || detail.dataset.detailsAnimBound === "1") { return; }
  detail.dataset.detailsAnimBound = "1";

  const summary = detail.querySelector(":scope > summary");
  if (!summary) { return; }

  summary.addEventListener("click", (e) => {
    if (prefersReducedMotion()) { return; }
    e.preventDefault();
    if (detail.open) {
      animatedClose(detail);
    } else {
      animatedOpen(detail);
    }
  });
}

export function syncExclusiveDetailsGroup(detailsElements) {
  const details = Array.from(detailsElements || []).filter(Boolean);
  const openDetails = details.filter((d) => d.open);

  if (openDetails.length <= 1) {
    return openDetails[0] || null;
  }

  const [activeDetail, ...rest] = openDetails;
  rest.forEach((d) => { d.open = false; });
  return activeDetail;
}

export function bindExclusiveDetailsGroup(container, selector) {
  if (!container) { return []; }

  const details = Array.from(container.querySelectorAll(selector));
  if (details.length === 0) { return []; }

  syncExclusiveDetailsGroup(details);

  details.forEach((detail) => {
    bindDetailsAnimation(detail);

    if (detail.dataset.exclusiveDetailsBound === "1") { return; }
    detail.dataset.exclusiveDetailsBound = "1";

    detail.addEventListener("toggle", () => {
      if (!detail.open) { return; }
      details.forEach((candidate) => {
        if (candidate !== detail) { animatedClose(candidate); }
      });
    });
  });

  return details;
}
