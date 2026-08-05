import { NextResponse } from "next/server";
import { extractDocumentData } from "@/lib/ocr";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "GEMINI_API_KEY غير مضبوط" }, { status: 503 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "ملف مطلوب" }, { status: 400 });
    }
    const data = await extractDocumentData(file, key);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل OCR" },
      { status: 500 },
    );
  }
}
