"use client";

import { useState } from "react";
import type { StoreInfo } from "@/lib/types";
import { updateStoreInfo } from "@/lib/apiClient";

const FIELDS: { key: keyof StoreInfo; label: string; placeholder?: string }[] = [
  { key: "description", label: "Description" },
  { key: "address", label: "Address" },
  { key: "phone", label: "Phone" },
  { key: "whatsappNumber", label: "WhatsApp Number", placeholder: "9647701234567" },
  { key: "logoUrl", label: "Logo URL" },
  { key: "facebookUrl", label: "Facebook URL" },
  { key: "instagramUrl", label: "Instagram URL" },
  { key: "tiktokUrl", label: "TikTok URL" },
  { key: "themeColor", label: "Theme Color", placeholder: "#2563eb" },
];

export function StoreEditForm({
  slug,
  businessName,
  info,
}: {
  slug: string;
  businessName: string;
  info?: StoreInfo;
}) {
  const [name, setName] = useState(businessName);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(FIELDS.map((f) => [f.key, info?.[f.key] ?? ""]))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateStoreInfo(slug, { businessName: name, ...values });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-sm font-semibold">Edit Store</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Store Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
          />
        </Field>
        {FIELDS.map((f) => (
          <Field key={f.key} label={f.label}>
            <input
              value={values[f.key]}
              placeholder={f.placeholder}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
            />
          </Field>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved</span>}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
