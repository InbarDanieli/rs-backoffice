import { NextRequest, NextResponse } from "next/server";
import { findSponsorById } from "@/lib/sponsors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;
  const sponsor = await findSponsorById(id);
  if (!sponsor) {
    return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
  }

  return NextResponse.json({
    logo: sponsor.logo || null,
    carouselImages: sponsor.carouselImages ?? [],
    testimonials: sponsor.testimonials.map((t, index) => ({
      index,
      image: t.image || null,
    })),
  });
}
