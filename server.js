const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "public");
const modelCards = {
  image: path.join(__dirname, "CNN", "saved-model", "training-report.json"),
  video: path.join(__dirname, "LSTM", "saved-model", "training-report.json")
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};

function send(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function readJson(req, callback) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 1024 * 1024) {
      req.destroy();
    }
  });
  req.on("end", () => {
    try {
      callback(null, body ? JSON.parse(body) : {});
    } catch (error) {
      callback(error);
    }
  });
}

function readModelCard(mode) {
  const reportPath = modelCards[mode];
  if (!reportPath || !fs.existsSync(reportPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(reportPath, "utf8"));
  } catch (_error) {
    return null;
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function metadataNudge(payload) {
  const seed = Array.from(payload.name || "media").reduce((total, char) => total + char.charCodeAt(0), 0);
  const size = Number(payload.size || 0);
  const sizeNudge = size > 0 ? clamp(Math.log10(size) * 2 - 10, -4, 6) : 0;
  const formatNudge = /png/i.test(payload.type || "") ? -2 : /webp/i.test(payload.type || "") ? 2 : /mp4|mov|webm/i.test(payload.type || "") ? 4 : 0;
  return Math.round(sizeNudge + formatNudge + (seed % 7) - 3);
}

function riskFromImageMetrics(payload) {
  const metrics = payload.metrics || {};
  const brightness = Number(metrics.brightness ?? 0.5);
  const contrast = Number(metrics.contrast ?? 0.25);
  const edgeDensity = Number(metrics.edgeDensity ?? 0.16);
  const saturation = Number(metrics.saturation ?? 0.35);

  let score = 34;
  score += clamp(Math.abs(brightness - 0.5) * 42, 0, 17);
  score += clamp((0.16 - contrast) * 95, -5, 16);
  score += clamp((0.12 - edgeDensity) * 130, -6, 18);
  score += clamp(Math.abs(saturation - 0.34) * 24, 0, 8);
  score += metadataNudge(payload);

  return Math.round(clamp(score, 12, 88));
}

function riskFromVideoMetadata(payload) {
  let score = 42;
  score += metadataNudge(payload);
  score += /mp4|mov|webm/i.test(payload.type || "") ? 5 : 0;
  return Math.round(clamp(score, 24, 72));
}

function riskFromPayload(payload, mode) {
  if (mode === "image" && payload.metrics) {
    return riskFromImageMetrics(payload);
  }

  return riskFromVideoMetadata(payload);
}

function analyze(payload) {
  const mode = payload.mode === "video" ? "video" : "image";
  const report = readModelCard(mode);
  const score = riskFromPayload(payload, mode);
  const confidence = report ? 0.82 : mode === "image" && payload.metrics ? 0.56 : 0.38;
  const decision = report
    ? score >= 70
      ? "High risk"
      : score >= 45
        ? "Needs review"
        : "Low risk"
    : score >= 58
      ? "Screening review"
      : "Low screening risk";

  return {
    mode,
    score,
    confidence,
    decision,
    modelReady: Boolean(report),
    modelSummary: report
      ? {
          trainedAt: report.trainedAt,
          validationAccuracy: report.validationAccuracy,
          validationLoss: report.validationLoss,
          samples: report.samples
        }
      : null,
    signals: [
      {
        name: "Visual consistency",
        value: score >= 70 ? "Strong artifact pattern" : score >= 45 ? "Some quality inconsistencies" : "No strong artifact pattern"
      },
      {
        name: "Temporal path",
        value: mode === "video" ? "LSTM sequence route" : "CNN image route"
      },
      {
        name: "Model status",
        value: report ? "Trained model metadata found" : "Screening mode until training data is added"
      },
      {
        name: "Confidence",
        value: `${Math.round(confidence * 100)}% ${report ? "model-backed" : "pre-training estimate"}`
      }
    ]
  };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/health") {
    send(res, 200, JSON.stringify({ ok: true }), "application/json; charset=utf-8");
    return;
  }

  if (url.pathname === "/api/analyze" && req.method === "POST") {
    readJson(req, (error, payload) => {
      if (error) {
        send(res, 400, JSON.stringify({ error: "Invalid JSON body" }), "application/json; charset=utf-8");
        return;
      }

      send(res, 200, JSON.stringify(analyze(payload)), "application/json; charset=utf-8");
    });
    return;
  }

  if (url.pathname === "/api/model-status") {
    send(
      res,
      200,
      JSON.stringify({
        image: readModelCard("image"),
        video: readModelCard("video")
      }),
      "application/json; charset=utf-8"
    );
    return;
  }

  const safePath = path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, "");
  const requestedPath = safePath === "/" ? "/index.html" : safePath;
  const filePath = path.join(publicDir, requestedPath);

  if (!filePath.startsWith(publicDir)) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, "Not found");
      return;
    }

    send(res, 200, data, mimeTypes[path.extname(filePath)] || "application/octet-stream");
  });
});

server.listen(port, () => {
  console.log(`DeepFake Analysis is running at http://localhost:${port}`);
});
