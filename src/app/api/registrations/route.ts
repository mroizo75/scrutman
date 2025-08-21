import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    
    // Only athletes can register for events
    if (user.role !== "ATHLETE") {
      return NextResponse.json({ error: "Only athletes can register for events" }, { status: 403 });
    }

    const { eventId, classId, selectedVehicleIds, depotSize, needsPower, depotNotes, vehicle } = await request.json();

    // Validate required fields
    if (!eventId || !classId) {
      return NextResponse.json(
        { error: "Event ID and class ID are required" },
        { status: 400 }
      );
    }

    // Check if event exists and is published
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        registrations: {
          where: { status: { not: "CANCELLED" } }
        },
        classes: true
      }
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Event is not open for registration" }, { status: 400 });
    }

    // Check if registration period is open
    const now = new Date();
    if (event.registrationStartDate && now < event.registrationStartDate) {
      return NextResponse.json({ error: "Registration has not opened yet" }, { status: 400 });
    }
    
    if (event.registrationEndDate && now > event.registrationEndDate) {
      return NextResponse.json({ error: "Registration has closed" }, { status: 400 });
    }

    // Check if user is already registered for this event
    console.log("Checking existing registration for user:", user.id, "event:", eventId);
    const existingRegistration = await prisma.registration.findFirst({
      where: {
        userId: user.id,
        eventId: eventId,
        status: { not: "CANCELLED" }
      }
    });

    console.log("Existing registration found:", existingRegistration);
    if (existingRegistration) {
      console.log("Registration exists with status:", existingRegistration.status);
      return NextResponse.json({ 
        error: "You are already registered for this event",
        debug: {
          existingRegistrationId: existingRegistration.id,
          status: existingRegistration.status,
          startNumber: existingRegistration.startNumber
        }
      }, { status: 400 });
    }

    // Check if event is full
    if (event.maxParticipants > 0) {
      const confirmedRegistrations = event.registrations.filter(r => r.status === "CONFIRMED");
      if (confirmedRegistrations.length >= event.maxParticipants) {
        return NextResponse.json({ error: "Event is full" }, { status: 400 });
      }
    }

    // Validate class exists for this event
    const eventClass = event.classes.find(c => c.id === classId);
    if (!eventClass) {
      return NextResponse.json({ error: "Invalid class for this event" }, { status: 400 });
    }

    // Determine start number
    let startNumber = 1;
    
    if (selectedVehicleIds && selectedVehicleIds.length > 0) {
      // Use the start number from the first selected vehicle
      const selectedVehicle = await prisma.userVehicle.findFirst({
        where: { 
          id: selectedVehicleIds[0],
          userId: user.id
        }
      });
      
      if (selectedVehicle) {
        const vehicleStartNumber = parseInt(selectedVehicle.startNumber);
        if (!isNaN(vehicleStartNumber)) {
          // Check if this start number is already taken in this event
          const existingRegistration = event.registrations.find(r => r.startNumber === vehicleStartNumber);
          if (existingRegistration) {
            return NextResponse.json({ 
              error: `Start number #${vehicleStartNumber} is already taken in this event` 
            }, { status: 400 });
          }
          startNumber = vehicleStartNumber;
        }
      }
    } else {
      // Generate sequential start number if no vehicle selected
      const existingNumbers = event.registrations.map(r => r.startNumber);
      while (existingNumbers.includes(startNumber)) {
        startNumber++;
      }
    }

    // Validate vehicle data if required
    if (event.requiresVehicle) {
      if ((!selectedVehicleIds || selectedVehicleIds.length === 0) && (!vehicle || !vehicle.make || !vehicle.model || !vehicle.category)) {
        return NextResponse.json({ 
          error: "Vehicle information is required for this event" 
        }, { status: 400 });
      }
    }

    // Create registration
    const registration = await prisma.registration.create({
      data: {
        startNumber,
        status: "CONFIRMED", // Auto-confirm for now
        userId: user.id,
        eventId: eventId,
        classId: classId,
        // Link to first selected vehicle if any
        userVehicleId: (selectedVehicleIds && selectedVehicleIds.length > 0) ? selectedVehicleIds[0] : null,
        depotSize: depotSize as any || null,
        needsPower: needsPower || false,
        depotNotes: depotNotes || null,
        // Legacy vehicle creation (if no selectedVehicleIds)
        vehicle: (!selectedVehicleIds || selectedVehicleIds.length === 0) && event.requiresVehicle && vehicle ? {
          create: {
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year || null,
            color: vehicle.color || null,
            licensePlate: vehicle.licensePlate || null,
            engineSize: vehicle.engineSize || null,
            fuelType: vehicle.fuelType || null,
            category: vehicle.category,
          }
        } : undefined
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        event: {
          select: {
            id: true,
            title: true
          }
        },
        class: {
          select: {
            id: true,
            name: true
          }
        },
        userVehicle: true,
        vehicle: true,
        registrationVehicles: {
          include: {
            userVehicle: true
          }
        }
      }
    });

    // Create RegistrationVehicle records for each selected vehicle
    if (selectedVehicleIds && selectedVehicleIds.length > 0) {
      for (let i = 0; i < selectedVehicleIds.length; i++) {
        const vehicleId = selectedVehicleIds[i];
        
        // Get the vehicle to use its start number
        const vehicle = await prisma.userVehicle.findFirst({
          where: { 
            id: vehicleId,
            userId: user.id
          }
        });
        
        if (vehicle) {
          const vehicleStartNumber = parseInt(vehicle.startNumber);
          
          // For multiple vehicles, check if start number is available
          if (i > 0) {
            const existingRegistration = event.registrations.find(r => r.startNumber === vehicleStartNumber);
            if (existingRegistration) {
              return NextResponse.json({ 
                error: `Start number #${vehicleStartNumber} from vehicle ${vehicle.make} ${vehicle.model} is already taken` 
              }, { status: 400 });
            }
          }
          
          await prisma.registrationVehicle.create({
            data: {
              registrationId: registration.id,
              userVehicleId: vehicleId,
              startNumber: vehicleStartNumber
            }
          });
        }
      }
    }

    // Fetch the final registration with all vehicles
    const finalRegistration = await prisma.registration.findUnique({
      where: { id: registration.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        event: {
          select: {
            id: true,
            title: true
          }
        },
        class: {
          select: {
            id: true,
            name: true
          }
        },
        userVehicle: true,
        vehicle: true,
        registrationVehicles: {
          include: {
            userVehicle: true
          }
        }
      }
    });

    console.log("Registration created successfully:", registration.id, "Start number:", startNumber);

    return NextResponse.json(finalRegistration, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    
    // Get user's registrations
    const registrations = await prisma.registration.findMany({
      where: {
        userId: user.id
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            location: true,
            status: true,
            club: {
              select: {
                name: true
              }
            }
          }
        },
        class: {
          select: {
            name: true
          }
        },
        vehicle: true,
        technicalCheck: true,
        weightCheck: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(registrations);
  } catch (error) {
    console.error("Error fetching registrations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
