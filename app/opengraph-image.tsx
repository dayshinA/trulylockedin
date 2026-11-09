import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

// The link preview for every page (WhatsApp, iMessage, Instagram, Facebook,
// X...). Generated once at build time: the white logo on brand burgundy.
// Hex colours mirror the tokens in app/globals.css (no CSS here). The logo
// carries the wordmark, so the only text is the small tagline in the default
// sans font.
export const alt = "Truly Locked In: locs and hair studio. Book online.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Read at module level (as in the Next docs): an async file read inside the
// handler stops it being prerendered under Cache Components.
const logo = await readFile(
  join(process.cwd(), "public/brand/logo-final.png"),
  "base64",
);

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#4B0F1F",
          border: "18px solid #320914",
        }}
      >
        <img
          src={`data:image/png;base64,${logo}`}
          width={560}
          height={256}
          alt=""
        />
        <div
          style={{ width: 72, height: 3, background: "#D08644", margin: "44px 0 32px" }}
        />
        <div
          style={{
            color: "#F1E2E6",
            fontSize: 30,
            letterSpacing: 8,
            textTransform: "uppercase",
          }}
        >
          Locs & Hair Studio · Book online
        </div>
      </div>
    ),
    size,
  );
}
