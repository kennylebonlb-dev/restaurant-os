import Link from "next/link";
import { BookOpen, FileText, LifeBuoy, Mail } from "lucide-react";

const helpLinks = [
  {
    href: "/legal/conditions-generales-vente",
    title: "Conditions Générales de Vente",
    text: "Souscription, paiement, engagement et résiliation."
  },
  {
    href: "/legal/conditions-generales-utilisation",
    title: "Conditions Générales d’Utilisation",
    text: "Règles d’usage des services ToqueTop."
  },
  {
    href: "/legal/protection-donnees",
    title: "Politique de confidentialité",
    text: "Données collectées, finalités et droits utilisateurs."
  },
  {
    href: "/legal/cookies",
    title: "Cookies",
    text: "Informations sur les cookies et technologies similaires."
  }
];

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-linen px-4 py-12 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link className="inline-flex items-center gap-2 text-sm font-black text-moss hover:underline" href="https://toquetop.com">
          <BookOpen className="h-4 w-4" />
          ToqueTop
        </Link>
        <section className="mt-10 rounded-lg border border-ink/10 bg-white p-8 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-moss">Centre d’aide</p>
              <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">Aide ToqueTop</h1>
              <p className="mt-4 text-base font-semibold leading-7 text-ink/65">
                Retrouvez les documents légaux et les premières ressources utiles. Cet espace deviendra le centre d’aide complet de ToqueTop.
              </p>
            </div>
            <span className="grid h-14 w-14 place-items-center rounded-full bg-sage text-moss">
              <LifeBuoy className="h-7 w-7" />
            </span>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {helpLinks.map((item) => (
            <Link
              key={item.href}
              className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
              href={item.href}
            >
              <FileText className="h-5 w-5 text-moss" />
              <h2 className="mt-4 text-lg font-black">{item.title}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-ink/60">{item.text}</p>
            </Link>
          ))}
        </section>

        <section className="mt-6 rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Besoin d’aide ?</h2>
              <p className="mt-1 text-sm font-semibold text-ink/60">Contactez l’équipe ToqueTop pour une question commerciale, technique ou administrative.</p>
            </div>
            <a className="primary-button h-10 px-4 text-sm" href="mailto:contact@toquetop.com">
              <Mail className="h-4 w-4" />
              Contacter
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
