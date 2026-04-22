export const COLOR_CATEGORIES = [
  "neutrals",
  "blues",
  "reds",
  "greens",
  "yellowsOranges",
  "earth",
  "premium",
] as const;

export type ColorCategory = (typeof COLOR_CATEGORIES)[number];

export type ColorEffect = "chameleon" | "chrome";

export interface ColorEntry {
  key: string;
  hex: string;
  category: ColorCategory;
  effect?: ColorEffect;
}

export const COLOR_CATALOG: readonly ColorEntry[] = [
  // Neutrals (20)
  { key: "white", hex: "#FFFFFF", category: "neutrals" },
  { key: "pearl_white", hex: "#F8F6F0", category: "neutrals" },
  { key: "ivory_white", hex: "#FFFFF0", category: "neutrals" },
  { key: "black", hex: "#000000", category: "neutrals" },
  { key: "gloss_black", hex: "#0A0A0A", category: "neutrals" },
  { key: "matte_black", hex: "#1C1C1C", category: "neutrals" },
  { key: "obsidian_black", hex: "#0B0B0D", category: "neutrals" },
  { key: "silver_gray", hex: "#C0C0C0", category: "neutrals" },
  { key: "dark_gray", hex: "#4A4A4A", category: "neutrals" },
  { key: "graphite_gray", hex: "#383A3D", category: "neutrals" },
  { key: "steel_gray", hex: "#7A8084", category: "neutrals" },
  { key: "cement_gray", hex: "#8D8D8D", category: "neutrals" },
  { key: "matte_gray", hex: "#6E6E6E", category: "neutrals" },
  { key: "metallic_silver", hex: "#B8B8B8", category: "neutrals" },
  { key: "aluminum_silver", hex: "#D0D2D4", category: "neutrals" },
  { key: "titanium_silver", hex: "#A9A9A9", category: "neutrals" },
  { key: "satin_silver", hex: "#BFC1C2", category: "neutrals" },
  { key: "light_gray", hex: "#BEBEBE", category: "neutrals" },
  { key: "blue_gray", hex: "#6E7B8B", category: "neutrals" },
  { key: "charcoal_gray", hex: "#36454F", category: "neutrals" },

  // Blues (15)
  { key: "navy_blue", hex: "#1B263B", category: "blues" },
  { key: "royal_blue", hex: "#002366", category: "blues" },
  { key: "electric_blue", hex: "#0892D0", category: "blues" },
  { key: "sky_blue", hex: "#87CEEB", category: "blues" },
  { key: "deep_blue", hex: "#002B5C", category: "blues" },
  { key: "metallic_blue", hex: "#2E5090", category: "blues" },
  { key: "pearl_dark_blue", hex: "#0B1F3A", category: "blues" },
  { key: "cobalt_blue", hex: "#0047AB", category: "blues" },
  { key: "petrol_blue", hex: "#005F6A", category: "blues" },
  { key: "indigo_blue", hex: "#4B0082", category: "blues" },
  { key: "turquoise_blue", hex: "#30D5C8", category: "blues" },
  { key: "aqua_blue", hex: "#00E5E5", category: "blues" },
  { key: "matte_blue", hex: "#3B5B7D", category: "blues" },
  { key: "steel_blue", hex: "#4682B4", category: "blues" },
  { key: "midnight_blue", hex: "#191970", category: "blues" },

  // Reds (15)
  { key: "solid_red", hex: "#C8102E", category: "reds" },
  { key: "bright_red", hex: "#E31B23", category: "reds" },
  { key: "cherry_red", hex: "#B0141E", category: "reds" },
  { key: "wine_red", hex: "#722F37", category: "reds" },
  { key: "carmine_red", hex: "#960018", category: "reds" },
  { key: "scarlet_red", hex: "#FF2400", category: "reds" },
  { key: "metallic_red", hex: "#B22222", category: "reds" },
  { key: "pearl_red", hex: "#B32B2B", category: "reds" },
  { key: "dark_red", hex: "#5C0A0A", category: "reds" },
  { key: "brick_red", hex: "#8B3A3A", category: "reds" },
  { key: "orange_red", hex: "#D2381F", category: "reds" },
  { key: "burgundy_red", hex: "#800020", category: "reds" },
  { key: "ruby_red", hex: "#9B111E", category: "reds" },
  { key: "matte_red", hex: "#8F1D1D", category: "reds" },
  { key: "racing_red", hex: "#D62828", category: "reds" },

  // Greens (13)
  { key: "olive_green", hex: "#556B2F", category: "greens" },
  { key: "military_green", hex: "#4B5320", category: "greens" },
  { key: "bottle_green", hex: "#006A4E", category: "greens" },
  { key: "dark_green", hex: "#0B3D0B", category: "greens" },
  { key: "lime_green", hex: "#32CD32", category: "greens" },
  { key: "bright_green", hex: "#2ECC71", category: "greens" },
  { key: "metallic_green", hex: "#355E3B", category: "greens" },
  { key: "emerald_green", hex: "#50C878", category: "greens" },
  { key: "jade_green", hex: "#00A86B", category: "greens" },
  { key: "matte_green", hex: "#4A6741", category: "greens" },
  { key: "forest_green", hex: "#228B22", category: "greens" },
  { key: "mint_green", hex: "#98FF98", category: "greens" },
  { key: "acid_green", hex: "#B0BF1A", category: "greens" },

  // Yellows & oranges (13)
  { key: "solid_yellow", hex: "#FFD400", category: "yellowsOranges" },
  { key: "bright_yellow", hex: "#FFEA00", category: "yellowsOranges" },
  { key: "canary_yellow", hex: "#FFEF00", category: "yellowsOranges" },
  { key: "mustard_yellow", hex: "#D4A017", category: "yellowsOranges" },
  { key: "metallic_yellow", hex: "#E5B80B", category: "yellowsOranges" },
  { key: "matte_yellow", hex: "#C9A227", category: "yellowsOranges" },
  { key: "gold_yellow", hex: "#DAA520", category: "yellowsOranges" },
  { key: "bright_orange", hex: "#FF7F00", category: "yellowsOranges" },
  { key: "burnt_orange", hex: "#CC5500", category: "yellowsOranges" },
  { key: "metallic_orange", hex: "#C15A30", category: "yellowsOranges" },
  { key: "matte_orange", hex: "#C8571F", category: "yellowsOranges" },
  { key: "copper_orange", hex: "#C46A24", category: "yellowsOranges" },
  { key: "flame_orange", hex: "#E25822", category: "yellowsOranges" },

  // Browns, beige & earth (12)
  { key: "dark_brown", hex: "#3E2723", category: "earth" },
  { key: "light_brown", hex: "#8B5A2B", category: "earth" },
  { key: "chocolate_brown", hex: "#5C3317", category: "earth" },
  { key: "metallic_brown", hex: "#6F4E37", category: "earth" },
  { key: "beige", hex: "#E8DCC4", category: "earth" },
  { key: "sand", hex: "#C2B280", category: "earth" },
  { key: "champagne", hex: "#F7E7CE", category: "earth" },
  { key: "bronze", hex: "#CD7F32", category: "earth" },
  { key: "metallic_bronze", hex: "#B08D57", category: "earth" },
  { key: "gold", hex: "#FFD700", category: "earth" },
  { key: "satin_gold", hex: "#D4AF37", category: "earth" },
  { key: "copper", hex: "#B87333", category: "earth" },

  // Others / premium (12)
  { key: "purple", hex: "#5D3FD3", category: "premium" },
  { key: "dark_purple", hex: "#3B0764", category: "premium" },
  { key: "metallic_purple", hex: "#6A0DAD", category: "premium" },
  { key: "violet", hex: "#8F00FF", category: "premium" },
  { key: "magenta", hex: "#FF00FF", category: "premium" },
  { key: "pink", hex: "#FFC0CB", category: "premium" },
  { key: "metallic_pink", hex: "#E75480", category: "premium" },
  { key: "quartz_pink", hex: "#F7CAC9", category: "premium" },
  { key: "chameleon_blue_purple", hex: "#6E4E9E", category: "premium", effect: "chameleon" },
  { key: "chameleon_black", hex: "#1A1A2E", category: "premium", effect: "chameleon" },
  { key: "chrome_gray", hex: "#A8A9AD", category: "premium", effect: "chrome" },
  { key: "chameleon_multicolor", hex: "#7F7F7F", category: "premium", effect: "chameleon" },
];
