import "./styles.css";
import "./references.css";
import { REFERENCES } from "./references-data.js";

const grid = document.querySelector("#reference-grid");
const count = document.querySelector("#filter-count");
const total = document.querySelector("#source-total");
const search = document.querySelector("#reference-search");
const empty = document.querySelector("#empty-results");
const filterButtons = [...document.querySelectorAll(".filter-button")];
let activeDomain = "all";

total.textContent = String(REFERENCES.length);
render();

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeDomain = button.dataset.domain;
    filterButtons.forEach((candidate) => {
      const active = candidate === button;
      candidate.classList.toggle("active", active);
      candidate.setAttribute("aria-pressed", String(active));
    });
    render();
  });
});

search.addEventListener("input", render);

function render() {
  const query = search.value.trim().toLocaleLowerCase();
  const visible = REFERENCES.filter((reference) => {
    const domainMatches =
      activeDomain === "all" || reference.domain === activeDomain;
    const searchMatches =
      !query ||
      [
        reference.citation,
        reference.mechanism,
        reference.constrains,
        reference.implementation,
        reference.validity,
        reference.doi,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query);
    return domainMatches && searchMatches;
  });

  grid.replaceChildren(...visible.map(referenceCard));
  count.textContent = `${visible.length} / ${REFERENCES.length}`;
  empty.hidden = visible.length > 0;
}

function referenceCard(reference, index) {
  const article = document.createElement("article");
  article.className = "reference-card";
  article.dataset.domain = reference.domain;
  article.id = reference.key;
  article.innerHTML = `
    <div class="reference-card-top">
      <span class="reference-domain ${reference.domain}">
        ${reference.domain}
      </span>
      <span class="reference-number">${String(index + 1).padStart(2, "0")}</span>
    </div>
    <p class="reference-mechanism">${reference.mechanism}</p>
    <h3>${reference.title}</h3>
    <p class="citation">${reference.citation}</p>
    <dl class="source-map">
      <div>
        <dt>What it constrains</dt>
        <dd>${reference.constrains}</dd>
      </div>
      <div>
        <dt>In the engine</dt>
        <dd>${reference.implementation}</dd>
      </div>
      <div>
        <dt>Parameter provenance</dt>
        <dd>${reference.parameterStatus}</dd>
      </div>
      <div>
        <dt>Validity boundary</dt>
        <dd>${reference.validity}</dd>
      </div>
    </dl>
    <div class="reference-card-footer">
      <span class="status ${statusClass(reference.evidence)}">${reference.evidence}</span>
      <a href="${reference.url}" target="_blank" rel="noreferrer">
        ${reference.doi === "primary manuscript" ? "Open manuscript" : `DOI ${reference.doi}`}
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  `;
  return article;
}

function statusClass(status) {
  if (status.includes("canonical")) return "canonical";
  if (status.includes("illustrative") || status.includes("omission")) {
    return "illustrative";
  }
  if (status.includes("reduced") || status.includes("constraint") || status.includes("coarse")) {
    return "reduced";
  }
  return "adapted";
}

