import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// Update club admin
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ clubId: string; userId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    const resolvedParams = await params;

    // Only superadmins can manage club admins
    if (user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, email } = await request.json();

    if (!name || !email) {
      return NextResponse.json({ 
        error: "Name and email are required" 
      }, { status: 400 });
    }

    // Check if club exists
    const club = await prisma.club.findUnique({
      where: { id: resolvedParams.clubId }
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: resolvedParams.userId },
      data: {
        name,
        email
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        clubId: true,
        createdAt: true
      }
    });

    return NextResponse.json(updatedUser);

  } catch (error) {
    console.error('Error updating club admin:', error);
    return NextResponse.json(
      { error: 'Failed to update club admin' },
      { status: 500 }
    );
  }
}

// Remove club admin
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ clubId: string; userId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    const resolvedParams = await params;

    // Only superadmins can manage club admins
    if (user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if club exists
    const club = await prisma.club.findUnique({
      where: { id: resolvedParams.clubId }
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Check if user exists and is a club admin for this club
    const adminUser = await prisma.user.findFirst({
      where: {
        id: resolvedParams.userId,
        clubId: resolvedParams.clubId,
        role: "CLUBADMIN"
      }
    });

    if (!adminUser) {
      return NextResponse.json({ 
        error: "Club admin not found" 
      }, { status: 404 });
    }

    // Delete the user
    await prisma.user.delete({
      where: { id: resolvedParams.userId }
    });

    return NextResponse.json({ message: "Club admin removed successfully" });

  } catch (error) {
    console.error('Error removing club admin:', error);
    return NextResponse.json(
      { error: 'Failed to remove club admin' },
      { status: 500 }
    );
  }
}