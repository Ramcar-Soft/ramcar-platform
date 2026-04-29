declare module "*.svg" {
  // Vite (desktop) emits a URL string. Next.js (web, webpack/Turbopack) emits a
  // StaticImageData-shaped object whose URL lives at `.src`. Consumers normalize.
  const asset: string | { src: string; height?: number; width?: number; blurDataURL?: string };
  export default asset;
}
