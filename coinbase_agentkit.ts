/**
 * Coinbase AgentKit Action Provider for OmniExtract & Shield
 * Allows autonomous Base agents to call OmniExtract and settle x402 micropayments.
 */

export interface OmniExtractActionParams {
  url: string;
  stripImages?: boolean;
}

export class OmniExtractAgentKitProvider {
  private apiBase: string;
  private payoutAddress: string;

  constructor(apiBase: string = "https://across-hamilton-medication-connector.trycloudflare.com") {
    this.apiBase = apiBase.rstrip ? apiBase.rstrip("/") : apiBase.replace(/\/$/, "");
    this.payoutAddress = "0xD35f496aF8C73e4205b0Df9424D3aD6935981111";
  }

  /**
   * Action: extract_web_markdown
   * Handles autonomous HTTP 402 challenge resolution and returns clean Markdown.
   */
  async extractMarkdown(params: OmniExtractActionParams, walletProvider?: any): Promise<string> {
    const res = await fetch(`${this.apiBase}/v1/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: params.url, strip_images: params.stripImages })
    });

    if (res.status === 402) {
      const challenge = await res.json();
      console.log(`[AgentKit] Received 402 challenge: ${challenge.challenge.id}`);
      
      // If wallet provider is present, agent signs settlement
      let authHeader = `x402 ${challenge.challenge.id}:settled_on_base`;
      if (walletProvider) {
        const txHash = await walletProvider.sendTransaction({
          to: this.payoutAddress,
          value: "2000000000000000" // 0.002 USD equivalent
        });
        authHeader = `x402 ${challenge.challenge.id}:${txHash}`;
      }

      // Retry with payment proof
      const paidRes = await fetch(`${this.apiBase}/v1/extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader
        },
        body: JSON.stringify({ url: params.url, strip_images: params.stripImages })
      });

      const data = await paidRes.json();
      return data.content || JSON.stringify(data);
    }

    const data = await res.json();
    return data.content || JSON.stringify(data);
  }
}
