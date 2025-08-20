import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

async function ensureDirectoryExists(path: string) {
  try {
    await mkdir(path, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

async function saveFile(file: File, clubId: string, eventId: string, type: 'files' | 'images') {
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${uuidv4()}-${file.name}`;
  const clubDir = join(UPLOAD_DIR, clubId);
  const eventDir = join(clubDir, eventId);
  const typeDir = join(eventDir, type);
  
  await ensureDirectoryExists(typeDir);
  const path = join(typeDir, filename);
  await writeFile(path, buffer);
  
  return {
    name: file.name,
    url: `/uploads/${clubId}/${eventId}/${type}/${filename}`,
    type: file.type,
    size: file.size
  };
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    
    // For CLUBADMIN, vis kun events fra deres klubb
    // For SUPERADMIN, vis alle events
    const whereClause = user.role === "CLUBADMIN" 
      ? { clubId: user.clubId }
      : {};

    const events = await prisma.event.findMany({
      where: whereClause,
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
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    if (user.role !== "CLUBADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string;
    const location = formData.get("location") as string;
    const maxParticipants = parseInt(formData.get("maxParticipants") as string) || 0;
    const files = formData.getAll("files") as File[];
    const images = formData.getAll("images") as File[];
    const classIds = formData.getAll("classIds") as string[];

    // Først oppretter vi eventet for å få en ID
    const event = await prisma.event.create({
      data: {
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        status: "DRAFT", // All new events start as DRAFT
        maxParticipants,
        clubId: user.clubId
      }
    });

    // Deretter legger vi til filer og bilder
    const updatedEvent = await prisma.event.update({
      where: { id: event.id },
      data: {
        files: {
          create: await Promise.all(files.map(file => saveFile(file, user.clubId, event.id, 'files')))
        },
        images: {
          create: await Promise.all(images.map(image => saveFile(image, user.clubId, event.id, 'images')))
        }
      },
      include: {
        files: true,
        images: true
      }
    });

    // Opprett klasser for eventet hvis noen er valgt
    if (classIds && classIds.length > 0) {
      // Hent club class data
      const clubClasses = await prisma.clubClass.findMany({
        where: {
          id: {
            in: classIds
          },
          clubId: user.clubId,
          isActive: true
        }
      });

      // Opprett klasser basert på klubbklasser
      await prisma.class.createMany({
        data: clubClasses.map(clubClass => ({
          eventId: event.id,
          name: clubClass.name,
          minWeight: clubClass.minWeight,
          maxWeight: clubClass.maxWeight
        }))
      });
    }

    // Hent det oppdaterte eventet med klasser
    const finalEvent = await prisma.event.findUnique({
      where: { id: event.id },
      include: {
        files: true,
        images: true,
        classes: true,
        club: true
      }
    });

    return NextResponse.json(finalEvent);
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    if (user.role !== "CLUBADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const eventId = formData.get("id") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string;
    const location = formData.get("location") as string;
    const status = formData.get("status") as string;
    const maxParticipants = parseInt(formData.get("maxParticipants") as string) || 0;
    const files = formData.getAll("files") as File[];
    const images = formData.getAll("images") as File[];

    // Først oppdaterer vi eventet
    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        status: status as any,
        maxParticipants
      }
    });

    // Deretter legger vi til nye filer og bilder
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        files: {
          create: await Promise.all(files.map(file => saveFile(file, user.clubId, eventId, 'files')))
        },
        images: {
          create: await Promise.all(images.map(image => saveFile(image, user.clubId, eventId, 'images')))
        }
      },
      include: {
        files: true,
        images: true
      }
    });

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    if (user.role !== "CLUBADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("id");

    if (!eventId) {
      return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
    }

    // Slett eventet (dette vil også slette tilknyttede filer og bilder via cascade)
    await prisma.event.delete({
      where: { id: eventId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 