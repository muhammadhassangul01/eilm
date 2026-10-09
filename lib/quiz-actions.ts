"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";

import { getAdminSession } from "@/lib/auth";
import { addRegistryEntry, deleteRegistryEntry, setRegistryEntryEnabled } from "@/lib/quiz-registry";

const PORTAL_CACHE_TAG = "portal";

function registryUrl(params: Record<string, string>): string {
  const search = new URLSearchParams({ section: "registry", ...params });
  return `/admin?${search.toString()}#registry`;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "The quiz registry could not be updated.";
}

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin");
  }
}

export async function addQuizAction(formData: FormData) {
  await requireAdmin();

  const title = String(formData.get("title") ?? "");
  const formUrl = String(formData.get("formUrl") ?? "");
  const sheetUrl = String(formData.get("sheetUrl") ?? "");

  let result: Awaited<ReturnType<typeof addRegistryEntry>>;
  try {
    result = await addRegistryEntry({ title, formUrl, sheetUrl });
  } catch (error) {
    result = { ok: false, error: messageOf(error) };
  }

  if (!result.ok) {
    redirect(registryUrl({ error: result.error }));
  }

  updateTag(PORTAL_CACHE_TAG);
  redirect(registryUrl({ added: title.trim() }));
}

export async function toggleQuizAction(formData: FormData) {
  await requireAdmin();

  const row = Number(formData.get("row"));
  const enabled = String(formData.get("enabled") ?? "") === "true";

  let result: Awaited<ReturnType<typeof setRegistryEntryEnabled>>;
  try {
    result = await setRegistryEntryEnabled(row, enabled);
  } catch (error) {
    result = { ok: false, error: messageOf(error) };
  }

  if (!result.ok) {
    redirect(registryUrl({ error: result.error }));
  }

  updateTag(PORTAL_CACHE_TAG);
  redirect(registryUrl({ updated: "1" }));
}

export async function deleteQuizAction(formData: FormData) {
  await requireAdmin();

  const row = Number(formData.get("row"));

  let result: Awaited<ReturnType<typeof deleteRegistryEntry>>;
  try {
    result = await deleteRegistryEntry(row);
  } catch (error) {
    result = { ok: false, error: messageOf(error) };
  }

  if (!result.ok) {
    redirect(registryUrl({ error: result.error }));
  }

  updateTag(PORTAL_CACHE_TAG);
  redirect(registryUrl({ removed: "1" }));
}
