import "./globals.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata = {
  title: "Planner Pro",
  description: "Smart productivity planner",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}