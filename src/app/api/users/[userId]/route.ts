import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const resolvedParams = await params;
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    
    // Users can only access their own profile, or admins can access any profile
    if (user.id !== resolvedParams.userId && user.role !== "SUPERADMIN" && user.role !== "CLUBADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: resolvedParams.userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        licenseNumber: true,
        licenseReceiptUrl: true,
        licenseExpiryDate: true,
        memberClub: true,
        dateOfBirth: true,
        address: true,
        city: true,
        postalCode: true,
        country: true,
        emergencyContact: true,
        emergencyPhone: true,
        role: true,
        club: {
          select: {
            id: true,
            name: true,
            city: true,
            country: true
          }
        },
        createdAt: true,
        updatedAt: true,
        registrations: {
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
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        },
        vehicles: {
          select: {
            id: true,
            startNumber: true,
            make: true,
            model: true,
            year: true,
            category: true,
          },
          orderBy: {
            startNumber: 'asc'
          }
        }
      }
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(targetUser);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const resolvedParams = await params;
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    
    // Users can only update their own profile, or admins can update any profile
    if (user.id !== resolvedParams.userId && user.role !== "SUPERADMIN" && user.role !== "CLUBADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const {
      name,
      email,
      phone,
      role,
      licenseNumber,
      licenseExpiryDate,
      memberClub,
      dateOfBirth,
      address,
      city,
      postalCode,
      country,
      emergencyContact,
      emergencyPhone,
    } = await request.json();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: resolvedParams.userId }
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: resolvedParams.userId },
      data: {
        name: name || undefined,
        email: email || undefined,
        phone: phone || null,
        role: role || undefined,
        licenseNumber: licenseNumber || null,
        licenseExpiryDate: licenseExpiryDate ? new Date(licenseExpiryDate) : null,
        memberClub: memberClub || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        address: address || null,
        city: city || null,
        postalCode: postalCode || null,
        country: country || null,
        emergencyContact: emergencyContact || null,
        emergencyPhone: emergencyPhone || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        licenseNumber: true,
        licenseReceiptUrl: true,
        licenseExpiryDate: true,
        memberClub: true,
        dateOfBirth: true,
        address: true,
        city: true,
        postalCode: true,
        country: true,
        emergencyContact: true,
        emergencyPhone: true,
        role: true,
        club: {
          select: {
            id: true,
            name: true,
            city: true,
            country: true
          }
        },
        createdAt: true,
        updatedAt: true,
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const resolvedParams = await params;
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    
    // Only CLUBADMIN and SUPERADMIN can delete users
    if (user.role !== "SUPERADMIN" && user.role !== "CLUBADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: resolvedParams.userId }
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // CLUBADMIN can only delete users from their own club
    if (user.role === "CLUBADMIN" && targetUser.clubId !== user.clubId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Don't allow deleting yourself
    if (targetUser.id === user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    // Delete user
    await prisma.user.delete({
      where: { id: resolvedParams.userId }
    });

    console.log("User deleted successfully:", resolvedParams.userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
