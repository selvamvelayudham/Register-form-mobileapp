## Member login update

Mandatory member registration/login, email/password and native Google sign-in, account-scoped encrypted draft recovery, and cleaner aligned screens have been added. Taluk and street/area inputs are removed and the community name is corrected to **Krishnavaha**.

**Authentication requires Firebase setup before use.** See [AUTH_SETUP.md](SangamMobile/AUTH_SETUP.md) for provider configuration, signing fingerprints and the two GitHub Actions settings. Saved progress currently resumes on the same phone.

# Sangam Registration mobile app

React Native Android app without Expo. Uses the existing API at https://shreeswayam.tech/api.

The app is inside **SangamMobile**, so run commands from that folder:

```powershell
cd SangamMobile
npm ci
npm start
```

In a second terminal, from the same folder:

```powershell
npm run android
```

In Android Studio, open **SangamMobile/android**. Install Node.js 22 LTS, JDK 17 and the SDK components listed in [the app setup guide](SangamMobile/README.md).

If you already have this repository locally, first run `git pull --ff-only` from the repository folder. Then restart Metro from `SangamMobile` with `npm start -- --reset-cache`, and rerun `npm run android` in another terminal. Run `npm ci` if your dependencies have not been installed.

## Android APK builds

The [Android APK workflow](.github/workflows/android-apk.yml) runs on pushes to main and can be started manually from GitHub Actions. A successful run uploads the installable test-signed APK as **Sangam-Registration-APK**.

## Render error checks

The loose whitespace strings that caused `Text strings must be rendered within a <Text> component` have been removed from the dropdown footer, reports and form editor. Lint now rejects raw text outside React Native Text components, with a regression test covering whitespace and the app screens.

## Locked registration and administrative location UI

Member registration is locked to **Krishnavaha** and **Tamil Nadu**. PIN and ward use text inputs; Pidagai follows the address; post office and separate habitation controls are removed; administrative type controls village/town entry and resets dependent locations. See the [app guide](SangamMobile/README.md#current-registration-ui) for the API compatibility rules and outstanding backend requirements.

Urban dropdowns now use bundled LGD records filtered by district and type. See [directory provenance](SangamMobile/src/data/README.md).
