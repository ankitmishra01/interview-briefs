(function () {
  var root = document.documentElement;
  var defaultLang = root.getAttribute("data-default-lang") || "en";
  function storageGet() {
    try { return localStorage.getItem("fitcheck-lang"); } catch (e) { return null; }
  }
  function storageSet(value) {
    try { localStorage.setItem("fitcheck-lang", value); } catch (e) {}
  }
  function queryLang() {
    try {
      var value = new URLSearchParams(window.location.search).get("lang");
      return value === "fr" || value === "en" ? value : null;
    } catch (e) { return null; }
  }
  function setLang(lang) {
    root.lang = lang;
    root.setAttribute("data-active-lang", lang);
    document.querySelectorAll("[data-lang-button]").forEach(function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-lang-button") === lang ? "true" : "false");
    });
  }
  var lang = queryLang() || storageGet() || defaultLang;
  setLang(lang);
  document.querySelectorAll("[data-lang-button]").forEach(function (button) {
    button.addEventListener("click", function () {
      var next = button.getAttribute("data-lang-button");
      storageSet(next);
      setLang(next);
    });
  });
})();
