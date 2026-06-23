import Link from "next/link";

const legalPages: Record<string, { title: string; intro: string; sections: Array<{ title: string; text: string }> }> = {
  "conditions-generales-vente": {
    title: "Conditions Générales de Vente",
    intro: "Ces conditions encadrent la souscription aux offres ToqueTop, la facturation et l’accès aux services payants.",
    sections: [
      {
        title: "Offres et souscription",
        text: "Les offres ToqueTop donnent accès aux fonctionnalités de réservation, de gestion et d’accompagnement selon le forfait choisi par le restaurant."
      },
      {
        title: "Prix et paiement",
        text: "Les prix sont indiqués en euros hors éventuelles taxes applicables. Le paiement peut être mensuel, trimestriel ou annuel selon les options proposées au moment de la souscription."
      },
      {
        title: "Engagement et résiliation",
        text: "Certaines offres peuvent inclure une période d’engagement. Les modalités de résiliation et d’échéance sont précisées dans l’espace Abonnement du restaurant."
      }
    ]
  },
  "conditions-generales-utilisation": {
    title: "Conditions Générales d’Utilisation",
    intro: "Ces conditions encadrent l’utilisation du site ToqueTop et des services accessibles en ligne.",
    sections: [
      {
        title: "Objet",
        text: "ToqueTop propose des outils de présentation, de réservation et de gestion destinés aux restaurants et à leurs clients."
      },
      {
        title: "Accès au service",
        text: "Certaines fonctionnalités sont publiques, d’autres nécessitent un accès administrateur ou un compte utilisateur."
      },
      {
        title: "Responsabilités",
        text: "Chaque restaurant reste responsable des informations publiées, de ses disponibilités, de ses horaires et du traitement opérationnel des réservations."
      }
    ]
  },
  "mentions-legales": {
    title: "Mentions Légales",
    intro: "Cette page regroupe les informations d’identification et de contact relatives au site ToqueTop.",
    sections: [
      { title: "Éditeur", text: "ToqueTop. Les informations légales complètes de l’éditeur seront à compléter avant lancement commercial définitif." },
      { title: "Contact", text: "Pour toute demande, vous pouvez contacter l’équipe via contact@toquetop.com." },
      { title: "Hébergement", text: "Le site est hébergé par Vercel Inc., fournisseur d’infrastructure cloud pour applications web." }
    ]
  },
  "protection-donnees": {
    title: "Politique de protection des données",
    intro: "ToqueTop traite les données nécessaires à la gestion des demandes, comptes et réservations.",
    sections: [
      {
        title: "Données collectées",
        text: "Les données peuvent inclure nom, prénom, e-mail, téléphone, préférences de réservation, notes et historique de réservation."
      },
      {
        title: "Finalités",
        text: "Ces données servent à fournir le service, confirmer les réservations, accompagner les restaurants et améliorer l’expérience utilisateur."
      },
      {
        title: "Droits",
        text: "Les utilisateurs peuvent demander l’accès, la rectification ou la suppression de leurs données en contactant ToqueTop."
      }
    ]
  },
  cookies: {
    title: "Politique en matière de cookies",
    intro: "Cette politique explique l’usage des cookies et technologies similaires sur ToqueTop.",
    sections: [
      { title: "Cookies nécessaires", text: "Certains cookies sont indispensables au fonctionnement du site, notamment pour la sécurité et les sessions." },
      { title: "Mesure et amélioration", text: "Des outils de mesure peuvent être ajoutés pour comprendre l’utilisation du service et améliorer l’expérience." },
      { title: "Gestion", text: "Les préférences cookies pourront être ajustées selon les outils activés sur le site." }
    ]
  }
};

type LegalPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function LegalPage({ params }: LegalPageProps) {
  const { slug } = await params;
  const page = legalPages[slug] ?? legalPages["mentions-legales"];

  return (
    <main className="min-h-screen bg-[#fbf8f2] px-4 py-16 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link className="text-sm font-black text-moss hover:underline" href="/">
          Retour à ToqueTop
        </Link>
        <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl">{page.title}</h1>
        <p className="mt-5 text-base font-semibold leading-7 text-ink/70">{page.intro}</p>
        <div className="mt-10 grid gap-4">
          {page.sections.map((section) => (
            <section key={section.title} className="rounded-md border border-ink/10 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">{section.title}</h2>
              <p className="mt-3 text-sm font-medium leading-6 text-ink/65">{section.text}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
