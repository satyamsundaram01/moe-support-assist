import { logger } from '../lib/logger';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  errorCode?: string;
}

export interface ValidationOptions {
  maxLength?: number;
  minLength?: number;
  allowEmpty?: boolean;
  checkForScripts?: boolean;
  checkForSqlInjection?: boolean;
  customPatterns?: Array<{ pattern: RegExp; message: string }>;
}

const DEFAULT_OPTIONS: Required<ValidationOptions> = {
  maxLength: 2000,
  minLength: 1,
  allowEmpty: false,
  checkForScripts: true,
  checkForSqlInjection: true,
  customPatterns: [],
};

// Common malicious patterns to detect
const MALICIOUS_PATTERNS = [
  // Script injection patterns
  {
    pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    message: 'Script tags are not allowed',
    code: 'SCRIPT_TAG_DETECTED'
  },
  {
    pattern: /javascript\s*:/gi,
    message: 'JavaScript URLs are not allowed',
    code: 'JAVASCRIPT_URL_DETECTED'
  },
  {
    pattern: /data\s*:\s*text\/html/gi,
    message: 'Data URLs with HTML are not allowed',
    code: 'DATA_URL_HTML_DETECTED'
  },
  {
    pattern: /vbscript\s*:/gi,
    message: 'VBScript URLs are not allowed',
    code: 'VBSCRIPT_URL_DETECTED'
  },
  {
    pattern: /on\w+\s*=\s*["'][^"']*["']/gi,
    message: 'Event handlers are not allowed',
    code: 'EVENT_HANDLER_DETECTED'
  },
  
  // SQL injection patterns (basic detection)
  {
    pattern: /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b.*\b(from|where|into|values|table|database|schema)\b)/gi,
    message: 'Potential SQL injection detected',
    code: 'SQL_INJECTION_DETECTED'
  },
  {
    pattern: /['";]\s*(or|and)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/gi,
    message: 'Potential SQL injection detected',
    code: 'SQL_INJECTION_DETECTED'
  },
  
  // Command injection patterns
  {
    pattern: /[;&|`$(){}[\]\\]/g,
    message: 'Special characters that could be used for command injection are not allowed',
    code: 'COMMAND_INJECTION_DETECTED'
  },
  
  // XSS patterns
  {
    pattern: /<iframe[\s\S]*?>/gi,
    message: 'Iframe tags are not allowed',
    code: 'IFRAME_DETECTED'
  },
  {
    pattern: /<object[\s\S]*?>/gi,
    message: 'Object tags are not allowed',
    code: 'OBJECT_TAG_DETECTED'
  },
  {
    pattern: /<embed[\s\S]*?>/gi,
    message: 'Embed tags are not allowed',
    code: 'EMBED_TAG_DETECTED'
  },
];

/**
 * Validates user input for security and length constraints
 * @param input - The input string to validate
 * @param options - Validation options
 * @returns ValidationResult indicating if input is valid
 */
export function validateInput(
  input: string,
  options: ValidationOptions = {}
): ValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    // Check for null/undefined
    if (input == null) {
      return {
        isValid: false,
        error: 'Input cannot be null or undefined',
        errorCode: 'NULL_INPUT'
      };
    }

    // Convert to string if not already
    const inputStr = String(input);
    
    // Check if empty and not allowed
    if (!opts.allowEmpty && inputStr.trim().length === 0) {
      return {
        isValid: false,
        error: 'Message cannot be empty',
        errorCode: 'EMPTY_INPUT'
      };
    }

    // Check minimum length
    if (inputStr.trim().length < opts.minLength && inputStr.trim().length > 0) {
      return {
        isValid: false,
        error: `Message must be at least ${opts.minLength} character${opts.minLength === 1 ? '' : 's'} long`,
        errorCode: 'TOO_SHORT'
      };
    }

    // Check maximum length
    if (inputStr.length > opts.maxLength) {
      return {
        isValid: false,
        error: `Message is too long. Maximum ${opts.maxLength} characters allowed`,
        errorCode: 'TOO_LONG'
      };
    }

    // Check for malicious patterns
    if (opts.checkForScripts || opts.checkForSqlInjection) {
      for (const { pattern, message, code } of MALICIOUS_PATTERNS) {
        if (pattern.test(inputStr)) {
          // Log security violation
          logger.warn('Security validation failed', {
            errorCode: code,
            inputLength: inputStr.length,
            pattern: pattern.source,
            timestamp: new Date().toISOString()
          });
          
          return {
            isValid: false,
            error: message,
            errorCode: code
          };
        }
      }
    }

    // Check custom patterns
    for (const { pattern, message } of opts.customPatterns) {
      if (pattern.test(inputStr)) {
        return {
          isValid: false,
          error: message,
          errorCode: 'CUSTOM_PATTERN_VIOLATION'
        };
      }
    }

    // All checks passed
    return { isValid: true };
    
  } catch (error) {
    logger.error('Input validation error', { error, input: input?.substring(0, 100) });
    return {
      isValid: false,
      error: 'Validation error occurred',
      errorCode: 'VALIDATION_ERROR'
    };
  }
}

/**
 * Sanitizes input by removing potentially dangerous content
 * @param input - The input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  return input
    // Remove script tags and their content
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    // Remove javascript: URLs
    .replace(/javascript\s*:/gi, '')
    // Remove data: URLs with HTML
    .replace(/data\s*:\s*text\/html[^"']*/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove potentially dangerous tags
    .replace(/<(iframe|object|embed|form|input|script|style|link|meta)[^>]*>/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validates and sanitizes input in one step
 * @param input - The input string to validate and sanitize
 * @param options - Validation options
 * @returns Object with validation result and sanitized input
 */
export function validateAndSanitizeInput(
  input: string,
  options: ValidationOptions = {}
): { validation: ValidationResult; sanitized: string } {
  const validation = validateInput(input, options);
  const sanitized = validation.isValid ? sanitizeInput(input) : '';
  
  return { validation, sanitized };
}

/**
 * Quick validation for chat messages with sensible defaults
 * @param input - The input string to validate
 * @returns ValidationResult with chat-specific validation
 */
export function validateChatMessage(input: string): ValidationResult {
  return validateInput(input, {
    maxLength: 2000,
    minLength: 1,
    allowEmpty: false,
    checkForScripts: true,
    checkForSqlInjection: true,
  });
}

/**
 * Validates input with relaxed security for trusted content
 * @param input - The input string to validate
 * @param maxLength - Maximum allowed length
 * @returns ValidationResult with basic validation only
 */
export function validateTrustedInput(input: string, maxLength: number = 5000): ValidationResult {
  return validateInput(input, {
    maxLength,
    minLength: 0,
    allowEmpty: true,
    checkForScripts: false,
    checkForSqlInjection: false,
  });
}
