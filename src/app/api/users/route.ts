import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    if (user.role !== "CLUBADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // SUPERADMIN kan se alle brukere, CLUBADMIN kun sine egen klubbs brukere
    const whereClause = user.role === "SUPERADMIN" ? {} : { clubId: user.clubId };

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        clubId: true,
        createdAt: true
      }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: "Internal Server Error" },
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
    if (user.role !== "CLUBADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email, name, phone, role } = await request.json();

    // Generer et tilfeldig passord
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        phone,
        role,
        clubId: user.role === "SUPERADMIN" ? null : user.clubId, // SUPERADMIN kan opprette brukere uten clubId
        password: hashedPassword
      }
    });

    // TODO: Send e-post til brukeren med midlertidig passord
    console.log('Temporary password for new user:', tempPassword);

    return NextResponse.json({
      ...newUser,
      password: undefined // Fjern passordet fra responsen
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 