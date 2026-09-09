/** Nontechnical visual model labels and distinct livery styling for Iranian ballistic/hypersonic missiles. */
export const MISSILE_MODELS = [
  {
    id: "kheibar",
    label: "خیبرشکن",
    colorName: "خاکستری فیلی تاکتیکی",
    colorHex: "#c5beaf",
    metalness: 0.58,
    roughness: 0.32,
    textColor: "#000000",
    caption: "فرم تاکتیکی · بالک‌های هدایت میانی · رنگ فیلی تیتانیومی",
  },
  {
    id: "fattah",
    label: "فتاح ۱",
    colorName: "قهوه‌ای دارک متالیک",
    colorHex: "#2e211b",
    metalness: 0.52,
    roughness: 0.42,
    textColor: "#ffffff",
    caption: "هایپرسونیک · کلاهک گلایدری دو مخروطه · رنگ قهوه‌ای تیره مات",
  },
  {
    id: "sejjil",
    label: "سجیل",
    colorName: "قهوه‌ای خاکی کویری",
    colorHex: "#835a38",
    metalness: 0.48,
    roughness: 0.38,
    textColor: "#ffffff",
    caption: "دوربرد سوخت جامد · دو مرحله‌ای با رینگ‌های طلایی · رنگ قهوه‌ای خاکی",
  },
  {
    id: "khorramshahr",
    label: "خرمشهر ۴",
    colorName: "قهوه‌ای برنزه دودی",
    colorHex: "#524336",
    metalness: 0.55,
    roughness: 0.36,
    textColor: "#ffffff",
    caption: "سرجنگی سنگین · دماغه مخروطی پهن · رنگ قهوه‌ای برنزه دودی",
  },
  {
    id: "emad",
    label: "عماد",
    colorName: "سفید بالستیک نقطه‌زن",
    colorHex: "#e2e8f0",
    metalness: 0.52,
    roughness: 0.34,
    textColor: "#0f172a",
    caption: "نقطه‌زن دوربرد · بالک‌های هدایت سرجنگی کلاهک · رنگ سفید متالیک",
  },
  {
    id: "reyhaneh",
    label: "ریحانه (دخترانه)",
    colorName: "صورتی پاستلی کارتونی",
    colorHex: "#f472b6",
    metalness: 0.38,
    roughness: 0.28,
    textColor: "#ffffff",
    caption: "طرح اختصاصی ریحانه · رنگ صورتی شاد با برچسب‌های قلبی، پروانه و گل‌های کارتونی",
  },
] as const;

export type MissileModel = (typeof MISSILE_MODELS)[number]["id"];
export type MissileVisualConfig = (typeof MISSILE_MODELS)[number];

export function getMissileConfig(id: string): MissileVisualConfig {
  const found = MISSILE_MODELS.find((m) => m.id === id);
  return found ?? MISSILE_MODELS[0];
}
