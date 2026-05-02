# LSTM Dataset

Place temporal feature JSON files in this structure:

```text
LSTM/dataset/
  train/
    sample-001.json
  val/
    sample-101.json
```

Each JSON file should look like:

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

`label` is `0` for real and `1` for fake. The trainer pads or trims to the sequence length and feature size provided in the command.
