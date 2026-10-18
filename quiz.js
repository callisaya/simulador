const homeView = document.querySelector(".app-shell");
const quizView = document.querySelector("#quizView");
const quizPanel = document.querySelector("#quizPanel");
const resultsPanel = document.querySelector("#resultsPanel");
const reviewPanel = document.querySelector("#reviewPanel");
const quizLaw = document.querySelector("#quizLaw");
const quizTimer = document.querySelector("#quizTimer");
const quizTime = document.querySelector("#quizTime");
const quizPosition = document.querySelector("#quizPosition");
const quizPercent = document.querySelector("#quizPercent");
const quizBar = document.querySelector("#quizBar");
const quizBarFill = document.querySelector("#quizBarFill");
const questionNumber = document.querySelector("#questionNumber");
const questionLaw = document.querySelector("#questionLaw");
const questionText = document.querySelector("#questionText");
const optionList = document.querySelector("#optionList");
const feedback = document.querySelector("#feedback");
const feedbackText = document.querySelector("#feedbackText");
const prevButton = document.querySelector("#prevButton");
const nextButton = document.querySelector("#nextButton");
const nextLabel = document.querySelector("#nextLabel");
const finishButton = document.querySelector("#finishButton");
const finishDialog = document.querySelector("#finishDialog");

const LETTERS = ["A", "B", "C", "D"];
const ICON_CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const ICON_CROSS = '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg>';

let quiz = null;

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatTime(seconds) {
  const s = Math.max(0, seconds);
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

function startQuiz(config) {
  const law = QUESTION_BANK[config.lawId];
  const source = config.shuffleQuestions ? shuffle(law.questions) : [...law.questions];
  const questions = source.slice(0, config.count).map((q) => {
    const order = config.shuffleOptions ? shuffle([0, 1, 2, 3]) : [0, 1, 2, 3];
    return {
      text: q.q,
      options: order.map((i) => q.options[i]),
      answer: order.indexOf(q.answer),
      feedback: q.feedback,
    };
  });

  const limits = { auto: questions.length * 90, none: null };
  quiz = {
    config,
    title: law.title,
    questions,
    answers: Array(questions.length).fill(null),
    index: 0,
    limit: config.time in limits ? limits[config.time] : Number(config.time) * 60,
    startedAt: Date.now(),
    elapsed: 0,
    timer: null,
    finished: false,
    timedOut: false,
  };

  quizLaw.textContent = law.title;
  questionLaw.textContent = law.title;
  showView("quiz");
  showPanel("questions");
  render();
  startTimer();
}

function showView(name) {
  homeView.hidden = name !== "home";
  quizView.hidden = name !== "quiz";
  window.scrollTo(0, 0);
}

function showPanel(name) {
  quizPanel.hidden = name !== "questions";
  resultsPanel.hidden = name !== "results";
  reviewPanel.hidden = name !== "review";
  quizTimer.hidden = name !== "questions";
  window.scrollTo(0, 0);
}

function startTimer() {
  stopTimer();
  tick();
  quiz.timer = setInterval(tick, 1000);
}

function stopTimer() {
  if (quiz && quiz.timer) clearInterval(quiz.timer);
}

function tick() {
  quiz.elapsed = Math.floor((Date.now() - quiz.startedAt) / 1000);
  const remaining = quiz.limit === null ? null : quiz.limit - quiz.elapsed;
  quizTime.textContent = formatTime(remaining === null ? quiz.elapsed : remaining);
  quizTimer.classList.toggle("is-low", remaining !== null && remaining <= 60);
  if (remaining !== null && remaining <= 0) {
    quiz.timedOut = true;
    finishQuiz();
  }
}

function isLocked(index = quiz.index) {
  return quiz.config.mode === "practica" && quiz.answers[index] !== null;
}

function render() {
  const { questions, index, answers } = quiz;
  const question = questions[index];
  const total = questions.length;
  const percent = Math.round(((index + 1) / total) * 100);
  const chosen = answers[index];
  const locked = isLocked();

  quizPosition.textContent = `Pregunta ${index + 1} de ${total}`;
  quizPercent.textContent = `${percent}%`;
  quizBarFill.style.width = `${percent}%`;
  quizBar.setAttribute("aria-valuenow", String(percent));
  questionNumber.textContent = index + 1;
  questionText.textContent = question.text;

  optionList.replaceChildren(...question.options.map((text, i) => {
    const button = buildOption("button", question, i, chosen, locked);
    button.type = "button";
    button.setAttribute("aria-pressed", String(chosen === i));
    if (locked) button.setAttribute("aria-disabled", "true");
    button.addEventListener("click", () => chooseOption(i));
    return button;
  }));

  feedback.hidden = !locked;
  feedbackText.textContent = feedbackFor(question);

  prevButton.disabled = index === 0;
  nextLabel.textContent = index === total - 1 ? "Ver resultados" : "Siguiente";
}

// Alternativa con su letra; si está corregida, marca correcta/incorrecta.
function buildOption(tag, question, i, chosen, locked) {
  const option = document.createElement(tag);
  option.className = "option";
  option.innerHTML = '<span class="option-letter"></span><span class="option-text"></span><span class="option-badge"></span><span class="option-mark" aria-hidden="true"></span>';
  option.querySelector(".option-letter").textContent = LETTERS[i];
  option.querySelector(".option-text").textContent = question.options[i];

  if (locked && i === question.answer) {
    option.classList.add("is-correct");
    option.querySelector(".option-badge").textContent = "Correcta";
    option.querySelector(".option-mark").innerHTML = ICON_CHECK;
  } else if (locked && chosen === i) {
    option.classList.add("is-wrong");
    option.querySelector(".option-badge").textContent = "Incorrecta";
    option.querySelector(".option-mark").innerHTML = ICON_CROSS;
  } else if (chosen === i) {
    option.classList.add("is-selected");
  }
  return option;
}

function feedbackFor(question) {
  return question.feedback || "Esta pregunta no tiene sustento legal en el banco de preguntas.";
}

function chooseOption(i) {
  if (isLocked()) return;
  quiz.answers[quiz.index] = i;
  render();
  if (!feedback.hidden) feedback.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function goTo(index) {
  if (index < 0 || index >= quiz.questions.length) return;
  quiz.index = index;
  render();
  window.scrollTo(0, 0);
  questionText.focus({ preventScroll: true });
}

function unansweredCount() {
  return quiz.answers.filter((a) => a === null).length;
}

function finishQuiz() {
  stopTimer();
  if (finishDialog.open) finishDialog.close();
  quiz.finished = true;

  const total = quiz.questions.length;
  const correct = quiz.questions.filter((q, i) => quiz.answers[i] === q.answer).length;
  const blank = unansweredCount();
  const score = Math.round((correct / total) * 100);
  const mode = quiz.config.mode === "practica" ? "Modo práctica" : "Modo examen";

  document.querySelector("#scoreRing").style.setProperty("--score", score);
  document.querySelector("#scoreValue").textContent = `${score}%`;
  document.querySelector("#resultsTitle").textContent = quiz.timedOut ? "Tiempo agotado" : "Simulacro finalizado";
  document.querySelector("#resultsNote").textContent = `${mode} · ${correct} de ${total} respuestas correctas`;
  document.querySelector("#statCorrect").textContent = correct;
  document.querySelector("#statWrong").textContent = total - correct - blank;
  document.querySelector("#statBlank").textContent = blank;
  document.querySelector("#statTime").textContent = formatTime(quiz.elapsed);
  showPanel("results");
}

function requestFinish() {
  const blank = unansweredCount();
  const plural = blank === 1 ? "pregunta sin responder" : "preguntas sin responder";
  document.querySelector("#finishMessage").textContent = blank
    ? `Tienes ${blank} ${plural}, que no sumarán puntos. ¿Deseas finalizar y ver tus resultados?`
    : "Respondiste todas las preguntas. ¿Deseas finalizar y ver tus resultados?";
  document.querySelector("#finishAnswered").textContent = quiz.questions.length - blank;
  document.querySelector("#finishBlank").textContent = blank;
  document.querySelector("#finishBlankBox").classList.toggle("has-blank", blank > 0);
  finishDialog.showModal();
}

document.querySelector("#finishCancel").addEventListener("click", () => finishDialog.close());
document.querySelector("#finishConfirm").addEventListener("click", finishQuiz);
finishDialog.addEventListener("click", (event) => {
  if (event.target === finishDialog) finishDialog.close();
});

// Revisión: todas las preguntas corregidas en una sola página.
function showReview() {
  const items = quiz.questions.map((question, index) => {
    const chosen = quiz.answers[index];
    const status = chosen === null ? "blank" : chosen === question.answer ? "correct" : "wrong";

    const item = document.createElement("li");
    item.className = `review-item is-${status}`;
    item.innerHTML = '<div class="review-item-head"><span class="question-number"></span><span class="review-status"></span></div><h3 class="question-text"></h3><div class="option-list"></div>';
    item.querySelector(".question-number").textContent = index + 1;
    item.querySelector(".review-status").textContent = { correct: "Correcta", wrong: "Incorrecta", blank: "Sin responder" }[status];
    item.querySelector(".question-text").textContent = question.text;
    item.querySelector(".option-list").append(
      ...question.options.map((_, i) => buildOption("div", question, i, chosen, true))
    );

    const legal = feedback.cloneNode(true);
    legal.hidden = false;
    legal.removeAttribute("aria-live");
    legal.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    legal.removeAttribute("id");
    legal.querySelector(".feedback-text").textContent = feedbackFor(question);
    item.append(legal);
    return item;
  });

  const correct = quiz.questions.filter((q, i) => quiz.answers[i] === q.answer).length;
  document.querySelector("#reviewSummary").textContent =
    `${correct} de ${quiz.questions.length} respuestas correctas · ${unansweredCount()} sin responder`;
  document.querySelector("#reviewList").replaceChildren(...items);
  showPanel("review");
}

function exitQuiz() {
  const answered = quiz.answers.some((a) => a !== null);
  if (!quiz.finished && answered && !confirm("¿Salir del simulacro? Se perderá tu progreso.")) return;
  stopTimer();
  showView("home");
}

prevButton.addEventListener("click", () => goTo(quiz.index - 1));
nextButton.addEventListener("click", () => {
  if (quiz.index === quiz.questions.length - 1) requestFinish();
  else goTo(quiz.index + 1);
});
finishButton.addEventListener("click", requestFinish);
document.querySelector("#quizBack").addEventListener("click", exitQuiz);
document.querySelector("#homeButton").addEventListener("click", exitQuiz);
document.querySelector("#retryButton").addEventListener("click", () => startQuiz(quiz.config));
document.querySelector("#reviewButton").addEventListener("click", showReview);
document.querySelector("#reviewBack").addEventListener("click", () => showPanel("results"));

// Atajos: A-D o 1-4 para responder, flechas para navegar.
document.addEventListener("keydown", (event) => {
  if (quizView.hidden || quizPanel.hidden || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target.closest("input, select, textarea, dialog")) return;
  const key = event.key.toLowerCase();
  const option = "abcd".indexOf(key) >= 0 ? "abcd".indexOf(key) : "1234".indexOf(key);
  if (option >= 0) chooseOption(option);
  else if (event.key === "ArrowRight") goTo(quiz.index + 1);
  else if (event.key === "ArrowLeft") goTo(quiz.index - 1);
});
