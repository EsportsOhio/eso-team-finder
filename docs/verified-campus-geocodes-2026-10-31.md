# Team Finder: independently verified nonpublic campus geocodes

Verified 2026-10-31 for the **2026-27 Sponsored Season**, across 16 participating ESO program identities (15 distinct display names). This file records exact ESO `schools.id` / OEDS `ohio_irn` identity matches against live ESO production records, not changes to their canonical NCES or OEDS data. Official school-owned campus pages are the address authority; the current OEDS extract did not preserve physical addresses in ESO's import metadata for these schools. The Census Bureau's Public_AR_Current address-range geocoder returned HTTP 200 and a single Ohio street-address match for each entry through the existing staging geocoder. Coordinates are approximations/interpolations from address ranges, **not surveyed entrance positions**; Team Finder distances remain straight-line miles.

| School / program | Ohio IRN | ESO school UUID | Verified instructional campus | Latitude | Longitude | School-owned address source |
| --- | --- | --- | --- | ---: | ---: | --- |
| Bishop Hartley High School | `052696` | `a4461365-c47e-4ea2-97f4-57118ceb2698` | 1285 Zettler Road, Columbus, OH 43227 | 39.944962 | -82.910727 | [Source](https://www.bishop-hartley.org/) |
| Canton Central Catholic High School | `052845` | `08d465d4-d537-4f31-834e-c1809292d7d0` | 4824 Tuscarawas St W, Canton, OH 44708 | 40.794153 | -81.438451 | [Source](https://www.starkcountycatholicschools.net/cantoncentralcatholic_home.aspx) |
| Cincinnati Hills Christian Academy - High School | `122697` | `84f91951-78c6-4baa-82e9-a9b21934b591` | 11525 Snider Road, Cincinnati, OH 45249 | 39.276306 | -84.335774 | [Source](https://chca-oh.org/admissions/visit-chca/campus-visit-days/) |
| Cincinnati Hills Christian Academy - Middle School | `111898` | `60928d90-39c2-43c5-b50a-12da13d725a3` | 11300 Snider Road, Cincinnati, OH 45249 | 39.270760 | -84.336180 | [Source](https://chca-oh.org/admissions/visit-chca/campus-visit-days/) |
| Gilmour Academy - Upper School | `052993` | `e05bf0f7-0b9d-498b-9f44-3ab801560a56` | 2045 SOM Center Rd, Gates Mills, OH 44040 | 41.505180 | -81.438393 | [Source](https://www.gilmour.org/about/contact-us?deptId=27418) |
| Holy Name High School | `053348` | `1aeac822-028a-4027-8393-16149cc6827f` | 6000 Queens Hwy, Parma Heights, OH 44130 | 41.403674 | -81.761704 | [Source](https://www.holynamehs.com/) |
| La Salle High School | `053140` | `bb4a81c0-bc99-43db-bfdd-85e50e85d134` | 3091 North Bend Road, Cincinnati, OH 45239 | 39.189646 | -84.585887 | [Source](https://lasallehs.net/) |
| Lawrence School - Upper School | `009270` | `ca7e5a0a-504b-4f5d-8a6d-5e591f3b5f2e` | 10036 Olde Eight Road, Sagamore Hills, OH 44067 | 41.331577 | -81.533519 | [Source](https://lawrenceschool.org/admission/visit-lawrence) |
| Legacy Christian Academy | `067546` | `49e5942d-39da-4d93-847e-7c58a6c7e4a8` | 1101 Wesley Ave, Xenia, OH 45385 | 39.669872 | -83.923028 | [Source](https://www.legacyknights.org/about/location.cfm) |
| Potential Development High School | `132878` | `2aa7b899-27af-44f1-ac7e-e6e2173818e5` | 2405 Market Street, Youngstown, OH 44507 | 41.076131 | -80.656986 | [Source](https://potentialdevelopment.org/contact-us/) |
| St. Edward High School | `053546` | `2b50d361-b100-4cd4-b8e0-e91208d9e722` | 13500 Detroit Ave, Lakewood, OH 44107 | 41.485057 | -81.783809 | [Source](https://www.sehs.net/about-us/contact/general) |
| St. Albert the Great School - Middle School | `056713` | `8c1e8ecc-8770-4f7d-9f06-9db23a40aefa` | 6667 Wallings Rd, North Royalton, OH 44133 | 41.325769 | -81.733950 | [Source](https://school.saint-albert.org/contact-us) |
| St. John's Jesuit High School | `054015` | `304416cb-8da0-463e-b551-87f471621131` | 5901 Airport Highway, Toledo, OH 43615 | 41.614158 | -83.681639 | [Source](https://sjjtoledo.org/) |
| St. Xavier High School | `053876` | `4afae5a9-be62-4fb5-b448-1f04367eaa7b` | 600 W North Bend Road, Cincinnati, OH 45224 | 39.207425 | -84.502890 | [Source](https://www.stxavier.org/about/contact-us) |
| Ursuline High School | `053934` | `bfe570a5-93ea-42b0-a3db-4fda9acfd489` | 750 Wick Avenue, Youngstown, OH 44505 | 41.109605 | -80.642074 | [Source](https://ursuline.com/admissions/becoming-a-student/) |
| Worthington Christian High School | `071001` | `ab0b9b51-acc9-4d0d-9ed8-2a3bcf405bcc` | 1485 Lazelle Road, Westerville, OH 43081 | 40.135001 | -82.974567 | [Source](https://www.worthingtonchristian.com/contact-us/) |
## Campus-sensitive exceptions

- CHCA grades 9-12: Martha S. Lindner campus at **11525 Snider Road**; grades 7-8: Founders campus at **11300 Snider Road**. They use different canonical ESO school UUIDs and OEDS IRNs; neither point was inferred from the other.
- Gilmour Academy: **2045 SOM Center Road** is the school's stated GPS address for Middle & Upper School; **34001 Cedar Road** is its mailing address/Tudor House, deliberately not used here.
- Lawrence Upper School: **10036 Olde Eight Road, Sagamore Hills**, although ESO's existing school identity lists city Northfield. Official campus address controls location; school identity remains unchanged.
- Worthington Christian High School: **1485 Lazelle Road, Westerville**, grades 7-12, although ESO's existing school identity lists city Worthington. Lower-school buildings in Worthington are not the high school campus.
- US Census geocoding reference: https://www.census.gov/programs-surveys/geography/technical-documentation/complete-technical-documentation/census-geocoder.html

Scope of change: `assets/locations.json` static `bySchoolId` only, 16 explicit canonical ESO school UUIDs. Existing 3,611 NCES public-school point records remain byte-preserved. No public application records, credentials, student/coach information, database school identities, or public API authorization changes.
