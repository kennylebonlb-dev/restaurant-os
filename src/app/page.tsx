import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  Check,
  ChevronRight,
  Cuboid,
  Globe2,
  HeartHandshake,
  LockKeyhole,
  Mail,
  MousePointer2,
  PlugZap,
  Sparkles,
  Star,
  Table2,
  UsersRound,
  Zap
} from "lucide-react";

const capabilities = [
  {
    icon: CalendarCheck,
    title: "Réservations sans friction",
    text: "Vos clients choisissent un créneau, leurs préférences et leur table depuis une expérience visuelle claire."
  },
  {
    icon: Table2,
    title: "Plan de salle vivant",
    text: "Plan 2D/3D, tables, capacités, zones, blocages, rotations et disponibilités synchronisées en temps réel."
  },
  {
    icon: UsersRound,
    title: "Fichier client utile",
    text: "Nom, contact, notes, anniversaires, demandes spéciales et historique pour reconnaître les habitués."
  },
  {
    icon: BarChart3,
    title: "Pilotage opérationnel",
    text: "Occupation, services, tables libres, réservations du jour et indicateurs simples pour mieux remplir."
  },
  {
    icon: Globe2,
    title: "Site restaurant inclus",
    text: "Un site rapide, moderne et adapté à votre identité, connecté directement à votre moteur de réservation."
  },
  {
    icon: PlugZap,
    title: "Prêt à évoluer",
    text: "Architecture pensée pour les futures intégrations : IA, fidélité, automatisations, CRM et multi-sites."
  }
];

const workflow = [
  "On crée votre site et votre identité de réservation.",
  "Vous placez vos tables, services, horaires et règles métier.",
  "Vos clients réservent en ligne, vous gardez le contrôle en direct."
];

const plans = [
  {
    name: "Essentiel",
    price: "49€",
    highlight: "Pour lancer la réservation en ligne",
    features: ["Site vitrine ToqueTop", "Module de réservation", "Plan de salle 2D", "E-mails de confirmation", "Support de démarrage"]
  },
  {
    name: "Pro",
    price: "89€",
    highlight: "Le meilleur choix pour un restaurant actif",
    featured: true,
    features: ["Tout Essentiel", "Plan 3D immersif", "Dashboard temps réel", "Blocages et services avancés", "Personnalisation de marque", "Statistiques d’occupation"]
  },
  {
    name: "Signature",
    price: "Sur mesure",
    highlight: "Pour groupes, lieux premium et multi-sites",
    features: ["Multi-restaurants", "Accompagnement prioritaire", "Design sur mesure", "Automatisations avancées", "Préparation IA et CRM", "Stratégie conversion"]
  }
];

const proofPoints = [
  { value: "0%", label: "commission sur vos réservations directes" },
  { value: "15 min", label: "créneaux configurables pour chaque service" },
  { value: "2D + 3D", label: "plans de salle pensés pour convertir" },
  { value: "24/7", label: "prise de réservation même quand l’équipe est occupée" }
];

const faqs = [
  {
    question: "Est-ce que ToqueTop remplace mon site actuel ?",
    answer: "Oui si vous le souhaitez. ToqueTop peut devenir votre site principal, ou simplement ajouter une réservation moderne à votre site existant."
  },
  {
    question: "Puis-je garder la main sur les horaires et les tables ?",
    answer: "Oui. Vous gérez les services, vacances, blocages, capacités, préférences de tables et règles de réservation depuis l’espace admin."
  },
  {
    question: "Le client peut-il choisir sa table ?",
    answer: "Oui. Vous pouvez proposer une sélection visuelle, laisser le restaurant choisir, ou utiliser une attribution automatique selon vos règles."
  },
  {
    question: "Est-ce adapté à plusieurs restaurants ?",
    answer: "La base est prête pour le multi-sites : chaque restaurant peut avoir ses informations, son plan, ses horaires et ses réservations."
  }
];

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#fbf8f2] text-ink">
      <section className="relative min-h-screen">
        <img
          src="/login-restaurant-visual.png"
          alt=""
          className="absolute inset-0 h-full w-full scale-105 object-cover object-center landing-hero-image"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,18,16,0.92),rgba(12,18,16,0.62),rgba(12,18,16,0.18))]" />
        <div className="absolute inset-x-0 top-0 z-10">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
            <Link className="group inline-flex items-center gap-3 text-white" href="/">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-white text-ink shadow-soft">
                <Sparkles className="h-5 w-5 text-clay" />
              </span>
              <span className="text-2xl font-black tracking-normal">ToqueTop</span>
            </Link>
            <div className="hidden items-center gap-6 text-sm font-bold text-white/80 lg:flex">
              <a className="transition hover:text-white" href="#solution">Solution</a>
              <a className="transition hover:text-white" href="#fonctionnalites">Fonctionnalités</a>
              <a className="transition hover:text-white" href="#forfaits">Forfaits</a>
              <a className="transition hover:text-white" href="#faq">FAQ</a>
            </div>
            <div className="flex items-center gap-2">
              <Link className="hidden h-10 items-center rounded-md px-4 text-sm font-bold text-white/85 transition hover:bg-white/10 sm:inline-flex" href="/login">
                Connexion
              </Link>
              <Link className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-black text-ink shadow-soft transition hover:-translate-y-0.5 hover:bg-linen" href="#demo">
                Demander une démo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </nav>
        </div>

        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-4 pb-16 pt-28 sm:px-6 lg:px-8">
          <div className="max-w-3xl landing-fade-up">
            <p className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-xs font-black uppercase text-white/80 backdrop-blur">
              <Zap className="h-4 w-4 text-[#ead6bd]" />
              Site, réservations et plan de salle pour restaurants ambitieux
            </p>
            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.95] text-white sm:text-6xl lg:text-7xl">
              Remplissez vos tables sans perdre le contrôle de votre salle.
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-white/80">
              ToqueTop crée votre site restaurant et centralise les réservations, le plan de salle, les disponibilités, les préférences clients et les statistiques dans un espace fluide, premium et temps réel.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="inline-flex h-12 items-center gap-2 rounded-md bg-[#ead6bd] px-5 text-sm font-black text-ink shadow-soft transition hover:-translate-y-0.5 hover:bg-white" href="#forfaits">
                Voir les forfaits
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link className="inline-flex h-12 items-center gap-2 rounded-md border border-white/25 bg-white/10 px-5 text-sm font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20" href="/reservation">
                Voir l’expérience client
                <MousePointer2 className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-4">
              {proofPoints.map((point) => (
                <div key={point.label} className="rounded-md border border-white/15 bg-white/10 p-3 backdrop-blur landing-fade-up-stagger">
                  <p className="text-2xl font-black text-white">{point.value}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-white/70">{point.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="solution" className="bg-ink px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase text-[#ead6bd]">Une plateforme complète</p>
            <h2 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
              Tout ce qu’un restaurant doit piloter, dans un seul cockpit.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {workflow.map((step, index) => (
              <div key={step} className="rounded-md border border-white/10 bg-white/[0.06] p-5">
                <span className="text-3xl font-black text-[#ead6bd]">0{index + 1}</span>
                <p className="mt-5 text-sm font-semibold leading-6 text-white/75">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="fonctionnalites" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase text-moss">Fonctionnalités</p>
            <h2 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
              La réservation directe, mais avec une vraie vision de salle.
            </h2>
            <p className="mt-4 text-base font-medium leading-7 text-ink/70">
              Inspiré des meilleurs outils de réservation, ToqueTop met l’accent sur la relation directe, l’expérience client visuelle et la simplicité d’exploitation au quotidien.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((feature) => {
              const Icon = feature.icon;

              return (
                <article key={feature.title} className="group rounded-md border border-ink/10 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-soft">
                  <span className="flex h-12 w-12 items-center justify-center rounded-md bg-sage text-moss transition group-hover:bg-moss group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-xl font-black text-ink">{feature.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-ink/60">{feature.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-stretch">
          <div className="relative min-h-[520px] overflow-hidden rounded-lg bg-ink p-6 text-white shadow-soft">
            <div className="absolute inset-0 opacity-40 landing-grid-bg" />
            <div className="relative z-10">
              <p className="text-sm font-black uppercase text-[#ead6bd]">Vue restaurateur</p>
              <h2 className="mt-3 max-w-2xl text-4xl font-black leading-tight">
                Un dashboard pensé pour les services réels, pas pour les tableurs.
              </h2>
            </div>
            <div className="relative z-10 mt-8 grid gap-4 md:grid-cols-2">
              {[
                ["Réservations du jour", "12:30 · 4 couverts · anniversaire"],
                ["Occupation", "68% au déjeuner · 81% au dîner"],
                ["Tables disponibles", "2 places: 4 · 4 places: 3 · 6+: 1"],
                ["Alertes", "Table VIP bloquée à 20:00"]
              ].map(([title, text]) => (
                <div key={title} className="rounded-md border border-white/10 bg-white/10 p-5 backdrop-blur">
                  <p className="text-xs font-black uppercase text-white/50">{title}</p>
                  <p className="mt-3 text-lg font-black text-white">{text}</p>
                </div>
              ))}
            </div>
            <div className="relative z-10 mt-4 rounded-md border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black">Timeline du service</p>
                <span className="rounded bg-[#ead6bd] px-2 py-1 text-xs font-black text-ink">live</span>
              </div>
              <div className="mt-5 grid gap-3">
                {["19:00", "19:15", "19:30", "20:00", "20:30"].map((time, index) => (
                  <div key={time} className="grid grid-cols-[64px_1fr] items-center gap-3">
                    <span className="text-xs font-black text-white/60">{time}</span>
                    <span className="h-3 overflow-hidden rounded-full bg-white/10">
                      <span
                        className="block h-full rounded-full bg-[#ead6bd]"
                        style={{ width: `${44 + index * 10}%` }}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {[
              { icon: Cuboid, title: "Plans 2D et 3D", text: "Offrez une sélection de table plus rassurante, visuelle et différenciante." },
              { icon: LockKeyhole, title: "Règles métier", text: "Minimum avant réservation, durée de service, tables bloquées, vacances et restrictions de capacité." },
              { icon: HeartHandshake, title: "Expérience client", text: "Demandes PMR, chaise haute, dîner romantique, anniversaire, notes et préférences." },
              { icon: Mail, title: "Notifications", text: "Confirmation d’inscription, réservation, annulation et messages transactionnels." }
            ].map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="rounded-md border border-ink/10 bg-white p-6 shadow-sm">
                  <div className="flex gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#ead6bd] text-ink">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-lg font-black">{item.title}</h3>
                      <p className="mt-2 text-sm font-medium leading-6 text-ink/60">{item.text}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="forfaits" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase text-moss">Forfaits</p>
              <h2 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">Une offre lisible, sans commission cachée.</h2>
              <p className="mt-4 text-base font-medium leading-7 text-ink/70">
                Les forfaits peuvent être adaptés selon le nombre d’établissements, le niveau de personnalisation et l’accompagnement souhaité.
              </p>
            </div>
            <Link className="secondary-button" href="#demo">
              Recevoir une proposition
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-md border p-6 shadow-sm ${
                  plan.featured
                    ? "border-moss bg-ink text-white shadow-soft"
                    : "border-ink/10 bg-[#fbf8f2] text-ink"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-black">{plan.name}</h3>
                    <p className={`mt-2 text-sm font-semibold leading-6 ${plan.featured ? "text-white/60" : "text-ink/60"}`}>
                      {plan.highlight}
                    </p>
                  </div>
                  {plan.featured ? (
                    <span className="rounded bg-[#ead6bd] px-2 py-1 text-xs font-black text-ink">Populaire</span>
                  ) : null}
                </div>
                <p className="mt-8 flex items-end gap-2">
                  <span className="text-4xl font-black">{plan.price}</span>
                  {plan.price !== "Sur mesure" ? <span className={plan.featured ? "mb-1 text-sm font-bold text-white/60" : "mb-1 text-sm font-bold text-ink/50"}>/ mois</span> : null}
                </p>
                <ul className="mt-7 grid gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm font-semibold leading-6">
                      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.featured ? "text-[#ead6bd]" : "text-moss"}`} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-lg bg-ink p-6 text-white shadow-soft md:grid-cols-[1fr_0.8fr] md:p-10">
          <div>
            <p className="text-sm font-black uppercase text-[#ead6bd]">Lancer ToqueTop</p>
            <h2 className="mt-3 text-4xl font-black leading-tight">Prêt à transformer votre réservation directe ?</h2>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-white/70">
              On peut préparer une première version de votre site, votre plan de salle et vos règles de réservation pour vous montrer concrètement le rendu.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link className="inline-flex h-11 items-center gap-2 rounded-md bg-[#ead6bd] px-5 text-sm font-black text-ink transition hover:bg-white" href="mailto:contact@toquetop.com?subject=Démo ToqueTop">
                Demander une démo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link className="inline-flex h-11 items-center gap-2 rounded-md border border-white/20 bg-white/10 px-5 text-sm font-black text-white transition hover:bg-white/20" href="/reservation">
                Tester la réservation
                <CalendarCheck className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="grid gap-3">
            {["Audit rapide du site actuel", "Configuration des horaires et services", "Intégration du plan de salle", "Mise en ligne et formation"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.06] px-4 py-3">
                <Star className="h-4 w-4 text-[#ead6bd]" />
                <span className="text-sm font-bold text-white/80">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-[#f1e7d8] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-sm font-black uppercase text-moss">Questions fréquentes</p>
            <h2 className="mt-3 text-4xl font-black leading-tight">Simple à comprendre, solide à exploiter.</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-md border border-ink/10 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-black text-ink">{faq.question}</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-ink/60">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-ink px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xl font-black">ToqueTop</p>
            <p className="mt-1 text-sm font-semibold text-white/60">Sites et réservations directes pour restaurants.</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm font-bold text-white/60">
            <Link className="hover:text-white" href="/login">Connexion</Link>
            <Link className="hover:text-white" href="/reservation">Réservation</Link>
            <Link className="hover:text-white" href="/cmt-admin/login">Admin plateforme</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
