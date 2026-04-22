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
  ]),
  Chevrolet: Object.freeze([
    "Aveo", "Onix", "Spark", "Beat", "Malibu", "Tracker", "Equinox", "Silverado", "Tornado", "Cavalier", "Trax",
  ]),
  Volkswagen: Object.freeze([
    "Jetta", "Vento", "Pointer", "Golf", "Virtus", "Polo", "Taos", "Tiguan", "Amarok", "Teramont",
  ]),
  Toyota: Object.freeze([
    "Corolla", "Yaris", "Camry", "Avanza", "Rush", "RAV4", "Hilux", "Tacoma", "Highlander",
  ]),
  Kia: Object.freeze([
    "Rio", "Forte", "K3", "K4", "Seltos", "Sportage", "Sorento",
  ]),
  Hyundai: Object.freeze([
    "Accent", "Elantra", "Grand i10", "HB20", "Creta", "Tucson", "Santa Fe",
  ]),
  Mazda: Object.freeze([
    "Mazda2", "Mazda3", "CX-3", "CX-30", "CX-5", "CX-50", "CX-9",
  ]),
  Honda: Object.freeze([
    "Civic", "Accord", "City", "Fit", "HR-V", "CR-V", "Pilot",
  ]),
  Ford: Object.freeze([
    "Fiesta", "Focus", "Figo", "Escape", "Explorer", "Lobo", "Ranger", "Bronco Sport", "EcoSport", "Edge", "Mustang", "F-150",
  ]),
  Jeep: Object.freeze([
    "Wrangler", "Compass", "Renegade", "Grand Cherokee",
  ]),
  RAM: Object.freeze([
    "700", "1200", "1500", "2500",
  ]),
  GMC: Object.freeze([
    "Sierra", "Terrain", "Yukon",
  ]),
  Subaru: Object.freeze([
    "Impreza", "Forester", "Outback", "XV",
  ]),
  Renault: Object.freeze([
    "Kwid", "Logan", "Sandero", "Duster", "Oroch", "Stepway", "Koleos",
  ]),
  Peugeot: Object.freeze([
    "208", "2008", "3008", "Partner",
  ]),
  SEAT: Object.freeze([
    "Ibiza", "León", "Arona", "Ateca", "Tarraco",
  ]),
  MG: Object.freeze([
    "MG5", "ZS", "HS", "MG3", "MG4",
  ]),
  Chirey: Object.freeze([
    "Tiggo 2", "Tiggo 4", "Tiggo 7", "Tiggo 8",
  ]),
  JAC: Object.freeze([
    "SEI2", "SEI3", "SEI4", "SEI7", "Frison T6",
  ]),
  BYD: Object.freeze([
    "Dolphin", "Yuan Plus", "Seal", "Han",
  ]),
});

export type VehicleBrand = keyof typeof VEHICLE_BRAND_MODEL;
