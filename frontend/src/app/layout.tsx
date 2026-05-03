import "./styles.css";
import { Fira_Sans, Fira_Code, Rajdhani, IBM_Plex_Mono, Cormorant_Garamond } from "next/font/google";

const sans = Fira_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const mono = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rajdhani",
  display: "swap",
});

const ibmMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-mono",
  display: "swap",
});

export const metadata = {
  title: "Third Space Risk OS — Underwriter Console",
  description: "Real-time venue evidence, review gates, and carrier-ready outputs for modern underwriting operations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${cormorant.variable} ${rajdhani.variable} ${ibmMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
