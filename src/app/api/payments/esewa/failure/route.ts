import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");
  const base = process.env.NEXTAUTH_URL!;

  if (taskId) {
    return NextResponse.redirect(`${base}/tasks/${taskId}?payment=failed`);
  }
  return NextResponse.redirect(`${base}/dashboard?payment=failed`);
}
