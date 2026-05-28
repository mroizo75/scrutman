import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { INSPECTOR_ROLES } from "@/lib/auth";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userData = cookieStore.get("user");
  if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = JSON.parse(userData.value);
  if (!(INSPECTOR_ROLES as readonly string[]).includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WEBP and PDF files are accepted" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const filename = `${randomUUID()}.${ext}`;
  const uploadDir = join(process.cwd(), "public", "uploads", "transfer-docs");
  const filePath = join(uploadDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  return NextResponse.json({
    url: `/uploads/transfer-docs/${filename}`,
    type: file.type,
  });
}
