import { getTranslations } from "next-intl/server";

export default async function SocialProof() {
  const t = await getTranslations("socialProof");

  return (
    <section id="social-proof" className="relative overflow-hidden py-20">
      <div className="parallax-bg bg-gradient-to-br from-charcoal-blue/20 to-baltic-blue/10" />

      <div className="parallax-fg relative z-10 mx-auto max-w-6xl px-4">
        <h2 className="text-charcoal-blue mb-8 text-center text-3xl font-bold tracking-tight sm:text-4xl">
          {t("headline")}
        </h2>

        <p className="text-charcoal-blue mx-auto mb-12 max-w-3xl text-center text-lg leading-relaxed">
          {t("story")}
        </p>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-sky-reflection/30 bg-white/80 p-8 text-center backdrop-blur-sm"
            >
              <p className="text-light-green text-4xl font-extrabold">
                {t(`stats.${i}.value`)}
              </p>
              <p className="text-charcoal-blue mt-2 text-sm font-medium">
                {t(`stats.${i}.label`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
