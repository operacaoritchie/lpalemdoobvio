import type { Metadata } from "next";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/600-italic.css";
import "./globals.css";
import "./form.css";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
export const metadata: Metadata = {
 metadataBase: new URL(siteUrl),
 title: "Além do Óbvio — Imersão com Dr. Ritchie",
 description: "A técnica você aprende. A visão você desenvolve. Três dias de imersão presencial em Full Face com o Dr. Ritchie.",
 icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
 openGraph: { type: "website", locale: "pt_BR", title: "Além do Óbvio — Imersão com Dr. Ritchie", description: "A técnica você aprende. A visão você desenvolve. Três dias de imersão presencial em Full Face com o Dr. Ritchie." }
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
 return <html lang="pt-BR"><body>{children}</body></html>;
}
