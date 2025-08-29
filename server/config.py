"""
Configuration management for MoEngage Support Agent.

This module handles environment-based configuration for:
- Database connections (SQLite for local, PostgreSQL for production)
- MCP tool endpoints (local vs production)
- Discovery Engine credentials (secure handling)
- General application settings
"""

import os
from typing import Optional
from pathlib import Path
import json
import base64

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("Warning: python-dotenv not installed. Install it for .env file support.")

class Config:
    """Configuration class for the MoEngage Support Agent."""
    
    def __init__(self):
        # Environment detection
        self.environment = os.getenv("ENVIRONMENT", "local").lower()
        self.is_production = self.environment == "production"
        self.is_local = self.environment == "local"
        
        # Database configuration
        self.database_url = self._get_database_url()
        
        # MCP Tool configuration
        self.mcp_endpoint = self._get_mcp_endpoint()
        
        # Discovery Engine configuration
        self.discovery_engine_config = self._get_discovery_engine_config()
        
        # Server configuration
        self.host = os.getenv("HOST", "0.0.0.0")
        self.port = int(os.getenv("PORT", "8000"))
        self.allowed_origins = self._get_allowed_origins()
        self.serve_web_interface = os.getenv("SERVE_WEB_INTERFACE", "false").lower() == "true"
        
        # Logging configuration
        self.log_level = os.getenv("LOG_LEVEL", "INFO")
        
        # Model configuration for different agents
        self.model_config = self._get_model_config()
        
    def _get_model_config(self) -> dict:
        """Get model configuration for different agents."""
        return {
            "default": os.getenv("LLM_MODEL_DEFAULT", "gemini-2.5-flash-preview-05-20"),
            "technical": os.getenv("LLM_MODEL_TECHNICAL", "gemini-2.5-flash-preview-05-20"),
            "push": os.getenv("LLM_MODEL_PUSH", "gemini-2.5-flash-preview-05-20"),
            "whatsapp": os.getenv("LLM_MODEL_WHATSAPP", "gemini-2.5-flash-preview-05-20"),
            "knowledge": os.getenv("LLM_MODEL_KNOWLEDGE", "gemini-2.5-flash-preview-05-20"),
            "followup": os.getenv("LLM_MODEL_FOLLOWUP", "gemini-2.5-flash-preview-05-20"),
            "ticket": os.getenv("LLM_MODEL_TICKET", "gemini-2.5-flash-preview-05-20"),
            "execution": os.getenv("LLM_MODEL_EXECUTION", "gemini-2.5-flash-preview-05-20"),
            "root": os.getenv("LLM_MODEL_ROOT", "gemini-2.5-flash-preview-05-20")
        }
    
    def _get_database_url(self) -> str:
        """Get PostgreSQL database URL from environment."""
        # Get full DATABASE_URL first
        db_url = os.getenv("DATABASE_URL")
        if db_url:
            return db_url
        
        # If not provided, construct from individual components
        db_host = os.getenv("DB_HOST", "localhost")
        db_port = os.getenv("DB_PORT", "5432")
        db_name = os.getenv("DB_NAME", "adkdb")
        db_user = os.getenv("DB_USER", "postgres")
        db_password = os.getenv("DB_PASSWORD", "")
        
        if not db_name:
            raise ValueError("DB_NAME environment variable is required")
        
        # Construct PostgreSQL URL
        if db_password:
            return f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
        else:
            return f"postgresql://{db_user}@{db_host}:{db_port}/{db_name}"
    
    def _get_mcp_endpoint(self) -> str:
        """Get MCP endpoint based on environment."""
        if self.is_production:
            # Production: Use environment variable
            mcp_endpoint = os.getenv("MCP_ENDPOINT")
            if not mcp_endpoint:
                raise ValueError("MCP_ENDPOINT environment variable is required in production")
            return mcp_endpoint
        else:
            # Local: Use localhost endpoint
            return os.getenv("MCP_LOCAL_ENDPOINT", "http://localhost:8080")
    
    def get_mcp_config(self) -> dict:
        """Get MCP configuration for SSE connection based on environment."""
        if self.is_production:
            # Production: Use environment variables
            mcp_config = {
                "sse": {
                    "url": os.getenv("MCP_SSE_URL"),
                    "headers": {
                        "Content-Type": "application/json"
                    },
                    "timeout": int(os.getenv("MCP_SSE_TIMEOUT", "200"))
                }
            }
            # Validate required production settings
            if not mcp_config["sse"]["url"]:
                raise ValueError("MCP_SSE_URL environment variable is required in production")
        else:
            # Local: Use default localhost settings
            mcp_config = {
                "sse": {
                    "url": os.getenv("MCP_SSE_URL", "http://127.0.0.1:8080/sse"),
                    "headers": {
                        "Content-Type": "application/json"
                    },
                    "timeout": int(os.getenv("MCP_SSE_TIMEOUT", "200"))
                }
            }
        return mcp_config
    
    def _get_discovery_engine_config(self) -> dict:
        """Get Discovery Engine configuration with secure credential handling."""
        config = {
            "project_id": os.getenv("DISCOVERY_ENGINE_PROJECT_ID", "agent-ai-initiatives"),
            "location": os.getenv("DISCOVERY_ENGINE_LOCATION", "us"),
            "engine_id": os.getenv("DISCOVERY_ENGINE_ID", "app-moe-support-agent-tech_1752497866942"),
            "datastores": {
                "confluence_runbooks": os.getenv("DISCOVERY_ENGINE_CONFLUENCE_DATASTORE", "moe-confluence-support-runbooks-live-p_1752497946721_page"),
                "zendesk_tickets": os.getenv("DISCOVERY_ENGINE_ZENDESK_DATASTORE", "moe-gs-zendesk-live-private_1752599941188_gcs_store"),
                "help_docs": os.getenv("DISCOVERY_ENGINE_HELP_DOCS_DATASTORE", "moe-gs-public-docs-live-public_1752599761524_gcs_store")
            }
        }
        
        # Handle credentials securely
        if self.is_production:
            # Production: Use environment variables for credentials
            service_account_info = self._get_service_account_from_env()
        else:
            # Local: Use local credentials file or environment
            service_account_info = self._get_service_account_local()
        
        config["credentials"] = service_account_info
        return config
    
    def _get_service_account_from_env(self) -> dict:
        """Get service account credentials from environment variables."""
        # Try to get from base64 encoded environment variable first
        encoded_creds = os.getenv("GOOGLE_SERVICE_ACCOUNT_BASE64")
        if encoded_creds:
            try:
                decoded_creds = base64.b64decode(encoded_creds).decode('utf-8')
                return json.loads(decoded_creds)
            except Exception as e:
                raise ValueError(f"Failed to decode GOOGLE_SERVICE_ACCOUNT_BASE64: {e}")
        
        # Fallback to individual environment variables
        service_account_info = {
            "type": "service_account",
            "project_id": os.getenv("GOOGLE_PROJECT_ID"),
            "private_key_id": os.getenv("GOOGLE_PRIVATE_KEY_ID"),
            "private_key": os.getenv("GOOGLE_PRIVATE_KEY", "").replace("\\n", "\n"),
            "client_email": os.getenv("GOOGLE_CLIENT_EMAIL"),
            "client_id": os.getenv("GOOGLE_CLIENT_ID"),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": os.getenv("GOOGLE_CLIENT_X509_CERT_URL"),
            "universe_domain": "googleapis.com"
        }
        
        # For local development, be more lenient with missing credentials
        if self.is_local:
            # Check if we have at least some credentials
            has_any_creds = any([
                service_account_info.get("project_id"),
                service_account_info.get("private_key"),
                service_account_info.get("client_email")
            ])
            
            if not has_any_creds:
                print("⚠️  Warning: No Google service account credentials found.")
                print("   The Discovery Engine features will not work without proper credentials.")
                print("   You can:")
                print("   1. Set GOOGLE_APPLICATION_CREDENTIALS to point to a service account JSON file")
                print("   2. Set individual GOOGLE_* environment variables")
                print("   3. Set GOOGLE_SERVICE_ACCOUNT_BASE64 with base64 encoded JSON")
                print("   4. Continue without Discovery Engine features (some functionality will be limited)")
                
                # Return a minimal service account info for local development
                return {
                    "type": "service_account",
                    "project_id": "local-development",
                    "private_key_id": "local-dev",
                    "private_key": "-----BEGIN PRIVATE KEY-----\nLOCAL_DEV_KEY\n-----END PRIVATE KEY-----\n",
                    "client_email": "local-dev@example.com",
                    "client_id": "local-dev-id",
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/local-dev%40example.com",
                    "universe_domain": "googleapis.com"
                }
        
        # For production, validate required fields
        required_fields = ["project_id", "private_key_id", "private_key", "client_email", "client_id"]
        missing_fields = [field for field in required_fields if not service_account_info.get(field)]
        
        if missing_fields:
            raise ValueError(f"Missing required Google service account fields: {missing_fields}")
        
        return service_account_info
    
    def _get_service_account_local(self) -> dict:
        """Get service account credentials for local development."""
        # Try to get from local file first
        local_creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if local_creds_path and Path(local_creds_path).exists():
            try:
                with open(local_creds_path, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Warning: Could not load local credentials from {local_creds_path}: {e}")
        
        # Fallback to environment variables (same as production)
        return self._get_service_account_from_env()
    
    def _get_allowed_origins(self) -> list:
        """Get allowed CORS origins."""
        # Hardcode to allow all origins
        return ["*"]
    
    def get_agent_config(self) -> dict:
        """Get configuration for agent initialization."""
        return {
            "agents_dir": os.path.dirname(os.path.abspath(__file__)),
            "session_service_uri": self.database_url,
            "allow_origins": self.allowed_origins,
            "web": self.serve_web_interface,
        }
    
    def validate(self):
        """Validate configuration."""
        errors = []
        
        # Validate database configuration
        if not self.database_url:
            errors.append("Database URL is required")
        elif not self.database_url.startswith('postgresql://'):
            errors.append("Only PostgreSQL databases are supported")
        
        # Validate MCP configuration
        try:
            self.get_mcp_config()
        except Exception as e:
            errors.append(f"MCP configuration error: {e}")
        
        # Validate Discovery Engine config
        try:
            self._get_discovery_engine_config()
        except Exception as e:
            errors.append(f"Discovery Engine configuration error: {e}")
        
        if errors:
            raise ValueError(f"Configuration validation failed: {'; '.join(errors)}")

# Global configuration instance
config = Config()

# Validate configuration on import
try:
    config.validate()
except Exception as e:
    print(f"Configuration error: {e}")
    # In production, we might want to exit here
    if config.is_production:
        raise 