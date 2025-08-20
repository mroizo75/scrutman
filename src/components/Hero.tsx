import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-[60vh] py-16 text-center overflow-hidden bg-gradient-to-br from-gray-900 to-indigo-900">
      <div className="relative z-10 flex flex-col items-center gap-6">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-lg">
          ScrutMan
        </h1>
        <p className="max-w-xl text-lg md:text-2xl text-white/90 font-medium drop-shadow">
          Den moderne plattformen for arrangement, teknisk kontroll og klubbadministrasjon i motorsport.
        </p>
        <Link href="/login">
          <Button size="lg" className="mt-4 shadow-lg animate-fade-in">
            Logg inn
          </Button>
        </Link>
      </div>
    </section>
  );
}

// Legg til animasjon i globals.css:
// @keyframes gradient {
//   0%, 100% { background-position: 0% 50%; }
//   50% { background-position: 100% 50%; }
// }
// .animate-gradient { background-size: 200% 200%; animation: gradient 8s ease-in-out infinite; }
// .animate-fade-in { animation: fadeIn 1.2s ease; }
// @keyframes fadeIn { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } } 