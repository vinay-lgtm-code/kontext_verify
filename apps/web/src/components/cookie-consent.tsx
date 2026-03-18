"use client";

import { useEffect } from "react";
import "vanilla-cookieconsent/dist/cookieconsent.css";
import "../styles/cookie-consent-theme.css";
import * as CookieConsent from "vanilla-cookieconsent";

function loadClarity() {
  if (document.getElementById("clarity-script")) return;
  const script = document.createElement("script");
  script.id = "clarity-script";
  script.async = true;
  script.src = "https://www.clarity.ms/tag/qi6iav4al4";
  document.head.appendChild(script);
  // Initialize clarity tracking
  (window as any).clarity =
    (window as any).clarity ||
    function () {
      ((window as any).clarity.q = (window as any).clarity.q || []).push(
        arguments
      );
    };
}

export function CookieConsentBanner() {
  useEffect(() => {
    CookieConsent.run({
      guiOptions: {
        consentModal: {
          layout: "box inline",
          position: "bottom left",
        },
        preferencesModal: {
          layout: "box",
        },
      },

      categories: {
        necessary: {
          enabled: true,
          readOnly: true,
        },
        analytics: {
          enabled: false,
          autoClear: {
            cookies: [{ name: /^_clck/ }, { name: /^_clsk/ }],
          },
        },
      },

      onConsent: () => {
        if (CookieConsent.acceptedCategory("analytics")) {
          loadClarity();
        }
      },

      onChange: ({ changedCategories }) => {
        if (changedCategories.includes("analytics")) {
          if (CookieConsent.acceptedCategory("analytics")) {
            loadClarity();
          } else {
            // Reload to fully clear Clarity session
            window.location.reload();
          }
        }
      },

      language: {
        default: "en",
        translations: {
          en: {
            consentModal: {
              title: "Cookie preferences",
              description:
                "We use cookies to analyze site usage with Microsoft Clarity. You can choose to accept or decline analytics cookies.",
              acceptAllBtn: "Accept all",
              acceptNecessaryBtn: "Reject all",
              showPreferencesBtn: "Manage preferences",
            },
            preferencesModal: {
              title: "Cookie preferences",
              acceptAllBtn: "Accept all",
              acceptNecessaryBtn: "Reject all",
              savePreferencesBtn: "Save preferences",
              sections: [
                {
                  title: "Strictly necessary",
                  description:
                    "These cookies are essential for the site to function and cannot be disabled.",
                  linkedCategory: "necessary",
                },
                {
                  title: "Analytics",
                  description:
                    "We use Microsoft Clarity to understand how visitors interact with the site. This helps us improve the developer experience. No personal data is sold or shared with third parties.",
                  linkedCategory: "analytics",
                },
              ],
            },
          },
        },
      },
    });
  }, []);

  return null;
}

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => CookieConsent.showPreferences()}
      className="text-xs text-[var(--term-text-2)] transition-colors hover:text-[var(--term-blue)]"
      aria-label="Open cookie preferences"
    >
      Cookie Settings
    </button>
  );
}
