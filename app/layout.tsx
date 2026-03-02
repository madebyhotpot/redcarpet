import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Confluence Awards — Augmented Red Carpet Experience',
  description: 'Take a selfie, pick an AI effect, and get your augmented red carpet shot.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <div className="min-h-screen w-full flex justify-center" style={{ background: '#000' }}>
          <div
            className="relative w-full max-w-[430px] min-h-screen overflow-hidden"
            style={{
              backgroundImage: 'url(/confluence-background.png)',
              backgroundSize: '100% auto',
              backgroundPosition: 'center top',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
