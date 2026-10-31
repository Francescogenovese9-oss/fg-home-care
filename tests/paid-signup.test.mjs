import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { PAID_SIGNUP_VERSION, getSignupPlan, needsSignupPayment } from "../lib/subscriptions/paid-signup.ts";
import { TERMS_VERSION, DIRECT_TERMS_VERSION, PRIVACY_VERSION, hasAcceptedDirectTerms } from "../lib/legal/versions.ts";
const signup = (plan = "DIRECT", profession = "Infermiere") => ({ id: "new-professional", app_metadata: {
  signup_subscription_version: PAID_SIGNUP_VERSION, signup_subscription_plan: plan, signup_profession: profession,
}});
function moduleAt(path, dependencies, env = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, console, Date, process: { env }, require(name) {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency ${name}`);
    return dependencies[name];
  }});
  return exports;
}
test("only new server-managed signups require payment; browser metadata cannot grant completion", () => {
  assert.equal(needsSignupPayment(signup()), true);
  assert.equal(needsSignupPayment(signup("PREMIUM")), true);
  for (const user of [{}, { user_metadata: signup().app_metadata }, { app_metadata: { ...signup().app_metadata, signup_subscription_version: "unknown" } }, { app_metadata: { ...signup().app_metadata, signup_subscription_plan: "BASIC" } }]) {
    assert.equal(getSignupPlan(user), null);
    assert.equal(needsSignupPayment(user), false);
  }
  assert.equal(needsSignupPayment({ ...signup(), user_metadata: { signup_subscription_completed: true } }), true);
  assert.equal(needsSignupPayment({ app_metadata: { ...signup().app_metadata, signup_subscription_completed: true } }), false);
});

test("completion requires an active subscription and its own fully paid invoice, not a return URL", async () => {
  let status = "incomplete", payment = null, marked = 0;
  const filters = [];
  const admin = { from(table) { return {
    select() { return this; }, eq(key, value) { if (table === "professional_subscription_payments") filters.push([key, value]); return this; },
    gte(key, value) { filters.push([key, value]); return this; }, limit() { return this; },
    maybeSingle: async () => ({ data: table === "professional_profiles" ? { stripe_subscription_id: "sub_mock", subscription_status: status } : payment }),
  }; }, auth: { admin: { updateUserById: async (id, values) => { assert.equal(id, "new-professional"); assert.equal(values.app_metadata.signup_subscription_completed, true); marked++; return {error: null}; } } } };
  const { completePaidSignup } = moduleAt("lib/subscriptions/complete-paid-signup.ts", {
    "server-only": {}, "@/lib/supabase/admin": { getSupabaseAdmin: () => admin },
    "@/lib/stripe/server": { getStripe: () => { throw new Error("No live Stripe calls allowed"); } },
    "@/lib/stripe/sync-professional-subscription": {}, "./paid-signup": { getSignupPlan, needsSignupPayment },
    "./direct-plan": { isDoctorProfession: p => p.startsWith("Medico") }, "@/lib/professions": { isProfession: () => true },
  });
  assert.equal(await completePaidSignup(signup()), false);
  status = "active";
  assert.equal(await completePaidSignup(signup()), false);
  assert.equal(marked, 0);
  payment = {stripe_invoice_id: "in_mock"};
  assert.equal(await completePaidSignup(signup("DIRECT", "Medico specialista")), true);
  assert.ok(filters.some(([k,v]) => k === "amount_paid" && v === 4990));
  for (const filter of [["professional_id", "new-professional"], ["stripe_subscription_id", "sub_mock"], ["currency", "eur"], ["status", "PAID"]]) {
    assert.ok(filters.some(x => x[0] === filter[0] && x[1] === filter[1]));
  }
  assert.equal(await completePaidSignup(signup("PREMIUM")), true);
  assert.ok(filters.some(([k,v]) => k === "amount_paid" && v === 1990));
  assert.equal(marked, 2);
  status = "canceled";
  assert.equal(await completePaidSignup({ ...signup(), app_metadata: { ...signup().app_metadata, signup_subscription_completed: true } }), true);
  assert.equal(marked, 2, "later cancellation must not restart signup or re-bill");
});

function checkoutHarness(plan) {
  let user = signup(plan);
  let professional = { verification_status: "PENDING", profession: "Infermiere", stripe_customer_id: "cus_mock", subscription_status: "INACTIVE", stripe_subscription_id: null };
  let stripeCalls = 0, parameters, priceAmount;
  const profile = { role: "PROFESSIONAL", email: "mock@example.com" };
  function client(data) { return { auth: { getUser: async () => ({ data: { user } }) }, from: () => ({ select() {return this;}, eq() {return this;}, maybeSingle: async () => ({data: typeof data === "function" ? data() : data}) }) }; }
  const { POST } = moduleAt(plan === "DIRECT" ? "app/api/stripe/subscription/direct/checkout/route.ts" : "app/api/stripe/subscription/checkout/route.ts", {
    "next/server": { NextResponse: {json: (body, init) => ({status: init?.status ?? 200, body})} },
    "@/lib/subscriptions/paid-signup": {getSignupPlan, needsSignupPayment},
    "@/lib/subscriptions/direct-rollout": {isDirectEnabledFor: () => true},
    "@/lib/legal/versions": {TERMS_VERSION, DIRECT_TERMS_VERSION, PRIVACY_VERSION, hasAcceptedDirectTerms},
    "@/lib/supabase/server": {createClient: async () => client(profile)},
    "@/lib/supabase/admin": {getSupabaseAdmin: () => client(() => professional)},
    "@/lib/professions": {isProfession: () => true},
    "@/lib/subscriptions/direct-plan": {isDoctorProfession: p => p.startsWith("Medico")},
    "@/lib/site-url": {getSiteUrl: () => "https://example.com"},
    "@/lib/stripe/server": {getStripe() { stripeCalls++; return {
      prices: {retrieve: async id => ({ active: true, type: "recurring", currency: "eur", unit_amount: priceAmount ?? (id === "price_doctor" ? 4990 : id === "price_premium" ? 1990 : 2990), recurring: {interval: "month", interval_count: 1} })},
      customers: {retrieve: async () => ({ id: "cus_mock" })},
      checkout: {sessions: {create: async values => { parameters = values; return {url: "https://example.com/mock-checkout"}; }}},
    }; }},
  }, { NEXT_PUBLIC_TRANSACTIONS_ENABLED: "false", STRIPE_PREMIUM_PRICE_ID: "price_premium", STRIPE_DIRECT_HEALTHCARE_PRICE_ID: "price_healthcare", STRIPE_DIRECT_DOCTOR_PRICE_ID: "price_doctor" });
  const consent = {signupTermsAccepted: true, signupTermsVersion: TERMS_VERSION, directTermsAccepted: true, directTermsVersion: DIRECT_TERMS_VERSION};
  return {post: (body = consent) => POST({json: async () => body}), get parameters() {return parameters;}, get stripeCalls() {return stripeCalls;}, set user(value) {user = value;}, set professional(value) {professional = {...professional, ...value};}, set priceAmount(value) {priceAmount = value;} };
}
for (const plan of ["PREMIUM", "DIRECT"]) {
  test(`${plan} new signup pays before approval while patient payments stay disabled`, async () => {
    const h = checkoutHarness(plan);
    assert.equal((await h.post({})).status, 400);
    assert.equal(h.stripeCalls, 0);
    assert.equal((await h.post()).status, 200);
    assert.match(h.parameters.success_url, /\/onboarding\/subscription\?payment=success$/);
    assert.match(h.parameters.cancel_url, /\/onboarding\/subscription\?payment=canceled$/);
    assert.equal(h.parameters.subscription_data.metadata.fg_home_care_plan, plan);
    assert.equal(h.parameters.line_items[0].price, plan === "PREMIUM" ? "price_premium" : "price_healthcare");
  });
  test(`${plan} cannot open the other signup plan or duplicate a recoverable subscription`, async () => {
    const h = checkoutHarness(plan);
    h.user = signup(plan === "PREMIUM" ? "DIRECT" : "PREMIUM");
    assert.equal((await h.post()).status, 409);
    assert.equal(h.stripeCalls, 0);
    h.user = signup(plan);
    h.professional = {stripe_subscription_id: "sub_existing", subscription_status: "active"};
    assert.equal((await h.post()).status, 409);
    assert.equal(h.stripeCalls, 0);
  });
  test(`${plan} refuses mismatched configured pricing before creating Checkout`, async () => {
    const h = checkoutHarness(plan); h.priceAmount = 1;
    assert.equal((await h.post()).status, 500);
    assert.equal(h.parameters, undefined);
  });
}
test("DIRECT doctor signup uses frozen server declaration even before documents; existing users still need approval", async () => {
  const h = checkoutHarness("DIRECT");
  h.user = signup("DIRECT", "Medico specialista");
  assert.equal((await h.post()).status, 200);
  assert.equal(h.parameters.line_items[0].price, "price_doctor");
  h.user = {id: "existing", user_metadata: signup().app_metadata};
  assert.equal((await h.post()).status, 403);
});

test("new paid registrations start Basic and receive a trusted checkout requirement; duplicates are not rewritten", async () => {
  let plan = "DIRECT", created = new Date().toISOString(), identities = [{id: "identity"}], capturedSignup, capturedMarker;
  const values = {role: "PROFESSIONAL", subscriptionPlan: plan, profession: "Medico specialista", email: "mock@example.com", password: "mock-only", firstName: "Test", lastName: "Mock"};
  const {POST} = moduleAt("app/api/auth/register/route.ts", {
    "next/server": {NextResponse: {json: (body, init) => ({status: init?.status ?? 200, body})}},
    "@/lib/legal/versions": {TERMS_VERSION}, "@/lib/subscriptions/paid-signup": {PAID_SIGNUP_VERSION},
    "@/lib/validations/register": {registerSchema: {safeParse: () => ({success: true, data: {...values, subscriptionPlan: plan}})}},
    "@/lib/supabase/server": {createClient: async () => ({auth: {signUp: async input => {
      capturedSignup = input;
      return {data: {user: {id: "new-mock", email: values.email, created_at: created, identities, app_metadata: {provider: "email"}}}};
    }}})},
    "@/lib/supabase/admin": {getSupabaseAdmin: () => ({auth: {admin: {updateUserById: async (_, input) => {capturedMarker = input.app_metadata; return {};}}}})},
  }, {FG_DIRECT_PLAN_ENABLED: "true"});
  for (const selected of ["DIRECT", "PREMIUM"]) {
    plan = selected; capturedMarker = null;
    assert.equal((await POST({json: async () => ({})})).status, 201);
    assert.equal(capturedSignup.options.data.subscription_plan, "BASIC");
    assert.equal(capturedMarker.signup_subscription_plan, selected);
    assert.equal(capturedMarker.signup_profession, "Medico specialista");
    assert.equal(capturedMarker.provider, "email");
  }
  capturedMarker = null; identities = [];
  await POST({json: async () => ({})});
  assert.equal(capturedMarker, null);
  identities = [{id: "old"}]; created = "2025-01-01T00:00:00Z";
  await POST({json: async () => ({})});
  assert.equal(capturedMarker, null);
});

test("email verification continues a paid signup at Checkout and keeps the ordinary flow for Basic/patients", async () => {
  let user = signup();
  const {POST} = moduleAt("app/api/auth/verify-email/route.ts", {
    "next/server": {NextResponse: {json: (body, init) => ({status: init?.status ?? 200, body})}},
    "@/lib/subscriptions/paid-signup": {needsSignupPayment},
    "@/lib/supabase/server": {createClient: async () => ({auth: {
      verifyOtp: async () => ({}), getUser: async () => ({data: {user}}),
    }})},
  });
  const request = {json: async () => ({email: "mock@example.com", token: "12345678"})};
  assert.equal((await POST(request)).body.redirectTo, "/onboarding/subscription");
  user = {id: "existing"};
  assert.equal((await POST(request)).body.redirectTo, "/login?confirmed=true");
});

test("paid DIRECT remains unavailable before document approval and requires the approved profession to match the price", async () => {
  let approved = false, profession = "Infermiere", updated;
  const {syncProfessionalSubscription} = moduleAt("lib/stripe/sync-professional-subscription.ts", {
    "server-only": {}, "stripe": {},
    "@/lib/subscriptions/direct-rollout": {isDirectEnabledFor: () => true},
    "@/lib/subscriptions/direct-plan": {isDoctorProfession: p => p.startsWith("Medico")},
    "@/lib/professions": {isProfession: () => true},
    "@/lib/supabase/admin": {getSupabaseAdmin: () => ({from: () => ({
      select() {return this;}, eq() {return this;},
      maybeSingle: async () => ({data: {profession, verification_status: approved ? "APPROVED" : "PENDING"}}),
      update(values) {updated = values; return {eq: async () => ({})};},
    })})},
  }, {STRIPE_DIRECT_DOCTOR_PRICE_ID: "price_doctor", STRIPE_DIRECT_HEALTHCARE_PRICE_ID: "price_healthcare"});
  const subscription = {id: "sub_mock", customer: "cus_mock", status: "active", metadata: {fg_home_care_professional_id: "new-mock", fg_home_care_plan: "DIRECT"}, items: {data: [{price: {id: "price_healthcare"}}]}};
  await syncProfessionalSubscription(subscription);
  assert.equal(updated.subscription_plan, "BASIC");
  approved = true;
  await syncProfessionalSubscription(subscription);
  assert.equal(updated.subscription_plan, "DIRECT");
  profession = "Medico specialista";
  await syncProfessionalSubscription(subscription);
  assert.equal(updated.subscription_plan, "BASIC");
  subscription.items.data[0].price.id = "price_doctor";
  await syncProfessionalSubscription(subscription);
  assert.equal(updated.subscription_plan, "DIRECT");
});
