const fs = require("fs");

const [
  datasetDir = "LSTM/dataset",
  outputDir = "LSTM/saved-model",
  epochs = "12",
  batchSize = "8",
  sequenceLength = "12",
  featureSize = "64"
] = process.argv.slice(2);

if (!fs.existsSync(datasetDir)) {
  console.error(`LSTM dataset is not ready. Missing: ${datasetDir}`);
  console.error(`Expected: node LSTM/train.js LSTM/dataset LSTM/saved-model ${epochs} ${batchSize} ${sequenceLength} ${featureSize}`);
  process.exitCode = 1;
  return;
}

fs.mkdirSync(outputDir, { recursive: true });
console.log("LSTM training scaffold is ready.");
console.log(`Dataset: ${datasetDir}`);
console.log(`Output: ${outputDir}`);
console.log(`Epochs: ${epochs}`);
console.log(`Batch size: ${batchSize}`);
console.log(`Sequence length: ${sequenceLength}`);
console.log(`Feature size: ${featureSize}`);
console.log("Install @tensorflow/tfjs-node and connect frame features before production training.");
