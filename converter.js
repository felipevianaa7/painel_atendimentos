
const fileInput = document.getElementById("excelFile");
const dropZone = document.getElementById("dropZone");
const convertButton = document.getElementById("convertButton");
const useButton = document.getElementById("useButton");
const downloadButton = document.getElementById("downloadButton");
const statusBox = document.getElementById("status");
const previewCard = document.getElementById("previewCard");
const previewBody = document.getElementById("previewBody");

let convertedData = null;

["dragenter", "dragover"].forEach(eventName => {
  dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });
});
["dragleave", "drop"].forEach(eventName => {
  dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
  });
});
dropZone.addEventListener("drop", event => {
  const files = event.dataTransfer.files;
  if (files.length) fileInput.files = files;
});

function excelDateToISO(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${String(date.m).padStart(2,"0")}-${String(date.d).padStart(2,"0")}`;
  }
  const text = String(value).trim();
  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return text.slice(0, 10);
}

function timeToText(value) {
  if (value === null || value === undefined || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${String(value.getHours()).padStart(2,"0")}:${String(value.getMinutes()).padStart(2,"0")}`;
  }
  if (typeof value === "number") {
    const totalMinutes = Math.round((value % 1) * 24 * 60);
    return `${String(Math.floor(totalMinutes / 60) % 24).padStart(2,"0")}:${String(totalMinutes % 60).padStart(2,"0")}`;
  }
  const text = String(value);
  const match = text.match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : text;
}

function durationToMinutes(value) {
  if (value === null || value === undefined || value === "") return null;

  // Durações do Excel devem chegar como fração de um dia.
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 24 * 60);
  }

  // Segurança extra caso alguma biblioteca ainda entregue um Date:
  // usa o horário local, evitando o deslocamento histórico de fuso de 1899.
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return (value.getHours() * 60) + value.getMinutes();
  }

  // Aceita textos como 00:18, 01:42 ou 1:42:00.
  const text = String(value).trim();
  const match = text.match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || 0);

  return Math.round((hours * 60) + minutes + (seconds / 60));
}

function pick(row, possibleNames) {
  for (const name of possibleNames) {
    if (Object.prototype.hasOwnProperty.call(row, name)) return row[name];
  }
  return "";
}

async function convertFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { cellDates: false });

  const sheetName = workbook.SheetNames.find(name =>
    name.trim().toLowerCase() === "base consolidada"
  );
  if (!sheetName) throw new Error('A aba "Base Consolidada" não foi encontrada.');

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "", range: 1 });

  const result = rows
    .filter(row => pick(row, ["Data"]) && pick(row, ["Médico", "Medico"]))
    .map(row => ({
      data: excelDateToISO(pick(row, ["Data"])),
      medico: String(pick(row, ["Médico", "Medico"])).trim(),
      especialidade: String(pick(row, ["Especialidade"])).trim(),
      paciente: String(pick(row, ["Nome fila", "Paciente"])).trim(),
      inicio: timeToText(pick(row, ["Início", "Inicio"])),
      termino: timeToText(pick(row, ["Término", "Termino"])),
      tempoSistemaMinutos: durationToMinutes(pick(row, ["Tempo pelo sistema", "Tempo de atendimento pelo sistema"])),
      tempoRealMinutos: durationToMinutes(pick(row, ["Tempo real apurado", "Tempo de atendimento real"])),
      sobreposicao: String(pick(row, ["Sobreposição", "Sobreposicao"])).toLowerCase() === "sim",
      observacao: String(pick(row, ["Observação", "Observacao"])).trim(),
      intervaloSeguinteMinutos: durationToMinutes(pick(row, ["Intervalo seguinte", "Intervalo até o próximo atendimento"])),
      origem: String(pick(row, ["Origem"])).trim()
    }));

  if (!result.length) throw new Error("Nenhum atendimento válido foi encontrado.");
  return result;
}

function renderPreview(data) {
  previewBody.innerHTML = data.slice(0, 8).map(item => `
    <tr>
      <td>${item.data}</td>
      <td>${item.medico}</td>
      <td>${item.especialidade}</td>
      <td>${item.paciente}</td>
      <td>${item.inicio}</td>
      <td>${item.termino}</td>
    </tr>
  `).join("");
  previewCard.classList.remove("hidden");
}

convertButton.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) {
    statusBox.textContent = "Selecione um arquivo Excel.";
    statusBox.className = "status error";
    return;
  }

  try {
    statusBox.textContent = "Processando...";
    statusBox.className = "status";
    convertedData = await convertFile(file);
    renderPreview(convertedData);
    useButton.disabled = false;
    downloadButton.disabled = false;
    statusBox.textContent = `${convertedData.length} atendimentos convertidos com sucesso. Agora você pode usar esses dados no painel.`;
  } catch (error) {
    convertedData = null;
    useButton.disabled = true;
    downloadButton.disabled = true;
    previewCard.classList.add("hidden");
    statusBox.textContent = error.message;
    statusBox.className = "status error";
  }
});


useButton.addEventListener("click", () => {
  if (!convertedData) return;

  try {
    localStorage.setItem("painelAtendimentosData", JSON.stringify(convertedData));
    localStorage.setItem("painelAtendimentosUpdatedAt", new Date().toISOString());
    statusBox.textContent = `${convertedData.length} atendimentos salvos neste navegador. Abrindo o painel...`;
    statusBox.className = "status";
    setTimeout(() => {
      window.location.href = "index.html";
    }, 500);
  } catch (error) {
    statusBox.textContent = "Não foi possível salvar os dados neste navegador.";
    statusBox.className = "status error";
  }
});

downloadButton.addEventListener("click", () => {
  if (!convertedData) return;
  const blob = new Blob([JSON.stringify(convertedData, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "atendimentos.json";
  link.click();
  URL.revokeObjectURL(url);
});
