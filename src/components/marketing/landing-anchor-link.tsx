"use client";

import { UtensilsCrossed } from "lucide-react";
import { CSSProperties, MouseEvent, ReactNode, useState } from "react";

export function LandingAnchorLink({
  href,
  className,
  style,
  children
}: {
  href: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [animating, setAnimating] = useState(false);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!href.startsWith("#")) {
      return;
    }

    const target = document.querySelector(href);

    if (!target) {
      return;
    }

    event.preventDefault();
    setAnimating(true);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", href);
    window.setTimeout(() => setAnimating(false), 900);
  }

  return (
    <a className={className} href={href} onClick={handleClick} style={style}>
      {children}
      {animating ? (
        <span className="landing-service-toast" aria-hidden="true">
          <UtensilsCrossed className="h-5 w-5" />
          Service en cours
        </span>
      ) : null}
    </a>
  );
}
