// Zendesk configuration
import type { ZendeskConfig } from '../types/zendesk';
import { createTicketService } from '../services/ticket-service';

// Get Zendesk configuration from environment variables
export const getZendeskConfig = (): ZendeskConfig | null => {
  const subdomain = import.meta.env.VITE_ZENDESK_SUBDOMAIN;
  const apiToken = import.meta.env.VITE_ZENDESK_API_TOKEN;
  const email = import.meta.env.VITE_ZENDESK_EMAIL;
  const domain = import.meta.env.VITE_ZENDESK_DOMAIN;


  // Use subdomain as domain if domain is not provided
  const finalDomain = domain || subdomain;

  if (!finalDomain || !apiToken || !email) {
    console.warn('Zendesk configuration incomplete. Please check environment variables.');
    console.warn('Required: VITE_ZENDESK_SUBDOMAIN (or VITE_ZENDESK_DOMAIN), VITE_ZENDESK_API_TOKEN, VITE_ZENDESK_EMAIL');
    return null;
  }

  const config = {
    domain: finalDomain,
    apiToken,
    email,
    subdomain,
  };
  return config;
};

// Initialize Zendesk services
export const initializeZendesk = () => {
  const config = getZendeskConfig();
  
  if (!config) {
    console.warn('Zendesk not configured. Ticket features will be disabled.');
    return false;
  }

  try {
    // Synchronous initialization
    createTicketService(config);
    return true;
  } catch (error) {
    console.error('Failed to initialize Zendesk:', error);
    return false;
  }
};
