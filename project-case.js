(function () {
  var activeSpy = null;

  function teardownProjectCase() {
    if (activeSpy) {
      activeSpy.teardown();
      activeSpy = null;
    }
  }

  function getScrollOffset(scrollRoot) {
    return Math.min(scrollRoot.clientHeight * 0.22, 160);
  }

  function sectionTop(scrollRoot, section) {
    return (
      section.getBoundingClientRect().top -
      scrollRoot.getBoundingClientRect().top +
      scrollRoot.scrollTop
    );
  }

  function initProjectCase(scrollRoot) {
    teardownProjectCase();

    var view = scrollRoot.querySelector(".page-view--project:not([hidden])");
    if (!view) return;

    var sections = view.querySelectorAll("[data-chapter-section]");
    var links = view.querySelectorAll("[data-chapter-link]");
    if (!sections.length || !links.length) return;

    var reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    var ticking = false;

    function setActive(chapter) {
      links.forEach(function (link) {
        var isActive = link.dataset.chapterLink === chapter;
        link.classList.toggle("is-active", isActive);
        if (isActive) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }

    function updateActive() {
      ticking = false;
      var offset = getScrollOffset(scrollRoot);
      var scrollY = scrollRoot.scrollTop + offset;
      var current = sections[0].dataset.chapterSection;

      sections.forEach(function (section) {
        if (sectionTop(scrollRoot, section) <= scrollY) {
          current = section.dataset.chapterSection;
        }
      });

      setActive(current);
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateActive);
    }

    links.forEach(function (link) {
      link.addEventListener("click", function (event) {
        var hash = link.getAttribute("href");
        if (!hash || hash.charAt(0) !== "#") return;
        event.preventDefault();
        var target = view.querySelector(hash);
        if (!target) return;
        var top = sectionTop(scrollRoot, target) - getScrollOffset(scrollRoot);
        scrollRoot.scrollTo({
          top: Math.max(0, top),
          behavior: reducedMotion ? "auto" : "smooth",
        });
      });
    });

    scrollRoot.addEventListener("scroll", onScroll, { passive: true });
    updateActive();

    activeSpy = {
      teardown: function () {
        scrollRoot.removeEventListener("scroll", onScroll);
      },
    };
  }

  window.ProjectCase = {
    init: initProjectCase,
    teardown: teardownProjectCase,
  };
})();
