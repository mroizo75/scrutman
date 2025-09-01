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

export async function POST(
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
    
    // Users can only upload their own license receipt
    if (user.id !== resolvedParams.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type (only allow images and PDFs)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: "Invalid file type. Only JPG, PNG, and PDF files are allowed." 
      }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: "File too large. Maximum size is 5MB." 
      }, { status: 400 });
    }

    // Create user-specific directory
    const userDir = join(UPLOAD_DIR, resolvedParams.userId);
    await ensureDirectoryExists(userDir);

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const filename = `license-receipt-${uuidv4()}.${fileExtension}`;
    const filePath = join(userDir, filename);

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Generate URL for the file
    const fileUrl = `/uploads/${resolvedParams.userId}/${filename}`;

    // Update user with license receipt URL
    const updatedUser = await prisma.user.update({
      where: { id: resolvedParams.userId },
      data: {
        licenseReceiptUrl: fileUrl
      },
      select: {
        id: true,
        licenseReceiptUrl: true
      }
    });

    return NextResponse.json({
      message: "License receipt uploaded successfully",
      fileUrl: fileUrl,
      user: updatedUser
    });

  } catch (error) {
    console.error("Error uploading license receipt:", error);
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
    
    // Users can only delete their own license receipt
    if (user.id !== resolvedParams.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Remove license receipt URL from user
    const updatedUser = await prisma.user.update({
      where: { id: resolvedParams.userId },
      data: {
        licenseReceiptUrl: null
      },
      select: {
        id: true,
        licenseReceiptUrl: true
      }
    });

    return NextResponse.json({
      message: "License receipt deleted successfully",
      user: updatedUser
    });

  } catch (error) {
    console.error("Error deleting license receipt:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
