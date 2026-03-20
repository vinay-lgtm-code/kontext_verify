import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title:
    "The Examiner Question That Will Define Agentic Payments: 'Who Authorized This?'",
  description:
    "Compliance frameworks assume human agency. When AI agents autonomously send USDC, concepts like 'authorized' and 'intentional' become ambiguous. The first enforcement action will set the precedent.",
  openGraph: {
    title:
      "The Examiner Question That Will Define Agentic Payments: 'Who Authorized This?'",
    description:
      "Compliance frameworks assume human agency. When AI agents autonomously send USDC, concepts like 'authorized' and 'intentional' become ambiguous.",
    type: "article",
    publishedTime: "2026-03-18T00:00:00Z",
    authors: ["Vinay Narayan"],
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Who Authorized This? Agentic Payments Compliance",
      },
    ],
  },
};

const blogPostJsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline:
    "The Examiner Question That Will Define Agentic Payments: 'Who Authorized This?'",
  description:
    "Compliance frameworks assume human agency. When AI agents autonomously send USDC, concepts like 'authorized' and 'intentional' become ambiguous. The first enforcement action will set the precedent.",
  datePublished: "2026-03-18T00:00:00Z",
  author: {
    "@type": "Person",
    name: "Vinay Narayan",
    url: "https://getkontext.com/team",
  },
  publisher: {
    "@type": "Organization",
    name: "Legaci Labs",
    url: "https://getkontext.com",
    logo: {
      "@type": "ImageObject",
      url: "https://getkontext.com/og-image.png",
    },
  },
  image: "https://getkontext.com/og-image.png",
  url: "https://getkontext.com/blog/who-authorized-this",
  mainEntityOfPage: "https://getkontext.com/blog/who-authorized-this",
};

export default function WhoAuthorizedThisPost() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostJsonLd) }}
      />
      {/* Back link */}
      <Link
        href="/blog"
        className="mb-8 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        Back to blog
      </Link>

      {/* Header */}
      <header className="mb-12">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <time dateTime="2026-03-18">March 18, 2026</time>
          <span aria-hidden="true">&middot;</span>
          <span>14 min read</span>
        </div>
        <h1 className="mt-4 text-sm font-medium">
          The Examiner Question That Will Define Agentic Payments: &apos;Who
          Authorized This?&apos;
        </h1>
        <p className="mt-4 text-xs text-[var(--ic-text-muted)] leading-relaxed">
          Compliance frameworks assume human agency. When AI agents
          autonomously send USDC, concepts like &quot;authorized&quot; and
          &quot;intentional&quot; become ambiguous. The first enforcement
          action will set the precedent.
        </p>
        <div className="mt-4 flex gap-2">
          <Badge variant="secondary">Agentic Payments</Badge>
          <Badge variant="secondary">Compliance</Badge>
          <Badge variant="secondary">Risk</Badge>
        </div>
      </header>

      <Separator className="my-8" />

      {/* Content */}
      <div className="prose-kontext">
        <p>
          Last month, an AI agent on Skyfire&apos;s platform sent $28,000 USDC
          to a wallet in Lagos at 3:14 AM Eastern. The agent was procuring
          data from a third-party API. It checked the invoice against its
          policy constraints, verified the destination wasn&apos;t on any
          blocklist, and executed the transfer. Nobody was awake.
        </p>
        <p>
          Now imagine a BSA examiner reviewing this transaction six months
          from now. They ask the question that every compliance professional
          knows is coming: &quot;Who authorized this?&quot;
        </p>
        <p>
          The honest answer is unsatisfying. Nobody authorized that specific
          payment. A developer wrote a policy file. A product manager approved
          the agent&apos;s spending limits. An LLM interpreted the policy and
          decided the invoice was legitimate. But nobody looked at this
          particular invoice, this particular wallet, this particular amount,
          and said &quot;yes, send it.&quot;
        </p>
        <p>
          This isn&apos;t a hypothetical problem for the future. Agentic
          payments are happening now. Skyfire processes real USDC payments
          through AI agent wallets. Skyfire&apos;s platform lets developers
          create a digital wallet for a large language model, then deposit
          funds into that wallet from a bank account or with USDC. Denso&apos;s
          AI agents are procuring auto parts autonomously. Citi Ventures is
          actively exploring the intersection of AI agents and payment
          networks. The rails exist. The compliance frameworks for those rails
          do not.
        </p>

        <h2>The authorization chain problem</h2>
        <p>
          When a human sends a wire, the authorization chain is unambiguous.
          Maria logged into the banking portal at 9:47 AM. She entered the
          beneficiary details. She reviewed the amount. She clicked
          &quot;Send.&quot; There&apos;s a session log, an IP address, maybe
          a second factor authentication event. The authorization is traceable
          to a specific person making a specific decision at a specific time.
        </p>
        <p>
          When an AI agent sends USDC, the authorization chain looks
          completely different. The &quot;authorization&quot; is a policy file
          written by a developer six months ago. The policy says something
          like: &quot;Agent may approve vendor invoices up to $50,000 from
          wallets in the approved vendor registry.&quot; The LLM interprets
          that policy. It applies it to a transaction the developer never saw,
          for an amount the developer didn&apos;t specifically approve, to a
          wallet the developer may never have reviewed.
        </p>
        <p>
          If the examiner asks &quot;who authorized this specific
          payment?&quot;, the truthful answer is: &quot;Nobody authorized this
          specific payment. Someone authorized the agent to make payments like
          this.&quot;
        </p>
        <p>
          That distinction matters. A lot. BSA compliance is built on the
          concept of individual transaction authorization. When you file a
          SAR, you identify specific transactions and specific authorization
          events. When you respond to an examiner inquiry, you produce the
          approval chain for a specific payment. The entire framework assumes
          that someone, at some point, looked at this transaction and said
          yes.
        </p>
        <p>
          With agentic payments, what you have instead is a delegation chain.
          The board delegated spending authority to the CFO. The CFO
          authorized the deployment of an autonomous treasury agent. The
          engineering team wrote a policy constraining the agent&apos;s
          behavior. The agent applied the policy to this transaction. Each
          link in that chain is defensible. But the chain is longer, less
          direct, and harder to document than &quot;Maria clicked send.&quot;
        </p>

        <h2>The reasoning gap</h2>
        <p>
          BSA examiners routinely ask a second question: &quot;Why was this
          transaction approved?&quot;
        </p>
        <p>
          For human-initiated payments, the answer lives in familiar places.
          Approval workflows. Email threads. Documented business purpose.
          &quot;This was a quarterly payment to our Lagos supplier per
          contract #4471. The invoice was reviewed by accounts payable and
          approved by the finance director.&quot; Clean. Auditable. Stored in
          a system that nobody can quietly modify.
        </p>
        <p>
          For agent-initiated payments, the &quot;reasoning&quot; is whatever
          the model computed at the time of the transaction. The agent
          evaluated the invoice. It checked the vendor registry. It compared
          the amount to the policy threshold. It decided the transaction was
          within scope. But unless you deliberately captured that reasoning
          at the moment of execution, it&apos;s gone.
        </p>
        <p>
          This is the part that unsettles me. The model that made the decision
          may have been updated since then. The weights are different. If you
          ask the same model why it approved the transaction today, it might
          give you a different answer than it would have given at 3:14 AM six
          months ago. The reasoning is ephemeral unless you make it durable.
        </p>
        <p>
          Agent reasoning capture is becoming a new compliance primitive. Not
          because regulators explicitly require it yet. But because the first
          examiner who asks &quot;why did your agent approve this $28,000
          transfer?&quot; will expect a better answer than &quot;the model
          thought it was fine.&quot; They&apos;ll want to see the specific
          policy that was applied, the specific inputs the model evaluated,
          and the specific output it produced. At the time of the transaction,
          not reconstructed after the fact.
        </p>
        <p>
          If you&apos;re deploying agents that make payment decisions, you
          should be logging the agent&apos;s decision context for every
          transaction above your materiality threshold. The log should include
          the policy version, the inputs evaluated, the confidence score (if
          your model produces one), and the specific authorization
          determination. This log should be append-only. It should be
          timestamped. And ideally, it should be tamper-evident, so that six
          months from now you can prove the log hasn&apos;t been modified
          since the transaction.
        </p>

        <h2>The &quot;subject&quot; problem in SAR filing</h2>
        <p>
          FinCEN&apos;s SAR form has a field called &quot;Subject
          Information.&quot; It asks for the person or entity conducting or
          attempting to conduct the suspicious transaction. Name, address,
          identification, role in the suspicious activity.
        </p>
        <p>
          When a human conducts a suspicious transaction, the subject is the
          human. When a shell company conducts a suspicious transaction, the
          subject is the company and its beneficial owners. The form was
          designed for these scenarios.
        </p>
        <p>
          When an AI agent conducts a suspicious transaction, who is the
          subject?
        </p>
        <p>
          The agent itself? It doesn&apos;t have an identity in the regulatory
          sense. No SSN, no EIN, no address. The company that deployed it?
          They didn&apos;t initiate the specific transaction. The developer
          who wrote the policy? They defined the boundaries but didn&apos;t
          direct the action. The end user who triggered the workflow? In many
          agentic systems, there is no end user. The agent acts autonomously.
        </p>
        <p>
          I&apos;ve talked to compliance officers at three companies deploying
          agentic payment systems. All three are handling this differently.
          One lists the company as the subject and the agent as &quot;acting
          on behalf of.&quot; Another lists the agent&apos;s identifier in the
          subject field and explains the relationship in the narrative. A
          third files with the company as subject and omits any reference to
          the agent, because they&apos;re worried that mentioning an AI agent
          will trigger additional scrutiny they&apos;re not prepared for.
        </p>
        <p>
          None of them are confident they&apos;re doing it right. The GENIUS
          Act requires &quot;appropriate operational, compliance, and
          information technology risk management principles-based requirements
          and standards, including Bank Secrecy Act and sanctions compliance
          standards.&quot; That language is broad enough to encompass
          agent-initiated transaction flows. It doesn&apos;t specifically
          address them. The gap between &quot;broad enough to encompass&quot;
          and &quot;specifically addressed&quot; is where enforcement risk
          lives.
        </p>

        <h2>The retroactive evidence problem</h2>
        <p>
          There&apos;s a fourth dimension to this that doesn&apos;t get
          enough attention. When an examiner reviews a suspicious transaction
          six months later, they need confidence that the records they&apos;re
          seeing are the same records that existed at the time of the
          transaction. They need to trust the evidence.
        </p>
        <p>
          For human-initiated payments, institutional controls provide that
          confidence. Access logs show who touched the record. Separation of
          duties means the person who initiated the transaction can&apos;t
          modify the compliance records. Audit trails on the audit system
          itself create a chain of custody. These aren&apos;t perfect, but
          they&apos;re well-understood and examiners know how to evaluate
          them.
        </p>
        <p>
          For agent-initiated payments, the picture is different. The
          agent&apos;s decision happened in software. The reasoning log is in
          a database. The compliance records are in another database. Anyone
          with database access could, in theory, modify what the agent
          &quot;thought&quot; six months ago. The traditional controls (access
          logs, separation of duties) still apply, but they&apos;re harder to
          enforce when the &quot;actor&quot; is software that runs across
          multiple systems.
        </p>
        <p>
          Think about it from the examiner&apos;s perspective. They&apos;re
          looking at a transaction that an AI agent initiated at 3:14 AM. The
          company presents a reasoning log showing the agent checked the
          policy, screened the wallet, and determined the transfer was within
          scope. The examiner asks: how do I know this log wasn&apos;t
          created or modified after the transaction? How do I know the
          &quot;reasoning&quot; you&apos;re showing me is the reasoning the
          agent actually had, not a post-hoc reconstruction?
        </p>
        <p>
          For traditional payments, nobody asks this question. The
          institutional controls are sufficient. For agent-initiated payments,
          the question is fair. The agent&apos;s reasoning is software output.
          Software output can be regenerated. Unless you&apos;ve
          cryptographically committed to the reasoning at the time of the
          transaction, you can&apos;t prove it hasn&apos;t changed.
        </p>
        <p>
          This is why tamper-evidence for agent transaction records is a
          harder problem than tamper-evidence for traditional payment records.
          It&apos;s not about the payment itself. It&apos;s about the decision
          that led to the payment. That decision happened in software, was
          produced by a model, and could theoretically be reproduced
          differently by a newer version of the same model. The evidence
          needs to be locked down at the time of creation, or it&apos;s not
          really evidence.
        </p>

        <h2>Where this leaves us</h2>
        <p>
          Compliance frameworks, BSA, OFAC, the Travel Rule, the GENIUS Act,
          were all written assuming a human initiates payments. They use words
          like &quot;authorized,&quot; &quot;intentional,&quot;
          &quot;subject,&quot; and &quot;conducted by.&quot; All of these
          concepts presume human agency. When an AI agent autonomously sends
          USDC to a wallet at 3 AM because its policy engine decided an
          invoice was valid, every one of those concepts gets fuzzy.
        </p>
        <p>
          The companies deploying agentic payments today are operating in an
          interpretive gap. The regulations exist. The technology exists. The
          interpretation connecting the two does not. The first enforcement
          action involving an agent-initiated payment will set the precedent,
          and every company in the space will have to adjust based on how that
          precedent lands.
        </p>
        <p>
          If you&apos;re building agentic payment systems, you should be
          thinking about four things now: documenting your authorization chain
          from board delegation to agent policy to individual transaction.
          Capturing agent reasoning at the time of each payment decision.
          Deciding how you&apos;ll handle the &quot;subject&quot; question on
          a SAR. And making your compliance records tamper-evident so that
          an examiner six months from now can trust what they&apos;re seeing.
        </p>
        <p>
          The regulatory clarity will come. It always does. The question is
          whether you&apos;ll have the evidence trail to survive the period
          before it arrives.
        </p>

        {/* Kontext CTA */}
        <div className="mt-8 rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] p-5">
          <p className="text-sm text-[var(--ic-text-muted)]">
            Kontext&apos;s patented tamper-evident audit trail captures intent, screening results, and approval context for every programmable payment.{" "}
            <Link href="/contact" className="text-[var(--ic-accent)] hover:underline">
              Learn how it works →
            </Link>
          </p>
        </div>

        {/* Related reading */}
        <div className="mt-8">
          <h3 className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">Related reading</h3>
          <ul className="mt-3 space-y-2">
            <li>
              <Link href="/blog/bsa-always-on-settlement" className="text-sm text-[var(--ic-text-muted)] hover:text-[var(--ic-accent)] transition-colors">
                Your BSA Program Wasn&apos;t Built for 24/7 Settlement →
              </Link>
            </li>
            <li>
              <Link href="/blog/regulated-entity-partner-problem" className="text-sm text-[var(--ic-text-muted)] hover:text-[var(--ic-accent)] transition-colors">
                You&apos;re the Regulated Entity. Your Partner Initiated the Transaction. →
              </Link>
            </li>
          </ul>
        </div>

        <Separator className="my-12" />

        <p className="text-xs text-[var(--ic-text-dim)]">
          Vinay Narayan is the founder of Legaci Labs. He holds a patent on
          tamper-evident digest chains for agent audit trails.
        </p>
      </div>
    </article>
  );
}
