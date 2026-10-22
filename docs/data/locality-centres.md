# Locality centres — data record

The points Search's map draws localities at (UI-21). Code:
`lib/location/centres.ts`. Check: `lib/location/centres.test.ts`.

## Rule

- **One point per LOCALITY.** Sub-localities and societies are drawn at their locality's point. A home is never placed more precisely than the locality its card already names.
- **Every point is a published record, never a guess.** It comes from one of two sources, both requiring attribution, credited under the map:
  - `india-post`: the post office named for the locality, in the India Post pincode directory as published on data.gov.in (Government Open Data Licence – India). Read from the copy in the `india-pincode` npm package 2.5.9.
  - `geonames`: a GeoNames record (CC BY 4.0). Read from `cities.json` 1.1.65 (cities1000) and `postalcodes-india` 1.2.0 (the GeoNames postal file).
- **A record is rejected if** it is a placeholder (one point shared by unrelated offices), is given to two decimals when a precise record exists, or lies outside the Kolkata area.
- **Each kept point was cross-checked** against an independent reference, the locality's published coordinates. It is kept only within **2 km** of it. The test holds the references and fails on drift.
- **Uncertain means unplaced, never approximated.** An unplaced locality's homes stay in the list and in the map's area index under "Not on the map".

## Verification status

| Check | Status |
|---|---|
| Source record, licence and identifier for every point | Done |
| Placeholder, precision and Kolkata-area checks | Done |
| Independent cross-check, ≤ 2 km | Done for all 25 kept points. The reference is usually Wikipedia; two exceptions are marked in the table |
| **OpenStreetMap** | **Not done: a pre-launch blocker.** OpenStreetMap, Nominatim, Overpass and the tile host were unreachable from the build environment. Each point should be checked against OSM's place node or boundary before launch, and moved to "unplaced" if it misrepresents the locality |

Limits of the cross-check:
- A post office is not the geometric centre of its area. Every point is labelled "approximate area" wherever it is shown.
- Two references are not fully independent:
  - Sonarpur: Wikipedia's main value equals the GeoNames record, so a second copy of the article (0.8 km away) was used.
  - Madhyamgram: the precise public coordinates are GeoNames', so the arc-minute Wikipedia value was used.
- References read 22 October 2026.

## Placed (25)

| Locality | Point (lat, lng) | Source / licence | Record | Independent reference | Distance |
|---|---|---|---|---|---|
| New Town | 22.5760, 88.4718 | India Post directory, data.gov.in (GODL-India) | 700156 New Town SO | Wikipedia: 22.5894, 88.4748 | 1.5 km |
| Salt Lake | 22.5911, 88.4128 | India Post directory, data.gov.in (GODL-India) | 700091 Sech Bhawan SO | Wikipedia: 22.58, 88.42 | 1.4 km |
| Lake Town | 22.6068, 88.4010 | India Post directory, data.gov.in (GODL-India) | 700089 Lake Town SO | findlatitudeandlongitude.com: 22.603037, 88.404029 | 0.5 km |
| Dum Dum | 22.6322, 88.4161 | India Post directory, data.gov.in (GODL-India) | 700028 Dumdum SO | Wikipedia: 22.6352, 88.4143 | 0.4 km |
| Madhyamgram | 22.6938, 88.4610 | India Post directory, data.gov.in (GODL-India) | 700129 Madhyamgram SO | Wikipedia: 22.7, 88.45 | 1.3 km |
| Barasat | 22.7149, 88.4827 | India Post directory, data.gov.in (GODL-India) | 700124 Barasat HO | WorldAtlas: 22.72, 88.48 | 0.6 km |
| Ballygunge | 22.5314, 88.3653 | India Post directory, data.gov.in (GODL-India) | 700019 Ballygunge SO | Wikipedia: 22.529, 88.362 | 0.4 km |
| Tollygunge | 22.5067, 88.3452 | India Post directory, data.gov.in (GODL-India) | 700033 Tollygunge HO | Wikipedia: 22.498, 88.346 | 1.0 km |
| Jadavpur | 22.4978, 88.3703 | India Post directory, data.gov.in (GODL-India) | 700032 Jadavpur University SO | Wikipedia: 22.5025, 88.3676 | 0.6 km |
| Garia | 22.4632, 88.3979 | GeoNames (CC BY 4.0) | Garia (South 24 Parganas), postal 700084 | Wikipedia: 22.4629, 88.3968 | 0.1 km |
| Behala | 22.4941, 88.3166 | India Post directory, data.gov.in (GODL-India) | 700034 Behala SO | Wikipedia: 22.4981, 88.3108 | 0.7 km |
| Alipore | 22.5257, 88.3377 | India Post directory, data.gov.in (GODL-India) | 700027 Alipore HO | Wikipedia: 22.5392, 88.3273 | 1.8 km |
| Santoshpur | 22.4916, 88.3836 | India Post directory, data.gov.in (GODL-India) | 700075 Santoshpur SO | Wikipedia: 22.491, 88.383 | 0.1 km |
| Narendrapur | 22.4449, 88.3935 | India Post directory, data.gov.in (GODL-India) | 700103 Narendrapur SO | Wikipedia: 22.4391, 88.3968 | 0.7 km |
| Sonarpur | 22.4382, 88.4321 | GeoNames (CC BY 4.0) | Rajpur Sonarpur (cities1000) | Wikipedia: 22.4409, 88.4246 | 0.8 km |
| Joka | 22.4531, 88.3025 | India Post directory, data.gov.in (GODL-India) | 700104 Joka SO | Wikipedia: 22.453, 88.301 | 0.2 km |
| Thakurpukur | 22.4647, 88.3073 | India Post directory, data.gov.in (GODL-India) | 700063 Thakurpukur SO | Wikipedia: 22.465, 88.307 | 0.0 km |
| Park Street | 22.5520, 88.3539 | India Post directory, data.gov.in (GODL-India) | 700016 Park Street HO | the street's metro station: 22.55445, 88.34985 | 0.5 km |
| Maniktala | 22.5842, 88.3773 | India Post directory, data.gov.in (GODL-India) | 700006 Manicktala SO | Wikipedia: 22.585, 88.375 | 0.2 km |
| Shyambazar | 22.5977, 88.3718 | India Post directory, data.gov.in (GODL-India) | 700004 Shyambazar Mail SO | Wikipedia: 22.601, 88.374 | 0.4 km |
| Ultadanga | 22.5940, 88.3844 | India Post directory, data.gov.in (GODL-India) | 700067 Ultadanga Main Road SO | Wikipedia: 22.59225, 88.389528 | 0.6 km |
| Howrah | 22.5769, 88.3186 | GeoNames (CC BY 4.0) | Howrah (cities1000) | Wikipedia: 22.58, 88.32944 | 1.2 km |
| Uttarpara Kotrung | 22.6608, 88.3471 | GeoNames (CC BY 4.0) | Uttarpara, postal 712258 | Wikipedia: 22.67, 88.35 | 1.1 km |
| Barrackpore | 22.7660, 88.3634 | GeoNames (CC BY 4.0) | Barrackpore (cities1000) | Wikipedia: 22.76, 88.37 | 1.0 km |
| Serampore | 22.7573, 88.3424 | India Post directory, data.gov.in (GODL-India) | 712201 Serampore HO | Wikipedia: 22.75, 88.3333 | 1.2 km |

**Changed in UI-21 Stage B, by the cross-check:**
- **Garia:** the post office point was 2.05 km from the reference. The GeoNames record is 0.1 km from it.
- **Uttarpara Kotrung:** 1.65 km before; the GeoNames record is 1.1 km from the reference.

## Not on the map (7)

| Locality | Why |
|---|---|
| Rajarhat | The sources disagree by up to 4.6 km. The post office (22.6314, 88.4846) is 4.6 km from the reference (22.6236, 88.4410), and GeoNames (22.5922, 88.4311) is 3.6 km from it. Moved out in Stage B |
| E M Bypass | A road running across the east of the city, not an area. No single point stands for it; it would need a corridor or geometry model |
| Baguiati | The directory places its office more than 30 km away, in South 24 Parganas |
| Kestopur | No office or GeoNames record is named for it |
| Bhowanipore | Its office shares a placeholder point with unrelated offices |
| Kasba | Its office shares a placeholder point; GeoNames gives only an estimate |
| Beliaghata | No office in the locality is listed ("Beliaghata Bridge" is in North 24 Parganas) |

## Maintenance

- **Adding or moving a point:** cite its record, add its independent reference to the test, and keep it within 2 km. Otherwise list the locality in `UNPLACED` with the reason.
- **Park Street** is kept: its post office sits 0.5 km from the street's metro station, and "Park Street" names a compact central neighbourhood. E M Bypass names a corridor, so it is not placed.
