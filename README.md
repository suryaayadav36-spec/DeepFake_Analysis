# DeepFake Analysis

Hackathon-ready deepfake detection lab built with Node.js and TensorFlow.js. The project includes a polished reviewer dashboard, a trainable CNN image classifier, an LSTM sequence classifier for video features, model-readiness reporting, and clear dataset contracts.

## What It Does

- Analyzes images through the CNN route.
- Analyzes videos through the LSTM route.
- Shows a reviewer-friendly risk score, decision, and evidence signals.
- Detects whether trained model reports exist and surfaces validation accuracy.
- Provides real TensorFlow.js training scripts for both image and temporal models.

## Quick Start

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000
```

## Project Structure

```text
CNN/
  train.js
  dataset/
  saved-model/
LSTM/
  train.js
  dataset/
  saved-model/
public/
  index.html
  style.css
  app.js
scripts/
  check-dataset.js
server.js
package.json
```

## Dataset Setup

CNN image dataset:

```text
CNN/dataset/
  train/
    real/
    fake/
  val/
    real/
    fake/
```

LSTM feature dataset:

```text
LSTM/dataset/
  train/
    sample-001.json
  val/
    sample-101.json
```

Each LSTM JSON file:

```json
{
  "id": "sample-001",
  "label": 1,
  "features": [
    [0.12, 0.41, 0.07],
    [0.14, 0.39, 0.09]
  ]
}
```

`label` is `0` for real and `1` for fake.

## Training

Check dataset folders:

```bash
npm run check:data
```

Train CNN:

```bash
npm run train:cnn
```

Train LSTM:

```bash
npm run train:lstm
```

Custom training commands:

```bash
node CNN/train.js CNN/dataset CNN/saved-model 30 16
node LSTM/train.js LSTM/dataset LSTM/saved-model 30 8 12 64
```

Training writes:

```text
saved-model/
  model.json
  weights.bin
  labels.json
  training-report.json
```

## Accuracy Plan

For stronger accuracy, use balanced real/fake data, hold out a validation set, avoid duplicate frames across train and validation, and evaluate on videos from creators or generation methods not seen during training. A practical hackathon baseline is 500+ real and 500+ fake CNN training images, then improve with more data and cleaner labels.

## Hackathon Pitch

DeepFake Analysis is not just a classifier. It is a review workflow: model status, evidence routing, reviewer-readable decisions, and auditable training artifacts. That makes it easier to demo, explain, and defend.

## Scripts

```bash
npm start
npm run check:data
npm run train:cnn
npm run train:lstm
```

## Notes

The UI can run immediately. Real model accuracy requires labeled datasets, which are not committed to the repository because media datasets are usually large and license-restricted.
