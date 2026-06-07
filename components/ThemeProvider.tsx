"use client";

import { useEffect } from "react";

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const savedTheme = localStorage.getItem("planner-theme") || "black";
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  return <>{children}</>;
}