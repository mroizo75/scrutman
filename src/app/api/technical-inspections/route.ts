import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { broadcastUpdate, REALTIME_EVENTS } from "@/lib/realtime";

// Get technical inspections for an event or search by vehicle info
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
    const eventId = searchParams.get("eventId");
    const chassisNumber = searchParams.get("chassisNumber");
    const licensePlate = searchParams.get("licensePlate");
    const startNumber = searchParams.get("startNumber");

    let whereClause: any = {};

    // If searching by vehicle identification for history
    if (chassisNumber || licensePlate) {
      whereClause = {
        OR: [
          chassisNumber ? { chassisNumber: { contains: chassisNumber } } : {},
          licensePlate ? { licensePlate: { contains: licensePlate } } : {},
        ].filter(condition => Object.keys(condition).length > 0)
      };
    }
    // If getting inspections for specific event
    else if (eventId) {
      whereClause.eventId = eventId;
      
      // Optional filter by start number within event
      if (startNumber) {
        whereClause.startNumber = parseInt(startNumber);
      }
    }
    // If no filters, get recent inspections for user's club
    else {
      whereClause.clubId = user.clubId;
    }

    const inspections = await prisma.technicalInspection.findMany({
      where: whereClause,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            club: {
              select: {
                name: true
              }
            }
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
        },
        vehicle: {
          select: {
            startNumber: true,
            user: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        inspectionDate: 'desc'
      },
      take: chassisNumber || licensePlate ? 20 : 100 // More results when searching history
    });

    return NextResponse.json(inspections);
  } catch (error) {
    console.error('Error fetching technical inspections:', error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Create or update technical inspection
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    if (user.role !== "TECHNICAL_INSPECTOR") {
      return NextResponse.json({ error: "Forbidden - Only technical inspectors can perform inspections" }, { status: 403 });
    }

    const {
      eventId,
      startNumber,
      vehicleId,
      chassisNumber,
      licensePlate,
      make,
      model,
      year,
      status,
      notes
    } = await request.json();

    // Validate required fields
    if (!eventId || !startNumber || !make || !model || !status) {
      return NextResponse.json({ 
        error: "Missing required fields: eventId, startNumber, make, model, status" 
      }, { status: 400 });
    }

    // Check if inspection already exists for this event/start number
    const existingInspection = await prisma.technicalInspection.findUnique({
      where: {
        eventId_startNumber: {
          eventId,
          startNumber: parseInt(startNumber)
        }
      }
    });

    if (existingInspection) {
      // Update existing inspection
      const updatedInspection = await prisma.technicalInspection.update({
        where: { id: existingInspection.id },
        data: {
          status,
          notes,
          inspectionDate: new Date(),
          inspectorId: user.id,
          // Update vehicle info if provided
          ...(vehicleId && { vehicleId }),
          ...(chassisNumber && { chassisNumber }),
          ...(licensePlate && { licensePlate }),
          make,
          model,
          ...(year && { year: parseInt(year) }),
        },
        include: {
          event: {
            select: {
              title: true
            }
          },
          inspector: {
            select: {
              name: true
            }
          }
        }
      });

      return NextResponse.json(updatedInspection);
    } else {
      // Create new inspection
      const newInspection = await prisma.technicalInspection.create({
        data: {
          eventId,
          startNumber: parseInt(startNumber),
          inspectorId: user.id,
          clubId: user.clubId,
          status,
          notes,
          vehicleId: vehicleId || null,
          chassisNumber: chassisNumber || null,
          licensePlate: licensePlate || null,
          make,
          model,
          year: year ? parseInt(year) : null,
        },
        include: {
          event: {
            select: {
              title: true
            }
          },
          inspector: {
            select: {
              name: true
            }
          }
        }
      });

      // Broadcast real-time update
      await broadcastUpdate(eventId, REALTIME_EVENTS.TECHNICAL_UPDATED, {
        participantId: newInspection.id,
        startNumber: startNumber,
        status: status,
        inspectorName: user.name,
        timestamp: new Date().toISOString(),
        inspectionId: newInspection.id
      });

      return NextResponse.json(newInspection, { status: 201 });
    }
  } catch (error) {
    console.error('Error creating/updating technical inspection:', error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
