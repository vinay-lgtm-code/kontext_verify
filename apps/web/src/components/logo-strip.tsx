import Image from "next/image";

const logos = [
  { name: "Circle", src: "/logos/circle.svg", href: "https://circle.com" },
  { name: "Base", src: "/logos/base.svg", href: "https://base.org" },
  { name: "USDC", src: "/logos/usdc.svg", href: "https://circle.com/usdc" },
  {
    name: "Vercel AI SDK",
    src: "/logos/vercel-ai.svg",
    href: "https://sdk.vercel.ai",
  },
  {
    name: "LangChain",
    src: "/logos/langchain.svg",
    href: "https://langchain.com",
  },
];

export function LogoStrip() {
  return (
    <div>
      <p className="text-[10px] font-light uppercase tracking-widest text-[var(--term-text-3)] mb-6 text-center">
        Compatible with
      </p>
      <div className="flex items-center justify-center gap-x-10 gap-y-6 flex-wrap">
        {logos.map((logo) => (
          <a
            key={logo.name}
            href={logo.href}
            target="_blank"
            rel="noopener noreferrer"
            className="grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(74,222,128,0.3)]"
          >
            <Image
              src={logo.src}
              alt={logo.name}
              width={120}
              height={32}
              className="h-6 w-auto"
            />
          </a>
        ))}
      </div>
    </div>
  );
}
