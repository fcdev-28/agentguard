import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/app-shell/app-shell";
import { RuntimeProvider } from "@/components/app-shell/runtime-store";
import { ReviewProvider } from "@/components/review/review-store";
import { CommentProvider } from "@/components/review/comment-store";
import { CommandPaletteProvider } from "@/components/app-shell/command-palette-store";
import { NotificationProvider } from "@/components/app-shell/notification-store";
import { CommandPalette } from "@/components/app-shell/command-palette";
import { getActions } from "@/data/actions";
import { getUsers } from "@/data/users";
import { getComments } from "@/data/comments";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AgentGuard",
  description:
    "Plano de control para agentes de IA: visibilidad, aprobación y auditoría de cada acción.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [actions, users, comments] = await Promise.all([
    getActions(),
    getUsers(),
    getComments(),
  ]);

  return (
    <html lang="es" className={inter.variable}>
      <body>
        <RuntimeProvider>
          <ReviewProvider initialActions={actions} users={users}>
            <CommentProvider initialComments={comments}>
              <NotificationProvider>
                <CommandPaletteProvider>
                  <AppShell>{children}</AppShell>
                  <CommandPalette />
                </CommandPaletteProvider>
              </NotificationProvider>
            </CommentProvider>
          </ReviewProvider>
        </RuntimeProvider>
      </body>
    </html>
  );
}
