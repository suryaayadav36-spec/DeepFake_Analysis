const fs = require("fs");
const path = require("path");

let tf;
try {
  tf = require("@tensorflow/tfjs-node");
} catch (error) {
  console.error("Missing dependency: @tensorflow/tfjs-node");
  console.error("Run `npm install` before training.");
  process.exit(1);
}

const [
  datasetDir = "LSTM/dataset",
  outputDir = "LSTM/saved-model",
  epochsArg = "20",
  batchArg = "8",
  sequenceArg = "12",
  featureArg = "64"
] = process.argv.slice(2);

const epochs = Number(epochsArg);
const batchSize = Number(batchArg);
const sequenceLength = Number(sequenceArg);
const featureSize = Number(featureArg);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeSequence(features) {
  const sequence = features.slice(0, sequenceLength).map((row) => {
    const normalized = row.slice(0, featureSize);
    while (normalized.length < featureSize) {
      normalized.push(0);
    }
    return normalized;
  });

  while (sequence.length < sequenceLength) {
    sequence.push(Array(featureSize).fill(0));
  }

  return sequence;
}

function loadSplit(split) {
  const splitDir = path.join(datasetDir, split);
  if (!fs.existsSync(splitDir)) {
    return [];
  }

  return fs
    .readdirSync(splitDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const item = readJson(path.join(splitDir, file));
      if (!Array.isArray(item.features) || typeof item.label !== "number") {
        throw new Error(`${file} must contain { "label": 0|1, "features": number[][] }`);
      }
      return {
        id: item.id || file,
        label: item.label,
        features: normalizeSequence(item.features)
      };
    });
}

function assertDataset() {
  const missing = ["train", "val"].map((split) => path.join(datasetDir, split)).filter((dir) => !fs.existsSync(dir));
  if (missing.length > 0) {
    console.error(`LSTM dataset is not ready. Missing:\n${missing.map((dir) => `- ${dir}`).join("\n")}`);
    console.error("Add sequence JSON files, then run `npm run train:lstm`.");
    process.exit(1);
  }
}

function createDataset(samples, shuffle) {
  function* generator() {
    for (const sample of samples) {
      yield {
        xs: tf.tensor2d(sample.features, [sequenceLength, featureSize]),
        ys: tf.tensor1d([sample.label])
      };
    }
  }

  let dataset = tf.data.generator(generator);
  if (shuffle) {
    dataset = dataset.shuffle(Math.max(samples.length, 1));
  }
  return dataset.batch(batchSize).prefetch(2);
}

function buildModel() {
  const model = tf.sequential();
  model.add(tf.layers.masking({ maskValue: 0, inputShape: [sequenceLength, featureSize] }));
  model.add(tf.layers.lstm({ units: 96, returnSequences: true, dropout: 0.2, recurrentDropout: 0.1 }));
  model.add(tf.layers.lstm({ units: 48, dropout: 0.2, recurrentDropout: 0.1 }));
  model.add(tf.layers.dense({ units: 48, activation: "relu", kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }) }));
  model.add(tf.layers.dropout({ rate: 0.35 }));
  model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));
  model.compile({
    optimizer: tf.train.adam(0.0007),
    loss: "binaryCrossentropy",
    metrics: ["accuracy"]
  });
  return model;
}

async function evaluate(model, samples) {
  let correct = 0;
  let totalLoss = 0;

  for (const sample of samples) {
    const input = tf.tensor3d([sample.features], [1, sequenceLength, featureSize]);
    const prediction = model.predict(input);
    const score = (await prediction.data())[0];
    totalLoss += -(sample.label * Math.log(score + 1e-7) + (1 - sample.label) * Math.log(1 - score + 1e-7));
    correct += Number((score >= 0.5 ? 1 : 0) === sample.label);
    tf.dispose([input, prediction]);
  }

  return {
    accuracy: samples.length ? correct / samples.length : 0,
    loss: samples.length ? totalLoss / samples.length : 0
  };
}

async function main() {
  assertDataset();
  const trainSamples = loadSplit("train");
  const valSamples = loadSplit("val");

  if (trainSamples.length < 10 || valSamples.length < 4) {
    console.error("Not enough sequence data for useful LSTM training. Add at least 10 train and 4 validation JSON files.");
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const model = buildModel();
  model.summary();

  await model.fitDataset(createDataset(trainSamples, true), {
    epochs,
    validationData: createDataset(valSamples, false),
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        const acc = logs.acc ?? logs.accuracy;
        const valAcc = logs.val_acc ?? logs.val_accuracy;
        console.log(`epoch=${epoch + 1} loss=${logs.loss.toFixed(4)} acc=${acc.toFixed(4)} valLoss=${logs.val_loss.toFixed(4)} valAcc=${valAcc.toFixed(4)}`);
      }
    }
  });

  const metrics = await evaluate(model, valSamples);
  await model.save(`file://${outputDir}`);
  const report = {
    modelType: "LSTM temporal classifier",
    trainedAt: new Date().toISOString(),
    epochs,
    batchSize,
    sequenceLength,
    featureSize,
    samples: {
      train: trainSamples.length,
      validation: valSamples.length
    },
    labels: {
      real: 0,
      fake: 1
    },
    validationAccuracy: Number(metrics.accuracy.toFixed(4)),
    validationLoss: Number(metrics.loss.toFixed(4))
  };
  fs.writeFileSync(path.join(outputDir, "training-report.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(outputDir, "labels.json"), JSON.stringify(report.labels, null, 2));
  console.log(`Saved LSTM model and report to ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
