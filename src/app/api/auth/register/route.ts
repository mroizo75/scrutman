import { NextResponse } from "next/server";
import { hash } from "bcrypt";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function POST(req: Request) {
  console.log("Register API called");
  try {
    const body = await req.json();
    console.log("Request body:", body);
    
    const { email, password, name } = body;

    // Valider input
    if (!email || !password || !name) {
      console.log("Missing required fields");
      return new NextResponse(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Sjekk om bruker allerede eksisterer
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log("User already exists:", email);
      return new NextResponse(
        JSON.stringify({ error: "Bruker med denne e-posten eksisterer allerede" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Hash passordet
    const hashedPassword = await hash(password, 10);

    // Opprett superadmin
    console.log("Creating new user:", email);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: UserRole.SUPERADMIN,
      },
    });

    console.log("User created successfully:", user.id);

    // Returner bruker uten passord
    const { password: _, ...userWithoutPassword } = user;
    
    return new NextResponse(
      JSON.stringify(userWithoutPassword),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {

    return new NextResponse(
      JSON.stringify({ error: "Something went wrong during registration" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
} 