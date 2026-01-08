"""
Human behavior simulation utilities.

This module provides functions to simulate human-like behavior
in browser automation, including:
- Random delays between actions
- Gradual typing simulation
- Natural mouse movements
- Random micro-pauses
"""

import asyncio
import random
from typing import Optional

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("human_behavior")
settings = get_settings()


def get_random_delay(
    min_ms: Optional[int] = None,
    max_ms: Optional[int] = None
) -> float:
    """
    Generate a random delay in seconds.

    Args:
        min_ms: Minimum delay in milliseconds (uses config default if None)
        max_ms: Maximum delay in milliseconds (uses config default if None)

    Returns:
        Random delay in seconds (float).
    """
    min_delay = min_ms or settings.human_min_delay_ms
    max_delay = max_ms or settings.human_max_delay_ms

    delay_ms = random.randint(min_delay, max_delay)
    return delay_ms / 1000.0


async def human_delay(
    min_ms: Optional[int] = None,
    max_ms: Optional[int] = None,
    reason: str = ""
) -> None:
    """
    Async sleep with human-like random delay.

    Args:
        min_ms: Minimum delay in milliseconds
        max_ms: Maximum delay in milliseconds
        reason: Optional reason for logging
    """
    delay = get_random_delay(min_ms, max_ms)
    if reason:
        logger.debug(f"Human delay ({reason}): {delay:.2f}s")
    await asyncio.sleep(delay)


def sync_human_delay(
    min_ms: Optional[int] = None,
    max_ms: Optional[int] = None
) -> float:
    """
    Synchronous sleep with human-like random delay.

    Returns:
        The delay that was used (in seconds).
    """
    import time
    delay = get_random_delay(min_ms, max_ms)
    time.sleep(delay)
    return delay


def get_typing_delay() -> float:
    """
    Get a random typing delay for a single character.

    Returns:
        Delay in seconds.
    """
    delay_ms = random.randint(
        settings.typing_min_delay_ms,
        settings.typing_max_delay_ms
    )

    # Occasionally add a longer pause (simulating thinking)
    if random.random() < 0.05:  # 5% chance
        delay_ms += random.randint(100, 300)

    return delay_ms / 1000.0


def simulate_typing_delays(text: str) -> list[float]:
    """
    Generate an array of delays for typing each character.

    This creates more realistic typing patterns with:
    - Varying speeds
    - Occasional pauses
    - Faster typing for common key sequences

    Args:
        text: The text to be typed

    Returns:
        List of delays (in seconds) for each character.
    """
    delays = []

    for i, char in enumerate(text):
        base_delay = get_typing_delay()

        # Faster for spaces (common, easy to type)
        if char == ' ':
            base_delay *= 0.5

        # Slightly slower for special characters
        elif not char.isalnum():
            base_delay *= 1.2

        # Add occasional "burst" typing (faster sequences)
        if random.random() < 0.1:  # 10% chance
            base_delay *= 0.3

        delays.append(base_delay)

    return delays


def human_like_scroll_amount() -> int:
    """
    Generate a human-like scroll amount.

    Returns:
        Scroll amount in pixels.
    """
    # Humans don't scroll exactly the same amount each time
    base_scroll = random.choice([100, 200, 300, 400])
    variation = random.randint(-50, 50)
    return base_scroll + variation


def should_do_micro_action() -> bool:
    """
    Determine if a micro-action (small pause, minor movement) should occur.

    This adds randomness that makes automation less detectable.

    Returns:
        Boolean indicating whether to perform a micro-action.
    """
    return random.random() < 0.15  # 15% chance


def get_mouse_path_points(
    start: tuple[int, int],
    end: tuple[int, int],
    num_points: int = 10
) -> list[tuple[int, int]]:
    """
    Generate intermediate points for natural mouse movement.

    Uses a bezier-like curve with slight randomization.

    Args:
        start: Starting coordinates (x, y)
        end: Ending coordinates (x, y)
        num_points: Number of intermediate points

    Returns:
        List of (x, y) coordinates for the mouse path.
    """
    points = []

    # Add slight curve to the path
    control_x = (start[0] + end[0]) / 2 + random.randint(-50, 50)
    control_y = (start[1] + end[1]) / 2 + random.randint(-50, 50)

    for i in range(num_points + 1):
        t = i / num_points

        # Quadratic bezier curve
        x = (1-t)**2 * start[0] + 2*(1-t)*t * control_x + t**2 * end[0]
        y = (1-t)**2 * start[1] + 2*(1-t)*t * control_y + t**2 * end[1]

        # Add small random noise
        x += random.randint(-3, 3)
        y += random.randint(-3, 3)

        points.append((int(x), int(y)))

    return points


class HumanBehaviorMixin:
    """
    Mixin class providing human-like behavior methods for browser automation.

    Usage:
        class MyBrowser(HumanBehaviorMixin):
            def __init__(self, page):
                self.page = page

            def click_button(self, selector):
                self.before_action()
                # ... click logic
                self.after_action()
    """

    def before_action(self, action_name: str = "action") -> None:
        """Add a small delay before performing an action."""
        delay = sync_human_delay(200, 800)
        logger.debug(f"Pre-{action_name} delay: {delay:.2f}s")

    def after_action(self, action_name: str = "action") -> None:
        """Add a small delay after performing an action."""
        delay = sync_human_delay(300, 1000)
        logger.debug(f"Post-{action_name} delay: {delay:.2f}s")

    def maybe_micro_pause(self) -> None:
        """Occasionally add a micro-pause to simulate human hesitation."""
        if should_do_micro_action():
            delay = sync_human_delay(100, 500)
            logger.debug(f"Micro-pause: {delay:.2f}s")
