# Member accounts

This React Native CLI app requires a member account before opening family registration. It supports email/password registration and login, password reset, and native Google sign-in through Android Credential Manager. Firebase Authentication validates passwords and Google tokens. Admin login remains separate.

## Activate sign-in

No Firebase project configuration was present in the repository. Authentication requires the project owner's settings before it can work.

1. Create or select a Firebase project. Enable **Email/Password** and **Google** in Authentication → Sign-in method, including Google's support email.
2. Register Android package **tech.shreeswayam.sangam**. Add SHA-1 and SHA-256 fingerprints for the actual APK signing certificate. To inspect the existing test key: `keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android`. Add your production signing certificate too when changing keys.
3. Get the project's **Web API key** and its **Web application OAuth client ID**. Use a web client ID from the same project, not the Android client ID. Configure the Google Auth Platform consent screen and test users if the project is in testing mode.
4. Add GitHub Actions secrets `FIREBASE_API_KEY` and `GOOGLE_WEB_CLIENT_ID` to this repository. The APK workflow passes them into the build. For local builds, set the same environment variables or Gradle properties in your personal `~/.gradle/gradle.properties`.
5. Rebuild the APK. An APK built without configuration cannot authenticate. The settings are read at build time.

The API key and OAuth client ID are client configuration. Never put a Firebase service-account private key into the app. Follow Firebase's API key restrictions guidance and allow the Identity Toolkit and Token Service APIs used by Authentication REST requests.

## Saved progress

The app encrypts account tokens, form values, current section and completed receipts with Android Keystore-backed storage. Passwords are never saved. Reopening the app or signing back into the same account **on the same phone** restores progress. Different accounts have separate drafts. Consent must be checked again after recovery. Successful receipts are retained for the backend's existing 24-hour lifetime to avoid reopening submitted drafts. Uninstalling or clearing app storage removes progress. Cross-device draft synchronization is not implemented.

Member accounts do not grant admin access and use separate session storage. The existing public `/api/families` endpoint is unchanged: authentication is mandatory in this mobile app, not in the existing web application or server. Enforcing accounts server-side and linking submitted records to Firebase UIDs requires a backend deployment by its owner.

## Distribution checks

With providers and certificate configured, test new email registration, login, wrong password, reset email, Google account selection and cancellation on a physical Android device. Fill details, advance a section, close/reopen the app and verify recovery. Sign into another account to verify isolation. Submit and reopen to verify receipt recovery.

The release APK still uses the repository's existing test signing key. Retain it for updates to existing test installations; use a managed production key for public distribution.

References: [Firebase Auth REST API](https://firebase.google.com/docs/reference/rest/auth), [Google sign-in with Credential Manager](https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation).
