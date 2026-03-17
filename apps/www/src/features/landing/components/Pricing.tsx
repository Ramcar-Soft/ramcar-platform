import { getTranslations } from "next-intl/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
} from "@ramcar/ui";

const TIER_COUNT = 3;
const FEATURE_COUNTS = [4, 6, 8];

export default async function Pricing() {
  const t = await getTranslations("pricing");

  return (
    <section id="pricing" className="relative overflow-hidden bg-white py-20">
      <div className="relative z-10 mx-auto max-w-6xl px-4">
        <div className="mb-14 text-center">
          <h2 className="text-charcoal-blue text-3xl font-bold tracking-tight sm:text-4xl">
            {t("headline")}
          </h2>
          <p className="text-charcoal-blue mx-auto mt-4 max-w-2xl text-lg leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {Array.from({ length: TIER_COUNT }).map((_, i) => {
            const isPopular = i === 1;

            return (
              <Card
                key={i}
                className={`relative flex flex-col ${
                  isPopular
                    ? "border-light-green bg-light-green/5 md:scale-[1.03] shadow-lg ring-2 ring-light-green/40"
                    : "border-sky-reflection/30 bg-white/60 shadow-sm"
                } transition-shadow hover:shadow-md`}
              >
                {isPopular && (
                  <span className="bg-light-green absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-semibold text-white">
                    {t("tiers.1.badge")}
                  </span>
                )}

                <CardHeader className="text-center">
                  <CardTitle className="text-charcoal-blue text-2xl font-bold ">
                    {t(`tiers.${i}.name`)}
                  </CardTitle>
                  <div className="text-light-green mt-2 text-4xl font-extrabold">
                    {t(`tiers.${i}.price`)}
                  </div>
                  {t.has(`tiers.${i}.description`) && (
                    <CardDescription className="text-frosted-mint mt-2">
                      {t(`tiers.${i}.description`)}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {Array.from({ length: FEATURE_COUNTS[i] }).map((_, fi) =>
                      t.has(`tiers.${i}.features.${fi}`) ? (
                        <li
                          key={fi}
                          className="text-charcoal-blue flex items-start gap-2 text-sm"
                        >
                          <span className="text-light-green mt-0.5 shrink-0">
                            &#10003;
                          </span>
                          {t(`tiers.${i}.features.${fi}`)}
                        </li>
                      ) : null,
                    )}
                  </ul>
                </CardContent>

                <CardFooter className="pt-4">
                  <Button
                    asChild
                    className={`w-full ${
                      isPopular
                        ? "bg-light-green hover:bg-baltic-blue text-white"
                        : "border-light-green text-light-green hover:bg-light-green/10 border bg-transparent font-bold"
                    }`}
                  >
                    <a href="#contact">{t(`tiers.${i}.cta`)}</a>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-charcoal-blue/30 text-sm">{t("trialNote")}</p>
          <p>{t("customPlan")}</p>
          <a
            href="#contact"
            className="text-light-green hover:text-baltic-blue mt-2 inline-block text-sm font-medium underline underline-offset-4 transition-colors"
          >
            {t("customPlanLink")}
          </a>
        </div>
      </div>
    </section>
  );
}
