"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import YadvareLogo from "@/components/ui/YadvareLogo";
import {
  Shield,
  Rocket,
  Target,
  Users,
  Settings,
  Calendar,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Lock,
  ArrowRight,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Volume2,
  VolumeX,
  Play,
  Square,
  Zap,
  LogOut,
} from "lucide-react";
import {
  CampaignSettings,
  DailyMission,
  MartyrProfile,
  ConstellationStar,
  AdminAuditLog,
} from "@/types/campaign";
import { MISSILE_MODELS, MissileModel } from "@/components/engine/missile-catalog";
import { formatPersianNumber, toPersianDigits, formatTehranTime, formatJalaliDate } from "@/lib/utils";
import dynamic from "next/dynamic";

const Missile3DThumbnail = dynamic(
  () => import("@/components/engine/Missile3DThumbnail"),
  { ssr: false }
);

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "targets" | "martyrs" | "settings" | "history">("overview");
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Admin Data State
  const [settings, setSettings] = useState<CampaignSettings | null>(null);
  const [todayMission, setTodayMission] = useState<DailyMission | null>(null);
  const [martyrs, setMartyrs] = useState<MartyrProfile[]>([]);
  const [constellation, setConstellation] = useState<ConstellationStar[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  // Modals & Form State
  const [martyrForm, setMartyrForm] = useState<Partial<MartyrProfile> | null>(null);
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideTarget, setOverrideTarget] = useState<number>(10000);
  const [isPlayingAudioTest, setIsPlayingAudioTest] = useState(false);
  const [audioTestInstance, setAudioTestInstance] = useState<HTMLAudioElement | null>(null);

  const toggleTestAudio = () => {
    if (isPlayingAudioTest) {
      if (audioTestInstance) {
        audioTestInstance.pause();
      }
      setIsPlayingAudioTest(false);
    } else {
      let aud = audioTestInstance;
      if (!aud) {
        aud = new Audio("/audio/bayad-barkhast-playground.mp3");
        aud.volume = 0.85;
        aud.loop = true;
        setAudioTestInstance(aud);
      }
      aud
        .play()
        .then(() => {
          setIsPlayingAudioTest(true);
        })
        .catch((e) => {
          showNotification("خطا در پخش فایل صوتی: " + e.message, "error");
        });
    }
  };

  // Check login & load data
  const loadAdminData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/data", { credentials: "same-origin" });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setTodayMission(data.todayMission);
        setMartyrs(data.martyrs || []);
        setConstellation(data.constellation || []);
        setAuditLogs(data.auditLogs || []);
        setIsAuthenticated(true);
      } else if (res.status === 401) {
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkAuthAndLoad = async () => {
    setLoading(true);
    try {
      const authRes = await fetch("/api/admin/auth", { credentials: "same-origin" });
      if (authRes.ok) {
        const { authenticated } = await authRes.json();
        if (authenticated) {
          setIsAuthenticated(true);
          await loadAdminData();
          return;
        }
      }
      setIsAuthenticated(false);
    } catch (err) {
      console.error(err);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
    checkAuthAndLoad();
  }, []);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth", { method: "DELETE", credentials: "same-origin" });
      setIsAuthenticated(false);
      setSettings(null);
      setTodayMission(null);
      showNotification("با موفقیت خارج شدید");
    } catch {
      setIsAuthenticated(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
        loadAdminData();
        showNotification("با موفقیت وارد شدید");
      } else {
        showNotification("رمز عبور اشتباه است", "error");
        const data = await res.json().catch(() => ({}));
        showNotification(data.error || "رمز عبور اشتباه است", "error");
      }
    } catch {
      showNotification("خطای ارتباط با سرور", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerLaunch = async () => {
    if (!confirm("آیا از ثبت و پرتاب راکت امروز اطمینان دارید؟")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/launch", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showNotification("پرتاب راکت با موفقیت ثبت گردید");
        loadAdminData();
      } else {
        showNotification(data.error || "خطا در پرتاب راکت", "error");
      }
    } catch {
      showNotification("خطای سرور", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetLaunch = async () => {
    if (
      !confirm(
        "آیا از بازنشانی پرتاب امروز اطمینان دارید؟ ستاره امروز از آسمان برداشته شده و پرتاب مجدداً فعال می‌شود."
      )
    )
      return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/launch", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showNotification("وضعیت پرتاب امروز با موفقیت بازنشانی شد");
        loadAdminData();
      } else {
        showNotification(data.error || "خطا در بازنشانی پرتاب", "error");
      }
    } catch {
      showNotification("خطای سرور", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSalawat = async () => {
    if (!confirm("آیا از صفر کردن تعداد صلوات‌های امروز برای تست اطمینان دارید؟")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bulk-salawat", {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showNotification("صلوات‌های امروز صفر شدند");
        loadAdminData();
      } else {
        showNotification(data.error || "خطا در صفر کردن صلوات‌ها", "error");
      }
    } catch {
      showNotification("خطای سرور", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFillTarget = async () => {
    if (!todayMission) return;
    const remaining = Math.max(0, todayMission.target - todayMission.currentCount);
    if (remaining === 0) {
      showNotification("هدف صلوات امروز قبلاً تکمیل شده است");
      return;
    }
    const countToSend = Math.min(remaining, 100000);
    await handleSimulateSalawat(countToSend);
  };

  const handleSimulateSalawat = async (count: number) => {
    try {
      const res = await fetch("/api/admin/bulk-salawat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ count }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showNotification(`تعداد ${formatPersianNumber(count)} صلوات تستی ثبت شد`);
        loadAdminData();
      } else {
        showNotification(data.error || "خطا در ثبت صلوات تستی", "error");
      }
    } catch {
      showNotification("خطا در ثبت صلوات تستی", "error");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Empty/undefined adminPin means "keep current PIN"
        body: JSON.stringify({ ...settings, adminPin: settings.adminPin || undefined }),
      });
      if (res.ok) {
        showNotification("تنظیمات با موفقیت ذخیره شد");
        setSettings((prev) => (prev ? { ...prev, adminPin: undefined } : prev));
        loadAdminData();
      } else {
        showNotification("خطا در ذخیره تنظیمات", "error");
      }
    } catch {
      showNotification("خطای سرور", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMissileModel = async (modelId: MissileModel) => {
    if (!settings) return;
    setSettings({ ...settings, activeMissileModel: modelId });
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeMissileModel: modelId }),
      });
      if (res.ok) {
        const found = MISSILE_MODELS.find((m) => m.id === modelId);
        showNotification(`مدل موشک به «${found?.label || modelId}» تغییر یافت`);
        loadAdminData();
      } else {
        showNotification("خطا در تغییر مدل موشک", "error");
      }
    } catch {
      showNotification("خطای ارتباط با سرور", "error");
    }
  };

  const handleSetTargetOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideDate || !overrideTarget) return;
    try {
      const res = await fetch("/api/admin/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: overrideDate, target: Number(overrideTarget) }),
      });
      if (res.ok) {
        showNotification(`هدف تاریخ ${overrideDate} تنظیم گردید`);
        setOverrideDate("");
        loadAdminData();
      }
    } catch {
      showNotification("خطا در تنظیم هدف اختصاصی", "error");
    }
  };

  const handleRemoveTargetOverride = async (date: string) => {
    try {
      const res = await fetch(`/api/admin/targets?date=${date}`, { method: "DELETE" });
      if (res.ok) {
        showNotification(`هدف اختصاصی ${date} حذف شد`);
        loadAdminData();
      }
    } catch {
      showNotification("خطا در حذف هدف اختصاصی", "error");
    }
  };

  const handleSaveMartyr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!martyrForm || !martyrForm.name || !martyrForm.biography) {
      showNotification("نام و زندگینامه شهید الزامی است", "error");
      return;
    }
    try {
      const res = await fetch("/api/admin/martyrs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(martyrForm),
      });
      if (res.ok) {
        showNotification("اطلاعات شهید با موفقیت ذخیره شد");
        setMartyrForm(null);
        loadAdminData();
      }
    } catch {
      showNotification("خطا در ذخیره اطلاعات شهید", "error");
    }
  };

  const handleDeleteMartyr = async (id: string) => {
    if (!confirm("آیا از حذف این شهید اطمینان دارید؟")) return;
    try {
      const res = await fetch(`/api/admin/martyrs?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showNotification("شهید حذف گردید");
        loadAdminData();
      }
    } catch {
      showNotification("خطا در حذف", "error");
    }
  };

  // 1. PIN Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm p-8 rounded-3xl bg-slate-900/90 border border-amber-500/30 shadow-2xl text-center">
          <div className="flex justify-center mb-4">
            <YadvareLogo className="w-16 h-16 drop-shadow-[0_4px_16px_rgba(245,158,11,0.35)]" priority />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-1">
            ورود به پنل مدیریت پویش
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            رمز عبور مدیریت را وارد فرمایید
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="رمز عبور مدیریت"
              className="w-full text-center tracking-widest text-xl py-3 px-4 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 focus:outline-none focus:border-amber-400"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !pin}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 font-bold text-slate-950 transition-colors disabled:opacity-50"
            >
              {loading ? "در حال ورود..." : "ورود به سامانه"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-amber-400 flex items-center justify-center gap-1"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>بازگشت به صفحه اصلی پویش</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Main Admin Dashboard
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <div>
            <div className="flex items-center gap-3">
              <YadvareLogo className="w-10 h-10 drop-shadow-[0_2px_8px_rgba(245,158,11,0.25)]" />
              <h1 className="text-xl font-bold text-slate-100">
                پنل مدیریت پویش معنوی یادواره ۷۶ شهید شهیدیه میبد
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              کنترل مقتدرانه اهداف روزانه، پرتاب راکت و اطلاعات یادواره
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAdminData}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="بروزرسانی داده‌ها"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              href="/"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-400 transition-colors flex items-center gap-1.5"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>مشاهده سایت</span>
            </Link>
            <button
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-semibold text-rose-300 transition-colors flex items-center gap-1.5"
              title="خروج از پنل مدیریت"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج</span>
            </button>
          </div>
        </div>

        {/* Discreet Access Tip Banner */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-200/90">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>دکمه پنل مدیریت از صفحه اصلی مخفی شد:</strong> جهت ورود سریع به این پنل از صفحه اصلی، می‌توانید کلیدهای میانبر <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-amber-500/30 text-amber-300 font-mono text-[11px]">Ctrl + Shift + A</kbd> را بفشارید یا مستقیماً به آدرس <code className="font-mono text-amber-300">/admin</code> مراجعه فرمایید.
            </span>
          </div>
        </div>

        {/* Action Notification Toast */}
        {actionMessage && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
              actionMessage.type === "success"
                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                : "bg-rose-950/80 text-rose-300 border border-rose-500/40"
            }`}
          >
            {actionMessage.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "overview"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <Rocket className="w-4 h-4" />
            <span>وضعیت پرواز و مأموریت امروز</span>
          </button>
          <button
            onClick={() => setActiveTab("targets")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "targets"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <Target className="w-4 h-4" />
            <span>فرمول و زمان‌بندی اهداف صلوات</span>
          </button>
          <button
            onClick={() => setActiveTab("martyrs")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "martyrs"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>مدیریت شهدای والامقام</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "settings"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>تنظیمات کلی پویش</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "history"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>تاریخچه و لاگ‌های امنیتی</span>
          </button>
        </div>

        {/* Tab 1: Overview & Today's Mission */}
        {activeTab === "overview" && todayMission && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-amber-400" />
                  <span>مأموریت امروز (روز {toPersianDigits(todayMission.dayNumber)})</span>
                </h3>
                <span
                  className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                    todayMission.state === "LAUNCHED"
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-600/40"
                      : todayMission.state === "READY_TO_LAUNCH"
                      ? "bg-amber-950 text-amber-300 border border-amber-500/40 animate-pulse"
                      : "bg-blue-950 text-blue-300 border border-blue-600/40"
                  }`}
                >
                  وضعیت: {todayMission.state}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400">صلوات‌های امروز</span>
                  <p className="text-2xl font-bold text-amber-400 mt-1">
                    {formatPersianNumber(todayMission.currentCount)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400">هدف تعیین‌شده</span>
                  <p className="text-2xl font-bold text-slate-100 mt-1">
                    {formatPersianNumber(todayMission.target)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400">تعداد مشارکت‌کنندگان</span>
                  <p className="text-2xl font-bold text-slate-100 mt-1">
                    {toPersianDigits(todayMission.participantsCount)}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">پیشرفت صلوات‌های امروز تا هدف:</span>
                  <span className="font-bold text-amber-400 tabular-nums">
                    {toPersianDigits(
                      Math.min(
                        100,
                        Math.round((todayMission.currentCount / Math.max(1, todayMission.target)) * 100)
                      )
                    )}
                    ٪
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 transition-all duration-500 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (todayMission.currentCount / Math.max(1, todayMission.target)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Action Controls */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Rocket className="w-3.5 h-3.5 text-amber-400" />
                    <span>فرمان پرتاب راکت روز</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    پرتاب راکت مأموریت امروز را تکمیل کرده و ستاره‌ای زرین در آسمان پویش روشن می‌کند.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleTriggerLaunch}
                    disabled={todayMission.state === "LAUNCHED" || loading}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 font-bold text-slate-950 text-xs shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {todayMission.state === "LAUNCHED" ? "امروز پرتاب شده است" : "اجرای پرتاب معنوی"}
                  </button>

                  {todayMission.state === "LAUNCHED" && (
                    <button
                      onClick={handleResetLaunch}
                      disabled={loading}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 text-xs font-semibold transition-colors flex items-center gap-1"
                      title="بازنشانی وضعیت پرتاب امروز جهت تست دوباره"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>بازنشانی پرتاب</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Simulation test contributions & Resets */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>عملیات سریع تست صلوات:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleSimulateSalawat(100)}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                  >
                    + ۱۰۰
                  </button>
                  <button
                    onClick={() => handleSimulateSalawat(500)}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                  >
                    + ۵۰۰
                  </button>
                  <button
                    onClick={() => handleSimulateSalawat(1000)}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-amber-300"
                  >
                    + ۱٬۰۰۰
                  </button>

                  <button
                    onClick={handleFillTarget}
                    className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-xs font-semibold text-amber-300 border border-amber-500/40"
                    title="افزودن صلوات تا رسیدن به سقف ۱۰۰٪ مأموریت امروز"
                  >
                    تکمیل ۱۰۰٪ هدف
                  </button>

                  <button
                    onClick={handleResetSalawat}
                    className="px-3 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-xs text-rose-300 border border-rose-800/50 flex items-center gap-1"
                    title="صفر کردن صلوات‌های امروز"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>صفر کردن</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Campaign Summary Quick Card */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col gap-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>خلاصه آماری پویش</span>
              </h3>

              <div className="flex flex-col gap-3 text-xs text-slate-300">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950">
                  <span>تعداد کل پرتاب‌های موفق:</span>
                  <span className="font-bold text-amber-400">{toPersianDigits(constellation.length)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950">
                  <span>شهدای ثبت‌شده:</span>
                  <span className="font-bold text-slate-100">{toPersianDigits(martyrs.length)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950">
                  <span>تاریخ و ساعت یادواره:</span>
                  <span className="font-bold text-amber-300">
                    {settings?.memorialDate ? formatJalaliDate(settings.memorialDate) : "-"}
                    {settings?.memorialTime ? ` (ساعت ${toPersianDigits(settings.memorialTime)})` : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Active Missile Model Selector Card (Placed BEFORE Audio Panel) */}
            <div className="md:col-span-3 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-amber-400" />
                  <span>مدل موشک فعال در پویش (نمایش سه‌بعدی و انتخاب آنلاین)</span>
                </h3>
                <span className="text-xs text-amber-300 font-bold bg-amber-500/15 border border-amber-500/40 px-3 py-1 rounded-full self-start sm:self-auto flex items-center gap-2">
                  <span>مدل فعال: {MISSILE_MODELS.find((m) => m.id === (settings?.activeMissileModel || "kheibar"))?.label}</span>
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block border border-white/40 shadow-sm"
                    style={{
                      backgroundColor:
                        MISSILE_MODELS.find((m) => m.id === (settings?.activeMissileModel || "kheibar"))?.colorHex ||
                        "#c5beaf",
                    }}
                  />
                </span>
              </div>
              <p className="text-xs text-slate-400">
                مدیر گرامی، هر یک از موشک‌ها دارای رنگ‌آمیزی و هویت بصری متمایز (فیلی، قهوه‌ای دارک، قهوه‌ای خاکی و قهوه‌ای برنزه دودی)، رنگ یکپارچه کلاهک و بوستر، و استوانه متالیک شفاف نمایش سوخت صلوات است. برای تغییر موشک صفحه اصلی، روی کارت موردنظر کلیک کنید:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {MISSILE_MODELS.map((item) => {
                  const isSelected = (settings?.activeMissileModel || "kheibar") === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectMissileModel(item.id)}
                      className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 cursor-pointer group ${
                        isSelected
                          ? "bg-slate-950 border-amber-500/80 shadow-[0_0_24px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/50"
                          : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70"
                      }`}
                    >
                      <div className="w-full flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full border border-white/20 shadow-sm shrink-0"
                            style={{ backgroundColor: item.colorHex }}
                            title={item.colorName}
                          />
                          <span className={`text-sm font-black ${isSelected ? "text-amber-300" : "text-slate-200"}`}>
                            {item.label}
                          </span>
                        </div>
                        {isSelected ? (
                          <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded-full shadow-sm">
                            فعال در پویش ✓
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-800/80 group-hover:text-slate-200 px-2 py-0.5 rounded-full">
                            انتخاب این مدل
                          </span>
                        )}
                      </div>

                      {/* 3D Model Interactive Preview Box */}
                      <div className="w-full h-44 rounded-xl bg-slate-900/60 border border-slate-800/60 flex items-center justify-center overflow-hidden relative group-hover:border-amber-500/30 transition-colors">
                        <Missile3DThumbnail model={item.id} isSelected={isSelected} className="w-full h-full" />
                      </div>

                      <div className="flex flex-col gap-1.5 w-full">
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                          <span className="text-slate-400">رنگ پوشش بدنه:</span>
                          <span className="font-bold text-slate-200 flex items-center gap-1.5 text-[11px]">
                            <span
                              className="w-2 h-2 rounded-full inline-block border border-white/20"
                              style={{ backgroundColor: item.colorHex }}
                            />
                            {item.colorName}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{item.caption}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Audio & Background Music Control Widget (Placed AFTER Missile Panel) */}
            <div className="md:col-span-3 lg:col-span-1 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col gap-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span>مدیریت صوت و موزیک زمینه</span>
              </h3>

              <div className="flex flex-col gap-3 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-slate-950 flex flex-col gap-1 border border-slate-800">
                  <span className="text-slate-400 text-[11px]">فایل صوت پلی‌گراند:</span>
                  <span className="font-mono text-amber-300 text-[11px] truncate" dir="ltr">
                    bayad-barkhast-playground.mp3
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 text-[11px]">بلندی صدا:</span>
                    <p className="font-bold text-slate-100 mt-0.5">۸۵٪ (0.85)</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 text-[11px]">لود تنبل (Lazy):</span>
                    <p className="font-bold text-emerald-400 mt-0.5">فعال ✓</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleTestAudio}
                  className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    isPlayingAudioTest
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                  }`}
                >
                  {isPlayingAudioTest ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>توقف تست موزیک</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>تست پخش موزیک در پنل</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Daily Targets & Formula Schedule */}
        {activeTab === "targets" && settings && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Target Formula Config */}
            <form
              onSubmit={handleSaveSettings}
              className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col gap-4"
            >
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                <span>پیکربندی فرمول هدف روزانه</span>
              </h3>
              <p className="text-xs text-slate-400">
                فرمول پیش‌فرض محاسبه هدف روزانه به صورت صعودی تا یادواره شهدا عمل می‌کند.
              </p>

              <div>
                <label className="text-xs text-slate-300 block mb-1">هدف روز اول (Start Target)</label>
                <input
                  type="number"
                  value={settings.startTarget}
                  onChange={(e) => setSettings({ ...settings, startTarget: Number(e.target.value) })}
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">میزان افزایش روزانه (Daily Increase)</label>
                <input
                  type="number"
                  value={settings.dailyIncrease}
                  onChange={(e) => setSettings({ ...settings, dailyIncrease: Number(e.target.value) })}
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm"
                />
              </div>

              <button
                type="submit"
                className="mt-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 font-bold text-slate-950 text-xs transition-colors"
              >
                ذخیره فرمول اهداف
              </button>
            </form>

            {/* Custom Target Override Form */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col gap-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>تعیین هدف اختصاصی برای تاریخ خاص</span>
              </h3>
              <p className="text-xs text-slate-400">
                در صورتی که برای مناسبتی خاص (مانند شب یادواره) هدف متفاوتی مدنظر دارید، در این بخش وارد کنید.
              </p>

              <form onSubmit={handleSetTargetOverride} className="flex flex-col gap-3">
                <input
                  type="date"
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm"
                  required
                />
                <input
                  type="number"
                  value={overrideTarget}
                  onChange={(e) => setOverrideTarget(Number(e.target.value))}
                  placeholder="تعداد صلوات هدف"
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm"
                  required
                />
                <button
                  type="submit"
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs transition-colors"
                >
                  ثبت هدف اختصاصی
                </button>
              </form>

              {/* Overrides Table */}
              <div className="mt-4 pt-4 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 mb-2">اهداف اختصاصی ثبت‌شده:</h4>
                {Object.keys(settings.targetOverrides || {}).length === 0 ? (
                  <span className="text-[11px] text-slate-500">هیچ هدف اختصاصی ثبت نشده است.</span>
                ) : (
                  <div className="flex flex-col gap-2">
                    {Object.entries(settings.targetOverrides).map(([date, targetVal]) => (
                      <div
                        key={date}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 text-xs"
                      >
                        <span className="text-slate-300">{date}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-amber-400">{formatPersianNumber(targetVal)}</span>
                          <button
                            onClick={() => handleRemoveTargetOverride(date)}
                            className="text-rose-400 hover:text-rose-300 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Martyrs & Remembrance Manager */}
        {activeTab === "martyrs" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100">
                فهرست شهدای والامقام پویش ({toPersianDigits(martyrs.length)})
              </h3>
              <button
                onClick={() =>
                  setMartyrForm({
                    name: "",
                    title: "شهید والامقام",
                    photoUrl: "",
                    biography: "",
                    quote: "",
                  })
                }
                className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 font-bold text-slate-950 text-xs flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن شهید جدید</span>
              </button>
            </div>

            {/* Martyr Modal Form */}
            {martyrForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                <form
                  onSubmit={handleSaveMartyr}
                  className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col gap-4"
                >
                  <h3 className="text-sm font-bold text-slate-100">
                    {martyrForm.id ? "ویرایش اطلاعات شهید" : "افزودن شهید جدید"}
                  </h3>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">نام و نام خانوادگی شهید *</label>
                    <input
                      type="text"
                      value={martyrForm.name || ""}
                      onChange={(e) => setMartyrForm({ ...martyrForm, name: e.target.value })}
                      className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">عنوان / سمت</label>
                    <input
                      type="text"
                      value={martyrForm.title || ""}
                      onChange={(e) => setMartyrForm({ ...martyrForm, title: e.target.value })}
                      className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">آدرس عکس (URL)</label>
                    <input
                      type="url"
                      value={martyrForm.photoUrl || ""}
                      onChange={(e) => setMartyrForm({ ...martyrForm, photoUrl: e.target.value })}
                      className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">تاریخ شهادت</label>
                    <input
                      type="text"
                      value={martyrForm.martyrdomDate || ""}
                      onChange={(e) => setMartyrForm({ ...martyrForm, martyrdomDate: e.target.value })}
                      className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                      placeholder="مثال: ۱۳۶۲/۱۲/۱۷"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">محل شهادت</label>
                    <input
                      type="text"
                      value={martyrForm.martyrdomLocation || ""}
                      onChange={(e) => setMartyrForm({ ...martyrForm, martyrdomLocation: e.target.value })}
                      className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                      placeholder="مثال: جزیره مجنون"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">زندگینامه و شرح دلاوری‌ها *</label>
                    <textarea
                      value={martyrForm.biography || ""}
                      onChange={(e) => setMartyrForm({ ...martyrForm, biography: e.target.value })}
                      className="w-full h-24 py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">فراز شاخص از وصیت‌نامه / کلام شهید</label>
                    <input
                      type="text"
                      value={martyrForm.quote || ""}
                      onChange={(e) => setMartyrForm({ ...martyrForm, quote: e.target.value })}
                      className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">اختصاص به تاریخ مشخص (اختیاری)</label>
                    <input
                      type="date"
                      value={martyrForm.assignedDate || ""}
                      onChange={(e) => setMartyrForm({ ...martyrForm, assignedDate: e.target.value })}
                      className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setMartyrForm(null)}
                      className="py-2 px-4 rounded-xl bg-slate-800 text-xs text-slate-300"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      className="py-2 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
                    >
                      ذخیره اطلاعات
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Martyrs Cards List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {martyrs.map((martyr) => (
                <div
                  key={martyr.id}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-4"
                >
                  <div className="w-16 h-16 rounded-xl bg-slate-800 overflow-hidden shrink-0">
                    {martyr.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={martyr.photoUrl} alt={martyr.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <Users className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-100 truncate">{martyr.name}</h4>
                    <p className="text-[11px] text-amber-400/90">{martyr.title}</p>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">{martyr.biography}</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setMartyrForm(martyr)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="ویرایش"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteMartyr(martyr.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: General Campaign Settings */}
        {activeTab === "settings" && settings && (
          <form
            onSubmit={handleSaveSettings}
            className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col gap-4 max-w-2xl"
          >
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-400" />
              <span>تنظیمات عمومی پویش</span>
            </h3>

            <div>
              <label className="text-xs text-slate-300 block mb-1">عنوان پویش</label>
              <input
                type="text"
                value={settings.campaignTitle}
                onChange={(e) => setSettings({ ...settings, campaignTitle: e.target.value })}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">شعار و زیرعنوان پویش</label>
              <input
                type="text"
                value={settings.campaignSubtitle}
                onChange={(e) => setSettings({ ...settings, campaignSubtitle: e.target.value })}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">عنوان یادواره شهدا</label>
              <input
                type="text"
                value={settings.memorialTitle}
                onChange={(e) => setSettings({ ...settings, memorialTitle: e.target.value })}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">تاریخ یادواره شهدا</label>
                <input
                  type="date"
                  value={settings.memorialDate}
                  onChange={(e) => setSettings({ ...settings, memorialDate: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">ساعت برگزاری مراسم</label>
                <input
                  type="text"
                  placeholder="19:00"
                  value={settings.memorialTime || ""}
                  onChange={(e) => setSettings({ ...settings, memorialTime: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">ساعت ریست روزانه (۰ تا ۲۳)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={settings.dailyResetHour}
                  onChange={(e) => setSettings({ ...settings, dailyResetHour: Number(e.target.value) })}
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">محل برگزاری مراسم</label>
              <input
                type="text"
                value={settings.memorialLocation}
                onChange={(e) => setSettings({ ...settings, memorialLocation: e.target.value })}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">مدل موشک پیش‌فرض پویش</label>
              <select
                value={settings.activeMissileModel || "kheibar"}
                onChange={(e) => setSettings({ ...settings, activeMissileModel: e.target.value as MissileModel })}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
              >
                {MISSILE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.colorName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">رمز عبور جدید مدیریت (PIN)</label>
              <input
                type="password"
                placeholder="برای تغییر رمز، رمز جدید را وارد کنید"
                value={settings.adminPin || ""}
                onChange={(e) => setSettings({ ...settings, adminPin: e.target.value })}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
              />
              <p className="text-[10px] text-slate-500 mt-1">رمز ذخیره‌شده نمایش داده نمی‌شود. در صورت خالی بودن، رمز فعلی حفظ می‌شود.</p>
            </div>

            <button
              type="submit"
              className="mt-4 py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 font-bold text-slate-950 text-xs self-start"
            >
              ذخیره تغییرات کلی
            </button>
          </form>
        )}

        {/* Tab 5: History & Audit Logs */}
        {activeTab === "history" && (
          <div className="flex flex-col gap-6">
            {/* Constellation History */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800">
              <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>تاریخچه پرتاب‌ها و صورت‌فلکی</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 pb-2">
                      <th className="py-2 px-3">روز</th>
                      <th className="py-2 px-3">تاریخ</th>
                      <th className="py-2 px-3">شهید اختصاصی</th>
                      <th className="py-2 px-3">تعداد صلوات</th>
                      <th className="py-2 px-3">زمان پرتاب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {constellation.map((star) => (
                      <tr key={star.date} className="border-b border-slate-950 hover:bg-slate-950/50">
                        <td className="py-2.5 px-3 font-bold text-amber-400">
                          روز {toPersianDigits(star.dayNumber)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{star.date}</td>
                        <td className="py-2.5 px-3 text-slate-200">{star.martyrName}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-100">
                          {formatPersianNumber(star.salawatCount)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{formatTehranTime(star.launchedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Audit Logs */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800">
              <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>لاگ‌های امنیتی و عملیاتی</span>
              </h3>

              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-amber-400 ml-2">[{log.action}]</span>
                      <span className="text-slate-300">{log.details}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">{formatTehranTime(log.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
