# Sangam Registration — React Native Android

Native React Native CLI app. **No Expo and no WebView.** Connects directly to the existing backend at `https://shreeswayam.tech/api`; it uses the same database and does not change or deploy the website/backend.

## Screens and behaviour

- Sangam registration branding, colours, section navigation and review adapted from the existing React frontend.
- Locked Krishavaha registration (existing `krishnan-community` ID) and live published forms, including custom questions, required fields, hidden sections, dropdowns and multiple-choice benefits.
- Parent-filtered state → district → taluk/block → panchayat → village/habitation lists, rural and urban entry, wards, streets, PIN lookup and post offices. Search and pagination use the backend master directory.
- Family members (up to 100), conditional work locations, household information, support requests, contributions and consent.
- Submission through the existing `/families` endpoint and PDF receipt download through Android’s Save As picker. Receipt authentication uses the backend’s 24-hour receipt token.
- Admin login with an encrypted Android Keystore-backed one-hour session, community filter, overview, family search, help requests, contributions, record details, verification and PDF downloads.
- District/community report filters, totals, pagination and summary/family/member CSV export.
- Community administrator form editor: section and question editing, draft saving, native preview and publishing. Form editor actions respect backend permissions. Managers have read access because the existing backend does not grant them `forms:write`.

Form answers remain in memory until submission. Public registration is locked to Krishavaha; admin form previews may still preview other communities. Admin data and credentials are not bundled in the APK. The API remains the authority for access control and validation.

## Run on your Windows computer

1. Install Node.js 22 LTS, JDK 17 and Android Studio.
2. In Android Studio → SDK Manager, install Android SDK Platform 36, Build Tools 36.0.0, Android SDK Platform Tools, NDK 27.1.12297006 and CMake 3.22.1.
3. Extract this project and open its root folder in VS Code. In the terminal, run:

   ```powershell
   npm ci
   ```

4. Create `android/local.properties` with your Android SDK path. Example (replace the username):

   ```properties
   sdk.dir=C:/Users/YOUR_NAME/AppData/Local/Android/Sdk
   ```

5. Start an Android emulator, or connect a phone with USB debugging enabled.
6. Run `npm start` in one terminal, and `npm run android` in another.

The Android app supports Android 7.0 (API 24) or later. Internet access is required.

## Build an installable APK without Metro

```powershell
npm ci
cd android
.\gradlew.bat assembleRelease
```

APK output: `android/app/build/outputs/apk/release/app-release.apk`.

On Linux/macOS use `./gradlew assembleRelease`. This project’s release variant currently uses the template’s **test signing key**, making it installable for testing. For Play Store distribution, configure an owner-controlled private release keystore and keep it out of Git. Retain the same signing key for future app updates.

To install, copy the APK to your Android phone, open it and allow installation from that file/browser source if Android asks. Launch **Sangam Registration**; Metro and Expo Go are not required.

## Checks

```powershell
npm run typecheck
npm test
npm run lint
```

Validation tests cover contact numbers, rural/urban location requirements, member ages and work locations, engagement categories, dynamic required fields and scoped submission payloads. See `VALIDATION.md` for the actual build and runtime verification results.

## Repository updates

Repository: https://github.com/selvamvelayudham/Register-form-mobileapp.git

This repository stores the app in `SangamMobile`. Run npm commands from that folder, and open `SangamMobile/android` in Android Studio. The Android APK workflow is stored at the repository root, under `.github/workflows`.

After pulling a render fix, stop Metro and restart it with:

```powershell
npm start -- --reset-cache
```

Then run `npm run android` in another terminal. ESLint checks that UI text and explicit space strings stay inside React Native `<Text>` components.

## Source and configuration

Source UI and API contracts: https://github.com/Kows3002/Tamil-Registration-form/tree/main/frontend

Inspected source commit: `0dfc6a9ff1e895078cf8c24bc22769c7b07d6ba3`. Published forms are always fetched from the live backend, rather than copied from that commit.

API base URL is in `src/api.ts`. Native Android document saving and session encryption are in `android/app/src/main/java/com/sangam/SangamDevice.kt`. This deliverable targets Android; an iOS-specific file/session implementation would be needed for iOS.

The Android scaffold is based on the MIT-licensed React Native Community template 0.81.5. Its license is in `LICENSE-React-Native-Template`.

## Registration changes — 9 October 2026

Public registration displays **Krishavaha**, using the existing community ID/slug so records and authentication remain connected. Tamil Nadu is fixed and disabled. Settings for preparing a later app for another community are in `src/registrationConfig.ts`; this does not rename the server's community or PDF branding.

Administrative type offers Village Panchayat, Town Panchayat, Municipality and Corporation. Village Panchayat uses block → panchayat → village/habitation masters. The other types use district-scoped town choices and allow manual entry for an unlisted city. Switching type or district clears dependent choices. The old Rural/Urban selector is removed; the API-compatible settlement value is derived automatically.

PIN code, ward number and post office are text inputs. PIN remains six digits; an optional ward must be 1–999. Post office is optional and resolves its directory ID by an exact name match within the entered PIN. Unmatched names cannot be submitted because the existing API does not save free-text post offices unless the published form includes that field.

### Backend requirements still outstanding

The current API has no administrative-type categorization for urban location choices: Town Panchayat, Municipality and Corporation share the district's available town list. It also does not persist `localBody` from the location widget in the current published form. The mobile app sends this value, but saving it requires a backend/published-form change. Separate city lists require categorized server master data. Arbitrary free-text post-office persistence and renaming the server community/PDF branding also require server changes. No backend/database changes or deployments are part of this mobile repository update.
