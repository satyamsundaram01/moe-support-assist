import axios from "axios";
import logger from "./logger.js";
import { handleError } from "./error.js";

/**
 * Makes an HTTP request with robust logging and error handling.
 * @param {Object} config - Axios request config
 * @param {string} toolName - Name of the tool for logging context
 * @returns {Promise<Object>} - Response data
 */
export async function makeRequest(config, toolName = "") {
  logger.info(`[${toolName}] Request config:`, config);
  try {
    config.timeout = Math.max(config.timeout || 30000, 120000);
    const response = await axios(config);
    logger.info(`[${toolName}] Response status: ${response.status}`);
    logger.debug(`[${toolName}] Response data:`, response.data);
    return response.data;
  } catch (err) {
    if (err.code === "ECONNRESET" || (err.message && err.message.includes("socket hang up"))) {
      logger.error(`[${toolName}] Error: socket hang up or connection reset`);
      return { error: "Error: socket hang up or connection reset. Please check the target server." };
    }
    logger.error(`[${toolName}] Error invoking tool:`, err?.response?.data || err);
    if (err?.response) {
      logger.error(`[${toolName}] Error status: ${err.response.status}`);
      logger.error(`[${toolName}] Error data:`, err.response.data);
    }
    throw handleError(err, toolName);
  }
}
