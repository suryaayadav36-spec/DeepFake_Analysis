const fs = require("fs");
const path = require("path");

const checks = [
  ["CNN train real", "CNN/dataset/train/real"],
  ["CNN train fake", "CNN/dataset/train/fake"],
  ["CNN val real", "CNN/dataset/val/real"],
  ["CNN val fake", "CNN/dataset/val/fake"],
  ["LSTM train sequences", "LSTM/dataset/train"],
  ["LSTM val sequences", "LSTM/dataset/val"]
];

function countFiles(dir) {
  if (!fs.existsSync(dir)) {
    return 0;
  }

  return fs.readdirSync(dir).filter((file) => !file.startsWith(".")).length;
}

let ok = true;
for (const [label, dir] of checks) {
  const count = countFiles(dir);
  const status = count > 0 ? "ok" : "missing";
  if (count === 0) {
    ok = false;
  }
  console.log(`${label.padEnd(22)} ${status.padEnd(8)} ${dir} (${count} files)`);
}

if (!ok) {
  console.log("\nAdd labeled data before training. See README.md for folder formats.");
  process.exitCode = 1;
}
