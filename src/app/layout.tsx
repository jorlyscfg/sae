import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import TopMenu from "@/components/TopMenu";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Gestión Aspel Dany",
    description: "Dashboard de gestión de datos históricos de Aspel",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es">
            <body className={inter.className}>
                <Providers>
                    <div className="min-h-screen bg-background flex flex-col">
                        <TopMenu />
                        <main className="flex-1 pt-20">
                            {children}
                        </main>
                    </div>
                </Providers>
            </body>
        </html>
    );
}
