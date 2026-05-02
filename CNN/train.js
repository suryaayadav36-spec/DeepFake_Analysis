const fs = require("fs");
const path = require("path");

const [datasetDir = "CNN/dataset", outputDir = "CNN/saved-model", epochs = "12", batchSize = "16"] = process.argv.slice(2);

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const requiredDirs = [
  path.join(datasetDir, "train", "real"),
  path.join(datasetDir, "train", "fake"),
  path.join(datasetDir, "val", "real"),
  path.join(datasetDir, "val", "fake")
];

const missing = requiredDirs.filter((dir) => !fs.existsSync(dir));

if (missing.length > 0) {
  fail(`CNN dataset is not ready. Missing:\n${missing.map((dir) => `- ${dir}`).join("\n")}\n\nExpected: node CNN/train.js CNN/dataset CNN/saved-model ${epochs} ${batchSize}`);
  return;
}

fs.mkdirSync(outputDir, { recursive: true });
console.log("CNN training scaffold is ready.");
console.log(`Dataset: ${datasetDir}`);
console.log(`Output: ${outputDir}`);
console.log(`Epochs: ${epochs}`);
console.log(`Batch size: ${batchSize}`);
console.log("Install @tensorflow/tfjs-node and connect a real model before production training.");
