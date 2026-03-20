"use client";

import Image from "next/image";

const logos = [
  { name: "Circle", src: "/logos/circle.svg" },
  { name: "Base", src: "/logos/base.svg" },
  { name: "USDC", src: "/logos/usdc.svg" },
  { name: "Arc", src: "/logos/arc.svg" },
  { name: "Tempo", src: "/logos/tempo.svg" },
  { name: "USDT", src: "/logos/usdt.svg" },
  { name: "EURC", src: "/logos/eurc.svg" },
  { name: "Vercel AI SDK", src: "/logos/vercel-ai.svg" },
  { name: "LangChain", src: "/logos/langchain.svg" },
  { name: "USD", src: "/logos/usd.svg" },
  { name: "GBP", src: "/logos/gbp.svg" },
  { name: "INR", src: "/logos/inr.svg" },
  { name: "AED", src: "/logos/aed.svg" },
  { name: "SGD", src: "/logos/sgd.svg" },
  { name: "CNY", src: "/logos/cny.svg" },
];

export function LogoStrip() {
  return (
    <div>
      <p className="text-[10px] font-mono font-medium uppercase tracking-widest text-[var(--ic-text-dim)] mb-2 text-center">
        Built for teams using
      </p>
      <p className="text-[11px] text-[var(--ic-text-dim)] mb-6 text-center">
        Stablecoin rails, wallet infrastructure, payment APIs, and treasury orchestration
      </p>
      <div className="relative overflow-hidden">
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#07080b] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#07080b] to-transparent" />
        {/* Ticker — duplicate items for seamless loop */}
        <div className="flex animate-ticker hover:[animation-play-state:paused]">
          {[...logos, ...logos].map((logo, i) => (
            <div
              key={`${logo.name}-${i}`}
              className="flex-shrink-0 px-6 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
            >
              <Image
                src={logo.src}
                alt={logo.name}
                width={120}
                height={32}
                className="h-6 w-auto"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
