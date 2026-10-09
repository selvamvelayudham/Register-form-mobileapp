# Tamil Nadu urban local body snapshot

`urbanLocalBodies.json` contains 650 Tamil Nadu records from the Local Government Directory snapshot dated 9 October 2026: 23 corporations, 147 municipalities and 480 town panchayats. These are the counts in this snapshot, not a claim that the directory reflects every recent government reclassification.

Primary source: Ministry of Panchayati Raj, Government of India, https://lgdirectory.gov.in . Downloaded through the public daily mirror at https://github.com/ramSeraph/opendata/releases/tag/lgd-latest-extra1 .

Source files:
- `urban_local_bodies.09Oct2026.csv.7z`
- `statewise_ulbs_coverage.09Oct2026.csv.7z`

Each JSON row is `[LGD code, local body type code, district names, English local body name]`. Type codes are 4 (Corporation), 5 (Municipality), 7 (Town Panchayat). District mappings come from the coverage file and support multiple districts where the source lists them. All records have a district mapping and unique LGD code. No list is generated from postal-office names or guessed place names.

`urbanLocalBodies.ts` matches live district names through explicit spelling aliases, then filters by district and selected administrative type. The snapshot is packaged with the app so dropdowns work even if the backend has no community-managed urban choices. LGD IDs are provenance only: they are never sent as MongoDB `villageChoiceId`. Selected towns submit the API-supported `villageManual: true` and `villageName` fields. Missing entries remain available through the manual-entry fallback.

The backend currently exposes 37 Tamil Nadu districts and omits Chennai. The app cannot select a server district that is missing from that master list; this dataset retains Chennai records for when the backend adds it. This update does not alter or deploy the backend.

To refresh: obtain matching-date source files from the mirror, filter State Code 33, map each Local Body Code to District Name from the Tamil Nadu coverage rows, and regenerate sorted JSON. Validate unique codes, nonempty district mappings, known type codes and dropdown regression tests before pushing.
