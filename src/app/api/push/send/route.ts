import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Deprecated endpoint. Push is now dispatched by backend jobs only.",
    },
    { status: 410 },
  );
}
