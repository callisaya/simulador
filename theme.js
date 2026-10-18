// Alterna entre modo claro y oscuro y recuerda la elección en este navegador.
const themeButtons = document.querySelectorAll(".theme-toggle");
const themeColorMeta = document.querySelector('meta[name="theme-color"]');

function applyTheme(theme) {
  const dark = theme === "dark";
  const label = dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  themeColorMeta.content = dark ? "#0f1722" : "#f7fafc";
  themeButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(dark));
    button.setAttribute("aria-label", label);
    button.title = label;
  });
}

themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem("tema", next);
    } catch (e) {
      // Sin almacenamiento disponible: el tema solo dura esta visita.
    }
  });
});

applyTheme(document.documentElement.dataset.theme);
