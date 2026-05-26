(function () {
  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  var layer;
  var stage;
  var backdrop;
  var contentEl;
  var homeShell;
  var activeView = null;
  var originCard = null;
  var originRect = null;
  var originRadius = "";
  var isAnimating = false;
  var closingFromHistory = false;

  function captureRect(rect) {
    return {
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  }

  function insetFromRect(rect, radius) {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var round = radius ? " round " + radius : "";
    return (
      "inset(" +
      rect.top +
      "px " +
      (w - rect.right) +
      "px " +
      (h - rect.bottom) +
      "px " +
      rect.left +
      "px" +
      round +
      ")"
    );
  }

  function fullInset() {
    return "inset(0px 0px 0px 0px)";
  }

  function setClip(el, clip) {
    if (!el) return;
    el.style.clipPath = clip;
    el.style.webkitClipPath = clip;
  }

  function clearClip(el) {
    if (!el) return;
    el.style.clipPath = "";
    el.style.webkitClipPath = "";
  }

  function readCardRadius(card) {
    if (!card) return "";
    var style = window.getComputedStyle(card);
    var radius = style.borderRadius;
    return radius && radius !== "0px" ? radius : "";
  }

  function getCardForView(viewId) {
    return document.querySelector('.js-card-open[data-view="' + viewId + '"]');
  }

  function hideAllViews() {
    contentEl.querySelectorAll(".page-view").forEach(function (panel) {
      panel.hidden = true;
    });
  }

  function showView(viewId) {
    hideAllViews();
    var panel = contentEl.querySelector(
      '.page-view[data-view="' + viewId + '"]'
    );
    if (panel) {
      panel.hidden = false;
    }
    activeView = viewId;
    var titleEl =
      panel &&
      (panel.querySelector(".project-case__title") ||
        panel.querySelector(".project-title"));
    document.title = titleEl
      ? titleEl.textContent + " — Portfolio"
      : viewId.charAt(0).toUpperCase() +
        viewId.slice(1).replace(/-/g, " ") +
        " — Portfolio";
    contentEl.scrollTop = 0;
    if (window.ProjectCase) {
      window.ProjectCase.teardown();
    }
  }

  function revealProjectCase() {
    if (window.ProjectCase) {
      window.ProjectCase.init(contentEl);
    }
  }

  function animateClip(fromClip, toClip, durationSec, el) {
    el = el || backdrop;
    var transitionValue =
      "clip-path " +
      durationSec +
      "s cubic-bezier(0.42, 0.02, 0.16, 1)";

    return new Promise(function (resolve) {
      if (prefersReducedMotion) {
        setClip(el, toClip);
        resolve();
        return;
      }

      setClip(el, fromClip);
      el.style.transition = transitionValue;

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          setClip(el, toClip);
        });
      });

      function done(event) {
        if (event.propertyName !== "clip-path") return;
        el.removeEventListener("transitionend", done);
        resolve();
      }

      el.addEventListener("transitionend", done);
    });
  }

  function openPage(card, viewId, options) {
    if (isAnimating || !viewId) return;
    options = options || {};
    var skipOpenAnimation = !!options.skipOpenAnimation;
    isAnimating = true;
    originCard = card;

    if (card) {
      var rect = card.getBoundingClientRect();
      originRect = captureRect(rect);
      originRadius = readCardRadius(card);
    } else {
      originRect = null;
      originRadius = "";
    }

    showView(viewId);

    contentEl.style.opacity = "";
    contentEl.style.transition = "";

    layer.removeAttribute("inert");
    layer.setAttribute("aria-hidden", "false");
    layer.classList.add("is-active");
    layer.classList.remove("is-content-visible");
    document.body.classList.add("page-is-open", "card-transition-active");

    if (prefersReducedMotion || skipOpenAnimation || !originRect) {
      clearClip(stage);
      clearClip(backdrop);
      backdrop.style.transition = "";
      layer.classList.add("is-content-visible");
      homeShell.setAttribute("aria-hidden", "true");
      revealProjectCase();
      isAnimating = false;
      if (!skipOpenAnimation && originRect && history.pushState) {
        history.pushState({ view: viewId }, "", "#" + viewId);
      }
      return;
    }

    var startClip = insetFromRect(originRect, originRadius);
    clearClip(stage);
    setClip(backdrop, startClip);

    animateClip(startClip, fullInset(), 0.62, backdrop).then(function () {
      clearClip(backdrop);
      backdrop.style.transition = "";
      layer.classList.add("is-content-visible");
      homeShell.setAttribute("aria-hidden", "true");
      revealProjectCase();
      isAnimating = false;
      if (history.pushState) {
        history.pushState({ view: viewId }, "", "#" + viewId);
      }
    });
  }

  function runCloseAnimation() {
    if (!originRect) {
      finishClose();
      return;
    }

    if (prefersReducedMotion) {
      layer.classList.remove("is-content-visible");
      finishClose();
      return;
    }

    var endClip = insetFromRect(originRect, originRadius);
    var fadeMs = 100;

    contentEl.style.transition = "opacity " + fadeMs + "ms ease";
    contentEl.style.opacity = "0";

    var collapseStarted = false;
    function startCollapse() {
      if (collapseStarted) return;
      collapseStarted = true;

      layer.classList.remove("is-content-visible");
      homeShell.removeAttribute("aria-hidden");

      setClip(backdrop, fullInset());
      backdrop.style.transition = "";

      requestAnimationFrame(function () {
        animateClip(fullInset(), endClip, 0.48, backdrop).then(finishClose);
      });
    }

    function onFadeEnd(event) {
      if (event.propertyName !== "opacity") return;
      contentEl.removeEventListener("transitionend", onFadeEnd);
      startCollapse();
    }

    contentEl.addEventListener("transitionend", onFadeEnd);
    setTimeout(startCollapse, fadeMs + 40);
  }

  function closePage() {
    if (isAnimating || !activeView) return;

    if (!closingFromHistory && location.hash) {
      history.back();
      return;
    }

    isAnimating = true;
    runCloseAnimation();
  }

  function finishClose() {
    layer.classList.remove("is-active", "is-content-visible");
    layer.setAttribute("aria-hidden", "true");
    layer.setAttribute("inert", "");
    homeShell.removeAttribute("aria-hidden");
    document.body.classList.remove("page-is-open", "card-transition-active");
    stage.style.transition = "";
    clearClip(stage);
    backdrop.style.transition = "";
    clearClip(backdrop);
    contentEl.style.opacity = "";
    contentEl.style.transition = "";
    hideAllViews();
    if (window.ProjectCase) {
      window.ProjectCase.teardown();
    }
    activeView = null;
    originCard = null;
    originRect = null;
    originRadius = "";
    isAnimating = false;
    closingFromHistory = false;
    document.title = "Portfolio — Home";

    if (!closingFromHistory && history.replaceState) {
      history.replaceState(null, "", window.location.pathname);
    }
  }

  function isModifiedClick(event) {
    return (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    );
  }

  document.addEventListener("DOMContentLoaded", function () {
    layer = document.getElementById("expand-layer");
    if (!layer) return;

    stage = layer.querySelector(".expand-layer__stage");
    backdrop = layer.querySelector(".expand-layer__backdrop");
    contentEl = layer.querySelector(".expand-layer__content");
    homeShell = document.getElementById("home-shell");
    if (!stage || !contentEl || !homeShell) return;

    document.querySelectorAll(".js-card-open").forEach(function (card) {
      card.addEventListener("click", function (event) {
        if (isModifiedClick(event)) return;
        var viewId = card.getAttribute("data-view");
        if (!viewId) return;
        event.preventDefault();
        if (activeView === viewId && layer.classList.contains("is-active")) {
          return;
        }
        openPage(card, viewId);
      });
    });

    layer.addEventListener("click", function (event) {
      if (event.target.closest(".js-page-back")) {
        closePage();
      }
    });

    window.addEventListener("popstate", function () {
      if (activeView && !location.hash) {
        closingFromHistory = true;
        if (isAnimating) return;
        isAnimating = true;
        runCloseAnimation();
        return;
      }

      if (!activeView && location.hash) {
        var viewId = location.hash.replace("#", "");
        var card = getCardForView(viewId);
        if (card) openPage(card, viewId);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && activeView) {
        closePage();
      }
    });

    function hasViewPanel(viewId) {
      return !!contentEl.querySelector(
        '.page-view[data-view="' + viewId + '"]'
      );
    }

    document.querySelectorAll('a[href*="?view="]').forEach(function (link) {
      link.addEventListener("click", function (event) {
        if (isModifiedClick(event)) return;
        var url;
        try {
          url = new URL(link.href, location.href);
        } catch (err) {
          return;
        }
        if (url.pathname !== location.pathname) return;
        var viewId = new URLSearchParams(url.search).get("view");
        if (!viewId || !hasViewPanel(viewId)) return;
        event.preventDefault();
        openPage(getCardForView(viewId), viewId, {
          skipOpenAnimation: true,
        });
      });
    });

    var initialHash = location.hash.replace("#", "");
    if (initialHash && getCardForView(initialHash)) {
      openPage(getCardForView(initialHash), initialHash);
    } else {
      var params = new URLSearchParams(location.search);
      var directView = params.get("view");
      if (directView && hasViewPanel(directView)) {
        openPage(getCardForView(directView), directView, {
          skipOpenAnimation: true,
        });
      }
    }
  });
})();
