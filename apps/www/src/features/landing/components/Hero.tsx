import { getTranslations } from "next-intl/server";

export default async function Hero() {
  const t = await getTranslations("hero");

  return (
    <section
      id="hero"
      className="relative min-h-[80vh] overflow-hidden py-32"
    >
      <div className="parallax-bg bg-gradient-to-br from-light-green/30 to-sky-reflection/20" />

      <div className="parallax-fg relative z-10 mx-auto flex max-w-6xl flex-col items-center px-4 text-center">
        <h1 className="text-charcoal-blue text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          {t("headline")}
        </h1>

        <p className="text-frosted-mint mt-6 max-w-2xl text-lg leading-relaxed sm:text-xl">
          {t("subheadline")}
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <a
            href="#contact"
            className="bg-light-green hover:bg-baltic-blue inline-flex items-center justify-center rounded-lg px-8 py-3 text-base font-semibold text-white shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            {t("cta")}
          </a>

          <a
            href="#how-it-works"
            className="text-light-green hover:text-baltic-blue inline-flex items-center justify-center text-base font-medium underline underline-offset-4 transition-colors"
          >
            {t("secondary")}
          </a>
        </div>
      </div>
    </section>
  );
}
