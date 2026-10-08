import { NextRequest, NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { getPortalSnapshot } from "@/lib/student-data";

export async function GET(request: NextRequest) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "json";

  if (type !== "json") {
    return NextResponse.json(
      { error: "Only JSON exports are supported." },
      { status: 400 },
    );
  }

  const snapshot = await getPortalSnapshot();

  if (snapshot.error) {
    return NextResponse.json({ error: snapshot.error }, { status: 500 });
  }

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      registrations: snapshot.registrations,
      submissions: snapshot.submissions,
      metrics: snapshot.metrics,
      quizDefinitions: snapshot.quizDefinitions,
      registrySource: snapshot.registrySource,
      warnings: snapshot.warnings,
    },
    {
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
