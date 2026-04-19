import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClientProvider } from "@/contexts/ClientContext";
import { MailProvider } from "@/contexts/MailContext";
import { PaycheckProvider } from "@/contexts/PaycheckContext";
import { GameProvider } from "@/contexts/GameContext";
// Stock feature removed
import { BudgetProvider } from "@/contexts/BudgetContext";
import { TaxVoteProvider } from "@/contexts/TaxVoteContext";
import { EmployeeShopProvider } from "@/contexts/EmployeeShopContext";
import Navbar from "@/components/Navbar";
import DisclaimerWarning from "@/components/DisclaimerWarning";
import PaycheckPopup from "@/components/PaycheckPopup";
import MaintenanceMode from "@/components/MaintenanceMode";
import PasswordSetupPopup from "@/components/PasswordSetupPopup";
import ActiveChangeBanner from "@/components/ActiveChangeBanner";
import MotivationPackFloater from "@/components/shop/MotivationPackFloater";
import WalkingBomb from "@/components/shop/WalkingBomb";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yates Inc. - The Future of Absurd Commerce",
  description: "Premium products with innovative pricing models",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-gray-50 dark:bg-gray-900">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gray-900`}
      >
        <MaintenanceMode>
          <AuthProvider>
            <ClientProvider>
              <GameProvider>
                <BudgetProvider>
                  <PaycheckProvider>
                    <TaxVoteProvider>
                      <EmployeeShopProvider>
                        <CartProvider>
                            <MailProvider>
                            <DisclaimerWarning />
                            <Navbar />
                            <ActiveChangeBanner />
                            <PaycheckPopup />
                            <PasswordSetupPopup />
                            <MotivationPackFloater />
                            <WalkingBomb />
                            <main className="pt-16 min-h-screen bg-gray-50 dark:bg-gray-900">
                              {children}
                            </main>
                          </MailProvider>
                        </CartProvider>
                      </EmployeeShopProvider>
                    </TaxVoteProvider>
                  </PaycheckProvider>
                </BudgetProvider>
              </GameProvider>
            </ClientProvider>
          </AuthProvider>
        </MaintenanceMode>
      </body>
    </html>
  );
}
