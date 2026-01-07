#!/usr/bin/env node

/**
 * MCP Enterprise Support Demo Server
 * 
 * Demonstrates how AI can leverage external data sources through MCP
 * to provide personalized enterprise support responses.
 * 
 * Tools provided:
 * - lookup_customer: Get customer account details by company name or ID
 * - get_open_tickets: Retrieve open support tickets for a customer
 * - get_response_guidance: Get personalized response recommendations based on customer context
 * - check_escalation_rules: Get escalation requirements for a customer's tier
 * 
 * Author: Ashley Harrison
 * Created for: Anthropic Support Operations Specialist application
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load customer database
const dataPath = join(__dirname, "..", "data", "customers.json");
let database: Database;

interface Customer {
  id: string;
  company: string;
  tier: string;
  accountManager: string | null;
  contractValue: number;
  renewalDate: string;
  products: string[];
  apiUsage: {
    monthlyTokens: number;
    monthlyLimit: number;
    utilizationPercent: number;
  };
  knownIssues: string[];
  supportHistory: {
    totalTickets: number;
    avgResolutionHours: number;
    csat: number;
  };
  contacts: Array<{
    name: string;
    role: string;
    email: string;
    primary: boolean;
  }>;
  flags: string[];
}

interface Ticket {
  id: string;
  customerId: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  lastUpdated: string;
  assignee: string;
  description: string;
  tags: string[];
}

interface EscalationRule {
  maxResponseTime: string;
  escalateTo: string;
  autoEscalateAfter: string;
}

interface Database {
  customers: Customer[];
  tickets: Ticket[];
  escalationRules: Record<string, EscalationRule>;
}

try {
  const rawData = readFileSync(dataPath, "utf-8");
  database = JSON.parse(rawData) as Database;
} catch (error) {
  console.error("Failed to load customer database:", error);
  process.exit(1);
}

// Initialize MCP Server
const server = new McpServer({
  name: "mcp-enterprise-support",
  version: "1.0.0"
});

/**
 * Tool: lookup_customer
 * Retrieves customer account information for personalized support
 */
server.tool(
  "lookup_customer",
  {
    query: z.string().describe("Company name or customer ID to search for")
  },
  async ({ query }) => {
    const searchLower = query.toLowerCase();
    
    const customer = database.customers.find(
      c => c.id.toLowerCase() === searchLower || 
           c.company.toLowerCase().includes(searchLower)
    );

    if (!customer) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            found: false,
            message: `No customer found matching "${query}"`,
            suggestion: "Try searching by company name or customer ID (e.g., ENT-001)"
          }, null, 2)
        }]
      };
    }

    // Build personalized context
    const primaryContact = customer.contacts.find(c => c.primary);
    const daysUntilRenewal = Math.ceil(
      (new Date(customer.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const context = {
      found: true,
      customer: {
        id: customer.id,
        company: customer.company,
        tier: customer.tier,
        accountManager: customer.accountManager,
        contractValue: `$${customer.contractValue.toLocaleString()}`,
        renewalStatus: {
          date: customer.renewalDate,
          daysUntil: daysUntilRenewal,
          urgent: daysUntilRenewal <= 30
        },
        products: customer.products,
        apiUsage: {
          ...customer.apiUsage,
          status: customer.apiUsage.utilizationPercent >= 90 ? "APPROACHING_LIMIT" : 
                  customer.apiUsage.utilizationPercent >= 75 ? "HEALTHY" : "UNDERUTILIZED"
        },
        primaryContact: primaryContact ? {
          name: primaryContact.name,
          role: primaryContact.role,
          email: primaryContact.email
        } : null,
        supportHistory: customer.supportHistory,
        activeFlags: customer.flags,
        knownIssues: customer.knownIssues
      },
      supportGuidance: generateSupportGuidance(customer)
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify(context, null, 2)
      }]
    };
  }
);

/**
 * Tool: get_open_tickets
 * Retrieves open support tickets for a customer
 */
server.tool(
  "get_open_tickets",
  {
    customerId: z.string().describe("Customer ID (e.g., ENT-001)")
  },
  async ({ customerId }) => {
    const customer = database.customers.find(c => c.id === customerId);
    
    if (!customer) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            found: false,
            message: `No customer found with ID "${customerId}"`
          }, null, 2)
        }]
      };
    }

    const tickets = database.tickets.filter(
      t => t.customerId === customerId && 
           ["open", "pending", "in_progress"].includes(t.status)
    );

    const ticketSummary = {
      customerId,
      company: customer.company,
      tier: customer.tier,
      openTicketCount: tickets.length,
      tickets: tickets.map(t => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        ageInDays: Math.ceil(
          (Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        ),
        lastUpdated: t.lastUpdated,
        assignee: t.assignee,
        tags: t.tags
      })),
      escalationRule: database.escalationRules[customer.tier]
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify(ticketSummary, null, 2)
      }]
    };
  }
);

/**
 * Tool: get_response_guidance
 * Generates personalized response recommendations based on customer context
 */
server.tool(
  "get_response_guidance",
  {
    customerId: z.string().describe("Customer ID"),
    issueType: z.enum(["billing", "technical", "api", "account", "feature_request", "escalation"])
      .describe("Type of support issue")
  },
  async ({ customerId, issueType }) => {
    const customer = database.customers.find(c => c.id === customerId);
    
    if (!customer) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            found: false,
            message: `No customer found with ID "${customerId}"`
          }, null, 2)
        }]
      };
    }

    const guidance = generateResponseGuidance(customer, issueType);

    return {
      content: [{
        type: "text",
        text: JSON.stringify(guidance, null, 2)
      }]
    };
  }
);

/**
 * Tool: check_escalation_rules
 * Returns escalation requirements and timelines for a customer tier
 */
server.tool(
  "check_escalation_rules",
  {
    tier: z.enum(["Standard", "Growth", "Enterprise", "Enterprise Plus"])
      .describe("Customer tier level")
  },
  async ({ tier }) => {
    const rules = database.escalationRules[tier];
    
    if (!rules) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: `Unknown tier: ${tier}`,
            validTiers: Object.keys(database.escalationRules)
          }, null, 2)
        }]
      };
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          tier,
          escalationRules: rules,
          guidance: tier.includes("Enterprise") 
            ? "High-touch support required. Always personalize responses and proactively communicate."
            : "Standard support flow. Escalate if SLA at risk."
        }, null, 2)
      }]
    };
  }
);

/**
 * Helper: Generate support guidance based on customer profile
 */
function generateSupportGuidance(customer: Customer): object {
  const guidance: string[] = [];
  
  // Tier-based guidance
  if (customer.tier === "Enterprise Plus") {
    guidance.push("🔴 STRATEGIC ACCOUNT - White-glove service required");
    guidance.push("Always CC account manager on responses");
    guidance.push("Proactive status updates every 2 hours for open issues");
  } else if (customer.tier === "Enterprise") {
    guidance.push("Enterprise customer - Prioritize and personalize");
    guidance.push("Loop in account manager for complex issues");
  }

  // Flag-based guidance
  if (customer.flags.includes("HIGH_VALUE")) {
    guidance.push("💰 High-value account - Extra care on all interactions");
  }
  if (customer.flags.includes("APPROACHING_RENEWAL")) {
    guidance.push("⚠️ Renewal approaching - Ensure positive experience");
  }
  if (customer.flags.includes("EXPANSION_OPPORTUNITY")) {
    guidance.push("📈 Expansion opportunity - Note upsell potential");
  }
  if (customer.flags.includes("COMPLIANCE_SENSITIVE")) {
    guidance.push("🔒 Compliance-sensitive - Document all interactions thoroughly");
  }

  // Usage-based guidance
  if (customer.apiUsage.utilizationPercent >= 90) {
    guidance.push("⚡ Approaching API limit - Proactively discuss upgrade options");
  }

  // Known issues
  if (customer.knownIssues.length > 0) {
    guidance.push(`📋 Known issues to be aware of: ${customer.knownIssues.join("; ")}`);
  }

  return {
    priorityLevel: customer.tier.includes("Enterprise") ? "HIGH" : "STANDARD",
    responseTimeTarget: database.escalationRules[customer.tier]?.maxResponseTime || "24 hours",
    keyGuidance: guidance,
    accountManager: customer.accountManager
  };
}

/**
 * Helper: Generate response guidance for specific issue types
 */
function generateResponseGuidance(customer: Customer, issueType: string): object {
  const baseGuidance = {
    customer: {
      company: customer.company,
      tier: customer.tier,
      primaryContact: customer.contacts.find(c => c.primary)?.name
    },
    issueType,
    responseTemplate: "",
    toneGuidance: [] as string[],
    escalationPath: database.escalationRules[customer.tier],
    additionalContext: [] as string[]
  };

  // Tone guidance based on tier
  if (customer.tier.includes("Enterprise")) {
    baseGuidance.toneGuidance.push("Use professional, consultative tone");
    baseGuidance.toneGuidance.push("Reference their specific use case if known");
    baseGuidance.toneGuidance.push("Offer direct line or meeting for complex issues");
  } else {
    baseGuidance.toneGuidance.push("Friendly and helpful tone");
    baseGuidance.toneGuidance.push("Clear, step-by-step guidance");
  }

  // Issue-specific guidance
  switch (issueType) {
    case "billing":
      baseGuidance.responseTemplate = `Hi ${customer.contacts.find(c => c.primary)?.name || "there"},\n\nThank you for reaching out about your billing inquiry. [Address specific question]\n\nFor reference, your current plan is ${customer.products.join(", ")} at $${customer.contractValue.toLocaleString()}/year.\n\n[Resolution or next steps]`;
      baseGuidance.additionalContext.push(`Contract value: $${customer.contractValue.toLocaleString()}`);
      baseGuidance.additionalContext.push(`Renewal date: ${customer.renewalDate}`);
      break;
    
    case "api":
    case "technical":
      baseGuidance.responseTemplate = `Hi ${customer.contacts.find(c => c.primary)?.name || "there"},\n\nThank you for reporting this technical issue. [Acknowledge the problem]\n\nCurrent API usage: ${customer.apiUsage.utilizationPercent}% of monthly limit\n\n[Technical solution or investigation steps]`;
      baseGuidance.additionalContext.push(`API utilization: ${customer.apiUsage.utilizationPercent}%`);
      baseGuidance.additionalContext.push(`Products: ${customer.products.join(", ")}`);
      if (customer.knownIssues.length > 0) {
        baseGuidance.additionalContext.push(`Known issues: ${customer.knownIssues.join("; ")}`);
      }
      break;

    case "escalation":
      baseGuidance.responseTemplate = `Hi ${customer.contacts.find(c => c.primary)?.name || "there"},\n\nI understand the urgency of this issue and I'm escalating this to ${database.escalationRules[customer.tier].escalateTo} immediately.\n\n[Summary of issue and actions taken]\n\nYou can expect an update within [timeframe based on SLA].`;
      baseGuidance.toneGuidance.push("Acknowledge frustration");
      baseGuidance.toneGuidance.push("Provide concrete timeline");
      baseGuidance.toneGuidance.push("Take ownership");
      break;

    default:
      baseGuidance.responseTemplate = `Hi ${customer.contacts.find(c => c.primary)?.name || "there"},\n\nThank you for contacting Anthropic support. [Address their inquiry]\n\n[Resolution or next steps]`;
  }

  return baseGuidance;
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Enterprise Support Demo Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
