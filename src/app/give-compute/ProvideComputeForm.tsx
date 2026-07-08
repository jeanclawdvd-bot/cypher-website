"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import Link from "next/link";
import { track } from "@/features/analytics";
import {
  GIVE_HARDWARE_OPTIONS,
  GIVE_COUNT_OPTIONS,
  GIVE_AVAIL_OPTIONS,
  HONEYPOT_FIELD,
} from "@/features/leads/leads";
import { submitLead } from "@/features/leads/submit";
import styles from "../buy-compute/page.module.css";

type Status = "idle" | "submitting" | "success" | "fallback";

export function ProvideComputeForm(): ReactElement {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [hardware, setHardware] = useState("");
  const [count, setCount] = useState("");
  const [availability, setAvailability] = useState("");
  const [setup, setSetup] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [started, setStarted] = useState(false);

  // Fire the top-of-funnel event once, the moment the visitor starts filling
  // the form — pairs with `compute_lead_submitted` to measure conversion.
  function markStarted(): void {
    if (started) return;
    setStarted(true);
    track("compute_form_started", { lead_type: "give" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");

    const result = await submitLead("give", {
      name,
      email,
      company,
      hardware,
      count,
      availability,
      setup,
      [HONEYPOT_FIELD]: honeypot,
    });
    setStatus(result);
  }

  if (status === "success") {
    return (
      <SuccessCard
        title="Offer received"
        body="Thanks — we'll review your fleet and reply to your email, usually within a few hours."
      />
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Provide Compute</h2>
        <span className={styles.slaTag}>
          <CheckIcon />
          Typical reply under 5h
        </span>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        {/* Honeypot: hidden from users, catches bots. Never rendered visibly. */}
        <input
          type="text"
          name={HONEYPOT_FIELD}
          className={styles.honeypot}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />

        <div className={styles.grid}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="name">
              Name *
            </label>
            <input
              id="name"
              name="name"
              className={styles.input}
              placeholder="Jane Doe"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={markStarted}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Work email *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className={styles.input}
              placeholder="jane@company.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={markStarted}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="company">
              Company *
            </label>
            <input
              id="company"
              name="company"
              className={styles.input}
              placeholder="Your company"
              autoComplete="organization"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onFocus={markStarted}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="hardware">
              Hardware type *
            </label>
            <select
              id="hardware"
              name="hardware"
              className={styles.select}
              required
              value={hardware}
              onChange={(e) => setHardware(e.target.value)}
            >
              <option value="" disabled>
                Select…
              </option>
              {GIVE_HARDWARE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="count">
              GPUs available *
            </label>
            <select
              id="count"
              name="count"
              className={styles.select}
              required
              value={count}
              onChange={(e) => setCount(e.target.value)}
            >
              <option value="" disabled>
                Select…
              </option>
              {GIVE_COUNT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="availability">
              Available from *
            </label>
            <select
              id="availability"
              name="availability"
              className={styles.select}
              required
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
            >
              <option value="" disabled>
                Select…
              </option>
              {GIVE_AVAIL_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label className={styles.label} htmlFor="setup">
              Tell us about your setup
            </label>
            <textarea
              id="setup"
              name="setup"
              className={styles.textarea}
              placeholder="e.g. 24× H100 in a Tier III facility in Frankfurt, 100 Gbps uplink, idle nights and weekends"
              value={setup}
              onChange={(e) => setSetup(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className={styles.submit} disabled={status === "submitting"}>
          {status === "submitting" ? (
            "Sending…"
          ) : (
            <>
              Provide Compute <span aria-hidden="true">→</span>
            </>
          )}
        </button>

        {status === "fallback" && (
          <p className={styles.formError} role="alert">
            We couldn&apos;t reach our servers, so we opened your email app with
            the details instead. If nothing happened, email us at{" "}
            <a className={styles.disclaimerLink} href="mailto:hello@zode.org">
              hello@zode.org
            </a>
            .
          </p>
        )}

        <p className={styles.disclaimer}>
          Sending this request means you accept ZODE&apos;s{" "}
          <Link className={styles.disclaimerLink} href="/terms">
            Terms
          </Link>{" "}
          and{" "}
          <Link className={styles.disclaimerLink} href="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </div>
  );
}

function SuccessCard({ title, body }: { title: string; body: string }): ReactElement {
  return (
    <div className={styles.card}>
      <div className={styles.success} role="status">
        <span className={styles.successIcon}>
          <CheckIcon />
        </span>
        <h2 className={styles.cardTitle}>{title}</h2>
        <p className={styles.successBody}>{body}</p>
      </div>
    </div>
  );
}

function CheckIcon(): ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
