import { NextResponse } from "next/server";
import { compare } from "bcrypt";
import { prisma } from "@/lib/prisma";
import { sign } from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
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

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return new NextResponse(
        JSON.stringify({ error: "No user found with this email" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      return new NextResponse(
        JSON.stringify({ error: "Incorrect password" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { password: _, ...userWithoutPassword } = user;

    return new NextResponse(
      JSON.stringify(userWithoutPassword),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Login error:", error);
          return new NextResponse(
        JSON.stringify({ error: "Something went wrong during login" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
  }
} 