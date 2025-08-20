import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Offentlig API - vis kun publiserte events uten autentisering
    const events = await prisma.event.findMany({
      where: {
        status: 'PUBLISHED' // Kun publiserte events på forsiden
      },
      include: {
        registrations: {
          include: {
            user: true
          }
        },
        files: true,
        images: true,
        club: true
      },
      orderBy: {
        startDate: 'asc'
      }
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching public events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
