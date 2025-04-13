# AMUHACKS-4.0_Peaky-Blinders




# 🌐 Community-Driven Women’s Safety App

A full-stack application designed to empower women through a real-time community-based safety system. It provides smart SOS alerts, safe route recommendations, and anonymous incident reporting — all while maintaining user privacy and leveraging machine learning for intelligent decision-making.

---

## 🚀 Key Features

### ✅ Real-Time SOS Alerts
- Sends SOS alerts to nearby users (not just contacts) for quicker help.
- Integrates mobile shake detection (accelerometer) to validate genuine alerts.
- Filters false alerts using past activity history and Python-based ML models (`false_sos_detection.py`).

### 🛣 Safe Route Recommendation
- Clusters risk-prone areas using data like TASMAC store locations and poor network zones.
- `safe_route.py` uses geospatial logic to suggest the safest paths at night.

### 🕵️ Anonymous Incident Reporting
- Allows women to share sensitive experiences anonymously.
- NLP analysis (`story_analysis.py`) extracts severity, intent, and location from shared stories for better reporting and action.

### 📡 WebSocket Support
- Real-time communication using `socket.io` in `/socket` for broadcasting alerts and story events.

---

## 📁 Project Structure

### Backend (`/backend`)
Built with **Node.js** + **Express**, integrates Python scripts and ML models.

- `controllers/` – Handles business logic (e.g., SOS, Users, Anonymous Alerts).
- `models/` – MongoDB models using Mongoose.
- `routes/` – API routes mapped to controllers.
- `functions/` – Cloud functions (if deployed on Firebase/AWS).
- `socket/` – WebSocket communication handlers.
- `safe_route.py` – Clustering-based safe route generator.
- `false_sos_detection.py` – Predicts validity of an SOS.
- `story_analysis.py` – NLP for story intent analysis.
- `tasmac_locations.csv` – Raw data for risky zones.
- `risk_model.pkl` – Trained model for real-time safe route prediction based on network strength and tasmac locations.

### Frontend (`/frontend`)
A React Native app structured with reusable components and navigation screens.

- `screens/` – Auth flow, maps, alerts, stories, tutorials.
- `components/` – Reusable UI like chatbot.
- `context/` – Global state management.
- `map.html` – For embedded maps in hybrid apps.

---

## 🛠 Installation & Setup

### Backend Setup
```bash
cd backend
npm install
node app.js
```

Make sure MongoDB is running and update connection strings as needed in `app.js`.

### Frontend Setup
```bash
cd frontend
npm install
npx react-native run-android
```

Use Android Studio or an emulator to preview the mobile app. You may need to set up environment variables for API endpoints.

---

## 📊 Machine Learning Models

- **false_sos_detection.py** – Filters accidental or fake SOS.
- **story_analysis.py** – Processes incident stories to generate structured reports.
- **risk_model.pkl** – Trained model for real-time safe route prediction based on network strength and tasmac locations (GMM and DBSCAN).

---

## 📖 Future Enhancements

- Voice-based interaction for SOS.
- Government authority dashboard for reported stories.
- Integration with telecom providers for enhanced offline detection.

---

## 📜 License

MIT License – free to use, modify, and distribute with attribution.

---

## 👨‍💻 Contributors

- [Ganesh S]

For suggestions, issues, or contributions — please raise a pull request or issue on GitHub.

