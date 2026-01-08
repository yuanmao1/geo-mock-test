"""
Logging configuration for the application.
Provides structured logging with file and console output.
"""

import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional


def setup_logging(
    level: int = logging.INFO,
    log_dir: Optional[str] = "./logs",
    app_name: str = "call-gpt-server"
) -> logging.Logger:
    """
    Configure application logging with console and file handlers.

    Args:
        level: Logging level (default: INFO)
        log_dir: Directory for log files (default: ./logs)
        app_name: Application name for the logger

    Returns:
        Configured logger instance.
    """
    logger = logging.getLogger(app_name)
    logger.setLevel(level)

    # Clear existing handlers
    logger.handlers.clear()

    # Create formatter
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # File handler (if log_dir specified)
    if log_dir:
        log_path = Path(log_dir)
        log_path.mkdir(parents=True, exist_ok=True)

        # Daily rotating log file
        today = datetime.now().strftime("%Y-%m-%d")
        log_file = log_path / f"{app_name}_{today}.log"

        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        file_handler.setLevel(level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    return logger


def get_logger(name: str) -> logging.Logger:
    """
    Get a child logger with the specified name.

    Args:
        name: Logger name (will be prefixed with app name)

    Returns:
        Logger instance.
    """
    return logging.getLogger(f"call-gpt-server.{name}")
