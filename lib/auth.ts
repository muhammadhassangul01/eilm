import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getPortalSnapshot, matchStudentLogin } from "@/lib/student-data";

export const STUDENT_SESSION_COOKIE = "eilm_student_session";
export const ADMIN_SESSION_COOKIE = "eilm_admin_session";

type StudentSession = { id: string; name: string; number: string };
type AdminSession = { role: string };

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (secret) {
    return secret;
  }

  console.warn(
    "[auth] SESSION_SECRET is not set; using a development-only signing secret. Sessions are rejected once a real secret is configured.",
  );
  return "eilm-development-session-secret";
}

function sign(body: string): string {
  return crypto.createHmac("sha256", sessionSecret()).update(body).digest("base64url");
}

function encodeSession(payload: StudentSession | AdminSession): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

function decodeSession<T>(value: string | undefined): T | null {
  if (!value) {
    return null;
  }

  const separator = value.lastIndexOf(".");
  if (separator <= 0) {
    return null;
  }

  const body = value.slice(0, separator);
  const signature = Buffer.from(value.slice(separator + 1));
  const expected = Buffer.from(sign(body));

  if (signature.length !== expected.length || !crypto.timingSafeEqual(signature, expected)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

async function setCookie(name: string, value: string) {
  const cookieStore = await cookies();
  cookieStore.set(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function handleStudentLogin(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const number = String(formData.get("number") ?? "").trim();
  const countryCode = String(formData.get("countryCode") ?? "PK").trim();

  const snapshot = await getPortalSnapshot();
  if (snapshot.error) {
    redirect(`/student-portal?error=${encodeURIComponent(snapshot.error)}`);
  }

  const result = matchStudentLogin(snapshot.registrations, { name, number, countryCode });
  if (!result.ok) {
    redirect(`/student-portal?error=${encodeURIComponent(result.reason)}`);
  }

  await setCookie(
    STUDENT_SESSION_COOKIE,
    encodeSession({
      id: result.student.id,
      name: result.student.name,
      number: result.student.number,
    }),
  );

  redirect("/student-status");
}

export async function handleAdminLogin(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "").trim();
  const configuredPassword = process.env.ADMIN_PASSWORD || "admin123";

  if (password !== configuredPassword) {
    redirect(`/admin?error=${encodeURIComponent("Invalid admin password.")}`);
  }

  await setCookie(ADMIN_SESSION_COOKIE, encodeSession({ role: "admin" }));
  redirect("/admin");
}

export async function logoutStudent() {
  "use server";
  const cookieStore = await cookies();
  cookieStore.delete(STUDENT_SESSION_COOKIE);
  redirect("/student-portal");
}

export async function logoutAdmin() {
  "use server";
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  redirect("/admin");
}

export async function getStudentSession() {
  "use server";
  const cookieStore = await cookies();
  return decodeSession<StudentSession>(cookieStore.get(STUDENT_SESSION_COOKIE)?.value);
}

export async function getAdminSession() {
  "use server";
  const cookieStore = await cookies();
  return decodeSession<AdminSession>(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}
