import { Construction, Wrench } from "lucide-react";
import Link from "next/link";

export default function MaintenancePage({
  title,
}: {
  title: string;
}) {
  return (
    <main className="min-h-screen bg-[#030712] flex items-center justify-center p-6 text-white">
      <div className="max-w-lg text-center">
        <div className="flex justify-center mb-6">
          <Construction size={80} />
        </div>

        <h1 className="text-4xl font-bold mb-4">
          {title}
        </h1>

        <p className="text-white/50 mb-8">
          Cette fonctionnalité est actuellement en cours de développement.
        </p>

        <div className="flex justify-center gap-3 mb-8">
          <Construction size={22} />
          <Wrench size={22} />
        </div>

        <p className="text-white/30 text-sm">
          Erreur 404 — Module temporairement indisponible
        </p>

        <Link
          href="/dashboard"
          className="inline-block mt-6 rounded-2xl bg-white text-black px-5 py-3 font-semibold"
        >
          Retour au Dashboard
        </Link>
      </div>
    </main>
  );
}