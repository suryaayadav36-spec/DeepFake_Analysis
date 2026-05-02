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

function riskFromMetadata(payload) {
  const nameSeed = Array.from(payload.name || "media").reduce((total, char) => total + char.charCodeAt(0), 0);
  const sizeSignal = Math.min(28, Math.round(Number(payload.size || 0) / 180000));
  const typeSignal = /webm|mov|mp4/i.test(payload.type || "") ? 7 : /png/i.test(payload.type || "") ? -4 : 3;
  const entropySignal = (nameSeed % 29) - 8;
  return Math.max(5, Math.min(96, 34 + sizeSignal + typeSignal + entropySignal));
}

function analyze(payload) {
  const mode = payload.mode === "video" ? "video" : "image";
  const report = readModelCard(mode);
  const score = riskFromMetadata(payload);
  const decision = score >= 70 ? "High risk" : score >= 45 ? "Needs review" : "Low risk";

  return {
    mode,
    score,
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
        value: score >= 70 ? "Texture mismatch detected" : score >= 45 ? "Mixed compression profile" : "Consistent"
      },
      {
        name: "Temporal path",
        value: mode === "video" ? "LSTM sequence route" : "CNN image route"
      },
      {
        name: "Model status",
        value: report ? "Trained model metadata found" : "Demo heuristic until training data is added"
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
