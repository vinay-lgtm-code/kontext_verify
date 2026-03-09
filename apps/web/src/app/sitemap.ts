import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://getkontext.com";
  const now = new Date();

  return [
    { url: baseUrl, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/docs`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/use-cases`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/integrations`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/dashboard`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/blog/payment-control-plane`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${baseUrl}/blog/8-stage-payment-lifecycle`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${baseUrl}/changelog`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/audiences`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/audiences/fintech-startups`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/audiences/treasury-ops`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/audiences/payment-platforms`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
