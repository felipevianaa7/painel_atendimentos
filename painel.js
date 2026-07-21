const startDateFilter = document.getElementById("startDateFilter");
const endDateFilter = document.getElementById("endDateFilter");
const doctorFilter = document.getElementById("doctorFilter");
const specialtyFilter = document.getElementById("specialtyFilter");
const jsonFile = document.getElementById("jsonFile");
const statusBox = document.getElementById("status");
const sourceInfo = document.getElementById("sourceInfo");
const clearSavedButton = document.getElementById("clearSavedButton");
const resultsBody = document.getElementById("resultsBody");
const scheduleAnalysisBody = document.getElementById("scheduleAnalysisBody");

let allData = [];

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hasOverlap(item) {
  if (typeof item?.sobreposicao === "boolean") return item.sobreposicao;
  const value = normalizeText(item?.sobreposicao);
  return value === "sim" || value === "true" || value === "1";
}

function normalizeData(items) {
  if (!Array.isArray(items)) return [];
  return items.map(item => ({
    ...item,
    sobreposicao: hasOverlap(item),
    esperaMinutos: Number.isFinite(Number(item.esperaMinutos)) ? Number(item.esperaMinutos) : null
  }));
}

function attendanceMinutes(item) {
  if (Number.isFinite(item.tempoAtendimentoMinutos)) return item.tempoAtendimentoMinutos;
  if (Number.isFinite(item.tempoConsideradoMinutos)) return item.tempoConsideradoMinutos;
  return Number.isFinite(item.tempoRealMinutos) ? item.tempoRealMinutos : item.tempoSistemaMinutos;
}

function minutesText(minutes) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return "—";
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  return hours ? `${hours}h ${String(mins).padStart(2,"0")}min` : `${mins} min`;
}

function formatDateBr(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function timeToMinutes(value) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return (hours * 60) + minutes;
}

function doctorMatches(schedule, doctorName) {
  const target = normalizeText(doctorName);
  return [schedule.medico, ...(schedule.aliases || [])]
    .some(name => normalizeText(name) === target);
}

function uniqueSorted(field, source = allData) {
  return [...new Set(source.map(item => item[field]).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function populateDoctorFilter() {
  const selectedDoctor = doctorFilter.value;
  const source = specialtyFilter.value
    ? allData.filter(item => item.especialidade === specialtyFilter.value)
    : allData;

  const doctors = uniqueSorted("medico", source);
  doctorFilter.innerHTML = '<option value="">Todos os médicos</option>' +
    doctors.map(value => `<option value="${value}">${value}</option>`).join("");

  doctorFilter.value = doctors.includes(selectedDoctor) ? selectedDoctor : "";
}

function populateFilters() {
  const selectedSpecialty = specialtyFilter.value;
  const specialties = uniqueSorted("especialidade");

  specialtyFilter.innerHTML = '<option value="">Todas as especialidades</option>' +
    specialties.map(value => `<option value="${value}">${value}</option>`).join("");
  specialtyFilter.value = specialties.includes(selectedSpecialty) ? selectedSpecialty : "";

  populateDoctorFilter();

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
    (!specialtyFilter.value || item.especialidade === specialtyFilter.value) &&
    (!doctorFilter.value || item.medico === doctorFilter.value)
  );
}

function findSchedule(date, doctor, specialties) {
  const extras = AGENDAS_EXTRAS.filter(schedule =>
    schedule.data === date && doctorMatches(schedule, doctor) &&
    (!schedule.especialidade || specialties.some(spec => normalizeText(spec) === normalizeText(schedule.especialidade)))
  );
  const candidates = extras.length ? extras : HORARIOS_MEDICOS.filter(schedule => {
    const weekday = new Date(`${date}T12:00:00`).getDay();
    return schedule.diaSemana === weekday &&
      doctorMatches(schedule, doctor) &&
      (!schedule.especialidade || specialties.some(spec => normalizeText(spec) === normalizeText(schedule.especialidade)));
  });

  if (!candidates.length) return null;

  const starts = candidates.map(item => timeToMinutes(item.inicio)).filter(Number.isFinite);
  const ends = candidates.map(item => timeToMinutes(item.fim)).filter(Number.isFinite);
  const lunchCandidate = candidates.find(item => item.almocoInicio && item.almocoFim);

  return {
    inicio: Math.min(...starts),
    fim: Math.max(...ends),
    inicioTexto: candidates.sort((a,b) => timeToMinutes(a.inicio) - timeToMinutes(b.inicio))[0].inicio,
    fimTexto: candidates.sort((a,b) => timeToMinutes(b.fim) - timeToMinutes(a.fim))[0].fim,
    almocoInicio: lunchCandidate?.almocoInicio || null,
    almocoFim: lunchCandidate?.almocoFim || null
  };
}

function entryStatus(firstStart, scheduledStart) {
  const first = timeToMinutes(firstStart);
  if (!Number.isFinite(first) || !Number.isFinite(scheduledStart)) return "Sem dados";

  const difference = first - scheduledStart;
  if (difference < 0) return `${minutesText(Math.abs(difference))} antes`;
  if (difference <= 15) return difference === 0 ? "No horário" : `Dentro da tolerância (+${difference} min)`;
  return `Atraso de ${minutesText(difference)}`;
}

function endStatus(lastEnd, scheduledEnd) {
  const last = timeToMinutes(lastEnd);
  if (!Number.isFinite(last) || !Number.isFinite(scheduledEnd)) return "Sem término registrado";

  const difference = last - scheduledEnd;
  if (difference === 0) return "No horário previsto";
  return difference > 0
    ? `${minutesText(difference)} após o fim previsto`
    : `${minutesText(Math.abs(difference))} antes do fim previsto`;
}

function renderScheduleAnalysis(data) {
  const groups = new Map();

  data.forEach(item => {
    const key = `${item.data}|||${item.medico}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  const rows = [...groups.values()]
    .sort((a, b) => `${a[0].data}${a[0].medico}`.localeCompare(`${b[0].data}${b[0].medico}`, "pt-BR"))
    .map(items => {
      const { data, medico } = items[0];
      const starts = items.map(item => item.inicio).filter(Boolean).sort();
      const ends = items.map(item => item.termino).filter(Boolean).sort();
      const specialties = [...new Set(items.map(item => item.especialidade).filter(Boolean))];
      const schedule = findSchedule(data, medico, specialties);
      const waitsAvailable = items.some(item => Number.isFinite(item.esperaMinutos));
      const waitsOver90 = items.filter(item => Number.isFinite(item.esperaMinutos) && item.esperaMinutos > 90).length;
      const hasMissingEnd = items.some(item => !item.termino);
      const endAnalysis = hasMissingEnd
        ? "Relatório com término incompleto"
        : (schedule ? endStatus(ends.at(-1), schedule.fim) : "—");

      return `
        <tr>
          <td>${formatDateBr(data)}</td>
          <td>${medico}</td>
          <td>${items.length}</td>
          <td>${schedule
            ? `${schedule.inicioTexto} às ${schedule.fimTexto}${schedule.almocoInicio ? `<br><small>Almoço: ${schedule.almocoInicio} às ${schedule.almocoFim}</small>` : ""}`
            : "Horário não cadastrado"}</td>
          <td>${starts[0] || "—"}</td>
          <td>${schedule ? entryStatus(starts[0], schedule.inicio) : "—"}</td>
          <td>${ends.at(-1) || "—"}</td>
          <td>${endAnalysis}</td>
          <td>${waitsAvailable ? waitsOver90 : "Sem dados de espera"}</td>
        </tr>
      `;
    });

  scheduleAnalysisBody.innerHTML = rows.length
    ? rows.join("")
    : '<tr><td colspan="9">Nenhum atendimento encontrado para o período selecionado.</td></tr>';
}

function render() {
  const data = filteredData();
  const durations = data.map(attendanceMinutes).filter(Number.isFinite);
  const average = durations.length ? Math.round(durations.reduce((a,b) => a+b, 0) / durations.length) : null;
  const waits = data.map(item => item.esperaMinutos).filter(Number.isFinite);
  const averageWait = waits.length ? Math.round(waits.reduce((a,b) => a+b, 0) / waits.length) : null;
  const starts = data.map(item => item.inicio).filter(Boolean).sort();
  const ends = data.map(item => item.termino).filter(Boolean).sort();
  const overlaps = data.filter(hasOverlap).length;

  document.getElementById("patientCount").textContent = data.length;
  document.getElementById("averageTime").textContent = minutesText(average);
  document.getElementById("averageWait").textContent = minutesText(averageWait);
  document.getElementById("firstTime").textContent = starts[0] || "—";
  document.getElementById("lastTime").textContent = ends.at(-1) || "—";
  document.getElementById("overlapCount").textContent = overlaps;

  const doctorText = doctorFilter.value ? ` pelo médico ${doctorFilter.value}` : "";
  const specialtyText = specialtyFilter.value ? ` na especialidade ${specialtyFilter.value}` : "";
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
    `Foram encontrados ${data.length} pacientes atendidos${doctorText}${specialtyText}${periodText}.`;

  renderScheduleAnalysis(data);

  resultsBody.innerHTML = data.map(item => `
    <tr class="${hasOverlap(item) ? "overlap" : ""}">
      <td>${formatDateBr(item.data)}</td>
      <td>${item.medico}</td>
      <td>${item.especialidade}</td>
      <td>${item.paciente}</td>
      <td>${item.geracaoSenha || "—"}</td>
      <td>${item.inicio || "—"}</td>
      <td>${item.termino || "—"}</td>
      <td>${minutesText(attendanceMinutes(item))}</td>
      <td>${minutesText(item.esperaMinutos)}</td>
      <td><span class="badge ${hasOverlap(item) ? "yes" : "no"}">${hasOverlap(item) ? "Sim" : "Não"}</span></td>
    </tr>
  `).join("");

  statusBox.textContent = `${allData.length} registros disponíveis; ${data.length} exibidos.`;
  statusBox.className = "status";
}

async function loadDefaultData() {
  const savedData = localStorage.getItem("painelAtendimentosData");
  const savedAt = localStorage.getItem("painelAtendimentosUpdatedAt");

  if (savedData) {
    try {
      allData = normalizeData(JSON.parse(savedData));
      populateFilters();
      render();

      const updatedText = savedAt
        ? new Date(savedAt).toLocaleString("pt-BR")
        : "data não informada";

      sourceInfo.textContent =
        `Fonte: dados importados e salvos neste navegador em ${updatedText}.`;
      return;
    } catch (error) {
      localStorage.removeItem("painelAtendimentosData");
      localStorage.removeItem("painelAtendimentosUpdatedAt");
    }
  }

  const response = await fetch("dados/atendimentos.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Não foi possível carregar os dados iniciais.");

  allData = normalizeData(await response.json());
  populateFilters();
  render();
  sourceInfo.textContent = "Fonte: base pública atualizada publicada com o site.";
}

document.getElementById("applyButton").addEventListener("click", render);
document.getElementById("clearButton").addEventListener("click", () => {
  startDateFilter.value = "";
  endDateFilter.value = "";
  specialtyFilter.value = "";
  doctorFilter.value = "";
  populateDoctorFilter();
  render();
});
specialtyFilter.addEventListener("change", () => {
  populateDoctorFilter();
  render();
});
doctorFilter.addEventListener("change", render);
startDateFilter.addEventListener("change", render);
endDateFilter.addEventListener("change", render);

clearSavedButton.addEventListener("click", () => {
  const confirmed = window.confirm(
    "Deseja apagar os dados importados neste navegador? O painel recarregará a base pública atualizada."
  );
  if (!confirmed) return;

  localStorage.removeItem("painelAtendimentosData");
  localStorage.removeItem("painelAtendimentosUpdatedAt");
  window.location.reload();
});

jsonFile.addEventListener("change", async () => {
  const file = jsonFile.files[0];
  if (!file) return;
  try {
    allData = normalizeData(JSON.parse(await file.text()));
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
