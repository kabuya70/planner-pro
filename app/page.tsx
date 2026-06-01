"use client";

import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function HomePage() {
  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/login";
      }
    }

    check();
  }, []);

  return null;
}