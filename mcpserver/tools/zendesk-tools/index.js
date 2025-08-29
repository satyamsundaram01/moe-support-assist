import { z } from "zod";
import { makeRequest } from "../../src/utils/request.js";
import logger from "../../src/utils/logger.js";

export async function registerZendeskTools(server) {
  server.tool(
    "fetch_zendesk_ticket",
    "Fetches a Zendesk ticket by ticket ID.",
    {
      ticket_id: z.string().describe("Zendesk ticket ID")
    },
    async ({ ticket_id }) => {
      const zendeskDomain = process.env.ZENDESK_DOMAIN;
      const zendeskToken = process.env.ZENDESK_TOKEN;
      if (!zendeskDomain || !zendeskToken) {
        logger.error("Zendesk domain or token not set in environment variables.");
        return {
          content: [{ type: "text", text: "Zendesk domain or token not configured." }]
        };
      }
      const url = `https://${zendeskDomain}/api/v2/tickets/${ticket_id}.json`;
      const headers = {
        "Authorization": `Bearer ${zendeskToken}`,
        "Content-Type": "application/json"
      };
      const requestConfig = {
        url,
        method: "GET",
        headers
      };
      logger.info(`[Zendesk] Fetching ticket: ${ticket_id}`);
      try {
        const data = await makeRequest(requestConfig, "fetch_zendesk_ticket");
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
        };
      } catch (err) {
        logger.error(`[Zendesk] Error fetching ticket ${ticket_id}:`, err);
        return {
          content: [{ type: "text", text: `Error fetching ticket: ${err.error || err.message}` }]
        };
      }
    }
  );
}
