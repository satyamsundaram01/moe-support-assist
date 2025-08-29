import os
import uvicorn
from moe_support_agent.ask_mode.analytics import analytics_router
from google.adk.cli.fast_api import get_fast_api_app
from config import config

agent_config = config.get_agent_config()

# Create FastAPI app with configuration
app = get_fast_api_app(
    agents_dir=agent_config["agents_dir"],
    session_service_uri=agent_config["session_service_uri"],
    allow_origins=["*"],  # Allow all origins
    web=agent_config["web"],
)

# ask mode and other routes (analytics , announcements , sessions , prompt library)
from moe_support_agent.ask_mode import ask_router
from moe_support_agent.ask_mode.announcements import announcement_router
from moe_support_agent.ask_mode.sessions import sessions_router
from moe_support_agent.ask_mode.prompt_library import prompt_library_router

app.include_router(ask_router)
app.include_router(router=announcement_router)
app.include_router(analytics_router)
app.include_router(sessions_router) # we don't have list all session endpoint from adk so for that this endpointl
app.include_router(prompt_library_router)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "environment": config.environment,
        "database": "connected" if config.database_url else "disconnected"
    }

if __name__ == "__main__":
    uvicorn.run(
        app, 
        host=config.host, 
        port=config.port,
        log_level=config.log_level.lower()
    )
