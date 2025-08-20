import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Update federation admin
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ adminId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    const resolvedParams = await params;

    // Only federation admins can update other federation admins
    if (user.role !== "FEDERATION_ADMIN") {
      return NextResponse.json({ error: "Only federation admins can update other admins" }, { status: 403 });
    }

    const {
      name,
      email,
      password,
      phone,
      address,
      city,
      postalCode,
      country
    } = await request.json();

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    // Check if admin exists and is a federation admin
    const existingAdmin = await prisma.user.findUnique({
      where: { id: resolvedParams.adminId }
    });

    if (!existingAdmin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    if (existingAdmin.role !== "FEDERATION_ADMIN") {
      return NextResponse.json({ error: "User is not a federation admin" }, { status: 400 });
    }

    // Check if email is already taken by another user
    if (email !== existingAdmin.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      });

      if (emailExists) {
        return NextResponse.json({ error: "Email already exists" }, { status: 400 });
      }
    }

    // Prepare update data
    const updateData: any = {
      name,
      email,
      phone: phone || null,
      address: address || null,
      city: city || null,
      postalCode: postalCode || null,
      country: country || null
    };

    // Only update password if provided
    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 12);
    }

    // Update admin
    const updatedAdmin = await prisma.user.update({
      where: { id: resolvedParams.adminId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        postalCode: true,
        country: true,
        createdAt: true
      }
    });

    return NextResponse.json(updatedAdmin);
  } catch (error) {
    console.error('Error updating federation admin:', error);
    return NextResponse.json(
      { error: 'Failed to update federation admin' },
      { status: 500 }
    );
  }
}

// Delete federation admin
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ adminId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    const resolvedParams = await params;

    // Only federation admins can delete other federation admins
    if (user.role !== "FEDERATION_ADMIN") {
      return NextResponse.json({ error: "Only federation admins can delete other admins" }, { status: 403 });
    }

    // Prevent deleting yourself
    if (user.id === resolvedParams.adminId) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    // Check if admin exists and is a federation admin
    const existingAdmin = await prisma.user.findUnique({
      where: { id: resolvedParams.adminId }
    });

    if (!existingAdmin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    if (existingAdmin.role !== "FEDERATION_ADMIN") {
      return NextResponse.json({ error: "User is not a federation admin" }, { status: 400 });
    }

    // Check if this is the last federation admin
    const adminCount = await prisma.user.count({
      where: { role: "FEDERATION_ADMIN" }
    });

    if (adminCount <= 1) {
      return NextResponse.json({ 
        error: "Cannot delete the last federation admin. At least one admin must remain." 
      }, { status: 400 });
    }

    // Delete admin
    await prisma.user.delete({
      where: { id: resolvedParams.adminId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting federation admin:', error);
    return NextResponse.json(
      { error: 'Failed to delete federation admin' },
      { status: 500 }
    );
  }
}
