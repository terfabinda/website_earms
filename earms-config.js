// EARMS runtime API overrides for https://earmshub.com.
//
// This file is optional. The built-in default already works:
//   - earmshub.com -> direct https://iam|onboarding|billing|project.earmshub.com
//     (backends CORS-allow https://earmshub.com)
//   - everywhere else (Vercel, localhost) -> relative /api/* proxy
//     (vercel.json rewrites / vite.config.js proxy).
//
// Uncomment + edit ONLY if backends move or you need to point at staging.
// No rebuild needed — edit this file on the server and hard-refresh.
//
//   window.EARMS_IAM_BASE_URL = "https://iam.earmshub.com";
//   window.EARMS_ONBOARDING_BASE_URL = "https://onboarding.earmshub.com";
//   window.EARMS_BILLING_BASE_URL = "https://billing.earmshub.com";
//   window.EARMS_PROJECT_BASE_URL = "https://project.earmshub.com";
