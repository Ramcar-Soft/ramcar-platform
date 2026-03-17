import { getTranslations } from "next-intl/server";
import {
  FileText,
  BellOff,
  RefreshCw,
  ShieldAlert,
  EyeOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const icons: LucideIcon[] = [FileText, BellOff, RefreshCw, ShieldAlert, EyeOff];

export default async function TheProblem() {
  const t = await getTranslations("problem");

  return (
    <section id="problem" className="relative overflow-hidden py-20">
      {/* <div className="parallax-bg bg-gradient-to-br from-sky-reflection/20 to-light-green/10" /> */}

      <div className="parallax-fg relative z-10 mx-auto max-w-6xl px-4">
        <div className="mb-14 text-center">
          <h2 className="text-charcoal-blue text-3xl font-bold tracking-tight sm:text-4xl">
            {t("headline")}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {icons.map((Icon, i) => (
            <div
              key={i}
              className="rounded-2xl border border-sky-reflection/30 bg-white p-6 shadow-sm backdrop-blur transition-shadow hover:shadow-md"
            >
              <div className="bg-light-green/10 text-light-green mb-4 inline-flex rounded-xl p-3">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-charcoal-blue text-lg font-semibold">
                {t(`items.${i}.title`)}
              </h3>
              <p className="text-charcoal-blue mt-2 text-sm leading-relaxed">
                {t(`items.${i}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
