"""
utils/logger.py — Structured logger factory.

Usage in any file:
    from app.utils.logger import get_logger
    logger = get_logger(__name__)
    logger.info("Something happened")

Why __name__?
  Python sets __name__ to the module path, e.g. "app.services.auth_service".
  This appears in every log line so you know exactly which file produced it.
"""
import logging
import sys


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)
        logger.propagate = False

    return logger
