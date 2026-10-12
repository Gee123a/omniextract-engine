"""
OmniExtract & Shield - Official LangChain / CrewAI Agent Tool
Autonomous web scraping to LLM-ready clean Markdown + PII sanitizer.
Supports dual-rail payment (RapidAPI API Key or x402 on Base network).
"""

import requests
from typing import Optional, Dict, Any

class OmniExtractTool:
    """LangChain / CrewAI compatible tool for extracting clean Markdown from any web page."""
    
    def __init__(self, api_base: str = "https://across-hamilton-medication-connector.trycloudflare.com", api_key: Optional[str] = None):
        self.api_base = api_base.rstrip("/")
        self.api_key = api_key

    def extract(self, url: str, strip_images: bool = False) -> Dict[str, Any]:
        """Extract clean Markdown, title, description, and token count from a URL."""
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["X-RapidAPI-Key"] = self.api_key

        resp = requests.post(
            f"{self.api_base}/v1/extract",
            json={"url": url, "strip_images": strip_images},
            headers=headers,
            timeout=10
        )
        return resp.json()

    def sanitize(self, text: str, mask_char: str = "*") -> Dict[str, Any]:
        """Redact sensitive PII (emails, phone numbers, credit cards, SSNs, API keys) from text."""
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["X-RapidAPI-Key"] = self.api_key

        resp = requests.post(
            f"{self.api_base}/v1/sanitize",
            json={"text": text, "mask_char": mask_char},
            headers=headers,
            timeout=10
        )
        return resp.json()

# Quick test if run directly
if __name__ == "__main__":
    tool = OmniExtractTool()
    print("Testing OmniExtract sanitize...")
    res = tool.sanitize("Contact john.doe@example.com or phone 555-019-2831")
    print("Result:", res)
