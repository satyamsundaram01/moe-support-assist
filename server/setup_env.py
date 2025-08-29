#!/usr/bin/env python3
"""
Environment setup script for MoEngage Support Agent.

This script helps users set up their environment variables securely.
"""

import os
import base64
import json
import sys
from pathlib import Path

def encode_service_account(service_account_path):
    """Encode service account JSON file to base64."""
    try:
        with open(service_account_path, 'r') as f:
            service_account_data = f.read()
        
        # Validate JSON
        json.loads(service_account_data)
        
        # Encode to base64
        encoded = base64.b64encode(service_account_data.encode('utf-8')).decode('utf-8')
        return encoded
    except Exception as e:
        print(f"Error encoding service account file: {e}")
        return None

def create_env_file():
    """Create .env file from user input."""
    print("🔧 MoEngage Support Agent Environment Setup")
    print("=" * 50)
    
    env_vars = {}
    
    # Environment
    print("\n1. Environment Configuration:")
    env_vars['ENVIRONMENT'] = input("Environment (local/production) [local]: ").strip() or "local"
    
    # Server Configuration
    print("\n2. Server Configuration:")
    env_vars['HOST'] = input("Host [0.0.0.0]: ").strip() or "0.0.0.0"
    env_vars['PORT'] = input("Port [8080]: ").strip() or "8080"
    env_vars['LOG_LEVEL'] = input("Log Level [INFO]: ").strip() or "INFO"
    env_vars['SERVE_WEB_INTERFACE'] = input("Serve Web Interface (true/false) [false]: ").strip() or "false"
    
    # CORS Configuration
    print("\n3. CORS Configuration:")
    env_vars['ALLOWED_ORIGINS'] = input("Allowed Origins [http://localhost,http://localhost:8080,http://localhost:3000]: ").strip() or "http://localhost,http://localhost:8080,http://localhost:3000"
    
    # Database Configuration
    print("\n4. Database Configuration:")
    print("Choose database configuration method:")
    print("1. Full connection string (recommended)")
    print("2. Individual components")
    
    db_method = input("Method [1]: ").strip() or "1"
    
    if db_method == "1":
        env_vars['DATABASE_URL'] = input("PostgreSQL Database URL: ").strip()
        if not env_vars['DATABASE_URL']:
            print("❌ DATABASE_URL is required")
            return False
    else:
        # Individual components
        env_vars['DB_HOST'] = input("Database Host [localhost]: ").strip() or "localhost"
        env_vars['DB_PORT'] = input("Database Port [5432]: ").strip() or "5432"
        env_vars['DB_NAME'] = input("Database Name: ").strip()
        if not env_vars['DB_NAME']:
            print("❌ DB_NAME is required")
            return False
        env_vars['DB_USER'] = input("Database User [postgres]: ").strip() or "postgres"
        env_vars['DB_PASSWORD'] = input("Database Password: ").strip()
    
    # MCP Configuration
    print("\n=== MCP Configuration ===")
    mcp_sse_url = input("MCP SSE URL (default: http://127.0.0.1:8080/sse): ").strip()
    if mcp_sse_url:
        env_vars['MCP_SSE_URL'] = mcp_sse_url
    else:
        env_vars['MCP_SSE_URL'] = "http://127.0.0.1:8080/sse"
    
    mcp_sse_timeout = input("MCP SSE Timeout (default: 200): ").strip()
    if mcp_sse_timeout:
        env_vars['MCP_SSE_TIMEOUT'] = mcp_sse_timeout
    else:
        env_vars['MCP_SSE_TIMEOUT'] = "200"
    
    # LLM Model Configuration
    print("\n=== LLM Model Configuration ===")
    print("Configure models for different agents (press Enter for defaults):")
    
    env_vars['LLM_MODEL_DEFAULT'] = input("Default Model [gemini-2.5-flash-preview-05-20]: ").strip() or "gemini-2.5-flash-preview-05-20"
    env_vars['LLM_MODEL_TECHNICAL'] = input("Technical Agent Model [gemini-2.5-flash-preview-05-20]: ").strip() or "gemini-2.5-flash-preview-05-20"
    env_vars['LLM_MODEL_PUSH'] = input("Push Agent Model [gemini-2.5-flash-preview-05-20]: ").strip() or "gemini-2.5-flash-preview-05-20"
    env_vars['LLM_MODEL_WHATSAPP'] = input("WhatsApp Agent Model [gemini-2.5-flash-preview-05-20]: ").strip() or "gemini-2.5-flash-preview-05-20"
    env_vars['LLM_MODEL_KNOWLEDGE'] = input("Knowledge Agent Model [gemini-2.5-flash-preview-05-20]: ").strip() or "gemini-2.5-flash-preview-05-20"
    env_vars['LLM_MODEL_FOLLOWUP'] = input("Followup Agent Model [gemini-2.5-flash-preview-05-20]: ").strip() or "gemini-2.5-flash-preview-05-20"
    env_vars['LLM_MODEL_TICKET'] = input("Ticket Agent Model [gemini-2.5-flash-preview-05-20]: ").strip() or "gemini-2.5-flash-preview-05-20"
    env_vars['LLM_MODEL_EXECUTION'] = input("Execution Agent Model [gemini-2.5-flash-preview-05-20]: ").strip() or "gemini-2.5-flash-preview-05-20"
    env_vars['LLM_MODEL_ROOT'] = input("Root Agent Model [gemini-2.5-flash-preview-05-20]: ").strip() or "gemini-2.5-flash-preview-05-20"
    
    # Discovery Engine Configuration
    print("\n6. Discovery Engine Configuration:")
    env_vars['DISCOVERY_ENGINE_PROJECT_ID'] = input("Project ID [agent-ai-initiatives]: ").strip() or "agent-ai-initiatives"
    env_vars['DISCOVERY_ENGINE_LOCATION'] = input("Location [us]: ").strip() or "us"
    env_vars['DISCOVERY_ENGINE_ID'] = input("Engine ID [app-moe-support-agent-tech_1752497866942]: ").strip() or "app-moe-support-agent-tech_1752497866942"
    
    # Datastores
    env_vars['DISCOVERY_ENGINE_CONFLUENCE_DATASTORE'] = input("Confluence Datastore ID [moe-confluence-support-runbooks-live-p_1752497946721_page]: ").strip() or "moe-confluence-support-runbooks-live-p_1752497946721_page"
    env_vars['DISCOVERY_ENGINE_ZENDESK_DATASTORE'] = input("Zendesk Datastore ID [moe-gs-zendesk-live-private_1752599941188_gcs_store]: ").strip() or "moe-gs-zendesk-live-private_1752599941188_gcs_store"
    env_vars['DISCOVERY_ENGINE_HELP_DOCS_DATASTORE'] = input("Help Docs Datastore ID [moe-gs-public-docs-live-public_1752599761524_gcs_store]: ").strip() or "moe-gs-public-docs-live-public_1752599761524_gcs_store"
    
    # Google Service Account Credentials
    print("\n7. Google Service Account Credentials:")
    print("Choose credential method:")
    print("1. Base64 encoded service account JSON (recommended)")
    print("2. Individual environment variables")
    print("3. Local credentials file path")
    
    cred_method = input("Method [1]: ").strip() or "1"
    
    if cred_method == "1":
        # Base64 encoded
        service_account_path = input("Path to service account JSON file: ").strip()
        if service_account_path and Path(service_account_path).exists():
            encoded = encode_service_account(service_account_path)
            if encoded:
                env_vars['GOOGLE_SERVICE_ACCOUNT_BASE64'] = encoded
                print("✅ Service account encoded successfully")
            else:
                print("❌ Failed to encode service account")
                return False
        else:
            print("❌ Service account file not found")
            return False
    
    elif cred_method == "2":
        # Individual variables
        env_vars['GOOGLE_PROJECT_ID'] = input("Google Project ID: ").strip()
        env_vars['GOOGLE_PRIVATE_KEY_ID'] = input("Private Key ID: ").strip()
        env_vars['GOOGLE_PRIVATE_KEY'] = input("Private Key (with \\n for newlines): ").strip()
        env_vars['GOOGLE_CLIENT_EMAIL'] = input("Client Email: ").strip()
        env_vars['GOOGLE_CLIENT_ID'] = input("Client ID: ").strip()
        env_vars['GOOGLE_CLIENT_X509_CERT_URL'] = input("Client X509 Cert URL: ").strip()
    
    elif cred_method == "3":
        # Local file
        env_vars['GOOGLE_APPLICATION_CREDENTIALS'] = input("Path to service account JSON file: ").strip()
    
    # Write .env file
    env_file_path = Path(".env")
    with open(env_file_path, 'w') as f:
        for key, value in env_vars.items():
            f.write(f"{key}={value}\n")
    
    print(f"\n✅ Environment file created: {env_file_path.absolute()}")
    print("\n📝 Next steps:")
    print("1. Review the .env file and make any necessary adjustments")
    print("2. For local development: python main.py")
    print("3. For Docker: docker-compose up")
    print("4. For production: Set these environment variables in your deployment platform")
    
    return True

def main():
    """Main function."""
    if len(sys.argv) > 1 and sys.argv[1] == "--help":
        print("Usage: python setup_env.py")
        print("This script will guide you through setting up your environment variables.")
        return
    
    try:
        success = create_env_file()
        if not success:
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n❌ Setup cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 