declare module "arabic-persian-reshaper" {
  export const ArabicShaper: {
    convertArabic(text: string): string;
    convertArabicBack(text: string): string;
  };
  export const PersianShaper: {
    convertArabic(text: string): string;
  };
}

declare module "bidi-js" {
  type EmbeddingLevels = {
    levels: Uint8Array;
    paragraphs: Array<{ start: number; end: number; level: number }>;
  };

  type Bidi = {
    getEmbeddingLevels(string: string, baseDirection?: "ltr" | "rtl" | "auto"): EmbeddingLevels;
    getReorderedString(string: string, levels: EmbeddingLevels): string;
  };

  export default function bidiFactory(): Bidi;
}
