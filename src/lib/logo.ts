import { supabase } from "./supabase";

export const LOGO_MAX_INPUT = 10 * 1024 * 1024;
export const LOGO_MAX_OUTPUT = 192 * 1024;
export function validateLogoFile(file: { type: string; size: number }) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Escolha uma imagem PNG, JPG ou WebP.");
  if (!file.size || file.size > LOGO_MAX_INPUT)
    throw new Error("A imagem precisa ter até 10 MB.");
}

export async function prepareLogo(file: File): Promise<Blob> {
  validateLogoFile(file);
  const bitmap = await createImageBitmap(file);
  try {
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width * bitmap.height > 40000000
    )
      throw new Error("Escolha uma imagem com até 40 megapixels.");
    const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("Não foi possível preparar a imagem neste navegador.");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b
            ? resolve(b)
            : reject(new Error("Não foi possível preparar a imagem.")),
        "image/webp",
        0.88,
      ),
    );
    if (blob.size > LOGO_MAX_OUTPUT)
      throw new Error(
        "A imagem ficou muito grande. Escolha uma logo mais simples.",
      );
    return blob;
  } finally {
    bitmap.close();
  }
}

export async function uploadLogo(file: File, owner: string): Promise<string> {
  const blob = await prepareLogo(file);
  if (!supabase)
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () =>
        reject(new Error("Não foi possível ler a imagem."));
      reader.readAsDataURL(blob);
    });
  const extension = blob.type === "image/webp" ? "webp" : "png";
  const path = `${owner}/${crypto.randomUUID()}.${extension}`;
  const bucket = supabase.storage.from("sitefactory-logos");
  const { error } = await bucket.upload(path, blob, {
    contentType: blob.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error)
    throw new Error(
      "Não foi possível enviar a logo. Tente novamente. " + error.message,
    );
  return bucket.getPublicUrl(path).data.publicUrl;
}
