# Sangam Registration — React Native Android

Native React Native CLI app. **No Expo and no WebView.** Connects directly to the existing backend at `https://shreeswayam.tech/api`; it uses the same database and does not change or deploy the website/backend.

## Screens and behaviour

- Sangam registration branding, colours, section navigation and review adapted from the existing React frontend.
- Locked Krishnavaha registration (existing `krishnan-community` ID) and live published forms, including custom questions, required fields, hidden sections, dropdowns and multiple-choice benefits.
- Parent-filtered state → district → taluk/block → panchayat → village/habitation lists, rural and urban entry, wards, streets, PIN lookup and post offices. Search and pagination use the backend master directory.
- Family members (up to 100), conditional work locations, household information, support requests, contributions and consent.
- Submission through the existing `/families` endpoint and PDF receipt download through Android’s Save As picker. Receipt authentication uses the backend’s 24-hour receipt token.
- Admin login with an encrypted Android Keystore-backed one-hour session, community filter, overview, family search, help requests, contributions, record details, verification and PDF downloads.
- District/community report filters, totals, pagination and summary/family/member CSV export.
- Community administrator form editor: section and question editing, draft saving, native preview and publishing. Form editor actions respect backend permissions. Managers have read access because the existing backend does not grant them `forms:write`.

After member sign-in, form answers and the current section are saved in encrypted, account-scoped storage on the phone. See [AUTH_SETUP.md](AUTH_SETUP.md) to activate email/password and Google sign-in before building. Member registration is locked to Krishnavaha; admin form previews may still preview other communities. Admin data and credentials are not bundled in the APK. The API remains the authority for access control and validation.

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

## Current registration UI

Member registration displays **Krishnavaha**, using the existing `krishnan-community` ID/slug. Tamil Nadu is fixed and disabled. Settings for another community build are in `src/registrationConfig.ts`.

**Pidagai** is a text input immediately after residential address. It is included in review and submission under `pitagaiName`. Until the backend publishes that dedicated field, the app also preserves it as a `Pidagai:` line in the accepted address field, so it remains in stored records and PDF receipts. If the published form includes `pitagaiName`, the address fallback is omitted.

Post office and the separate Hamlet/Habitation control are removed, including review and receipt details in the app. Removed post-office values/IDs are stripped from new submissions. Rural users select block, village panchayat and **Village** once; this selection carries the existing master habitation ID internally because the current API requires it. No separate habitation selection is needed. Existing server PDFs for historical records are unchanged.

Administrative type offers Village Panchayat, Town Panchayat, Municipality and Corporation. Town/city dropdowns use a bundled LGD snapshot filtered by selected district and exact administrative type, instead of the empty shared backend list. Changing type or district clears dependent IDs and values. PIN remains a six-digit text input and optional ward is 1–999. Rural/Urban is derived automatically for the API and has no visible dropdown.

See [urban directory provenance](src/data/README.md) for source files, record counts, snapshot caveats and refresh instructions. The app has 650 mapped urban records; manually enter a location if a recent change is missing. The server still needs a published `localBody` field to store administrative type separately, a dedicated published `pitagaiName` field to save Pidagai separately, and a community rename for server PDF branding. Those server changes are outside this mobile repository update.
