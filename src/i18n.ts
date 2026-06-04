import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";
import zhTW from "./locales/zh-TW.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import ru from "./locales/ru.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import es from "./locales/es.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      "zh-CN": { translation: zhCN },
      "zh-TW": { translation: zhTW },
      ja: { translation: ja },
      ko: { translation: ko },
      ru: { translation: ru },
      fr: { translation: fr },
      de: { translation: de },
      es: { translation: es },
    },
    fallbackLng: "en",
    detection: {
      order: ["navigator", "localStorage"],
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
