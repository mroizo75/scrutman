import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Get all federation admins
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);

    // Only federation admins can manage other federation admins
    if (user.role !== "FEDERATION_ADMIN") {
      return NextResponse.json({ error: "Only federation admins can access this endpoint" }, { status: 403 });
    }

    const admins = await prisma.user.findMany({
      where: {
        role: "FEDERATION_ADMIN"
      },
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
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return NextResponse.json(admins);
  } catch (error) {
    console.error('Error fetching federation admins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch federation admins' },
      { status: 500 }
    );
  }
}

// Create new federation admin
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);

    // Only federation admins can create other federation admins
    if (user.role !== "FEDERATION_ADMIN") {
      return NextResponse.json({ error: "Only federation admins can create other admins" }, { status: 403 });
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
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new federation admin
    const newAdmin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "FEDERATION_ADMIN",
        phone: phone || null,
        address: address || null,
        city: city || null,
        postalCode: postalCode || null,
        country: country || null
      },
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

    return NextResponse.json(newAdmin, { status: 201 });
  } catch (error) {
    console.error('Error creating federation admin:', error);
    return NextResponse.json(
      { error: 'Failed to create federation admin' },
      { status: 500 }
    );
  }
}
