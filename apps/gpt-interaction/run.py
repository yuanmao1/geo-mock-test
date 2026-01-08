"""
Entry point for running the server.
"""

import uvicorn

from app.core.config import get_settings

settings = get_settings()


def main():
    """Run the server."""
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="debug" if settings.debug else "info",
        access_log=settings.uvicorn_access_log,
    )


if __name__ == "__main__":
    main()
