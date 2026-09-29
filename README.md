# Aegis H₂S 🛡️

> **Passive H₂S Exposure-Dosimeter Wristband**

Aegis H₂S is a prototype passive exposure-dosimeter system designed to provide a low-cost, battery-free method for recording **cumulative hydrogen sulfide (H₂S) exposure over a monitoring period**.

The system combines a disposable wearable sensing band with a smartphone-based image-analysis workflow. The prototype uses a reactive silver-based sensing element, a fixed reference patch, a protective sensing window, and a smartphone camera to estimate an exposure-dose range.

The system is designed as a **passive exposure-recording aid** and is intended to **complement—not replace—certified real-time H₂S alarms, PPE, and site safety procedures**.

---

## 🎯 Problem Statement

Hydrogen sulfide (H₂S) is a hazardous gas that can be encountered in industrial environments such as:

- Oil & gas facilities
- Refineries
- Wastewater treatment plants
- Sewage and drainage systems
- Chemical processing facilities
- Storage and confined-space environments

Conventional H₂S safety systems generally focus on **real-time gas detection and alarms**.

However, there is a complementary need for a simple and low-cost mechanism that can help record **cumulative exposure over a work shift or defined monitoring period**.

Aegis H₂S explores a passive, wearable approach in which exposure produces a measurable visual change in a sensing element. A smartphone can subsequently capture and analyse that change.

---

# 💡 Proposed Solution

Aegis H₂S consists of a lightweight disposable wristband containing:

- Reactive Ag/Ag₂S sensing strip
- Fixed neutral/reference patch
- Expiry indicator
- ePTFE protective sensing window
- QR/unique band identification area
- Breakaway wristband clasp
- Woven wearable strap

During the monitoring period, the reactive sensing element responds progressively to H₂S exposure.

At the end of the monitoring period, the sensing region can be photographed using a standard smartphone camera.

The application then performs image processing and colour analysis to estimate an exposure-dose range with a confidence indication.

### Core Concept

```text
H₂S Exposure
      │
      ▼
Reactive Ag sensing element
      │
      ▼
Progressive colour change
      │
      ▼
Smartphone camera
      │
      ▼
Image quality & ROI detection
      │
      ▼
Colour normalization
      │
      ▼
ΔE2000 colour difference
      │
      ▼
Calibration mapping
      │
      ▼
Estimated exposure-dose range
      │
      ▼
Result + confidence + record

