import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().trim().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  CORS_ORIGINS: z.string().default("http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"),
  FRONTEND_URL: z.string().url().default("http://127.0.0.1:5173"),
  API_PUBLIC_URL: z.string().url().default("http://127.0.0.1:3000"),
  DATABASE_URL: z.string().url().optional(),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(14),
  GOOGLE_CLIENT_ID: z.string().trim().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().trim().min(1).optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  INTEGRATION_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/).optional(),
  INBOUND_EMAIL_WEBHOOK_SECRET: z.string().min(32).optional(),
  INBOUND_EMAIL_DOMAIN: z.string().trim().regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i).optional(),
  SMTP_HOST: z.string().trim().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65_535).optional(),
  SMTP_USER: z.string().trim().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  SMTP_FROM: z.string().trim().email().optional(),
  OPENAI_API_KEY: z.string().trim().min(1).optional(),
  OPENAI_MODEL: z.string().trim().min(1).default("gpt-4.1-mini"),
}).superRefine((configuration, context) => {
  const smtpValues = [configuration.SMTP_HOST, configuration.SMTP_PORT, configuration.SMTP_USER, configuration.SMTP_PASSWORD, configuration.SMTP_FROM];
  if (smtpValues.some(Boolean) && smtpValues.some((value) => !value)) {
    context.addIssue({ code: "custom", path: ["SMTP_HOST"], message: "Set all SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM values together." });
  }
  const googleValues = [configuration.GOOGLE_CLIENT_ID, configuration.GOOGLE_CLIENT_SECRET, configuration.GOOGLE_REDIRECT_URI, configuration.INTEGRATION_ENCRYPTION_KEY];
  if (googleValues.some(Boolean) && googleValues.some((value) => !value)) {
    context.addIssue({ code: "custom", path: ["GOOGLE_CLIENT_ID"], message: "Set Google OAuth credentials, redirect URI, and integration encryption key together." });
  }
  if (Boolean(configuration.INBOUND_EMAIL_DOMAIN) !== Boolean(configuration.INBOUND_EMAIL_WEBHOOK_SECRET)) {
    context.addIssue({ code: "custom", path: ["INBOUND_EMAIL_DOMAIN"], message: "Set both INBOUND_EMAIL_DOMAIN and INBOUND_EMAIL_WEBHOOK_SECRET to receive email webhooks." });
  }
  const origins = configuration.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
  if (origins.includes("*")) context.addIssue({ code: "custom", path: ["CORS_ORIGINS"], message: "Wildcard CORS origins are not supported." });
  if (configuration.NODE_ENV === "production") {
    for (const origin of origins) {
      try {
        if (new URL(origin).protocol !== "https:") throw new Error("https required");
      } catch {
        context.addIssue({ code: "custom", path: ["CORS_ORIGINS"], message: "Production CORS origins must be valid HTTPS origins." });
        break;
      }
    }
    if (new URL(configuration.FRONTEND_URL).protocol !== "https:" || new URL(configuration.API_PUBLIC_URL).protocol !== "https:") {
      context.addIssue({ code: "custom", path: ["FRONTEND_URL"], message: "Production frontend and API public URLs must use HTTPS." });
    }
  }
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  const issues = parsedEnvironment.error.issues
    .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid environment configuration: ${issues}`);
}

export const env = {
  ...parsedEnvironment.data,
  CORS_ORIGINS: parsedEnvironment.data.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
