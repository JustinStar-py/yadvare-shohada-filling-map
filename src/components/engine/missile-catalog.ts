/** Nontechnical visual model labels. */
export const MISSILE_MODELS = [
  { id: "kheibar", label: "خیبرشکن", caption: "فرم تاکتیکی · باله‌های هدایت میانی" },
  { id: "fattah", label: "فتاح ۱", caption: "هایپرسونیک · کلاهک گلایدری و نازل متحرک" },
  { id: "sejjil", label: "سجیل", caption: "دوربرد سوخت جامد · دو مرحله‌ای" },
  { id: "khorramshahr", label: "خرمشهر ۴", caption: "سرجنگی سنگین · دماغه مخروطی پهن" },
] as const;

export type MissileModel = (typeof MISSILE_MODELS)[number]["id"];
