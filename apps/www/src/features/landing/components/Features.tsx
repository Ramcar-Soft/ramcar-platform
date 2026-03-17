"use client";

import { useTranslations } from "next-intl";
import {
  BarChart3,
  Users,
  Ban,
  History,
  Calendar,
  ClipboardList,
  Bell,
  ShieldCheck,
  ArrowRightLeft,
  WifiOff,
  UserCheck,
  BellRing,
  Phone,
  CalendarCheck,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@ramcar/ui";

const adminIcons = [BarChart3, Users, Ban, History, Calendar];
const guardIcons = [ClipboardList, Bell, ShieldCheck, ArrowRightLeft, WifiOff];
const residentIcons = [UserCheck, BellRing, Phone, CalendarCheck];

export default function Features() {
  const t = useTranslations("features");

  return (
    <section id="features" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-charcoal-blue mb-12 text-center text-3xl font-bold tracking-tight sm:text-4xl">
          {t("headline")}
        </h2>

        <Tabs defaultValue="admin" className="w-full">
          <TabsList className="bg-charcoal-blue/50 mx-auto mb-8 grid w-full max-w-3xl grid-cols-3">
            <TabsTrigger value="admin" className="cursor-pointer">{t("tabs.admin.title")}</TabsTrigger>
            <TabsTrigger value="guard" className="cursor-pointer">{t("tabs.guard.title")}</TabsTrigger>
            <TabsTrigger value="resident"className="cursor-pointer">
              {t("tabs.resident.title")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="admin">
            <p className="text-charcoal-blue mb-8 text-center text-lg">
              {t("tabs.admin.description")}
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {adminIcons.map((Icon, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-sky-reflection/30 bg-sky-reflection/5 p-6"
                >
                  <Icon className="text-light-green mb-3 h-8 w-8" />
                  <h3 className="text-charcoal-blue mb-1 text-lg font-semibold">
                    {t(`tabs.admin.items.${i}.title`)}
                  </h3>
                  <p className="text-charcoal-blue text-sm">
                    {t(`tabs.admin.items.${i}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="guard">
            <p className="text-charcoal-blue mb-8 text-center text-lg">
              {t("tabs.guard.description")}
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {guardIcons.map((Icon, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-sky-reflection/30 bg-sky-reflection/5 p-6"
                >
                  <Icon className="text-light-green mb-3 h-8 w-8" />
                  <h3 className="text-charcoal-blue mb-1 text-lg font-semibold">
                    {t(`tabs.guard.items.${i}.title`)}
                  </h3>
                  <p className="text-charcoal-blue text-sm">
                    {t(`tabs.guard.items.${i}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="resident">
            <p className="text-charcoal-blue mb-8 text-center text-lg">
              {t("tabs.resident.description")}
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {residentIcons.map((Icon, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-sky-reflection/30 bg-sky-reflection/5 p-6"
                >
                  <Icon className="text-light-green mb-3 h-8 w-8" />
                  <h3 className="text-charcoal-blue mb-1 text-lg font-semibold">
                    {t(`tabs.resident.items.${i}.title`)}
                  </h3>
                  <p className="text-charcoal-blue text-sm">
                    {t(`tabs.resident.items.${i}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
