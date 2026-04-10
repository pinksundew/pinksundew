import type {} from "./.sst/platform/config";

export default $config({
  app(input) {
    return {
      name: "agentplanner",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage || ""),
      home: "aws",
    };
  },
  async run() {
    // Secrets
    const supabaseUrl = new sst.Secret("SupabaseUrl");
    const supabasePublishableKey = new sst.Secret("SupabasePublishableKey");
    const supabaseSecretKey = new sst.Secret("SupabaseSecretKey");
    const resendApiKey = new sst.Secret("ResendApiKey");

    // Next.js app deployed via OpenNext → CloudFront + Lambda
    new sst.aws.Nextjs("AgentPlanner", {
      buildCommand: "node scripts/clean-opennext-output.mjs && npx --yes @opennextjs/aws@3.9.14 build",
      link: [supabaseUrl, supabasePublishableKey, supabaseSecretKey, resendApiKey],
      environment: {
        NEXT_PUBLIC_SUPABASE_URL: supabaseUrl.value,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey.value,
        SUPABASE_SECRET_KEY: supabaseSecretKey.value,
        RESEND_API_KEY: resendApiKey.value,
      },
    });
  },
});
