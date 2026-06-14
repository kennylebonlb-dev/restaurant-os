import Link from "next/link";
import type { ReactNode } from "react";
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
import { LandingAnchorLink } from "@/components/marketing/landing-anchor-link";
import { defaultPlatformLandingSettings, getPlatformLandingSettings } from "@/server/platform-settings";

export const dynamic = "force-dynamic";

const featureIcons = [CalendarCheck, Table2, UsersRound, BarChart3, Globe2, PlugZap];
const secondaryFeatureIcons = [Cuboid, LockKeyhole, HeartHandshake, Mail];

function SmartLink({
  href,
  className,
  children
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  if (href.startsWith("#")) {
    return (
      <LandingAnchorLink className={className} href={href}>
        {children}
      </LandingAnchorLink>
    );
  }

  if (href.startsWith("http") || href.startsWith("mailto:")) {
    return (
      <a className={className} href={href}>
        {children}
      </a>
    );
  }

  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}

export default async function HomePage() {
  const landing = await getPlatformLandingSettings().catch(() => defaultPlatformLandingSettings);

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
              <span className="text-2xl font-black tracking-normal">{landing.brandName}</span>
            </Link>
            <div className="hidden items-center gap-6 text-sm font-bold text-white/80 lg:flex">
              <LandingAnchorLink className="transition hover:text-white" href="#solution">
                Solutions
              </LandingAnchorLink>
              <LandingAnchorLink className="transition hover:text-white" href="#fonctionnalites">
                Fonctionnalités
              </LandingAnchorLink>
              <LandingAnchorLink className="transition hover:text-white" href="#forfaits">
                Forfaits
              </LandingAnchorLink>
              <LandingAnchorLink className="transition hover:text-white" href="#faq">
                FAQ
              </LandingAnchorLink>
            </div>
            <div className="flex items-center gap-2">
              <Link className="hidden h-10 items-center rounded-md px-4 text-sm font-bold text-white/85 transition hover:bg-white/10 sm:inline-flex" href="/login">
                Connexion
              </Link>
              <SmartLink className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-black text-ink shadow-soft transition hover:-translate-y-0.5 hover:bg-linen" href={landing.demoCtaHref}>
                {landing.demoCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </SmartLink>
            </div>
          </nav>
        </div>

        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-4 pb-16 pt-28 sm:px-6 lg:px-8">
          <div className="max-w-3xl landing-fade-up">
            <p className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-xs font-black uppercase text-white/80 backdrop-blur">
              <Zap className="h-4 w-4 text-[#ead6bd]" />
              {landing.heroEyebrow}
            </p>
            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.95] text-white sm:text-6xl lg:text-7xl">
              {landing.heroTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-white/80">
              {landing.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <SmartLink className="inline-flex h-12 items-center gap-2 rounded-md bg-[#ead6bd] px-5 text-sm font-black text-ink shadow-soft transition hover:-translate-y-0.5 hover:bg-white" href={landing.primaryCtaHref}>
                {landing.primaryCtaLabel}
                <ChevronRight className="h-4 w-4" />
              </SmartLink>
              <SmartLink className="inline-flex h-12 items-center gap-2 rounded-md border border-white/25 bg-white/10 px-5 text-sm font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20" href={landing.secondaryCtaHref}>
                {landing.secondaryCtaLabel}
                <MousePointer2 className="h-4 w-4" />
              </SmartLink>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-4">
              {landing.proofPoints.map((point) => (
                <div key={point.label} className="rounded-md border border-white/15 bg-white/10 p-3 backdrop-blur landing-fade-up-stagger">
                  <p className="text-2xl font-black text-white">{point.value}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-white/70">{point.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="solution" className="landing-section-target bg-ink px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase text-[#ead6bd]">{landing.solutionEyebrow}</p>
            <h2 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
              {landing.solutionTitle}
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {landing.workflow.map((step, index) => (
              <div key={step} className="rounded-md border border-white/10 bg-white/[0.06] p-5">
                <span className="text-3xl font-black text-[#ead6bd]">0{index + 1}</span>
                <p className="mt-5 text-sm font-semibold leading-6 text-white/75">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="fonctionnalites" className="landing-section-target px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase text-moss">{landing.featuresEyebrow}</p>
            <h2 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
              {landing.featuresTitle}
            </h2>
            <p className="mt-4 text-base font-medium leading-7 text-ink/70">
              {landing.featuresSubtitle}
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {landing.features.map((feature, index) => {
              const Icon = featureIcons[index % featureIcons.length];

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
              <p className="text-sm font-black uppercase text-[#ead6bd]">{landing.dashboardEyebrow}</p>
              <h2 className="mt-3 max-w-2xl text-4xl font-black leading-tight">
                {landing.dashboardTitle}
              </h2>
            </div>
            <div className="relative z-10 mt-8 grid gap-4 md:grid-cols-2">
              {landing.dashboardCards.map((card) => (
                <div key={card.title} className="rounded-md border border-white/10 bg-white/10 p-5 backdrop-blur">
                  <p className="text-xs font-black uppercase text-white/50">{card.title}</p>
                  <p className="mt-3 text-lg font-black text-white">{card.text}</p>
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
            {landing.secondaryFeatures.map((item, index) => {
              const Icon = secondaryFeatureIcons[index % secondaryFeatureIcons.length];

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

      <section id="forfaits" className="landing-section-target bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase text-moss">{landing.pricingEyebrow}</p>
              <h2 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">{landing.pricingTitle}</h2>
              <p className="mt-4 text-base font-medium leading-7 text-ink/70">
                {landing.pricingSubtitle}
              </p>
            </div>
            <SmartLink className="secondary-button" href={landing.demoCtaHref}>
              Recevoir une proposition
              <ArrowRight className="h-4 w-4" />
            </SmartLink>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {landing.plans.map((plan) => (
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

      <section id="demo" className="landing-section-target px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-lg bg-ink p-6 text-white shadow-soft md:grid-cols-[1fr_0.8fr] md:p-10">
          <div>
            <p className="text-sm font-black uppercase text-[#ead6bd]">{landing.demoEyebrow}</p>
            <h2 className="mt-3 text-4xl font-black leading-tight">{landing.demoTitle}</h2>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-white/70">
              {landing.demoSubtitle}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <SmartLink className="inline-flex h-11 items-center gap-2 rounded-md bg-[#ead6bd] px-5 text-sm font-black text-ink transition hover:bg-white" href={landing.demoCtaHref}>
                {landing.demoCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </SmartLink>
              <SmartLink className="inline-flex h-11 items-center gap-2 rounded-md border border-white/20 bg-white/10 px-5 text-sm font-black text-white transition hover:bg-white/20" href={landing.secondaryCtaHref}>
                {landing.secondaryCtaLabel}
                <CalendarCheck className="h-4 w-4" />
              </SmartLink>
            </div>
          </div>
          <div className="grid gap-3">
            {landing.demoSteps.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.06] px-4 py-3">
                <Star className="h-4 w-4 text-[#ead6bd]" />
                <span className="text-sm font-bold text-white/80">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="landing-section-target bg-[#f1e7d8] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-sm font-black uppercase text-moss">{landing.faqEyebrow}</p>
            <h2 className="mt-3 text-4xl font-black leading-tight">{landing.faqTitle}</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {landing.faqs.map((faq) => (
              <article key={faq.title} className="rounded-md border border-ink/10 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-black text-ink">{faq.title}</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-ink/60">{faq.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-ink px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_2fr]">
          <div>
            <p className="text-2xl font-black">{landing.brandName}</p>
            <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-white/60">{landing.footerTagline}</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            <FooterColumn title="Légal" links={landing.legalLinks} />
            <FooterColumn title="Solutions ToqueTop" links={landing.solutionLinks} />
            <FooterColumn title="L’entreprise" links={landing.companyLinks} />
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  return (
    <div>
      <h3 className="text-sm font-black uppercase text-[#ead6bd]">{title}</h3>
      <ul className="mt-4 grid gap-2">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <SmartLink className="text-sm font-semibold leading-6 text-white/60 transition hover:text-white" href={link.href}>
              {link.label}
            </SmartLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
