import type {} from "./.sst/platform/config";

const { loadEnvConfig } = await import("@next/env");
loadEnvConfig(process.cwd());

export default $config({
  app(input) {
    return {
      // This is a stable SST state namespace, not product copy. Renaming it
      // creates a brand-new app with empty secrets and duplicate DNS resources.
      name: "agentplanner",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage || ""),
      home: "aws"
    };
  },
  async run() {
    // Secrets
    const supabaseUrl = new sst.Secret("SupabaseUrl");
    const supabasePublishableKey = new sst.Secret("SupabasePublishableKey");
    const supabaseSecretKey = new sst.Secret("SupabaseSecretKey");
    const resendApiKey = new sst.Secret("ResendApiKey");
    const geminiApiKey = new sst.Secret("GeminiApiKey");

    // Next.js app deployed via OpenNext → CloudFront + Lambda
    // Keep the legacy construct ID so SST updates the existing stack instead
    // of creating a second CloudFront/Cloudflare deployment for the same domain.
    new sst.aws.Nextjs("AgentPlanner", {
      domain: $app.stage === "production" ? {
        name: "pinksundew.com",
        dns: sst.cloudflare.dns({
          zone: "e1abdf6439b30b69986244aec28a1831",
        }),
      } : undefined,
      buildCommand: "node scripts/clean-opennext-output.mjs && npx --yes @opennextjs/aws@3.9.14 build",
      link: [supabaseUrl, supabasePublishableKey, supabaseSecretKey, resendApiKey, geminiApiKey],
      environment: {
        NEXT_PUBLIC_SUPABASE_URL: supabaseUrl.value,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey.value,
        SUPABASE_SECRET_KEY: supabaseSecretKey.value,
        RESEND_API_KEY: resendApiKey.value,
        GEMINI_API_KEY: geminiApiKey.value,
        GEMINI_MODEL: "gemini-3.1-flash-lite-preview",
      },
    });
  },
});
