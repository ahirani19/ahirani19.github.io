(function () {
  function initCarousel(root) {
    var track = root.querySelector(".case-carousel__track");
    var slides = root.querySelectorAll(".case-carousel__slide");
    var prevBtn = root.querySelector(".case-carousel__btn--prev");
    var nextBtn = root.querySelector(".case-carousel__btn--next");
    var dots = root.querySelectorAll(".case-carousel__dot");
    var captionEl = root.querySelector("[data-carousel-caption]");
    var count = slides.length;
    var index = 0;
    var reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (!track || !count) return;

    var files = {};
    try {
      files = JSON.parse(root.getAttribute("data-carousel-files") || "{}");
    } catch (err) {
      files = {};
    }

    slides.forEach(function (slide) {
      var letter = slide.getAttribute("data-carousel-letter");
      var img = slide.querySelector(".case-carousel__image");
      var fallback = slide.querySelector("[data-carousel-fallback]");
      var src = letter && files[letter] ? files[letter] : "";
      if (!img) return;
      if (src) {
        img.src = src;
        img.hidden = false;
        if (fallback) fallback.hidden = true;
      } else {
        img.removeAttribute("src");
        img.hidden = true;
        if (fallback) fallback.hidden = false;
      }
    });

    function captionFor(slide) {
      var cap = slide.querySelector(".case-carousel__caption-text");
      return cap ? cap.textContent : "";
    }

    function goTo(nextIndex) {
      index = (nextIndex + count) % count;
      track.style.transform = "translateX(-" + index * 100 + "%)";
      slides.forEach(function (slide, i) {
        slide.classList.toggle("is-active", i === index);
        slide.setAttribute("aria-hidden", i === index ? "false" : "true");
      });
      dots.forEach(function (dot, i) {
        var isActive = i === index;
        dot.classList.toggle("is-active", isActive);
        dot.setAttribute("aria-selected", isActive ? "true" : "false");
        dot.tabIndex = isActive ? 0 : -1;
      });
      if (captionEl) {
        captionEl.textContent = captionFor(slides[index]);
      }
      root.setAttribute("data-carousel-index", String(index));
    }

    if (!reducedMotion) {
      track.style.transition = "transform 0.4s cubic-bezier(0.42, 0.02, 0.16, 1)";
    }

    prevBtn.addEventListener("click", function () {
      goTo(index - 1);
    });
    nextBtn.addEventListener("click", function () {
      goTo(index + 1);
    });

    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () {
        goTo(i);
      });
    });

    root.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(index - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(index + 1);
      }
    });

    goTo(0);
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".js-case-carousel").forEach(initCarousel);
  });
})();
