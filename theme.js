// // === GLOBAL LIGHT/DARK MODE HANDLER ===
const modeToggle = document.getElementById("modeToggle");

// Apply saved theme (default = light)
const savedTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);
if (modeToggle) modeToggle.textContent = savedTheme === "dark" ? "☀️ Light" : "🌙 Dark";

// Toggle theme
if (modeToggle) {
  modeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    modeToggle.textContent = next === "dark" ? "☀️ Light" : "🌙 Dark";
  });
}
