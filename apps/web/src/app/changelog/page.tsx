import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import fs from "fs";
import path from "path";

export const metadata: Metadata = {
  title: "Changelog - Kontext",
  description:
    "Track every update to the Kontext SDK and platform. New features, fixes, and improvements.",
};

/** Parse our controlled CHANGELOG.md format into structured sections */
function parseChangelog(raw: string) {
  const sections: {
    version: string;
    date: string;
    groups: { heading: string; items: string[] }[];
  }[] = [];

  let current: (typeof sections)[0] | null = null;
  let currentGroup: { heading: string; items: string[] } | null = null;

  for (const line of raw.split("\n")) {
    // Version header: ## [0.2.1] - 2026-02-10
    const versionMatch = line.match(/^## \[(.+?)\] - (\d{4}-\d{2}-\d{2})/);
    if (versionMatch) {
      if (current) sections.push(current);
      current = {
        version: versionMatch[1],
        date: versionMatch[2],
        groups: [],
      };
      currentGroup = null;
      continue;
    }

    // Group header: ### Added, ### Fixed, ### Changed
    const groupMatch = line.match(/^### (.+)/);
    if (groupMatch && current) {
      currentGroup = { heading: groupMatch[1], items: [] };
      current.groups.push(currentGroup);
      continue;
    }

    // List item: - Something
    const itemMatch = line.match(/^- (.+)/);
    if (itemMatch && currentGroup) {
      currentGroup.items.push(itemMatch[1]);
    }
  }

  if (current) sections.push(current);
  return sections;
}

function getChangelog(): string {
  const candidates = [
    // Local dev: cwd is apps/web
    path.join(process.cwd(), "..", "..", "CHANGELOG.md"),
    // Vercel with root=monorepo root
    path.join(process.cwd(), "CHANGELOG.md"),
    // Vercel serverless: relative to this source file
    path.resolve(__dirname, "..", "..", "..", "..", "..", "CHANGELOG.md"),
    // Prebuild copy fallback
    path.join(process.cwd(), "apps", "web", "CHANGELOG.md"),
  ];

  for (const candidate of candidates) {
    try {
      const content = fs.readFileSync(candidate, "utf-8");
      if (content.length > 0) return content;
    } catch {
      // try next candidate
    }
  }
  return "";
}

export default function ChangelogPage() {
  const raw = getChangelog();
  const sections = parseChangelog(raw);

  return (
    <>
      {/* Hero */}
      <section className="border-b border-border/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4">
              Changelog
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              What&apos;s new in Kontext
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Track every update to the SDK and platform. New features, bug
              fixes, and improvements -- all in one place. Auto-generated from{" "}
              <a
                href="https://github.com/vinay-lgtm-code/kontext_verify/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                GitHub Releases
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Changelog entries */}
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-16">
            {sections.length === 0 && (
              <p className="text-muted-foreground">
                No changelog entries yet. Check back soon.
              </p>
            )}

            {sections.map((section) => (
              <article key={section.version} className="relative">
                {/* Version badge + date */}
                <div className="flex items-center gap-3 mb-6">
                  <a
                    href={`https://github.com/vinay-lgtm-code/kontext_verify/releases/tag/v${section.version}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-80 transition-opacity"
                  >
                    <Badge variant="default" className="text-sm font-mono">
                      v{section.version}
                    </Badge>
                  </a>
                  <time
                    dateTime={section.date}
                    className="text-sm text-muted-foreground"
                  >
                    {new Date(section.date + "T00:00:00").toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </time>
                </div>

                {/* Change groups */}
                <div className="space-y-6">
                  {section.groups.map((group) => (
                    <div key={group.heading}>
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
                        {group.heading}
                      </h3>
                      <ul className="space-y-2">
                        {group.items.map((item, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground leading-relaxed pl-4 border-l-2 border-border/60"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* Divider */}
                <div className="mt-12 border-b border-border/40" />
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
