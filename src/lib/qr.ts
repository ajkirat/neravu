import "server-only";
import QRCode from "qrcode";

export const qrDataUrl = (text: string, width = 256) => QRCode.toDataURL(text, { width, margin: 1 });
