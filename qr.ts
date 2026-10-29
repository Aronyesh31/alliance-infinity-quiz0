import "server-only";
import QRCode from "qrcode";

/** QR code as an inline SVG string (dark modules on white for reliable scanning). */
export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#050919ff", light: "#ffffffff" },
  });
}
