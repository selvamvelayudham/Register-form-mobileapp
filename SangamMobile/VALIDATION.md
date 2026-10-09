# Verification results

## Current render-error fix — 9 October 2026

Removed four loose whitespace strings outside Text components: two in the dropdown footer, one in reports and one in the form editor. The no-raw-text lint rule detects all four in the previous commit and rejects this pattern going forward.

Current checks: TypeScript passed; 11 Jest tests passed in three suites; ESLint passed with zero errors and 25 warnings. The Android release build (`assembleRelease`) succeeded with 104 tasks executed. Its embedded Hermes bundle and Android v2 signature were verified; the signing certificate matches the initial APK. The GitHub APK workflow was moved to the repository root and configured for the SangamMobile app directory.

Fixed APK: `Sangam-Registration-Fixed.apk` (46,387,575 bytes), package `tech.shreeswayam.sangam`, version 1.0, minimum API 24, target API 36. SHA-256: `97bd4d4186545d3d04431d80eb72d7871448d73ed50829bef39a47b0a524596b`. It uses the same test signing key as the initial APK.

No native Android code, API routes or database behaviour was changed in this fix. The original APK below predates this render fix; use the fixed APK, a successful new GitHub Actions build or rebuild from the updated source. Live authenticated admin/submission testing still requires your account. The fixed APK was built and signature-checked but has not been tested on a device.

## Initial APK checks (before the render fix)

Validated on 9 October 2026.

| Check | Result |
| --- | --- |
| TypeScript (`npm run typecheck`) | Passed |
| Jest | 8 tests passed in 2 suites |
| ESLint | Passed with 0 errors; 25 style/control-regex warnings |
| Android release build | `assembleRelease` succeeded |
| APK signature | Android v2 signature verified; test signing key |
| Android package | `tech.shreeswayam.sangam`, version 1.0, minimum API 24, target API 36 |
| Embedded JavaScript | Hermes bundle included; does not require Metro or Expo Go |
| APK installation | Installed successfully on an Android 10 emulator |
| Native launch | Process remained running; Sangam registration UI rendered; no app fatal exception in captured log |
| Live Android API flow | Not verified: software emulator/network environment had system UI and connectivity problems |
| Live backend reads | Community list, published form, district/block/panchayat/habitation/taluk/village-choice endpoints returned HTTP 200 |
| Master hierarchy | Sample blocks belong to selected district; panchayats to block; habitations to panchayat |
| Authentication boundaries | Unauthenticated `/admin/me`, `/families`, `/admin/reports` returned HTTP 401 |
| Repository push | Blocked: GitHub returned HTTP 403, “Resource not accessible by integration” |

The live backend returned 85 public communities, 37 Tamil Nadu districts, and five published sections for Krishnan Community (form version 2) at the time of testing. These counts are observations of the existing backend, not claims that its master data is complete. Mobile search and pagination read whatever the backend currently provides.

Unit and native screen tests cover required fields, contact numbers, rural/urban location requirements, member ages/work locations, engagement details, dynamic questions, review, consent gating, scoped submission and the receipt screen. The submission test uses a mocked API. No real family registrations were created for testing, and no website or database changes were made.

Authenticated admin operations, real registration submission, receipt/PDF saving and report CSV export need a test on your connected phone with your own account/data. They are implemented against the existing backend routes but have not been verified end to end with live credentials.

## Check on your phone

1. Install and open the APK. Select your community; confirm the published questions appear.
2. Select a district and check that taluks/blocks and the next location lists follow the parent selection. Check both rural and urban entry.
3. Register a family with real, intended information. Review, give consent, submit and save the PDF through Android’s file picker.
4. Sign in with your existing admin account, open that family record, check verification, then try reports and CSV export.

For form editing, save a draft first. Publishing intentionally changes the public form for both the website and mobile app.

## Build fingerprint

APK SHA-256: `8c1c8b91da854d588275ae4d63344de2e81c864abd564375546b61eb88505bcb`

Inspected website source commit: `0dfc6a9ff1e895078cf8c24bc22769c7b07d6ba3`.
