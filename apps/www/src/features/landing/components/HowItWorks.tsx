import { getTranslations } from "next-intl/server";

const stepIndices = [0, 1, 2, 3] as const;

export default async function HowItWorks() {
  const t = await getTranslations("howItWorks");

  return (
    <section id="how-it-works" className="relative overflow-hidden py-20">
      <div className="parallax-bg bg-gradient-to-br from-sky-reflection/20 to-light-green/10" />

      <div className="parallax-fg relative z-10 mx-auto max-w-6xl px-4">
        <h2 className="text-charcoal-blue mb-14 text-center text-3xl font-bold tracking-tight sm:text-4xl">
          {t("headline")}
        </h2>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {stepIndices.map((i) => (
            <div key={i} className="relative flex flex-col items-center text-center">
              {/* Connecting line between steps (desktop only) */}
              {i < stepIndices.length - 1 && (
                <div className="absolute left-1/2 top-6 hidden h-0.5 w-full translate-x-1/2 bg-gradient-to-r from-light-green/40 to-sky-reflection/40 md:block" />
              )}

              {/* Number badge */}
              <div className="bg-light-green relative z-10 mb-4 flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white shadow-md">
                {i + 1}
              </div>

              <h3 className="text-charcoal-blue text-lg font-semibold">
                {t(`steps.${i}.title`)}
              </h3>

              <p className="text-charcoal-blue mt-2 max-w-xs text-sm leading-relaxed">
                {t(`steps.${i}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
