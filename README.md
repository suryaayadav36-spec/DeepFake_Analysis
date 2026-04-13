# 🧠 Deepfake Detection System (CNN + LSTM)

A powerful and flexible Deepfake Detection system built using **TensorFlow.js** and **Node.js**, designed to detect manipulated media through both **image-based** and **video-based** analysis.

---

## 🚀 Features

* 🖼️ **Image Deepfake Detection (CNN)**

  * Classifies images as **Real** or **Fake**
  * Uses Convolutional Neural Networks for high-quality feature extraction

* 🎥 **Video Deepfake Detection (LSTM)**

  * Analyzes sequences of frames for temporal inconsistencies
  * Utilizes Long Short-Term Memory (LSTM) networks

* ⚡ **JavaScript-Based Machine Learning**

  * Built entirely with TensorFlow.js
  * Seamless integration with Node.js applications

* 🔄 **Modular Architecture**

  * Separate pipelines for CNN and LSTM
  * Easy to extend and customize

---

## 📁 Project Structure

```id="a9g4bf"
Deepfake(CNN)/
│
├── Deepfake/
│   ├── CNN/
│   │   ├── train.js
│   │   ├── dataset/
│   │   └── saved-model/
│   │
│   ├── LSTM/
│   │   ├── train.js
│   │   ├── dataset/
│   │   └── saved-model/
│   │
│   ├── node_modules/
│   ├── package.json
│   └── README.md
```

---
## 🛠️ Tech Stack

* **Node.js**
* **TensorFlow.js**
* **JavaScript (ES6)**
* **FFmpeg** (for video frame processing)

---
## 📦 Installation

```bash id="2v1l1p"
git clone https://github.com/your-username/deepfake-detection.git
cd deepfake-detection
npm install
```

---
## 📊 Dataset Structure

### CNN (Image Dataset)

```id="k37p5n"
dataset/
 ├── train/
 │    ├── real/
 │    └── fake/
 └── val/
      ├── real/
      └── fake/
```

---

### LSTM (Frame Sequences)

```id="ql3jpw"
dataset/
 ├── sample-001/
 │    ├── frame-001.jpg
 │    ├── frame-002.jpg
 │    └── ...
```

---
## 🧪 Training

### ▶️ Train CNN Model

```bash id="b4m8q7"
node CNN/train.js CNN/dataset CNN/saved-model 12 16
```

---

### ▶️ Train LSTM Model

```bash id="u7z8wd"
node LSTM/train.js LSTM/dataset LSTM/saved-model 12 8 12 64
```

---

## 💡 Highlights

* 📌 Dual-model approach (CNN + LSTM) for comprehensive detection
* 📌 End-to-end pipeline for both images and videos
* 📌 Fully JavaScript-based ML system
* 📌 Scalable and easy to integrate into web applications

---

## 🤝 Contributing

Contributions are welcome! Feel free to fork the repository and submit improvements.

---

## 📜 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

Your Name
GitHub: https://github.com/your-username

---

## ⭐ Support

If you like this project, give it a ⭐ and share it!
