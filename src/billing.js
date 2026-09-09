// EARMS Billing — Frontend API client
// Implements the endpoints from Billing_API_Documentation.docx

import { apiFetch, tokenService } from './iam'

export const BILLING_BASE_URL =
  ((typeof window !== "undefined" && window.EARMS_BILLING_BASE_URL) || "/api/billing").replace(/\/?$/, "/");

async function billingFetch(path, options = {}) {
  return apiFetch(path, options, false, BILLING_BASE_URL);
}

async function parseResponse(res) {
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.message || "Request failed (" + res.status + ")");
  }
  return data;
}

function qs(params) {
  const us = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") us.append(k, v);
  });
  const s = us.toString();
  return s ? "?" + s : "";
}

export const billingApi = {
  // 3.1 Auth Test
  async secureTest() {
    const res = await billingFetch("api/billing/secure-test", { method: "GET" });
    return parseResponse(res);
  },

  // 3.2 Subscribe to a Plan
  async subscribe(payload) {
    const res = await billingFetch("api/billing/subscribe", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return parseResponse(res);
  },

  // 3.3 Get User Subscription
  async getUserSubscription(username) {
    const res = await billingFetch(
      "api/billing/get-subcription/" + encodeURIComponent(username),
      { method: "GET" }
    );
    return parseResponse(res);
  },

  // 3.4 Verify Payment
  async verifyPayment(reference) {
    const res = await fetch(BILLING_BASE_URL + "api/billing/payments/verify" + encodeURIComponent(reference), {
      method: "GET",
    });
    return parseResponse(res);
  },

  // 3.6 Get User Entitlements
  async getEntitlements(username) {
    const res = await fetch(BILLING_BASE_URL + "api/billing/entitlements/" + encodeURIComponent(username), {
      method: "GET",
    });
    return parseResponse(res);
  },

  // 3.7 Get Available Currencies
  async getCurrencies() {
    const res = await billingFetch("api/billing/currencies", { method: "GET" });
    return parseResponse(res);
  },

  // 3.8 Get Subscription Prices
  async getPrices(currencyCode) {
    const res = await billingFetch(
      "api/billing/getprices" + qs({ currency: currencyCode }),
      { method: "GET" }
    );
    return parseResponse(res);
  },

  // 3.9 Get Payment Details
  async getPaymentDetails(subscriptionId) {
    const res = await billingFetch(
      "api/billing/sub-payment" + qs({ SubscriptionId: subscriptionId }),
      { method: "GET" }
    );
    return parseResponse(res);
  },

  // 3.10 Create Subscription Plan
  async createPlan(payload) {
    const res = await billingFetch("api/billing/create-plan", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return parseResponse(res);
  },

  // 3.11 Get Plan Details
  async getPlanDetails(planId) {
    const res = await billingFetch(
      "api/billing/get-plan-details" + qs({ Id: planId }),
      { method: "GET" }
    );
    return parseResponse(res);
  },

  // 3.12 Get All Plans Summary
  async getPlansSummary() {
    const res = await billingFetch("api/billing/get-plans-summary", { method: "GET" });
    return parseResponse(res);
  },

  // 3.13 Activate Plan
  async activatePlan(planId) {
    const res = await billingFetch(
      "api/billing/plan/" + encodeURIComponent(planId) + "/activate",
      { method: "PUT" }
    );
    return parseResponse(res);
  },

  // 3.14 Deactivate Plan
  async deactivatePlan(planId) {
    const res = await billingFetch(
      "api/billing/plan/" + encodeURIComponent(planId) + "/deactivate",
      { method: "PUT" }
    );
    return parseResponse(res);
  },

  // 3.15 Get All Features
  async getAllFeatures() {
    const res = await billingFetch("api/billing/plan/get-all-features", { method: "GET" });
    return parseResponse(res);
  },

  // 3.16 Update Plan
  async updatePlan(planId, payload) {
    const res = await billingFetch(
      "api/billing/plan/update-plan/" + encodeURIComponent(planId),
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
    return parseResponse(res);
  },

  // 3.17 Get Billing History
  async getBillingHistory(username) {
    const res = await billingFetch(
      "api/billing/history" + qs({ username }),
      { method: "GET" }
    );
    return parseResponse(res);
  },

  // 3.18 Purchase AI Units
  async purchaseAIUnits(payload) {
    const res = await billingFetch("api/billing/purchase-aiunits", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return parseResponse(res);
  },

  // 3.19 Manual Payment Approval
  async manualPaymentApproval(payload) {
    const res = await billingFetch("api/billing/manual-payment-approval", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return parseResponse(res);
  },
};
