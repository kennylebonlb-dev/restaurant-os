"use client";

import { Globe2 } from "lucide-react";
import Image from "next/image";
import { useI18n, type Locale } from "@/lib/i18n";
import { useLocaleStore } from "@/stores/locale-store";

export function LanguageFooter() {
  const { locale, t } = useI18n();
  const setLocale = useLocaleStore((state) => state.setLocale);

  return (
    <footer className="border-t border-ink/10 bg-white/85">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Image
          src="/cest-ma-table-logo.png"
          alt="C’est ma table"
          width={170}
          height={42}
          className="h-8 w-auto object-contain"
        />
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Globe2 className="h-4 w-4 text-ink/55" />
          {t("footer.language")}
          <select
            className="control h-9"
            value={locale}
            onChange={(event) => setLocale(event.target.value as Locale)}
          >
            <option value="fr">{t("footer.french")}</option>
            <option value="en">{t("footer.english")}</option>
          </select>
        </label>
      </div>
    </footer>
  );
}
