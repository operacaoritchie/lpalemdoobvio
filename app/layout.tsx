import type { Metadata } from "next";
import "./globals.css";
import "./form.css";
export const metadata: Metadata = {
 title: "Além do Óbvio — Imersão com Dr. Ritchie",
 description: "A técnica você aprende. A visão você desenvolve. Três dias de imersão presencial em Full Face com o Dr. Ritchie.",
 icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
 openGraph: { type: "website", locale: "pt_BR", title: "Além do Óbvio — Imersão com Dr. Ritchie", description: "A técnica você aprende. A visão você desenvolve. Três dias de imersão presencial em Full Face com o Dr. Ritchie." }
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
 return <html lang="pt-BR"><body>{children}</body></html>;
}
