import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function InfoSection() {
  return (
    <section className="flex justify-center py-8">
      <Card className="max-w-2xl w-full shadow-xl border-0 bg-background/80 backdrop-blur-md animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl md:text-3xl">
            <Badge variant="outline" className="text-indigo-700 border-indigo-300 bg-indigo-50">Om ScrutMan</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg text-muted-foreground leading-relaxed">
            ScrutMan er et komplett system for klubber og arrangører i motorsport. Plattformen gir deg verktøy for arrangementshåndtering, teknisk kontroll, deltakerregistrering og klubbadministrasjon – alt i én moderne og brukervennlig løsning.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

export default InfoSection; 