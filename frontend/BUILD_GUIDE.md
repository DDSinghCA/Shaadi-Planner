# Shaadi Planner — Build & Distribution Guide

## Pre-requisites
- Node.js 18+ installed locally
- Expo account (free): https://expo.dev/signup
- For iOS: Apple Developer account ($99/year): https://developer.apple.com

---

## 🔧 Before You Build — Replace Placeholders

Open the following files and replace placeholders with your actual values:

### `app.json` — Replace these:
| Placeholder | Replace With |
|---|---|
| `com.yourcompany.shaadiplanner` | Your bundle ID (e.g., `com.sharmafamily.shaadiplanner`) |
| `your-expo-username` | Your Expo account username |
| `your-eas-project-id` | Auto-generated after `eas build:configure` |

### `eas.json` — Replace these:
| Placeholder | Replace With |
|---|---|
| `https://your-production-api-url.com` | Your deployed backend URL |
| `./google-services.json` | Path to Google Play service account key (for auto-submit) |
| `your-apple-id@email.com` | Your Apple ID email |
| `your-app-store-connect-app-id` | Your App Store Connect app ID |
| `YOUR_TEAM_ID` | Your Apple Developer Team ID |

---

## 🚀 Step-by-Step Build Guide

### 1. Export Code from Emergent
- Click **"Save to GitHub"** on the Emergent platform
- Clone the repo locally:
  ```bash
  git clone https://github.com/your-repo/shaadi-planner.git
  cd shaadi-planner/frontend
  ```

### 2. Install Dependencies
```bash
npm install
npm install -g eas-cli
```

### 3. Login to Expo & Configure EAS
```bash
eas login
eas build:configure
```
> This auto-generates your `projectId` and updates `app.json`

### 4. Update Backend URL
In `eas.json`, change `EXPO_PUBLIC_BACKEND_URL` under each build profile to your deployed backend URL.

---

## 🤖 Android APK (Direct Distribution)

Best for: sharing with family members via WhatsApp/email.

```bash
eas build --platform android --profile preview
```

- Build runs in the cloud (~5-10 minutes)
- When done, you get a **download link** for the `.apk` file
- Share the APK directly — no Play Store needed!

### Android AAB (Google Play Store)
```bash
eas build --platform android --profile production
eas submit --platform android
```

---

## 🍎 iOS TestFlight

### First-time setup:
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create a new app with bundle ID: `com.yourcompany.shaadiplanner`
3. Note your **App Store Connect App ID** and **Team ID**
4. Update these in `eas.json` under `submit.production.ios`

### Build & Submit:
```bash
eas build --platform ios --profile production
eas submit --platform ios
```

- Build takes ~10-15 minutes
- After submission, go to App Store Connect → TestFlight
- Add testers by email — they get a notification to install via TestFlight app

---

## 📋 Build Profiles Summary

| Profile | Platform | Output | Use Case |
|---|---|---|---|
| `development` | Android | Debug APK | Local dev testing |
| `development` | iOS | Simulator build | Xcode simulator testing |
| `preview` | Android | **APK** | **Share directly with family** |
| `preview` | iOS | Internal distribution | Ad-hoc testing (needs device UDID) |
| `production` | Android | AAB | Google Play Store upload |
| `production` | iOS | IPA | **App Store / TestFlight** |

---

## ⚡ Quick Commands Cheatsheet

```bash
# Android APK (share directly)
eas build --platform android --profile preview

# iOS TestFlight
eas build --platform ios --profile production
eas submit --platform ios

# Build both platforms
eas build --platform all --profile production

# Check build status
eas build:list

# OTA update (no rebuild needed for JS-only changes)
eas update --branch production --message "Bug fix"
```

---

## 🔐 Environment Variables for Production

Make sure your production backend is deployed and accessible. Update the `EXPO_PUBLIC_BACKEND_URL` in `eas.json` env section for each profile.

**Do NOT commit** sensitive keys to git. Use EAS Secrets for sensitive values:
```bash
eas secret:create --name EXPO_PUBLIC_BACKEND_URL --value https://api.yourdomain.com
```
