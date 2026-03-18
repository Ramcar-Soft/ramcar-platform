"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";

import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { Button } from "@/components/ui/Button";

interface FormValues {
  name: string;
  email: string;
  community: string;
  residents: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  community?: string;
  residents?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function FinalCTA(): React.JSX.Element {
  const t = useTranslations("cta");

  const [values, setValues] = useState<FormValues>({
    name: "",
    email: "",
    community: "",
    residents: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const validate = (): FormErrors => {
    const newErrors: FormErrors = {};

    if (!values.name.trim()) newErrors.name = t("form.errors.required");
    if (!values.email.trim()) {
      newErrors.email = t("form.errors.required");
    } else if (!EMAIL_PATTERN.test(values.email)) {
      newErrors.email = t("form.errors.email");
    }
    if (!values.community.trim()) newErrors.community = t("form.errors.required");
    if (!values.residents) newErrors.residents = t("form.errors.required");

    return newErrors;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    console.log({ name: values.name, email: values.email, community: values.community, residents: values.residents });
    setSubmitted(true);
  };

  const inputBase =
    "w-full bg-stone-900 border rounded-lg px-4 py-3 text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors";
  const inputNormal = `${inputBase} border-stone-700`;
  const inputError = `${inputBase} border-red-500`;

  const residentsOptions = ["1", "2", "3", "4"] as const;

  return (
    <section id="cta" className="bg-stone-950 py-20 md:py-28 relative overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16 max-w-6xl mx-auto px-4">
        {/* Left — Demo form */}
        <AnimatedSection direction="left">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">{t("headline")}</h2>

          {submitted ? (
            <div className="bg-teal-900/40 border border-teal-700 rounded-xl p-8 text-center">
              <p className="text-teal-300 text-lg font-semibold mb-2">
                ✓ {t("form.submit")}
              </p>
              <p className="text-stone-400 text-sm">{t("form.note")}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {/* Name */}
              <div className="mb-4">
                <label htmlFor="cta-name" className="text-stone-300 text-sm mb-1 block">
                  {t("form.name")}
                </label>
                <input
                  id="cta-name"
                  name="name"
                  type="text"
                  value={values.name}
                  onChange={handleChange}
                  placeholder={t("form.namePlaceholder")}
                  className={errors.name ? inputError : inputNormal}
                  autoComplete="name"
                />
                {errors.name && (
                  <p className="text-red-400 text-xs mt-1">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div className="mb-4">
                <label htmlFor="cta-email" className="text-stone-300 text-sm mb-1 block">
                  {t("form.email")}
                </label>
                <input
                  id="cta-email"
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={handleChange}
                  placeholder={t("form.emailPlaceholder")}
                  className={errors.email ? inputError : inputNormal}
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              {/* Community */}
              <div className="mb-4">
                <label htmlFor="cta-community" className="text-stone-300 text-sm mb-1 block">
                  {t("form.community")}
                </label>
                <input
                  id="cta-community"
                  name="community"
                  type="text"
                  value={values.community}
                  onChange={handleChange}
                  placeholder={t("form.communityPlaceholder")}
                  className={errors.community ? inputError : inputNormal}
                />
                {errors.community && (
                  <p className="text-red-400 text-xs mt-1">{errors.community}</p>
                )}
              </div>

              {/* Residents */}
              <div className="mb-4">
                <label htmlFor="cta-residents" className="text-stone-300 text-sm mb-1 block">
                  {t("form.residents")}
                </label>
                <select
                  id="cta-residents"
                  name="residents"
                  value={values.residents}
                  onChange={handleChange}
                  className={errors.residents ? inputError : inputNormal}
                >
                  <option value="" disabled>
                    {t("form.residentsPlaceholder")}
                  </option>
                  {residentsOptions.map((key) => (
                    <option key={key} value={key}>
                      {t(`form.residentsOptions.${key}`)}
                    </option>
                  ))}
                </select>
                {errors.residents && (
                  <p className="text-red-400 text-xs mt-1">{errors.residents}</p>
                )}
              </div>

              <Button variant="primary" type="submit" className="w-full mt-4">
                {t("form.submit")}
              </Button>

              <p className="text-stone-400 text-sm mt-3">{t("form.note")}</p>
            </form>
          )}
        </AnimatedSection>

        {/* Right — Direct contact */}
        <AnimatedSection direction="right" className="flex flex-col justify-center relative">
          {/* Decorative blur */}
          <div
            className="absolute -right-12 top-1/2 -translate-y-1/2 w-48 h-48 bg-teal-500/10 blur-3xl rounded-full pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative">
            <h3 className="text-xl font-semibold text-white">{t("contact.headline")}</h3>
            <p className="text-stone-400 mt-2">
              {t("contact.body")}{" "}
              <a
                href="mailto:info@ramcarsoft.com"
                className="text-teal-400 hover:text-teal-300 underline font-medium transition-colors"
              >
                {t("contact.email")}
              </a>
            </p>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
