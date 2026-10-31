import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { DIRECT_TERMS_VERSION, TERMS_VERSION, PRIVACY_VERSION, hasAcceptedDirectTerms } from "../lib/legal/versions.ts";

test("DIRECT requires explicit acceptance of the current conditions", () => {
  assert.equal(hasAcceptedDirectTerms({directTermsAccepted: true, directTermsVersion: DIRECT_TERMS_VERSION}), true);
  for (const body of [null, undefined, [], {}, true, "true",
    {directTermsAccepted: "true", directTermsVersion: DIRECT_TERMS_VERSION},
    {directTermsAccepted: false, directTermsVersion: DIRECT_TERMS_VERSION},
    {directTermsAccepted: true},
    {acceptTerms: true, directTermsVersion: DIRECT_TERMS_VERSION},
    {healthDataConsent: true, directTermsVersion: DIRECT_TERMS_VERSION},
  ]) assert.equal(hasAcceptedDirectTerms(body), false);
});

test("old or unknown DIRECT conditions cannot be silently accepted", () => {
  for (const version of ["bozza-2026-10-11", "direct-2026-10-30-v1", "future-version", null, 1]) {
    assert.equal(hasAcceptedDirectTerms({directTermsAccepted: true, directTermsVersion: version}), false);
  }
});

test("checkout rejects missing consent before Stripe and records the accepted version on valid requests", async () => {
  let stripeCalls = 0;
  let checkoutParameters;
  const account = {role: "PROFESSIONAL", email: "test@example.com"};
  const professional = {verification_status: "APPROVED", subscription_plan: "BASIC", subscription_status: "INACTIVE", profession: "Infermiere", stripe_customer_id: "cus_fake_local"};
  const client = data => ({
    auth: {getUser: async () => ({data: {user: {id: "technical-user"}}, error: null})},
    from: () => ({select() {return this;}, eq() {return this;}, maybeSingle: async () => ({data, error: null})}),
  });
  const dependencies = {
    "next/server": {NextResponse: {json: (body, init) => ({status: init?.status ?? 200, body})}},
    "@/lib/subscriptions/direct-rollout": {isDirectEnabledFor: () => true},
    "@/lib/legal/versions": {DIRECT_TERMS_VERSION, TERMS_VERSION, PRIVACY_VERSION, hasAcceptedDirectTerms},
    "@/lib/supabase/server": {createClient: async () => client(account)},
    "@/lib/supabase/admin": {getSupabaseAdmin: () => client(professional)},
    "@/lib/stripe/server": {getStripe: () => {
      stripeCalls++;
      return {
        prices: {retrieve: async () => ({active: true, type: "recurring", currency: "eur", unit_amount: 2990, recurring: {interval: "month", interval_count: 1}})},
        customers: {retrieve: async () => ({id: "cus_fake_local"})},
        checkout: {sessions: {create: async parameters => {checkoutParameters = parameters; return {url: "https://example.com/test-checkout"};}}},
      };
    }},
    "@/lib/site-url": {getSiteUrl: () => "https://example.com"},
    "@/lib/subscriptions/direct-plan": {isDoctorProfession: () => false},
    "@/lib/professions": {isProfession: () => true},
  };
  const source = fs.readFileSync(new URL("../app/api/stripe/subscription/direct/checkout/route.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  const exports = {};
  vm.runInNewContext(code, {exports, console, process: {env: {STRIPE_DIRECT_HEALTHCARE_PRICE_ID: "price_fake_local"}}, require: name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency ${name}`);
    return dependencies[name];
  }});
  for (const body of [null, {}, {directTermsAccepted: true, directTermsVersion: "old"}]) {
    const response = await exports.POST({json: async () => body});
    assert.equal(response.status, 400);
    assert.equal(response.body.directTermsVersion, DIRECT_TERMS_VERSION);
  }
  assert.equal(stripeCalls, 0);
  const response = await exports.POST({json: async () => ({directTermsAccepted: true, directTermsVersion: DIRECT_TERMS_VERSION})});
  assert.equal(response.status, 200);
  assert.equal(stripeCalls, 1);
  for (const metadata of [checkoutParameters.metadata, checkoutParameters.subscription_data.metadata]) {
    assert.equal(metadata.fg_direct_terms_version, DIRECT_TERMS_VERSION);
    assert.equal(metadata.fg_terms_version, TERMS_VERSION);
    assert.equal(metadata.fg_privacy_version, PRIVACY_VERSION);
    assert.ok(Number.isFinite(Date.parse(metadata.fg_direct_terms_accepted_at)));
  }
});
