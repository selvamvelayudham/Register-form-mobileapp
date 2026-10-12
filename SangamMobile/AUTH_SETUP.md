# Google Cloud registration and login — version 1.3

The app supports **Register with email/password**, **Log in with email/password**, **Sign in with Google**, password reset, and encrypted progress recovery on the same phone. Member authentication now uses **Google Cloud Identity Platform REST APIs**, configured entirely through **Google Cloud Console**. Google account selection uses Android Credential Manager and Google Auth Platform OAuth clients. Admin login still uses the existing Sangam API.

There is no Firebase SDK, Firebase build setting, `google-services.json`, or Firebase Console setup in this app. Identity Platform and Firebase Authentication share Google's underlying Identity Toolkit and Secure Token services; this change uses the Google Cloud product and its configuration, not a separate self-hosted authentication server.

## 1. Select your Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project selector near the top-left → **New project**, or select the Cloud project you want to use.
3. Note its **Project ID** from the project dashboard. This is the text ID, such as `sangam-member-login`, not the project display name or numeric project number.
4. Enable billing for this project as required by Identity Platform's setup. You need permission to enable services and manage Identity Platform.
5. Search for **Identity Platform** in the top search bar, open it, and click **Enable Identity Platform**.

Use the same project for the API key and both OAuth clients below. If you want a separate account store from your old project, create a new Google Cloud project; old accounts are not automatically copied to it.

## 2. Enable email/password registration and login

1. Open [Identity Platform → Providers](https://console.cloud.google.com/customer-identity/providers).
2. Click **Add a provider** → choose **Email/Password**.
3. Turn **Enabled** on → click **Save**.
4. Keep user creation/sign-up enabled. Users create their own accounts using **Register** in the app; you do not have to add each user manually.
5. Configure password-reset email settings/templates in Identity Platform as needed.

The password is an app-account password. Users must not enter their Google account password into the app. Gmail addresses can be used with an app password, or users can choose native Google sign-in instead.

## 3. Set up Google OAuth clients

### Consent screen

1. Open [Google Auth Platform](https://console.cloud.google.com/auth/overview) in the same project.
2. Complete **Branding**: app name `Sangam`, support email, and developer contact email.
3. Under **Audience**, choose **External** if community members use personal Gmail accounts. While the app is in Testing, add the Google email addresses you will test under **Test users**. Publish it when ready for the wider community.
4. Use only basic sign-in scopes: `openid`, `email`, and `profile`.

### Web application client — required by native Google sign-in

1. Open **Google Auth Platform → Clients** → **Create client**.
2. Select **Web application** and name it `Sangam member sign-in`.
3. Create it and copy the **Client ID**, ending in `.apps.googleusercontent.com`.
4. Retain the **Client secret** for the Identity Platform provider configuration below. Do not put that secret into the Android app, GitHub code, or chat.

### Android client — identifies this APK

1. Create a second OAuth client with application type **Android**.
2. Enter package name exactly: **`tech.shreeswayam.sangam`**.
3. Enter this SHA-1 for the repository's current test signing key:

```text
5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

4. Create the client. Do **not** use this Android client ID as `GOOGLE_WEB_CLIENT_ID`.

The current key's SHA-256, if a setup page asks for it:

```text
FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C
```

For a different production signing key, create/update the Android OAuth client with that key's certificate fingerprint. Inspect the actual key from the `SangamMobile` folder with:

```powershell
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android
```

## 4. Enable Google as an Identity Platform provider

1. Return to **Identity Platform → Providers** → **Add a provider** → **Google**.
2. Enable it. Enter the **Web Client ID** and **Web Client secret** created in step 3. The client secret stays in Google Cloud Console only.
3. In Project settings / Authorized domains, add **`shreeswayam.tech`**. The app's ID-token exchange uses `https://shreeswayam.tech` as its request URI.
4. If the provider page asks for allowed external client IDs, add the web client ID used by this app.
5. Save the provider.

This app uses a native Google account picker and exchanges its ID token directly with Identity Platform. It does not use a web sign-in popup, browser callback, or a client-side OAuth secret.

## 5. Copy the Identity Platform API key

1. On **Identity Platform → Providers**, click **Application setup details** (sometimes shown as **Setup details**).
2. Copy the **`apiKey`** field. Only copy the key value, not the entire sample SDK configuration.
3. This key must belong to the same Google Cloud project as the providers and OAuth clients.
4. Check that the project's **Identity Toolkit API** and **Token Service API** are enabled. When applying API restrictions to the key, permit both services used by this app's HTTPS REST requests.

You do not need to install any SDK shown in Google's example snippet or download a services configuration JSON file.

## 6. Add three settings to GitHub

1. Open [Register-form-mobileapp → Actions secrets](https://github.com/selvamvelayudham/Register-form-mobileapp/settings/secrets/actions).
2. Choose **New repository secret** and add each row below separately. Names must match exactly.

| Secret name | Value |
| --- | --- |
| `GOOGLE_CLOUD_PROJECT_ID` | Text Project ID from step 1 |
| `GOOGLE_CLOUD_API_KEY` | Identity Platform `apiKey` from step 5 |
| `GOOGLE_WEB_CLIENT_ID` | **Web application** OAuth Client ID from step 3 |

The workflow no longer reads `FIREBASE_API_KEY`. If you added that old repository secret, delete it from this same GitHub settings page. Remove the old setting from your personal Gradle properties/environment too. Updating code does not revoke an API key in your old project; revoke an unused old key in its Cloud Console if you want to invalidate it, after checking that other apps do not depend on it. Do not delete a whole project just to remove an unused app setting.

Project ID, API key and client ID are mobile client configuration. OAuth client secrets and service-account private keys must never be placed in the APK.

## 7. Build and install the configured APK

1. Open [GitHub Actions](https://github.com/selvamvelayudham/Register-form-mobileapp/actions).
2. Select **Android APK** → **Run workflow** → choose `main` → **Run workflow**.
3. Wait for the green successful result, open that run, and download **Sangam-Registration-APK** under **Artifacts**.
4. Extract the downloaded ZIP. Install `app-release.apk` on your phone.
5. Register using an email and a new app password. Sign out and test both email login and Google sign-in.

Build settings are baked into the APK. After changing these settings, build and install a new APK; an old APK cannot pick them up automatically. An APK built without the three settings cannot authenticate.

### Local build on your Windows computer

From the repository's **`SangamMobile`** folder in PowerShell:

```powershell
$env:GOOGLE_CLOUD_PROJECT_ID = "YOUR_PROJECT_ID"
$env:GOOGLE_CLOUD_API_KEY = "YOUR_IDENTITY_PLATFORM_API_KEY"
$env:GOOGLE_WEB_CLIENT_ID = "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com"
npm ci
cd android
.\gradlew.bat assembleRelease
```

The file is then at `SangamMobile\android\app\build\outputs\apk\release\app-release.apk`. Alternatively, place those three properties in your personal `%USERPROFILE%\.gradle\gradle.properties`; keep your own values out of Git.

## Session and progress behavior

- The app clears the previous member session on upgrade and asks members to log in again. Admin sessions remain separate.
- New member sessions and encrypted drafts are scoped to the configured Google Cloud Project ID. They cannot be reused as another project's session/draft. A new Cloud project has a separate account store; account and draft migration from a different project is not automatic.
- Progress resumes for the same member on the same phone. Uninstalling or clearing app storage removes it. Consent must be checked again after recovery.
- A successful submission restores its existing receipt for up to 24 hours instead of reopening a submitted draft.
- The existing `/api/families` endpoint remains public on the server. The mobile app requires member login. Server-side enforcement and ownership links would require a separate backend deployment.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Account sign-in temporarily unavailable | All three GitHub settings are present and a new APK was built; Project ID is the text ID |
| Email registration/login unavailable | Identity Platform is enabled and Email/Password is enabled in the same project |
| Google picker fails | Android OAuth package and SHA-1 match the installed APK; web client ID is configured; test account is allowed |
| Google account is selected but login fails | Google provider has the matching Web Client ID/secret; `shreeswayam.tech` is authorized; API key belongs to the same project |
| Session cannot be restored | Sign in again; project/key changes or a revoked account can invalidate tokens |

Live sign-in must be tested with your Cloud configuration on a physical Android device; repository tests do not validate an owner's unconfigured project.

Official guides: [Identity Platform REST API](https://docs.cloud.google.com/identity-platform/docs/use-rest-api), [email/password setup](https://docs.cloud.google.com/identity-platform/docs/sign-in-user-email), [Google provider setup](https://docs.cloud.google.com/identity-platform/docs/web/google), [native Google account picker](https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation).

## Automated build configuration check

The APK workflow now verifies that the three settings are present and formatted correctly, checks the project/API-key/OAuth-client association and authorized domain with Google, verifies the Google provider client ID, and probes password sign-in using a random reserved-domain identifier without creating an account. It logs only status messages. Some legacy public project responses return only a numeric project number; in that case the check reports that text Project ID ownership could not be confirmed. Native Android OAuth package/certificate registration and actual member sign-in must still be tested on a device.
