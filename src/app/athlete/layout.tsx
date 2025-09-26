import AthleteNav from "@/components/AthleteNav";

export default function AthleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <AthleteNav />
      {children}
    </div>
  );
}
