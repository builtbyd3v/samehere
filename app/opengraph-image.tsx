import { ImageResponse } from "next/og";

export const alt = "samehere: the network for verified students";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#f7f4ed",
          color: "#1c1c1c",
        }}
      >
        <div style={{ fontSize: 60, fontWeight: 600, letterSpacing: "-1.5px", lineHeight: 1.1 }}>
          You&apos;re not the only one.
        </div>
        <div style={{ marginTop: 24, fontSize: 18, color: "#5f5f5d", maxWidth: 720, lineHeight: 1.38 }}>
          The social network for verified students. Post the real stuff. Find people who get it.
        </div>
        <div style={{ marginTop: 48, fontSize: 20, fontWeight: 600 }}>samehere</div>
      </div>
    ),
    { ...size }
  );
}
