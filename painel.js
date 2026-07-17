
const startDateFilter = document.getElementById("startDateFilter");
const endDateFilter = document.getElementById("endDateFilter");
const doctorFilter = document.getElementById("doctorFilter");
const specialtyFilter = document.getElementById("specialtyFilter");
const jsonFile = document.getElementById("jsonFile");
const statusBox = document.getElementById("status");
const sourceInfo = document.getElementById("sourceInfo");
const clearSavedButton = document.getElementById("clearSavedButton");
const resultsBody = document.getElementById("resultsBody");

let allData = [];


function consideredMinutes(item) {
  if (Number.isFinite(item.tempoConsideradoMinutos)) {
    return item.tempoConsideradoMinutos;
  }
  return Number.isFinite(item.tempoRealMinutos)
    ? item.tempoRealMinutos
    : item.tempoSistemaMinutos;
}

function minutesText(minutes) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours ? `${hours}h ${String(mins).padStart(2,"0")}min` : `${mins} min`;
}

function formatDateBr(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function uniqueSorted(field) {
  return [...new Set(allData.map(item => item[field]).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function populateFilters() {
  const selectedDoctor = doctorFilter.value;
  const selectedSpecialty = specialtyFilter.value;

  doctorFilter.innerHTML = '<option value="">Todos os médicos</option>' +
    uniqueSorted("medico").map(value => `<option value="${value}">${value}</option>`).join("");
  specialtyFilter.innerHTML = '<option value="">Todas as especialidades</option>' +
    uniqueSorted("especialidade").map(value => `<option value="${value}">${value}</option>`).join("");

  doctorFilter.value = selectedDoctor;
  specialtyFilter.value = selectedSpecialty;

  const dates = uniqueSorted("data");
  if (dates.length) {
    if (!startDateFilter.value) startDateFilter.value = dates[0];
    if (!endDateFilter.value) endDateFilter.value = dates[dates.length - 1];
  }
}

function filteredData() {
  return allData.filter(item =>
    (!startDateFilter.value || item.data >= startDateFilter.value) &&
    (!endDateFilter.value || item.data <= endDateFilter.value) &&
    (!doctorFilter.value || item.medico === doctorFilter.value) &&
    (!specialtyFilter.value || item.especialidade === specialtyFilter.value)
  );
}

function render() {
  const data = filteredData();
  const durations = data.map(consideredMinutes).filter(Number.isFinite);
  const average = durations.length ? Math.round(durations.reduce((a,b) => a+b, 0) / durations.length) : null;
  const starts = data.map(item => item.inicio).filter(Boolean).sort();
  const ends = data.map(item => item.termino).filter(Boolean).sort();
  const overlaps = data.filter(item => item.sobreposicao).length;

  document.getElementById("patientCount").textContent = data.length;
  document.getElementById("averageTime").textContent = minutesText(average);
  document.getElementById("firstTime").textContent = starts[0] || "—";
  document.getElementById("lastTime").textContent = ends.at(-1) || "—";
  document.getElementById("overlapCount").textContent = overlaps;

  const doctorText = doctorFilter.value ? ` pelo médico ${doctorFilter.value}` : "";
  let periodText = "";
  if (startDateFilter.value && endDateFilter.value) {
    periodText = startDateFilter.value === endDateFilter.value
      ? ` em ${formatDateBr(startDateFilter.value)}`
      : ` entre ${formatDateBr(startDateFilter.value)} e ${formatDateBr(endDateFilter.value)}`;
  } else if (startDateFilter.value) {
    periodText = ` a partir de ${formatDateBr(startDateFilter.value)}`;
  } else if (endDateFilter.value) {
    periodText = ` até ${formatDateBr(endDateFilter.value)}`;
  }
  document.getElementById("answerText").textContent =
    `Foram encontrados ${data.length} pacientes atendidos${doctorText}${periodText}.`;

  resultsBody.innerHTML = data.map(item => `
    <tr class="${item.sobreposicao ? "overlap" : ""}">
      <td>${formatDateBr(item.data)}</td>
      <td>${item.medico}</td>
      <td>${item.especialidade}</td>
      <td>${item.paciente}</td>
      <td>${item.inicio}</td>
      <td>${item.termino}</td>
      <td>${minutesText(consideredMinutes(item))}</td>
      <td><span class="badge ${item.sobreposicao ? "yes" : "no"}">${item.sobreposicao ? "Sim" : "Não"}</span></td>
    </tr>
  `).join("");

  statusBox.textContent = `${allData.length} registros disponíveis; ${data.length} exibidos.`;
  statusBox.className = "status";
}

async function loadDefaultData() {
  const saved = localStorage.getItem("painelAtendimentosData");
  const updatedAt = localStorage.getItem("painelAtendimentosUpdatedAt");

  if (saved) {
    try {
      allData = JSON.parse(saved);
      populateFilters();
      render();
      const when = updatedAt ? new Date(updatedAt).toLocaleString("pt-BR") : "data desconhecida";
      sourceInfo.textContent = `Fonte: dados salvos neste navegador em ${when}.`;
      return;
    } catch {
      localStorage.removeItem("painelAtendimentosData");
      localStorage.removeItem("painelAtendimentosUpdatedAt");
    }
  }

  const response = await fetch("dados/atendimentos.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Não foi possível carregar os dados iniciais.");
  allData = await response.json();
  populateFilters();
  render();
  sourceInfo.textContent = "Fonte: arquivo padrão publicado com o site.";
}

document.getElementById("applyButton").addEventListener("click", render);
document.getElementById("clearButton").addEventListener("click", () => {
  startDateFilter.value = "";
  endDateFilter.value = "";
  doctorFilter.value = "";
  specialtyFilter.value = "";
  render();
});
doctorFilter.addEventListener("change", render);
specialtyFilter.addEventListener("change", render);
startDateFilter.addEventListener("change", render);
endDateFilter.addEventListener("change", render);

clearSavedButton.addEventListener("click", () => {
  const confirmed = window.confirm(
    "Deseja apagar os dados salvos neste navegador? O painel ficará vazio até você importar outro Excel ou JSON."
  );
  if (!confirmed) return;

  localStorage.removeItem("painelAtendimentosData");
  localStorage.removeItem("painelAtendimentosUpdatedAt");

  allData = [];
  startDateFilter.value = "";
  endDateFilter.value = "";
  doctorFilter.innerHTML = '<option value="">Todos os médicos</option>';
  specialtyFilter.innerHTML = '<option value="">Todas as especialidades</option>';

  render();
  sourceInfo.textContent = "Nenhuma base está carregada neste navegador.";
  statusBox.textContent = "Dados salvos apagados com sucesso.";
  statusBox.className = "status";
});

jsonFile.addEventListener("change", async () => {
  const file = jsonFile.files[0];
  if (!file) return;
  try {
    allData = JSON.parse(await file.text());
    localStorage.setItem("painelAtendimentosData", JSON.stringify(allData));
    localStorage.setItem("painelAtendimentosUpdatedAt", new Date().toISOString());
    populateFilters();
    render();
    sourceInfo.textContent = "Fonte: JSON carregado e salvo neste navegador.";
    statusBox.textContent = `JSON carregado: ${allData.length} registros.`;
  } catch {
    statusBox.textContent = "O arquivo JSON não pôde ser lido.";
    statusBox.className = "status error";
  }
});

loadDefaultData().catch(error => {
  statusBox.textContent = `${error.message} Abra o projeto por um servidor local ou publique no Vercel.`;
  statusBox.className = "status error";
});
