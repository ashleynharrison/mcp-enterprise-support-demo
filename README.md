# MCP Enterprise Support Demo

<div align="center">

![MCP](https://img.shields.io/badge/MCP-Model%20Context%20Protocol-blue?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Anthropic](https://img.shields.io/badge/Anthropic-Claude-D4A27F?style=for-the-badge)

**A Model Context Protocol server demonstrating AI-native enterprise support personalization**

[View Demo](https://ashleynharrison.github.io/mcp-enterprise-support-demo) · [Documentation](#usage) · [Report Bug](https://github.com/ashleynharrison/mcp-enterprise-support-demo/issues)

</div>

---

## Overview

This MCP server demonstrates how AI can leverage external data sources to provide **personalized enterprise support** at scale. When connected to Claude, it enables real-time customer lookups, ticket retrieval, and personalized response generation—exactly the capabilities described in modern AI-native support operations.

### The Problem

Traditional support systems force agents to manually check multiple systems before every response:
- 🔄 **Context switching** between CRM, ticketing, billing, and usage dashboards
- ⏱️ **Slow personalization** as agents gather customer context
- 📊 **Inconsistent treatment** across customer tiers
- 🚨 **Missed escalations** due to manual SLA tracking

### The Solution

With MCP, Claude pulls customer context automatically before drafting responses:

```
User: "Help me respond to Acme Corporation's rate limiting complaint"

Claude:
  1. Calls lookup_customer("Acme Corporation")
     → Enterprise tier, $125K contract, 90% API usage, known rate limiting issue
  
  2. Calls get_open_tickets("ENT-001")  
     → Finds existing ticket from 3 days ago
  
  3. Calls get_response_guidance("ENT-001", "api")
     → Gets personalized template with tone guidance
  
  4. Drafts response acknowledging the ongoing issue with specific solutions
```

---

## Tools

| Tool | Description |
|------|-------------|
| `lookup_customer` | Retrieves complete customer profile including tier, contract value, API usage, account flags, known issues, and support history |
| `get_open_tickets` | Fetches all open/pending tickets with age, priority, assignee, and tags |
| `get_response_guidance` | Generates personalized response templates with tone guidance and escalation paths |
| `check_escalation_rules` | Returns SLA requirements by tier including response time targets |

---

## Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│   Claude Desktop    │────▶│   MCP Server         │────▶│   Data Sources       │
│   (MCP Client)      │◀────│   (This project)     │◀────│   - Customer DB      │
└─────────────────────┘     └──────────────────────┘     │   - Ticket System    │
                                                          │   - Escalation Rules │
                                                          └──────────────────────┘
```

In production, the data sources would connect to real systems (Salesforce, Intercom, Stripe, etc.). This demo uses a mock JSON database to simulate enterprise customer data.

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Claude Desktop (for testing with Claude)

### Installation

```bash
# Clone the repository
git clone https://github.com/ashleynharrison/mcp-enterprise-support-demo.git
cd mcp-enterprise-support-demo

# Install dependencies
npm install

# Build the TypeScript
npm run build
```

### Testing with MCP Inspector

The MCP Inspector lets you test tools without connecting to Claude Desktop:

```bash
npm run inspector
```

This opens a browser-based interface where you can call tools and see responses.

### Connecting to Claude Desktop

Add this to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "enterprise-support": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-enterprise-support-demo/build/index.js"]
    }
  }
}
```

Restart Claude Desktop. You'll see the tools available in the interface.

---

## Usage

### Example: Looking Up a Customer

```typescript
// Claude calls this automatically when you mention a customer
lookup_customer({ query: "Acme Corporation" })

// Returns:
{
  "customer": {
    "id": "ENT-001",
    "company": "Acme Corporation",
    "tier": "Enterprise",
    "contractValue": "$125,000",
    "apiUsage": { "utilizationPercent": 90, "status": "APPROACHING_LIMIT" },
    "flags": ["HIGH_VALUE", "EXPANSION_OPPORTUNITY"],
    "knownIssues": ["Rate limiting concerns during peak hours"]
  },
  "supportGuidance": {
    "priorityLevel": "HIGH",
    "responseTimeTarget": "4 hours",
    "keyGuidance": [
      "Enterprise customer - Prioritize and personalize",
      "💰 High-value account - Extra care on all interactions",
      "⚡ Approaching API limit - Proactively discuss upgrade options"
    ]
  }
}
```

### Example: Getting Response Guidance

```typescript
get_response_guidance({ 
  customerId: "ENT-001", 
  issueType: "escalation" 
})

// Returns personalized template with:
// - Tone guidance for Enterprise tier
// - Pre-filled customer name and context
// - Escalation path and SLA requirements
// - Known issues to reference
```

---

## Demo Scenarios

### Scenario 1: Enterprise Rate Limiting

> "Acme Corporation is complaining about rate limiting. Help me respond."

Claude automatically:
1. Looks up Acme → sees 90% API usage and known rate limiting issue
2. Finds their open ticket from 3 days ago
3. Gets Enterprise-tier response guidance
4. Drafts personalized response acknowledging the ongoing issue

### Scenario 2: Strategic Account Escalation

> "Global Finance Ltd is upset about their deployment. How should I handle this?"

Claude automatically:
1. Looks up Global Finance → sees STRATEGIC_ACCOUNT flag, $500K contract
2. Checks escalation rules → Enterprise Plus requires 1-hour response
3. Gets escalation guidance with account manager info
4. Recommends immediate escalation with specific language

---

## Project Structure

```
mcp-enterprise-support-demo/
├── src/
│   └── index.ts          # MCP server with tool definitions
├── data/
│   └── customers.json    # Mock customer database
├── docs/
│   └── index.html        # Landing page (GitHub Pages)
├── package.json
├── tsconfig.json
└── README.md
```

---

## Extending This Demo

### Adding Real Data Sources

Replace the JSON file with actual API calls:

```typescript
// Instead of reading from JSON
const customer = await salesforce.getAccount(query);
const tickets = await intercom.getConversations(customerId);
```

### Adding More Tools

```typescript
server.tool(
  "check_usage_trends",
  {
    customerId: z.string(),
    timeframe: z.enum(["7d", "30d", "90d"])
  },
  async ({ customerId, timeframe }) => {
    // Fetch usage data and identify trends
    return { content: [{ type: "text", text: JSON.stringify(trends) }] };
  }
);
```

---

## Why This Matters

This project demonstrates:

- **MCP Protocol Understanding** — Server architecture, tool definitions, transport layers
- **Enterprise Support Operations** — Tiers, escalation rules, SLAs, account flags
- **AI-Native System Design** — How to make AI responses contextual by default
- **Practical Implementation** — Working code, not just concepts

---

## About

**Ashley Harrison** — Program Operations Specialist at Webflow

Built as a portfolio project demonstrating practical understanding of AI-native support systems and the Model Context Protocol.

- 📧 ashley8harrison@gmail.com
- 💼 [LinkedIn](https://linkedin.com/in/harrisonashleyn)

---

## License

MIT License - feel free to use this as a starting point for your own MCP projects.
