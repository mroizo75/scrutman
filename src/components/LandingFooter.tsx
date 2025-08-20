import { Badge } from "@/components/ui/badge";

export default function LandingFooter() {
  return (
    <footer className="w-full flex flex-col items-center gap-2 py-8 text-center animate-fade-in">
      <div className="flex flex-wrap gap-3 justify-center mb-2">
        <Badge variant="secondary">© {new Date().getFullYear()} ScrutMan</Badge>
        <span className="text-muted-foreground text-sm">Utviklet for moderne motorsportklubber</span>
      </div>
      <div className="text-xs text-muted-foreground">
        <span>Design & kode: ScrutMan Team</span>
      </div>
    </footer>
  );
} 