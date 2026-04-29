import audiLogo from "./assets/audi.svg";
import bmwLogo from "./assets/bmw.svg";
import bydLogo from "./assets/byd.svg";
import chevroletLogo from "./assets/chevrolet.svg";
import chireyLogo from "./assets/chirey.svg";
import fordLogo from "./assets/ford.svg";
import gacLogo from "./assets/gac.svg";
import geelyLogo from "./assets/geely.svg";
import gmcLogo from "./assets/gmc.svg";
import hondaLogo from "./assets/honda.svg";
import hyundaiLogo from "./assets/hyundai.svg";
import jacLogo from "./assets/jac.svg";
import jaecooLogo from "./assets/jaecoo.svg";
import jeepLogo from "./assets/jeep.svg";
import kiaLogo from "./assets/kia.svg";
import mazdaLogo from "./assets/mazda.svg";
import mercedesBenzLogo from "./assets/mercedes-benz.svg";
import mgLogo from "./assets/mg.svg";
import mitsubishiLogo from "./assets/mitsubishi.svg";
import nissanLogo from "./assets/nissan.svg";
import omodaLogo from "./assets/omoda.svg";
import peugeotLogo from "./assets/peugeot.svg";
import ramLogo from "./assets/ram.svg";
import renaultLogo from "./assets/renault.svg";
import seatLogo from "./assets/seat.svg";
import subaruLogo from "./assets/subaru.svg";
import suzukiLogo from "./assets/suzuki.svg";
import teslaLogo from "./assets/tesla.svg";
import toyotaLogo from "./assets/toyota.svg";
import volkswagenLogo from "./assets/volkswagen.svg";

// Vite (desktop) returns a URL string; Next.js (web) returns StaticImageData with `.src`.
function toUrl(asset: string | { src: string; height?: number; width?: number; blurDataURL?: string }): string {
  return typeof asset === "string" ? asset : asset.src;
}

export const BRAND_LOGO_REGISTRY: Readonly<Record<string, string>> = Object.freeze({
  Audi: toUrl(audiLogo),
  BMW: toUrl(bmwLogo),
  BYD: toUrl(bydLogo),
  Chevrolet: toUrl(chevroletLogo),
  Chirey: toUrl(chireyLogo),
  Ford: toUrl(fordLogo),
  GAC: toUrl(gacLogo),
  Geely: toUrl(geelyLogo),
  GMC: toUrl(gmcLogo),
  Honda: toUrl(hondaLogo),
  Hyundai: toUrl(hyundaiLogo),
  JAC: toUrl(jacLogo),
  Jaecoo: toUrl(jaecooLogo),
  Jeep: toUrl(jeepLogo),
  Kia: toUrl(kiaLogo),
  Mazda: toUrl(mazdaLogo),
  "Mercedes-Benz": toUrl(mercedesBenzLogo),
  MG: toUrl(mgLogo),
  Mitsubishi: toUrl(mitsubishiLogo),
  Nissan: toUrl(nissanLogo),
  Omoda: toUrl(omodaLogo),
  Peugeot: toUrl(peugeotLogo),
  RAM: toUrl(ramLogo),
  Renault: toUrl(renaultLogo),
  SEAT: toUrl(seatLogo),
  Subaru: toUrl(subaruLogo),
  Suzuki: toUrl(suzukiLogo),
  Tesla: toUrl(teslaLogo),
  Toyota: toUrl(toyotaLogo),
  Volkswagen: toUrl(volkswagenLogo),
});
