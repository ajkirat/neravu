"use client";

import { shrinkImage } from "@/lib/image";

/**
 * A photo field that shrinks the picture on the phone before it is sent (phone photos are often
 * several MB, more than a form may carry). Falls back to the original file if shrinking fails.
 */
export function PhotoInput({ name }: { name: string }) {
  return (
    <input
      name={name}
      type="file"
      accept="image/*"
      capture="environment"
      className="block w-full text-sm"
      onChange={async (e) => {
        const input = e.currentTarget;
        const file = input.files?.[0];
        if (!file || file.size < 600_000) return;
        try {
          const img = await shrinkImage(file, 1280, 0.75);
          const bytes = Uint8Array.from(atob(img.base64), (c) => c.charCodeAt(0));
          const dt = new DataTransfer();
          dt.items.add(new File([bytes], "photo.jpg", { type: "image/jpeg" }));
          input.files = dt.files;
        } catch {
          /* keep the original */
        }
      }}
    />
  );
}
