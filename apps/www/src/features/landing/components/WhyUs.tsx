import { getTranslations } from "next-intl/server";
import { MapPin, WifiOff, Zap, DollarSign, Bell, Lock } from "lucide-react";

const icons = [MapPin, WifiOff, Zap, DollarSign, Bell, Lock];

export default async function WhyUs() {
  const t = await getTranslations("whyUs");

  return (
    <section id="why-us" className="relative overflow-hidden py-20">
      <div className="parallax-bg bg-baltic-blue" />

      <div className="parallax-fg relative z-10 mx-auto max-w-6xl px-4">
        <h2 className="text-white mb-12 text-center text-3xl font-bold tracking-tight sm:text-4xl">
          {t("headline")}
        </h2>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
          {icons.map((Icon, i) => (
            <div
              key={i}
              className="rounded-xl border border-sky-reflection/30 bg-white/80 p-6 backdrop-blur-sm"
            >
              <Icon className="text-light-green mb-4 h-10 w-10" />
              <h3 className="text-charcoal-blue mb-2 text-lg font-semibold">
                {t(`items.${i}.title`)}
              </h3>
              <p className="text-charcoal-blue text-sm leading-relaxed">
                {t(`items.${i}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
