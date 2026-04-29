/**
 * Curated Mexico-market vehicle brand/model dataset.
 * Source: AMDA top-seller lists, INEGI vehicle registration data, manufacturer Mexico sites.
 * Canonical spellings match manufacturer Mexico-market marketing (no trim suffixes).
 *
 * Mutation policy: additions are normal PRs. Removals need sign-off because
 * historical vehicle rows in the DB may still reference a removed string.
 */
export const VEHICLE_BRAND_MODEL: Readonly<Record<string, readonly string[]>> = Object.freeze({
  Nissan: Object.freeze([
    "Versa", "Sentra", "March", "Altima", "Kicks", "X-Trail", "NP300", "Frontier",
    "V-Drive", "Urvan", "Pathfinder",
  ]),
  Chevrolet: Object.freeze([
    "Aveo", "Onix", "Spark", "Beat", "Malibu", "Tracker", "Equinox", "Silverado", "Tornado", "Cavalier", "Trax",
    "Captiva", "Groove",
  ]),
  Volkswagen: Object.freeze([
    "Jetta", "Vento", "Pointer", "Golf", "Virtus", "Polo", "Taos", "Tiguan", "Amarok", "Teramont",
    "Saveiro", "Cross Sport",
  ]),
  Toyota: Object.freeze([
    "Corolla", "Yaris", "Camry", "Avanza", "Rush", "RAV4", "Hilux", "Tacoma", "Highlander",
    "Raize", "Sienna",
  ]),
  Kia: Object.freeze([
    "Rio", "Forte", "K3", "K4", "Seltos", "Sportage", "Sorento",
    "Soul",
  ]),
  Hyundai: Object.freeze([
    "Accent", "Elantra", "Grand i10", "HB20", "Creta", "Tucson", "Santa Fe",
    "Venue",
  ]),
  Mazda: Object.freeze([
    "Mazda2", "Mazda3", "CX-3", "CX-30", "CX-5", "CX-50", "CX-9",
    "CX-60",
  ]),
  Honda: Object.freeze([
    "Civic", "Accord", "City", "Fit", "HR-V", "CR-V", "Pilot",
    "BR-V",
  ]),
  Ford: Object.freeze([
    "Fiesta", "Focus", "Figo", "Escape", "Explorer", "Lobo", "Ranger", "Bronco Sport", "EcoSport", "Edge", "Mustang", "F-150",
    "Maverick", "Expedition",
  ]),
  Jeep: Object.freeze([
    "Wrangler", "Compass", "Renegade", "Grand Cherokee",
    "Cherokee",
  ]),
  RAM: Object.freeze([
    "700", "1200", "1500", "2500",
    "Promaster",
  ]),
  GMC: Object.freeze([
    "Sierra", "Terrain", "Yukon",
    "Acadia",
  ]),
  Subaru: Object.freeze([
    "Impreza", "Forester", "Outback", "XV",
    "WRX",
  ]),
  Renault: Object.freeze([
    "Kwid", "Logan", "Sandero", "Duster", "Oroch", "Stepway", "Koleos",
    "Captur",
  ]),
  Peugeot: Object.freeze([
    "208", "2008", "3008", "Partner",
    "301", "Expert",
  ]),
  SEAT: Object.freeze([
    "Ibiza", "León", "Arona", "Ateca", "Tarraco",
    "Toledo",
  ]),
  MG: Object.freeze([
    "MG5", "ZS", "HS", "MG3", "MG4",
    "One",
  ]),
  Tesla: Object.freeze([
    "Model 3", "Model Y", "Model S", "Model X",
  ]),
  Geely: Object.freeze([
    "Coolray", "Geometry C",
  ]),
  Chirey: Object.freeze([
    "Tiggo 2 Pro", "Tiggo 4 Pro", "Tiggo 7 Pro", "Tiggo 8 Pro",
  ]),
  JAC: Object.freeze([
    "SEI2", "SEI3", "SEI4", "SEI7", "Frison T6",
    "J7", "E10X",
  ]),
  BYD: Object.freeze([
    "Dolphin", "Yuan Plus", "Seal", "Han",
    "Tang", "Song",
  ]),
  Suzuki: Object.freeze([
    "Swift", "Baleno", "Ignis", "Ertiga", "XL7", "Jimny", "Vitara",
  ]),
  Mitsubishi: Object.freeze([
    "Mirage", "L200", "Outlander", "Montero Sport",
  ]),
  Audi: Object.freeze([
    "A3", "A4", "Q3", "Q5", "Q7",
  ]),
  BMW: Object.freeze([
    "Serie 1", "Serie 3", "X1", "X3", "X5",
  ]),
  "Mercedes-Benz": Object.freeze([
    "Clase A", "Clase C", "GLA", "GLC", "GLE",
  ]),
  Omoda: Object.freeze([
    "Omoda C5",
  ]),
  Jaecoo: Object.freeze([
    "J7",
  ]),
  GAC: Object.freeze([
    "GS3", "GS8",
  ]),
});

export type VehicleBrand = keyof typeof VEHICLE_BRAND_MODEL;
