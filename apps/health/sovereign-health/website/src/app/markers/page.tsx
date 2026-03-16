"use client";

import { useI18n } from "@/lib/i18n";
import { MarkersPageClient } from "./markers-content";

export default function MarkersPage() {
  const { t } = useI18n();
  void t;
  return <MarkersPageClient />;
}
