# Frequently Asked Questions

## Is Sovereign Health free?

The self-hosted (OSS) version is completely free and open source under the AGPL-3.0 license. All features are unlocked with no usage limits. You provide your own server and (optionally) your own AI API key.

The hosted SaaS version at sovereignhealth.io offers a free tier (Glimpse) with limited markers and quotas, plus paid tiers for expanded access.

## What data does Sovereign Health collect?

In self-hosted mode: nothing. There is no telemetry, no analytics, no phone-home behavior. Your instance is entirely self-contained.

In SaaS mode: the platform stores your account information and health data on our servers. Health measurement values are encrypted at rest. We do not sell, share, or analyze your data for any purpose other than providing the service to you.

## Can I migrate from SaaS to self-hosted?

Yes. Use the data export feature in Settings to download all your health data as a JSON file. Set up a self-hosted instance and import the data. Your measurements, settings, and medication history are included in the export.

## Can I migrate from self-hosted to SaaS?

This is not yet supported through the UI, but the JSON export format is the same in both directions. Contact support for assistance with importing into a SaaS account.

## What AI model does Dr. Alex use?

Dr. Alex uses any OpenAI-compatible API. In SaaS mode, the platform uses GPT-4 class models. In self-hosted mode, you provide your own API key and can use any compatible provider, including local models served through OpenAI-compatible proxies (such as Ollama or LM Studio).

## Is Sovereign Health HIPAA compliant?

Sovereign Health is designed with strong privacy controls (encryption at rest, no admin access to user data, no data sharing), but HIPAA compliance involves organizational policies, business associate agreements, and audit processes beyond software alone. If you require HIPAA compliance for a clinical use case, consult with a compliance professional about your specific deployment.

For personal health tracking, the privacy protections in Sovereign Health exceed what most consumer health apps provide.

## How do I report a security issue?

Do not open a public issue for security vulnerabilities. Email security@sovereignhealth.io with a description of the issue, steps to reproduce, and any relevant details. We will acknowledge receipt within 48 hours and work to resolve the issue promptly.

## Can multiple users share one instance?

Yes. Each user creates their own account and cannot see other users' health data. The encryption system ensures that even the server administrator cannot read measurement values through the database. A single instance can support a family or small clinic.

## What browsers are supported?

Sovereign Health works in all modern browsers: Chrome, Firefox, Safari, and Edge (latest two versions). The UI is responsive and works on mobile devices, though it is optimized for desktop use.

## How do calculated markers work?

Calculated markers (like GKI, BMI, HOMA-IR) are derived automatically from other measurements. When you log the component values (e.g., glucose and ketones), the system computes the calculated marker (GKI) and stores it. You do not need to calculate or enter these values manually.

## Can I add my own markers?

Yes. See the [Adding Custom Markers](./guides/adding-markers.md) guide. You create a database migration to define the marker, its reference ranges, and optional knowledge content. The marker then appears in the dashboard and is available for measurement entry.

## What happens if I lose my encryption key?

If `ENCRYPTION_KEY` is lost, encrypted measurement values cannot be decrypted. The database still contains your data, but the values will be unreadable. Always back up your `.env` file (which contains the key) alongside your database backups. Store both in a secure location.

## Does Sovereign Health work offline?

The web application requires a network connection to your server. However, since you self-host the server, "offline" only means the server itself is down. There is no dependency on external cloud services (except for Dr. Alex AI, which requires an API endpoint).
