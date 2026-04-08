import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import es from "@ramcar/i18n/messages/es";
import en from "@ramcar/i18n/messages/en";

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: "es",
  fallbackLng: "es",
  interpolation: {
    escapeValue: false,
  },
});

export async function initializeLanguage(): Promise<void> {
  if (window.api?.getLanguage) {
    const savedLanguage = await window.api.getLanguage();
    if (savedLanguage && savedLanguage !== i18n.language) {
      await i18n.changeLanguage(savedLanguage);
    }
  }
}

export default i18n;
