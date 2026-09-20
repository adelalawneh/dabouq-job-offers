import { NextResponse } from "next/server";
import {
  quickParseOfferRequest,
  runOfferAssistant,
  type FormSnapshot,
} from "@/lib/assistant";
import { getSession } from "@/lib/session";

type Body = {
  messages?: { role?: string; content?: string }[];
  formSnapshot?: FormSnapshot;
};

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    const body = (await request.json()) as Body;
    const messages = (body.messages || [])
      .filter(
        (m): m is { role: "user" | "assistant"; content: string } =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0,
      )
      .map((m) => ({ role: m.role, content: m.content.trim() }));

    if (!messages.length) {
      return NextResponse.json({ error: "رسالة مطلوبة" }, { status: 400 });
    }

    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const local = quickParseOfferRequest(lastUser);
    if (local && Object.keys(local.patch).length >= 2) {
      return NextResponse.json(local);
    }

    const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
    if (!apiKey) {
      if (local) return NextResponse.json(local);
      return NextResponse.json({ error: "DEEPSEEK_API_KEY غير مضبوط" }, { status: 503 });
    }

    const result = await runOfferAssistant({
      apiKey,
      messages,
      formSnapshot: body.formSnapshot || {},
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل المساعد" },
      { status: 500 },
    );
  }
}
