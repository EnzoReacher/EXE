import { analyzeCvAgainstJob, SAMPLE_CV, SAMPLE_JD } from "./analyzer.js";

const form = document.querySelector("#analysis-form");
const cvInput = document.querySelector("#cv-text");
const jdInput = document.querySelector("#jd-text");
const roleInput = document.querySelector("#role-title");
const message = document.querySelector("#form-message");
const results = document.querySelector("#results");
const analyzeButton = document.querySelector("#analyze-button");

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function updateCount(input, counter) {
  counter.textContent = `${input.value.length.toLocaleString("vi-VN")} ký tự`;
}

function renderSummary(summary) {
  const root = document.querySelector("#summary-grid");
  root.replaceChildren();
  const cards = [
    ["Có bằng chứng mô tả", summary.supported],
    ["Bằng chứng một phần", summary.partial],
    ["Có nhắc nhưng chưa rõ", summary.unclear],
    ["Chưa thấy trong CV", summary.missing],
  ];
  for (const [label, value] of cards) {
    const card = createElement("div", "summary-card");
    card.append(createElement("span", "summary-label", label));
    card.append(createElement("strong", "summary-value", String(value)));
    root.append(card);
  }
}

function renderFindings(findings) {
  const root = document.querySelector("#findings-list");
  root.replaceChildren();
  document.querySelector("#requirement-count").textContent = `${findings.length} mục nhận diện`;

  for (const finding of findings) {
    const card = createElement("article", "finding-card");
    const top = createElement("div", "finding-top");
    top.append(createElement("h4", "finding-title", finding.requirement));

    const labels = {
      supported: ["Có bằng chứng", "status-supported"],
      partial: ["Một phần", "status-partial"],
      unclear: ["Chưa rõ", "status-unclear"],
      missing: ["Chưa thấy trong CV", "status-missing"],
    };
    const [label, statusClass] = labels[finding.status];
    top.append(createElement("span", `status-badge ${statusClass}`, label));
    card.append(top);

    const excerpt = finding.evidence
      ? `“${finding.evidence}”`
      : "Không tìm thấy đoạn CV đề cập trực tiếp đến yêu cầu này.";
    card.append(createElement("p", `finding-evidence${finding.evidence ? "" : " no-evidence"}`, excerpt));
    root.append(card);
  }
}

function renderActions(actions) {
  const root = document.querySelector("#action-list");
  root.replaceChildren();
  for (const action of actions) root.append(createElement("li", "", action));
}

function renderResult(report) {
  renderSummary(report.summary);
  renderFindings(report.findings);
  renderActions(report.actions);
  document.querySelector("#results-subtitle").textContent = `Vị trí: ${report.roleTitle}`;
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clearResult() {
  results.hidden = true;
  document.querySelector("#summary-grid").replaceChildren();
  document.querySelector("#findings-list").replaceChildren();
  document.querySelector("#action-list").replaceChildren();
  document.querySelector("#results-subtitle").textContent = "";
  message.textContent = "";
}

cvInput.addEventListener("input", () => updateCount(cvInput, document.querySelector("#cv-count")));
jdInput.addEventListener("input", () => updateCount(jdInput, document.querySelector("#jd-count")));

document.querySelector("#load-sample").addEventListener("click", () => {
  cvInput.value = SAMPLE_CV;
  jdInput.value = SAMPLE_JD;
  roleInput.value = "Backend Developer Intern";
  updateCount(cvInput, document.querySelector("#cv-count"));
  updateCount(jdInput, document.querySelector("#jd-count"));
  clearResult();
  cvInput.focus();
});

document.querySelector("#clear-results").addEventListener("click", () => {
  clearResult();
  document.querySelector("#cv-panel-title").scrollIntoView({ behavior: "smooth", block: "center" });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  message.textContent = "";
  analyzeButton.disabled = true;
  analyzeButton.querySelector("span:first-child").textContent = "Đang đối chiếu…";

  try {
    const report = analyzeCvAgainstJob({
      cvText: cvInput.value,
      jobDescription: jdInput.value,
      roleTitle: roleInput.value,
    });
    renderResult(report);
  } catch (error) {
    message.textContent = error instanceof Error ? error.message : "Chưa thể đối chiếu. Hãy kiểm tra lại nội dung đã nhập.";
    results.hidden = true;
  } finally {
    analyzeButton.disabled = false;
    analyzeButton.querySelector("span:first-child").textContent = "Đối chiếu CV với JD";
  }
});
