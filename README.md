# Aegis H₂S

> **Passive H₂S Exposure-Dosimeter Wristband**  
> **Team KaizenNoir | Smart India Hackathon 2026**

Aegis H₂S is a prototype, battery-free wearable exposure-dosimeter designed to provide **shift-level cumulative Hydrogen Sulfide (H₂S) exposure estimation** using a passive colorimetric sensing element and a smartphone-based analysis workflow.

The system is designed as a low-cost, disposable supplementary exposure-monitoring solution that complements certified H₂S alarms, PPE, and existing site safety procedures.

---

## 🎯 Problem

Hydrogen Sulfide (H₂S) is a hazardous gas encountered in industrial environments. Conventional gas detection systems primarily focus on real-time concentration and alarm events, while there is a need for a simple way to record **cumulative exposure over a monitoring period**.

---

## 💡 Proposed Solution

Aegis H₂S combines:

- Passive **Ag/Ag₂S reactive sensing strip**
- Fixed neutral reference patch
- ePTFE protective sensing window
- Expiry indicator
- Breakaway wristband clasp
- Smartphone camera-based colour analysis
- ΔE2000 colour-difference calculation
- Dose-range and confidence estimation
- Offline-first local record storage
- Exportable exposure records

---

## ⚙️ How It Works

```text
H₂S Exposure
     ↓
Reactive Sensing Strip
     ↓
Colour Change
     ↓
Smartphone Image Capture
     ↓
ROI & Image Quality Analysis
     ↓
Colour Extraction
     ↓
ΔE2000 Calculation
     ↓
Calibration Model
     ↓
Estimated Dose Range + Confidence
     ↓
Local Record & History
```
🚀 Key Features

* Battery-free passive wristband
* H₂S-specific colorimetric sensing concept
* Smartphone-based analysis without proprietary reader hardware
* Cumulative exposure estimation
* Dose range with confidence instead of unsupported exact values
* Offline-first workflow
* Local history and CSV/JSON export
* Prototype calibration and demo presets
* Privacy-conscious Band ID workflow

⸻

🖥️ Web Application

The accompanying web application provides:

* Dashboard
* Wristband management
* Image scanning
* Exposure result visualization
* Calibration workflow
* Science & methodology
* System architecture
* Exposure history
* Data export
* Settings and safety information

⸻

🧪 Current Status

Implemented

* Complete web-app workflow
* Image processing and colour analysis
* ROI-based sensing analysis
* ΔE2000 calculation
* Prototype/demo calibration model
* Dose range and confidence output
* Local storage
* History and data export
* Demo presets and validation pipeline

Planned / Requires Validation

* Controlled H₂S laboratory calibration
* Multi-condition temperature/RH calibration
* Cross-gas interference testing
* Sensing-film thickness optimization
* Shelf-life and environmental durability testing
* Physical clasp-force validation
* Field validation

Important: Temperature/RH compensation is planned for future multi-condition calibration and is not currently applied by the application.

⸻

🛠️ Technology Stack

* Frontend: React + TypeScript
* Styling: CSS
* Image Processing: Browser-based image analysis
* Storage: IndexedDB / Local Storage
* Data Export: CSV / JSON
* Deployment: Progressive Web App (PWA)

⸻

## ▶️ Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/deepp1102/aegis-h2s-dosimeter.git
cd aegis-h2s-dosimeter

**Install dependencies:**
npm install

**Start development server:**
npm run dev

**Build for production:**
npm run build

🔬 Validation & Testing

The current prototype has been tested through:
npx tsc -b
npx oxlint
npm run build
npm run test:pipeline

The demo pipeline includes 10 predefined test presets.
```
⚠️ Safety & Validation Disclaimer

Aegis H₂S is a prototype exposure-dosimeter concept. It is not a certified real-time H₂S alarm and does not replace certified gas detection systems, PPE, site procedures, or regulatory requirements.

The dose-mapping model is currently simulated/prototype calibration and requires controlled laboratory validation before real-world deployment.

⸻

🔗 Project Links

🌐 Website: 
