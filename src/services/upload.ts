// Conversion + upload de fotos para o Supabase Storage.
// A conversão para WebP acontece no próprio dispositivo, rápido e sem custar
// banda extra — o usuário escolhe a foto e ela já vai reduzida.

import { supabase } from "../lib/supabase";

export const GALLERY_BUCKET = "gallery";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível ler a imagem selecionada."));
    img.src = src;
  });
}

/** Redimensiona e converte a imagem para WebP no dispositivo. */
export async function fileToWebp(file: File, maxDim = 1600, quality = 0.82): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível processar a imagem.");
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/webp", quality)
    );
    if (blob) return blob;
    const png = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png")
    );
    if (png) return png;
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Converte a foto e publica no bucket "gallery"; devolve a URL pública. */
export async function uploadGalleryImage(shopId: string, file: File): Promise<string> {
  const blob = await fileToWebp(file);
  const path = `${shopId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const { error } = await supabase.storage.from(GALLERY_BUCKET).upload(path, blob, {
    contentType: "image/webp",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) throw new Error("Não foi possível gerar o link da foto.");
  return data.publicUrl;
}