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

const IMAGE_SIZE = 128;
const CHANNELS = 3;
const VALID_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const [datasetDir = "CNN/dataset", outputDir = "CNN/saved-model", epochsArg = "20", batchArg = "16"] = process.argv.slice(2);
const epochs = Number(epochsArg);
const batchSize = Number(batchArg);

function listImages(dir, label) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((file) => VALID_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .map((file) => ({ filePath: path.join(dir, file), label }));
}

function assertDataset() {
  const requiredDirs = [
    path.join(datasetDir, "train", "real"),
    path.join(datasetDir, "train", "fake"),
    path.join(datasetDir, "val", "real"),
    path.join(datasetDir, "val", "fake")
  ];
  const missing = requiredDirs.filter((dir) => !fs.existsSync(dir));

  if (missing.length > 0) {
    console.error(`CNN dataset is not ready. Missing:\n${missing.map((dir) => `- ${dir}`).join("\n")}`);
    console.error("\nAdd real/fake images, then run `npm run train:cnn`.");
    process.exit(1);
  }
}

function loadImage(filePath, augment = false) {
  return tf.tidy(() => {
    const buffer = fs.readFileSync(filePath);
    let image = tf.node.decodeImage(buffer, CHANNELS).toFloat();
    image = tf.image.resizeBilinear(image, [IMAGE_SIZE, IMAGE_SIZE]);

    if (augment && Math.random() > 0.5) {
      image = tf.image.flipLeftRight(image);
    }

    if (augment) {
      const brightness = 0.92 + Math.random() * 0.16;
      image = image.mul(brightness).clipByValue(0, 255);
    }

    return image.div(255);
  });
}

function createDataset(samples, shuffle, augment) {
  function* generator() {
    for (const sample of samples) {
      yield {
        xs: loadImage(sample.filePath, augment),
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
  model.add(tf.layers.conv2d({ inputShape: [IMAGE_SIZE, IMAGE_SIZE, CHANNELS], filters: 32, kernelSize: 3, activation: "relu", padding: "same" }));
  model.add(tf.layers.batchNormalization());
  model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
  model.add(tf.layers.dropout({ rate: 0.15 }));
  model.add(tf.layers.conv2d({ filters: 64, kernelSize: 3, activation: "relu", padding: "same" }));
  model.add(tf.layers.batchNormalization());
  model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.conv2d({ filters: 128, kernelSize: 3, activation: "relu", padding: "same" }));
  model.add(tf.layers.batchNormalization());
  model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
  model.add(tf.layers.globalAveragePooling2d());
  model.add(tf.layers.dense({ units: 96, activation: "relu", kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }) }));
  model.add(tf.layers.dropout({ rate: 0.35 }));
  model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));

  model.compile({
    optimizer: tf.train.adam(0.0005),
    loss: "binaryCrossentropy",
    metrics: ["accuracy"]
  });

  return model;
}

async function evaluateBinary(model, samples) {
  let correct = 0;
  let totalLoss = 0;

  for (const sample of samples) {
    const image = loadImage(sample.filePath, false).expandDims(0);
    const prediction = model.predict(image);
    const score = (await prediction.data())[0];
    const loss = -(sample.label * Math.log(score + 1e-7) + (1 - sample.label) * Math.log(1 - score + 1e-7));
    totalLoss += loss;
    correct += Number((score >= 0.5 ? 1 : 0) === sample.label);
    tf.dispose([image, prediction]);
  }

  return {
    accuracy: samples.length ? correct / samples.length : 0,
    loss: samples.length ? totalLoss / samples.length : 0
  };
}

async function main() {
  assertDataset();
  const trainSamples = [
    ...listImages(path.join(datasetDir, "train", "real"), 0),
    ...listImages(path.join(datasetDir, "train", "fake"), 1)
  ];
  const valSamples = [
    ...listImages(path.join(datasetDir, "val", "real"), 0),
    ...listImages(path.join(datasetDir, "val", "fake"), 1)
  ];

  if (trainSamples.length < 20 || valSamples.length < 4) {
    console.error("Not enough data for useful training. Add at least 20 train images and 4 validation images.");
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const model = buildModel();
  model.summary();

  await model.fitDataset(createDataset(trainSamples, true, true), {
    epochs,
    validationData: createDataset(valSamples, false, false),
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        const acc = logs.acc ?? logs.accuracy;
        const valAcc = logs.val_acc ?? logs.val_accuracy;
        console.log(`epoch=${epoch + 1} loss=${logs.loss.toFixed(4)} acc=${acc.toFixed(4)} valLoss=${logs.val_loss.toFixed(4)} valAcc=${valAcc.toFixed(4)}`);
      }
    }
  });

  const metrics = await evaluateBinary(model, valSamples);
  await model.save(`file://${outputDir}`);
  const report = {
    modelType: "CNN image classifier",
    trainedAt: new Date().toISOString(),
    imageSize: IMAGE_SIZE,
    epochs,
    batchSize,
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
  console.log(`Saved CNN model and report to ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
