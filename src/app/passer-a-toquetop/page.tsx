import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  CheckCircle2,
  DatabaseZap,
  Headphones,
  Rocket,
  ShieldCheck,
  Table2,
  UsersRound
} from "lucide-react";
import {
  defaultPlatformBrand,
  defaultPlatformLandingSettings,
  getPlatformBrand,
  getPlatformLandingSettings
} from "@/server/platform-settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Passez à ToqueTop | Migration accompagnée",
  description:
    "Migrez de TheFork, ZenChef, OpenTable ou d’une autre solution vers ToqueTop avec une transition accompagnée, sans interruption de service."
};

const migrationSteps = [
  {
    title: "Audit de votre système actuel",
    text: "Nous analysons vos réservations, habitudes de service, canaux de réservation, plan de salle et besoins opérationnels."
  },
  {
    title: "Migration des données",
    text: "Vos clients, réservations en cours et informations utiles sont préparés pour une reprise propre dans ToqueTop."
  },
  {
    title: "Configuration de votre espace",
    text: "Site internet, règles de réservation, horaires, plan 2D, rappels et accès équipe sont configurés selon votre restaurant."
  },
  {
    title: "Lancement accompagné",
    text: "Nous vous guidons au moment du basculement pour garder une continuité de service et éviter les frictions côté client."
  },
  {
    title: "Optimisation continue",
    text: "Après le lancement, nous suivons les premiers services, les no-shows, les disponibilités et les ajustements nécessaires."
  }
];

const guarantees = [
  { icon: ShieldCheck, title: "Sans interruption", text: "La transition est organisée pour conserver vos réservations actives." },
  { icon: DatabaseZap, title: "Données reprises", text: "Clients, historique utile, plan de table et paramètres sont structurés." },
  { icon: Headphones, title: "Accompagnement humain", text: "Une équipe vous guide avant, pendant et après le lancement." },
  { icon: BadgeCheck, title: "30 jours gratuits", text: "Testez ToqueTop sans carte bancaire, annulable à tout moment." }
];

const faqs = [
  {
    question: "Vais-je perdre mes réservations actuelles ?",
    answer: "Non. L’objectif de la migration est justement de conserver les réservations en cours et de préparer une bascule sans interruption."
  },
  {
    question: "Combien de temps faut-il pour lancer ToqueTop ?",
    answer: "Un site ToqueTop peut être lancé très rapidement. Pour une migration complète, le délai dépend du volume de données et des réglages à reprendre."
  },
  {
    question: "Puis-je garder mes liens Google et réseaux sociaux ?",
    answer: "Oui. ToqueTop est pensé pour s’intégrer à Google, Instagram, Facebook et aux liens utilisés par vos clients."
  }
];

export default async function SwitchToToqueTopPage() {
  const [landing, brand] = await Promise.all([
    getPlatformLandingSettings().catch(() => defaultPlatformLandingSettings),
    getPlatformBrand().catch(() => defaultPlatformBrand)
  ]);

  return (
    <div className="bg-[#fbf8f2] text-ink">
      <header className="absolute left-0 right-0 top-0 z-30 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="inline-flex min-w-0 items-center">
            <img
              src={brand.marketingLogoUrl}
              alt={brand.logoAlt}
              className="max-w-[220px] object-contain"
              style={{ height: brand.marketingLogoHeight }}
            />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-black text-white/75 md:flex">
            <Link className="transition hover:text-white" href="/#solution">
              Solutions
            </Link>
            <Link className="transition hover:text-white" href="/#fonctionnalites">
              Fonctionnalités
            </Link>
            <Link className="transition hover:text-white" href="/#forfaits">
              Forfaits
            </Link>
            <Link className="inline-flex h-10 items-center rounded-md bg-[#ead6bd] px-4 text-ink transition hover:bg-white" href="/reservation">
              Démo gratuite
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-ink px-4 py-20 text-white sm:px-6 lg:px-8">
        <img
          src={landing.heroImageUrl || brand.loginVisualUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/88 to-ink/50" />
        <div className="relative mx-auto grid max-w-7xl gap-10 pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-black uppercase text-[#ead6bd] backdrop-blur">
              <Rocket className="h-4 w-4" />
              Migration accompagnée
            </p>
            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-none sm:text-6xl lg:text-7xl">
              Passez à ToqueTop, on s’occupe de tout.
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-white/75">
              Quittez TheFork, ZenChef, OpenTable ou une autre solution sans repartir de zéro.
              ToqueTop reprend vos éléments essentiels et prépare votre nouveau site de réservation directe.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a className="inline-flex h-12 items-center gap-2 rounded-md bg-[#ead6bd] px-5 text-sm font-black text-ink transition hover:bg-white" href="mailto:contact@toquetop.com?subject=Passer à ToqueTop">
                Parler à un expert
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link className="inline-flex h-12 items-center gap-2 rounded-md border border-white/20 bg-white/10 px-5 text-sm font-black text-white transition hover:bg-white/20" href="/reservation">
                Voir la démo
                <CalendarCheck className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="grid gap-3">
            {[
              "Réservations en cours conservées",
              "Plan de salle et règles de réservation configurés",
              "Site ToqueTop prêt en moins de 5 minutes",
              "Rappels SMS et e-mail pour réduire les no-shows"
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.08] p-4 backdrop-blur">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#ead6bd]" />
                <span className="text-sm font-black text-white/85">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase text-moss">Plan de migration</p>
            <h2 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
              Une transition claire, encadrée, pensée pour vos services.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-5">
            {migrationSteps.map((step, index) => (
              <article key={step.title} className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm font-black text-[#ead6bd]">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-lg font-black">{step.title}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-ink/60">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase text-moss">Pourquoi changer</p>
            <h2 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
              Reprenez le contrôle de vos réservations directes.
            </h2>
            <p className="mt-5 text-base font-semibold leading-7 text-ink/65">
              ToqueTop aide les restaurants à réduire les no-shows jusqu’à 35%, à automatiser les rappels,
              à connecter Google et les réseaux sociaux, et à donner aux équipes un outil simple pendant le service.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {guarantees.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="rounded-md border border-ink/10 bg-[#fbf8f2] p-5">
                  <Icon className="h-6 w-6 text-moss" />
                  <h3 className="mt-4 text-lg font-black">{item.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-ink/60">{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-lg bg-ink p-6 text-white shadow-soft">
            <Table2 className="h-8 w-8 text-[#ead6bd]" />
            <h2 className="mt-5 text-3xl font-black">Votre restaurant, prêt à réserver.</h2>
            <p className="mt-4 text-sm font-semibold leading-7 text-white/70">
              Votre nouveau site peut intégrer réservation 24/7, plan de salle, disponibilité par créneau,
              rappels automatiques, préférences clients et accès administrateur.
            </p>
          </div>
          <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
            <UsersRound className="h-8 w-8 text-moss" />
            <h2 className="mt-5 text-3xl font-black">Vos équipes gagnent du temps.</h2>
            <p className="mt-4 text-sm font-semibold leading-7 text-ink/65">
              Moins d’appels, moins d’oublis, moins de no-shows, plus de clarté sur le service.
              ToqueTop devient le cockpit quotidien du restaurant.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#f1e7d8] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-sm font-black uppercase text-moss">Questions fréquentes</p>
            <h2 className="mt-3 text-4xl font-black">Changer de solution, sans mauvaise surprise.</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-black">{faq.question}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-ink/60">{faq.answer}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 rounded-lg bg-ink p-6 text-center text-white">
            <h2 className="text-3xl font-black">Commencez aujourd’hui.</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/70">
              30 jours gratuits, sans carte bancaire, annulable à tout moment.
            </p>
            <a className="mt-6 inline-flex h-12 items-center gap-2 rounded-md bg-[#ead6bd] px-5 text-sm font-black text-ink transition hover:bg-white" href="mailto:contact@toquetop.com?subject=Passer à ToqueTop">
              Organiser ma migration
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-ink px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <img
            src={brand.marketingFooterLogoUrl}
            alt={brand.logoAlt}
            className="max-w-[180px] object-contain"
            style={{ height: brand.marketingFooterLogoHeight }}
          />
          <p className="text-xs font-semibold text-white/45">
            {landing.footerCopyright}
          </p>
        </div>
      </footer>
    </div>
  );
}
