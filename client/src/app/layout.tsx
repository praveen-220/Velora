import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Velora | Advanced Mobility Network",
  description: "Experience the future of ride-sharing with Velora's premium features.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-black text-white`}>
        <AuthProvider>
          <Navbar />
          <main className="pb-24 md:pb-0">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
