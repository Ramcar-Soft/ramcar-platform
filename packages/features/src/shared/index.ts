export { ImageGrid } from "./image-capture/image-grid";
export { ImageUpload } from "./image-capture/image-upload";
export type { ImageUploadHandle } from "./image-capture/image-upload";

export { VehicleForm } from "./vehicle-form/vehicle-form";
export { VehicleTypeSelect } from "./vehicle-form/vehicle-type-select";

export { VisitPersonStatusSelect } from "./visit-person-status-select";

export { ResidentSelect } from "./resident-select";

export { ShortcutsHint } from "./shortcuts-hint";
export type { ShortcutsHintProps } from "./shortcuts-hint";

export { ColorSelect } from "./color-select";
export type { ColorSelectProps } from "./color-select";
export {
  COLOR_CATALOG,
  COLOR_CATEGORIES,
  type ColorCategory,
  type ColorEffect,
  type ColorEntry,
  lookupByHex,
  normalizeHex,
  isHex,
} from "./color-select";

export { useKeyboardNavigation } from "./hooks/use-keyboard-navigation";
export type { UseKeyboardNavigationOptions } from "./hooks/use-keyboard-navigation";

export {
  VehicleBrandSelect,
  VehicleModelSelect,
  VehicleYearInput,
  VEHICLE_BRAND_MODEL,
  normalizeForSearch,
  buildBrandIndex,
  searchModels,
} from "./vehicle-brand-model";
export type {
  VehicleBrandSelectProps,
  VehicleModelSelectProps,
  VehicleYearInputProps,
  VehicleBrand,
} from "./vehicle-brand-model";
