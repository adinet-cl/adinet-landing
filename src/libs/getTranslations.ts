// src/libs/getTranslations.ts
import enUS from "../locales/en-us.json";
import esMX from "../locales/es-mx.json";
import esES from "../locales/es-es.json";

const translations: any = {
  "en-us": enUS,
  "es-mx": esMX,
  "es-es": esES,
};

export function getTranslations(lang: string) {
  return translations[lang] || translations["en-us"];
}
