import { extractJson } from "./helpers";

export async function extractDocumentData(file: File, apiKey: string) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString("base64");
  const mime = file.type || "image/jpeg";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Analyze this Passport / ID / IQAMA.
Extract: full_name, nationality, document_number.
Return STRICT JSON ONLY:
{"full_name":"","nationality":"","document_number":""}`,
              },
              { inline_data: { mime_type: mime, data: base64 } },
            ],
          },
        ],
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini OCR failed: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return extractJson(text);
}
