const menuButton = document.querySelector("#menuButton");
const mobileMenu = document.querySelector("#mobileMenu");
const dialog = document.querySelector("#setupDialog");
const setupForm = document.querySelector("#setupForm");
const setupIcon = document.querySelector("#setupIcon");
const setupLaw = document.querySelector("#setupLaw");
const setupCount = document.querySelector("#setupCount");
const setupQuestions = document.querySelector("#setupQuestions");

menuButton.addEventListener("click", () => {
  const willOpen = mobileMenu.hidden;
  mobileMenu.hidden = !willOpen;
  menuButton.setAttribute("aria-expanded", String(willOpen));
});

const aboutDialog = document.querySelector("#aboutDialog");
document.querySelector("#aboutLink").addEventListener("click", (event) => {
  event.preventDefault();
  mobileMenu.hidden = true;
  menuButton.setAttribute("aria-expanded", "false");
  aboutDialog.showModal();
});
document.querySelector("#aboutClose").addEventListener("click", () => aboutDialog.close());
aboutDialog.addEventListener("click", (event) => {
  if (event.target === aboutDialog) aboutDialog.close();
});

function fillQuestionOptions(total) {
  const sizes = [10, 20, 50].filter((size) => size < total);
  setupQuestions.innerHTML = "";
  sizes.forEach((size) => setupQuestions.add(new Option(`${size} preguntas`, size)));
  setupQuestions.add(new Option(`Todas (${total})`, total, true, true));
}

const bankByTitle = Object.fromEntries(
  Object.entries(window.QUESTION_BANK || {}).map(([id, law]) => [law.title, id])
);
let selectedLawId = null;

document.querySelectorAll(".start-button").forEach((button) => {
  const card = button.closest(".law-card");
  const lawId = bankByTitle[button.dataset.law];
  const total = lawId ? QUESTION_BANK[lawId].questions.length : 0;
  card.querySelector(".law-meta span").textContent = total
    ? `♧ ${total} preguntas`
    : "♧ Banco de preguntas pendiente";

  button.addEventListener("click", () => {
    if (!total) {
      alert(`La normativa "${button.dataset.law}" aún no tiene preguntas cargadas.`);
      return;
    }

    selectedLawId = lawId;
    setupForm.reset();
    setupLaw.textContent = button.dataset.law;
    setupCount.textContent = `${total} preguntas disponibles`;
    setupIcon.innerHTML = card.querySelector(".law-icon svg").outerHTML;
    fillQuestionOptions(total);

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      alert(`Has seleccionado: ${setupLaw.textContent}`);
    }
  });
});

dialog.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => dialog.close());
});

// Los clics en el fondo oscuro llegan con el propio <dialog> como destino.
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

setupForm.addEventListener("submit", () => {
  const data = new FormData(setupForm);
  startQuiz({
    lawId: selectedLawId,
    mode: data.get("mode"),
    count: Number(data.get("count")),
    time: data.get("time"),
    shuffleQuestions: data.has("shuffleQuestions"),
    shuffleOptions: data.has("shuffleOptions"),
  });
});
