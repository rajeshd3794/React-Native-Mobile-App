# 🩺 MediTrack Portal

A professional Patient Record Management System built with **Expo SDK 54**. This application features real-time cloud synchronization with Supabase and a resilient local SQLite cache for offline capabilities.

---

## 🚀 Key Features
- **Cloud-First Architecture**: Powered by Supabase for global data synchronization.
- **Offline Resilience**: Local SQLite database for patient records and history.
- **Secure Authentication**: Hardened Admin and Doctor login layers.
- **Cross-Platform**: Runs on iOS, Android (via Expo Go), and Web.
- **OTA Updates**: Instant mobile updates via Expo EAS.

---

## 🛠️ Tech Stack
- **Framework**: Expo SDK 54 / React Native
- **Navigation**: Expo Router (File-based)
- **Cloud Database**: Supabase (PostgreSQL)
- **Local Database**: Expo SQLite (WAL Mode)
- **Deployment**: Surge (Web) & EAS (Mobile Updates)

---

## 📦 Prerequisites
- **Node.js**: v18 or later
- **npm**: v9 or later
- **Expo Go**: Installed on your physical iPhone/Android device.

---

## 🏗️ Project Setup

1. **Clone and Navigate**
   ```bash
   cd patients-record-app
   ```

2. **Install Dependencies**
   *Important: Use the legacy-peer-deps flag to ensure compatibility.*
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Configure Supabase**
   Open `db/supabaseClient.ts` and ensure your credentials are set:
   ```typescript
   export const SUPABASE_URL = 'https://your-project-url.supabase.co';
   export const SUPABASE_ANON_KEY = 'your-anon-key';
   ```

---

## 🏃 Execution Steps

### 📱 Mobile (Expo Go)
To launch the app on your physical device through a secure tunnel:
```bash
npx expo start --tunnel --clear
```
- Open **Expo Go** on your phone.
- Scan the **QR Code** generated in your terminal.

### 🌐 Web Browser
To run the web version locally:
```bash
npx expo start --web
```

---

## 🚢 Deployment

### 1. Web (Production)
The production bundle is hosted on Surge. To re-deploy:
```bash
node deploy.js
```
URL: [medicore-patients-app.surge.sh](https://medicore-patients-app.surge.sh)

### 2. Mobile (OTA Updates)
To push new code changes directly to installed apps without a new store submission:
```bash
npm run update:push
```

---

## 📁 Project Structure
- `app/`: Routing and UI screens (Expo Router).
- `assets/`: Images and static files.
- `db/`: Database logic (SQLite & Supabase Client).
- `dist/`: Build artifacts for web deployment.
- `eas.json`: Configuration for Expo Application Services.
