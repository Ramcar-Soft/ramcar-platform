"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Input,
  Label,
  Button,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@ramcar/ui";
import { demoRequestLeadSchema, residentCountOptions } from "@ramcar/shared";

export default function FinalCTA() {
  const t = useTranslations("cta");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    communityName: "",
    residentCount: "" as string,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const result = demoRequestLeadSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = t("form.errors.required");
        }
      }
      setErrors(fieldErrors);
      return;
    }

    console.log(result.data);
    setSubmitted(true);
  }

  return (
    <section
      id="contact"
      className="bg-charcoal-blue py-20 text-white"
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-4 md:grid-cols-2">
        {/* Left — Form */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t("headline")}
          </h2>
          <p className="text-white mt-4 text-lg">
            {t("subtitle")}
          </p>

          {submitted ? (
            <p className="bg-light-green/20 text-sky-reflection mt-8 rounded-lg p-6 text-center text-lg font-medium">
              {t("form.success")}
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">
                  {t("form.name")}
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="border-frosted-mint/40 bg-white/10 text-white placeholder:text-white/50 focus-visible:ring-light-green"
                />
                {errors.name && (
                  <p className="text-sm text-red-400">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">
                  {t("form.email")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="border-frosted-mint/40 bg-white/10 text-white placeholder:text-white/50 focus-visible:ring-light-green"
                />
                {errors.email && (
                  <p className="text-sm text-red-400">{errors.email}</p>
                )}
              </div>

              {/* Community Name */}
              <div className="space-y-2">
                <Label htmlFor="communityName" className="text-white">
                  {t("form.communityName")}
                </Label>
                <Input
                  id="communityName"
                  value={formData.communityName}
                  onChange={(e) => handleChange("communityName", e.target.value)}
                  className="border-frosted-mint/40 bg-white/10 text-white placeholder:text-white/50 focus-visible:ring-light-green"
                />
                {errors.communityName && (
                  <p className="text-sm text-red-400">{errors.communityName}</p>
                )}
              </div>

              {/* Resident Count */}
              <div className="space-y-2">
                <Label htmlFor="residentCount" className="text-white">
                  {t("form.residentCount")}
                </Label>
                <Select
                  value={formData.residentCount}
                  onValueChange={(value) => handleChange("residentCount", value)}
                >
                  <SelectTrigger className="border-frosted-mint/40 bg-white/10 text-white focus:ring-light-green">
                    <SelectValue placeholder={t("form.residentCountPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {residentCountOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.residentCount && (
                  <p className="text-sm text-red-400">{errors.residentCount}</p>
                )}
              </div>

              <Button
                type="submit"
                className="bg-light-green hover:bg-baltic-blue w-full rounded-lg px-8 py-3 text-base font-semibold text-white shadow-lg transition-colors"
              >
                {t("form.submit")}
              </Button>
            </form>
          )}
        </div>

        {/* Right — Contact Info */}
        <div className="flex flex-col justify-center">
          <h3 className="text-2xl font-semibold">{t("contact.headline")}</h3>
          <a
            href="mailto:info@ramcarsoft.com"
            className="text-sky-reflection hover:text-light-green mt-4 text-lg underline underline-offset-4 transition-colors"
          >
            {t("contact.email")}
          </a>
        </div>
      </div>
    </section>
  );
}
