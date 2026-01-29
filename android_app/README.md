# Dripdirective Android App (Expo)

This folder is a ready-to-build **Android** app version of Dripdirective using **Expo / React Native**.

## Run locally (Android)

```bash
cd android_app
npm install

# If testing on a real phone, set API base URL:
cp .env.example .env
# edit .env and set EXPO_PUBLIC_API_BASE_URL=https://api.dripdirective.com

npx expo start --android
```

## Build for Play Store (AAB)

```bash
cd android_app
npm install

npm i -g eas-cli
eas login
eas build:configure

# Production Play Store build (AAB)
eas build -p android --profile production
```

Upload the resulting **.aab** in Google Play Console → **Production** release.

## Important notes

- **Package name** (cannot change after publishing): `com.dripdirective.app`
- **Production API**: `config/api.js` uses `https://api.dripdirective.com` when `NODE_ENV=production`

