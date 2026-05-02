const tabs = document.querySelectorAll(".tab");
const input = document.querySelector("#media-input");
const imagePreview = document.querySelector("#image-preview");
const videoPreview = document.querySelector("#video-preview");
const emptyPreview = document.querySelector("#empty-preview");
const analyzeButton = document.querySelector("#analyze-button");
const resetButton = document.querySelector("#reset-button");
const statusDot = document.querySelector("#status-dot");
const statusText = document.querySelector("#status-text");
const scoreValue = document.querySelector("#score-value");
const meterFill = document.querySelector("#meter-fill");
const pipelineValue = document.querySelector("#pipeline-value");
const decisionValue = document.querySelector("#decision-value");
const modelValue = document.querySelector("#model-value");
const signalList = document.querySelector("#signal-list");
const routePill = document.querySelector("#route-pill");
const dropSubtitle = document.querySelector("#drop-subtitle");
const cnnStatus = document.querySelector("#cnn-status");
const lstmStatus = document.querySelector("#lstm-status");

let mode = "image";
let selectedFile = null;
let previewUrl = null;

function setMode(nextMode) {
  mode = nextMode;
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === nextMode));
  input.accept = nextMode === "image" ? "image/*" : "video/*";
  routePill.textContent = nextMode === "image" ? "CNN route" : "LSTM route";
  dropSubtitle.textContent = nextMode === "image" ? "Upload a face image, screenshot, or frame export." : "Upload a short video clip for temporal review.";
  resetMedia();
}

function updateStatus(kind, text) {
  statusDot.className = `dot ${kind}`;
  statusText.textContent = text;
}

function resetMedia() {
  selectedFile = null;
  input.value = "";
  analyzeButton.disabled = true;
  imagePreview.style.display = "none";
  videoPreview.style.display = "none";
  emptyPreview.style.display = "block";
  scoreValue.textContent = "--";
  meterFill.style.width = "0%";
  pipelineValue.textContent = "--";
  decisionValue.textContent = "--";
  modelValue.textContent = "--";
  signalList.innerHTML = "<li>No evidence analyzed yet.</li>";
  updateStatus("idle", "Waiting for media");

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
}

function setModelReadiness(status) {
  cnnStatus.textContent = status.image ? "Ready" : "Untrained";
  lstmStatus.textContent = status.video ? "Ready" : "Untrained";
}

async function loadModelStatus() {
  try {
    const response = await fetch("/api/model-status");
    const status = await response.json();
    setModelReadiness(status);
  } catch (_error) {
    cnnStatus.textContent = "Offline";
    lstmStatus.textContent = "Offline";
  }
}

function applyResult(result) {
  const kind = result.score >= 70 ? "danger" : result.score >= 45 ? "warn" : "ok";
  scoreValue.textContent = `${result.score}%`;
  meterFill.style.width = `${result.score}%`;
  pipelineValue.textContent = result.mode === "image" ? "CNN image scan" : "LSTM sequence scan";
  decisionValue.textContent = result.decision;
  modelValue.textContent = result.modelReady ? `trained ${result.modelSummary.validationAccuracy * 100}% val acc` : "training data needed";
  signalList.innerHTML = result.signals.map((signal) => `<li><strong>${signal.name}</strong><span>${signal.value}</span></li>`).join("");
  updateStatus(kind, "Analysis complete");
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});

input.addEventListener("change", () => {
  selectedFile = input.files[0] || null;
  analyzeButton.disabled = !selectedFile;
  imagePreview.style.display = "none";
  videoPreview.style.display = "none";
  emptyPreview.style.display = selectedFile ? "none" : "block";

  if (!selectedFile) {
    updateStatus("idle", "Waiting for media");
    return;
  }

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }
  previewUrl = URL.createObjectURL(selectedFile);

  if (mode === "image") {
    imagePreview.src = previewUrl;
    imagePreview.style.display = "block";
  } else {
    videoPreview.src = previewUrl;
    videoPreview.style.display = "block";
  }

  updateStatus("warn", "Ready to analyze");
});

analyzeButton.addEventListener("click", async () => {
  if (!selectedFile) {
    return;
  }

  updateStatus("warn", "Analyzing evidence");
  analyzeButton.disabled = true;

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type
      })
    });
    applyResult(await response.json());
  } catch (_error) {
    updateStatus("danger", "Analysis failed");
  } finally {
    analyzeButton.disabled = false;
  }
});

resetButton.addEventListener("click", resetMedia);
setMode("image");
loadModelStatus();
