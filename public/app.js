const tabs = document.querySelectorAll(".tab");
const input = document.querySelector("#media-input");
const imagePreview = document.querySelector("#image-preview");
const videoPreview = document.querySelector("#video-preview");
const analyzeButton = document.querySelector("#analyze-button");
const statusDot = document.querySelector("#status-dot");
const statusText = document.querySelector("#status-text");
const scoreValue = document.querySelector("#score-value");
const pipelineValue = document.querySelector("#pipeline-value");
const signalValue = document.querySelector("#signal-value");
const decisionValue = document.querySelector("#decision-value");

let mode = "image";
let selectedFile = null;

function setMode(nextMode) {
  mode = nextMode;
  selectedFile = null;
  input.value = "";
  input.accept = nextMode === "image" ? "image/*" : "video/*";
  imagePreview.style.display = "none";
  videoPreview.style.display = "none";
  analyzeButton.disabled = true;
  updateStatus("idle", "Waiting for media");

  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.mode === nextMode);
  });
}

function updateStatus(kind, text) {
  statusDot.className = `dot ${kind}`;
  statusText.textContent = text;
}

function stableScore(file) {
  const seed = Array.from(file.name).reduce((total, char) => total + char.charCodeAt(0), 0);
  const sizeFactor = Math.min(38, Math.round(file.size / 120000));
  return Math.max(8, Math.min(94, 22 + (seed % 34) + sizeFactor));
}

function showResult(score) {
  const highRisk = score >= 68;
  const mediumRisk = score >= 42 && score < 68;

  scoreValue.textContent = `${score}%`;
  pipelineValue.textContent = mode === "image" ? "CNN image scan" : "LSTM frame sequence";
  signalValue.textContent = highRisk ? "Compression and texture mismatch" : mediumRisk ? "Mixed visual consistency" : "Low anomaly pattern";
  decisionValue.textContent = highRisk ? "Review recommended" : mediumRisk ? "Needs model validation" : "Likely clean";
  updateStatus(highRisk ? "danger" : mediumRisk ? "warn" : "ok", "Analysis complete");
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});

input.addEventListener("change", () => {
  selectedFile = input.files[0] || null;
  analyzeButton.disabled = !selectedFile;

  imagePreview.style.display = "none";
  videoPreview.style.display = "none";

  if (!selectedFile) {
    updateStatus("idle", "Waiting for media");
    return;
  }

  const previewUrl = URL.createObjectURL(selectedFile);

  if (mode === "image") {
    imagePreview.src = previewUrl;
    imagePreview.style.display = "block";
  } else {
    videoPreview.src = previewUrl;
    videoPreview.style.display = "block";
  }

  updateStatus("warn", "Ready to analyze");
});

analyzeButton.addEventListener("click", () => {
  if (!selectedFile) {
    return;
  }

  updateStatus("warn", "Analyzing media");
  analyzeButton.disabled = true;

  window.setTimeout(() => {
    showResult(stableScore(selectedFile));
    analyzeButton.disabled = false;
  }, 700);
});

setMode("image");
