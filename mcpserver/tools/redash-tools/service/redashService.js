import axios from 'axios';
import { loadApiConfig } from '../../../utils/configLoader.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function fillTemplate(template, params) {
  return template.replace(/{{(\w+)}}/g, (_, key) => params[key] ?? '');
}

// Recursively remove keys from an object (and nested objects/arrays)
function stripKeysRecursive(obj, ignoreKeys) {
  if (Array.isArray(obj)) {
    return obj.map(item => stripKeysRecursive(item, ignoreKeys));
  } else if (obj && typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      if (!ignoreKeys.includes(key)) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          newObj[key] = stripKeysRecursive(obj[key], ignoreKeys);
        } else if (typeof obj[key] === 'string') {
          try {
            const parsed = JSON.parse(obj[key]);
            if (parsed && typeof parsed === 'object') {
              newObj[key] = JSON.stringify(stripKeysRecursive(parsed, ignoreKeys));
            } else {
              newObj[key] = obj[key];
            }
          } catch (e) {
            newObj[key] = obj[key];
          }
        } else {
          newObj[key] = obj[key];
        }
      }
    }
    return newObj;
  }
  return obj;
}

function stripKeysFromLogs(logs, ignoreKeys) {
  if (!Array.isArray(ignoreKeys) || ignoreKeys.length === 0) return logs;
  return logs.map(log => stripKeysRecursive(log, ignoreKeys));
}

class RedashService {
  constructor() {
    this.config = null;
    this.queries = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    const configPath = path.join(__dirname, '../config.yaml');
    const queriesPath = path.join(__dirname, '../queries/queries.json');
    
    this.config = await loadApiConfig(configPath);
    this.queries = await loadApiConfig(queriesPath);
    this.initialized = true;
  }

  getDatacenterConfig(datacenter) {
    if (!this.config.datacenters[datacenter]) {
      throw new Error(`Unknown datacenter: ${datacenter}. Available: ${Object.keys(this.config.datacenters).join(', ')}`);
    }
    return this.config.datacenters[datacenter];
  }

  getBaseURL(datacenter) {
    const dcConfig = this.getDatacenterConfig(datacenter);
    return dcConfig.url;
  }

  getApiKey(datacenter) {
    // Priority order:
    // 1. Global environment variable override (if set)
    // 2. Datacenter-specific API key from config (with env var substitution)
    // 3. Global fallback key from config (with env var substitution)
    
    const globalEnvKey = process.env[this.config.auth.global_api_key_env];
    if (globalEnvKey) {
      console.error(`[MCP-REDASH] Using global environment API key for ${datacenter}`);
      return globalEnvKey;
    }

    const dcConfig = this.getDatacenterConfig(datacenter);
    if (dcConfig.api_key) {
      console.error(`[MCP-REDASH] Using datacenter-specific API key for ${datacenter}`);
      // Handle environment variable substitution
      if (typeof dcConfig.api_key === 'string' && dcConfig.api_key.startsWith('${') && dcConfig.api_key.endsWith('}')) {
        const envVar = dcConfig.api_key.slice(2, -1);
        return process.env[envVar] || dcConfig.api_key;
      }
      return dcConfig.api_key;
    }

    console.error(`[MCP-REDASH] Using fallback API key for ${datacenter}`);
    // Handle environment variable substitution for fallback key
    if (typeof this.config.auth.fallback_key === 'string' && this.config.auth.fallback_key.startsWith('${') && this.config.auth.fallback_key.endsWith('}')) {
      const envVar = this.config.auth.fallback_key.slice(2, -1);
      return process.env[envVar] || this.config.auth.fallback_key;
    }
    return this.config.auth.fallback_key;
  }

  getHeaders(datacenter) {
    const apiKey = this.getApiKey(datacenter);
    const baseURL = this.getBaseURL(datacenter);
    
    return {
      ...this.config.headers,
      'Origin': baseURL,
      'Authorization': `Key ${apiKey}`
    };
  }

  getAxiosConfig(datacenter) {
    return {
      timeout: 100000, // 100 seconds
      httpsAgent: false,
      headers: this.getHeaders(datacenter),
      validateStatus: (status) => status < 500,
    };
  }

  getQueryConfig(type, datacenter) {
    const config = this.queries[type];
    if (!config) throw new Error(`Unknown query type: ${type}`);
    
    // Check if there's datacenter-specific configuration
    if (config.dc_config && config.dc_config[datacenter]) {
      return {
        ...config,
        ...config.dc_config[datacenter]
      };
    }
    
    return config;
  }

  getLogTypeFromQueryType(type) {
    const logTypeMap = {
      'push_campaign_logs': 'campaigns.pushlogs',
      'whatsapp_logs': 'campaigns.outbound.whatsapp', 
      'sms_logs': 'campaigns.sms'
    };
    return logTypeMap[type];
  }

  buildQuery(type, datacenter, params) {
    const config = this.getQueryConfig(type, datacenter);
    
    // Apply defaults first, then merge with provided params
    const merged = { 
      ...config.defaults, 
      ...params,
      // Add log_type for campaign logs
      log_type: this.getLogTypeFromQueryType(type)
    };
    
    // Check required parameters
    for (const req of config.required) {
      if (!merged[req]) {
        throw new Error(`Missing required parameter: ${req}`);
      }
    }
    
    // Use datacenter-specific query if available, otherwise fall back to base query
    const queryTemplate = config.query || this.queries[type].query;
    if (!queryTemplate) {
      throw new Error(`No query template found for type: ${type} and datacenter: ${datacenter}`);
    }
    
    return fillTemplate(queryTemplate, merged);
  }

  async queryLogs(datacenter, type, params) {
    await this.initialize();
    
    const config = this.getQueryConfig(type, datacenter);
    const query = this.buildQuery(type, datacenter, params);
    const baseURL = this.getBaseURL(datacenter);
    const axiosConfig = this.getAxiosConfig(datacenter);

    // Build parameters for the request
    const logType = this.getLogTypeFromQueryType(type);
    const requestParams = {
      ...config.defaults,
      ...params,
      // Standard parameters for all queries
      log_type: logType,
      search_str: params.campaign_id,
      search_str2: params.keyword_to_search || '%',
      // Legacy parameter names for backward compatibility (sent_logs)
      searcdh_str: params.keyword_to_search || '%', // DC01 specific typo
      searchd_str: params.keyword_to_search || '%', // DC04 specific
      search_stdr: params.keyword_to_search || '%', // DC02 specific
      db: params.db_name,
      LIMIT: params.limit || 10,
      Limit: params.limit || 10
    };

    const payload = {
      parameters: requestParams,
      query,
      max_age: 0
    };

    // Add datacenter-specific IDs
    if (config.data_source_id !== undefined) payload.data_source_id = config.data_source_id;
    if (config.query_id !== undefined) payload.query_id = config.query_id;
    if (config.id !== undefined) payload.id = config.id;

    console.error(`[MCP-REDASH] Sending query to Redash`, { 
      datacenter, 
      type, 
      log_type: logType,
      campaign_id: params.campaign_id,
      keyword_to_search: params.keyword_to_search || 'N/A',
      query_preview: query.substring(0, 150),
      data_source_id: config.data_source_id,
      query_id: config.query_id,
      s3_bucket: config.s3_bucket || 'N/A',
      timeout_ms: this.config.defaults.timeout,
      api_key_used: this.getApiKey(datacenter).substring(0, 8) + '...' // Log partial key for debugging
    });

    try {
      const response = await axios.post(
        `${baseURL}/api/query_results`,
        payload,
        axiosConfig
      );

      console.error(`[MCP-REDASH] Initial response from Redash`, { 
        datacenter, 
        type, 
        status: response.status,
        hasJob: !!response.data?.job?.id,
        response_time_info: `Query submitted successfully`
      });

      return response.data;
    } catch (error) {
      // Enhanced error handling for timeout and connection issues
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        console.error(`[MCP-REDASH] Request timeout after ${this.config.defaults.timeout}ms`, { 
          datacenter, 
          type,
          timeout_ms: this.config.defaults.timeout,
          error_message: error.message
        });
        throw new Error(`Request timeout after ${this.config.defaults.timeout/1000} seconds. The query might be too complex or the server is overloaded.`);
      }

      if (error.code === 'ECONNRESET' || error.message.includes('socket hang up')) {
        console.error(`[MCP-REDASH] Connection reset/hang up`, { 
          datacenter, 
          type,
          error_code: error.code,
          error_message: error.message
        });
        throw new Error(`Connection was reset by the server. This might indicate server overload or network issues.`);
      }

      console.error(`[MCP-REDASH] Error sending query to Redash: ${error.message}`, { 
        datacenter, 
        type, 
        status: error.response?.status,
        details: error.response?.data || null,
        error_code: error.code,
        api_key_prefix: this.getApiKey(datacenter).substring(0, 8) + '...' // Help debug auth issues
      });
      throw error;
    }
  }

  async pollForResult(datacenter, jobId) {
    await this.initialize();
    
    const baseURL = this.getBaseURL(datacenter);
    const axiosConfig = this.getAxiosConfig(datacenter);
    const maxTries = this.config.defaults.max_poll_tries;
    const interval = this.config.defaults.poll_interval;
    
    let tries = 0;
    let jobResult;
    let lastStatus = null;
    const startTime = Date.now();

    console.error(`[MCP-REDASH] Starting job polling`, {
      datacenter,
      jobId,
      max_tries: maxTries,
      poll_interval_ms: interval,
      estimated_max_time_s: (maxTries * interval) / 1000
    });

    do {
      await new Promise(r => setTimeout(r, interval));
      
      try {
        const response = await axios.get(
          `${baseURL}/api/jobs/${jobId}`,
          axiosConfig
        );
        
        jobResult = response.data;
        
        if (jobResult.job.status !== lastStatus) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.error(`[MCP-REDASH] Polling job status`, { 
            datacenter, 
            jobId, 
            status: jobResult.job.status, 
            tries,
            elapsed_seconds: elapsed
          });
          lastStatus = jobResult.job.status;
        }

        if (jobResult.job.status === 4) {
          console.error(`[MCP-REDASH] Job failed with error status`, { 
            datacenter, 
            jobId, 
            status: jobResult.job.status,
            error: jobResult.job.error || 'Unknown error'
          });
          throw new Error(`Redash job failed: ${jobResult.job.error || 'Unknown error'}`);
        }
      } catch (error) {
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          console.error(`[MCP-REDASH] Polling timeout, continuing...`, { 
            datacenter, 
            jobId,
            tries
          });
        } else {
          console.error(`[MCP-REDASH] Error polling job status: ${error.message}`, { 
            datacenter, 
            jobId, 
            tries,
            details: error.response?.data || null 
          });
          throw error;
        }
      }
      
      tries++;
    } while (jobResult?.job?.status !== 3 && tries < maxTries);

    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (!jobResult || jobResult.job.status !== 3) {
      console.error(`[MCP-REDASH] Job did not complete in time`, { 
        datacenter, 
        jobId, 
        status: jobResult?.job?.status || 'unknown',
        tries,
        total_elapsed_seconds: totalElapsed
      });
      throw new Error(`Job did not complete in time (status: ${jobResult?.job?.status || 'unknown'}, tries: ${tries}, elapsed: ${totalElapsed}s)`);
    }

    console.error(`[MCP-REDASH] Job completed successfully`, { 
      datacenter, 
      jobId, 
      query_result_id: jobResult.job.query_result_id,
      total_elapsed_seconds: totalElapsed,
      total_polls: tries
    });

    return jobResult.job.query_result_id;
  }

  async getQueryResultById(datacenter, queryResultId) {
    await this.initialize();
    
    const baseURL = this.getBaseURL(datacenter);
    const axiosConfig = this.getAxiosConfig(datacenter);

    try {
      const response = await axios.get(
        `${baseURL}/api/query_results/${queryResultId}`,
        axiosConfig
      );

      console.error(`[MCP-REDASH] Final query result fetched`, { 
        datacenter, 
        query_result_id: queryResultId, 
        rows_count: response.data?.query_result?.data?.rows?.length || 0
      });

      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error(`Timeout while fetching query results after ${this.config.defaults.timeout/1000} seconds`);
      }
      
      console.error(`[MCP-REDASH] Error fetching query result: ${error.message}`, { 
        datacenter, 
        query_result_id: queryResultId, 
        details: error.response?.data || null 
      });
      throw error;
    }
  }

  async runQuery(datacenter, type, params) {
    await this.initialize();
    
    const startTime = Date.now();
    
    console.error(`[MCP-REDASH] Starting query execution`, {
      datacenter,
      type,
      campaign_id: params.campaign_id,
      keyword_to_search: params.keyword_to_search || 'N/A',
      log_type: this.getLogTypeFromQueryType(type) || 'N/A',
      timeout_config: `${this.config.defaults.timeout/1000}s`,
      max_polls: this.config.defaults.max_poll_tries
    });

    try {
      const logResponse = await this.queryLogs(datacenter, type, params);
      const jobId = logResponse?.job?.id;
      
      if (!jobId) {
        throw new Error('No job id returned from Redash');
      }

      const queryResultId = await this.pollForResult(datacenter, jobId);
      const result = await this.getQueryResultById(datacenter, queryResultId);
      
      let logs = result?.query_result?.data?.rows || [];
      
      // Apply ignore keys filtering from config
      const queryConfig = this.getQueryConfig(type, datacenter);
      const configIgnore = Array.isArray(queryConfig.config_ignore) ? queryConfig.config_ignore : [];
      logs = stripKeysFromLogs(logs, configIgnore);
      
      const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      console.error(`[MCP-REDASH] Query execution completed successfully`, {
        datacenter,
        type,
        campaign_id: params.campaign_id,
        total_rows: logs.length,
        filtered_keys: configIgnore.length,
        total_execution_time: `${totalElapsed}s`
      });

      return { 
        success: true, 
        logs, 
        total_rows: logs.length,
        datacenter,
        query_type: type,
        log_type: this.getLogTypeFromQueryType(type),
        execution_time_seconds: parseFloat(totalElapsed),
        search_params: {
          campaign_id: params.campaign_id,
          keyword_to_search: params.keyword_to_search || '%'
        }
      };
    } catch (error) {
      const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      console.error(`[MCP-REDASH] Query execution failed`, {
        datacenter,
        type,
        campaign_id: params.campaign_id,
        error_message: error.message,
        total_execution_time: `${totalElapsed}s`
      });
      
      throw error;
    }
  }
}

const instance = new RedashService();
export default instance;
