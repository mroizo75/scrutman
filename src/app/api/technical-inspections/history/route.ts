import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// Get technical inspection history for a vehicle across all events and clubs
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    if (user.role !== "TECHNICAL_INSPECTOR" && user.role !== "CLUBADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const chassisNumber = searchParams.get("chassisNumber");
    const licensePlate = searchParams.get("licensePlate");

    if (!chassisNumber && !licensePlate) {
      return NextResponse.json({ 
        error: "Either chassisNumber or licensePlate is required" 
      }, { status: 400 });
    }

    // Build search conditions
    const whereConditions: any[] = [];
    
    if (chassisNumber) {
      whereConditions.push({ chassisNumber: chassisNumber });
    }
    
    if (licensePlate) {
      whereConditions.push({ licensePlate: licensePlate });
    }

    const inspectionHistory = await prisma.technicalInspection.findMany({
      where: {
        OR: whereConditions
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            location: true
          }
        },
        inspector: {
          select: {
            name: true
          }
        },
        club: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        inspectionDate: 'desc'
      }
    });

    // Group by vehicle identification and provide summary
    const vehicleInfo = inspectionHistory.length > 0 ? {
      chassisNumber: inspectionHistory[0].chassisNumber,
      licensePlate: inspectionHistory[0].licensePlate,
      make: inspectionHistory[0].make,
      model: inspectionHistory[0].model,
      year: inspectionHistory[0].year,
    } : null;

    // Count status occurrences
    const statusSummary = inspectionHistory.reduce((acc, inspection) => {
      acc[inspection.status] = (acc[inspection.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get latest status and any critical notes
    const latestInspection = inspectionHistory[0];
    const hasCriticalIssues = inspectionHistory.some(i => 
      i.status === 'REJECTED' && 
      new Date(i.inspectionDate) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Within last year
    );

    return NextResponse.json({
      vehicleInfo,
      latestInspection,
      hasCriticalIssues,
      statusSummary,
      totalInspections: inspectionHistory.length,
      inspectionHistory: inspectionHistory.slice(0, 10), // Last 10 inspections
      allInspections: inspectionHistory // Full history if needed
    });
  } catch (error) {
    console.error('Error fetching technical inspection history:', error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
