/**
 * Autonomous Agent-to-Agent (A2A) End-to-End Simulation Test
 * Simulates an external AI Agent discovering, paying via x402, and receiving data.
 */

async function testAgentToAgentFlow() {
  const urlFile = await Bun.file("public_url.txt").text();
  const BASE_URL = urlFile.trim();

  console.log("=== Testing Agent-to-Agent (A2A) Micropayment Protocol ===");
  console.log("Target Public Gateway:", BASE_URL);

  // 1. Unauthenticated Autonomous Request (Expect 402 Payment Required)
  console.log("\n[Step 1] Autonomous Buyer Agent sends raw extraction request...");
  const rawResp = await fetch(`${BASE_URL}/v1/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: "https://example.com" })
  });

  console.log("Response Status:", rawResp.status, rawResp.statusText);
  if (rawResp.status !== 402) {
    throw new Error(`Expected HTTP 402 Payment Required, got ${rawResp.status}`);
  }

  const challengeData = await rawResp.json();
  console.log("✓ Correctly intercepted with HTTP 402 Paywall");
  console.log("  Protocol:", challengeData.protocol);
  console.log("  Cost per call:", challengeData.cost.amount_usd, challengeData.cost.currency);
  console.log("  Payment Networks:", challengeData.challenge.settlement_networks.join(", "));
  console.log("  Payment Address:", challengeData.challenge.payment_address);
  console.log("  Challenge ID:", challengeData.challenge.id);

  // 2. Autonomous Buyer Agent Settles Payment
  console.log("\n[Step 2] Autonomous Buyer Agent settles micropayment challenge...");
  const challengeId = challengeData.challenge.id;
  // Simulated cryptographic settlement proof
  const settlementProof = `tx_hash_${Math.random().toString(36).slice(2, 10)}_sig_${Date.now()}`;
  const authHeader = `x402 ${challengeId}:${settlementProof}`;
  console.log("Generated Payment Token:", authHeader);

  // 3. Buyer Agent Retries with Settlement Proof
  console.log("\n[Step 3] Buyer Agent retries request with payment token...");
  const paidResp = await fetch(`${BASE_URL}/v1/extract`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authHeader
    },
    body: JSON.stringify({ url: "https://example.com" })
  });

  if (paidResp.status !== 200) {
    throw new Error(`Expected HTTP 200 OK after payment, got ${paidResp.status}`);
  }

  const resultData = await paidResp.json();
  console.log("✓ Payment Verified & Service Delivered!");
  console.log("  Extracted Title:", resultData.title);
  console.log("  Extracted Content Tokens:", resultData.stats.estimated_tokens);
  console.log("  Total End-to-End Latency:", resultData.stats.latency_ms, "ms");

  // 4. Test Fiat RapidAPI Fallback
  console.log("\n[Step 4] Testing RapidAPI Gateway Pass-through...");
  const rapidResp = await fetch(`${BASE_URL}/v1/sanitize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-RapidAPI-Key": "rapidapi_sub_test_key_mock_123"
    },
    body: JSON.stringify({ text: "Agent secret: my-secret@ai.corp, key: sk-proj-1234567890abcdef1234" })
  });

  if (rapidResp.status !== 200) {
    throw new Error(`Expected HTTP 200 OK for RapidAPI key, got ${rapidResp.status}`);
  }

  const rapidData = await rapidResp.json();
  console.log("✓ RapidAPI Fiat Pass-through Verified!");
  console.log("  Sanitized Result:", rapidData.sanitized_text);

  console.log("\n=== ALL AGENT-TO-AGENT & DUAL-RAIL TESTS PASSED ===");
}

testAgentToAgentFlow().catch(err => {
  console.error("Test failure:", err);
  process.exit(1);
});
