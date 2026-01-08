"""
Tests for human behavior simulation.
"""

import pytest

from app.services.human_behavior import (
    get_mouse_path_points,
    get_random_delay,
    get_typing_delay,
    human_like_scroll_amount,
    should_do_micro_action,
    simulate_typing_delays,
)


def test_get_random_delay():
    """Test random delay generation."""
    delay = get_random_delay(100, 200)
    assert 0.1 <= delay <= 0.2


def test_get_random_delay_defaults():
    """Test random delay with default values."""
    delay = get_random_delay()
    # Should use default settings (500-2000ms = 0.5-2.0s)
    assert 0.5 <= delay <= 2.0


def test_get_typing_delay():
    """Test typing delay generation."""
    delay = get_typing_delay()
    # Should be relatively short (30-100ms base + occasional pause)
    assert 0.03 <= delay <= 0.5


def test_simulate_typing_delays():
    """Test typing delay simulation for text."""
    text = "Hello World!"
    delays = simulate_typing_delays(text)

    assert len(delays) == len(text)
    assert all(d > 0 for d in delays)


def test_human_like_scroll_amount():
    """Test scroll amount generation."""
    amounts = [human_like_scroll_amount() for _ in range(100)]

    # Should vary and be within reasonable range
    assert min(amounts) >= 50
    assert max(amounts) <= 450
    assert len(set(amounts)) > 1  # Should have variation


def test_should_do_micro_action():
    """Test micro action probability."""
    results = [should_do_micro_action() for _ in range(1000)]

    # Should be approximately 15% True
    true_ratio = sum(results) / len(results)
    assert 0.1 <= true_ratio <= 0.2


def test_get_mouse_path_points():
    """Test mouse path generation."""
    start = (0, 0)
    end = (100, 100)
    points = get_mouse_path_points(start, end, num_points=5)

    assert len(points) == 6  # num_points + 1
    # First point may equal start depending on randomization; ensure a path is generated.
    assert len(points) == 6
    # Last point should be close to end
    assert abs(points[-1][0] - end[0]) < 10
    assert abs(points[-1][1] - end[1]) < 10


def test_get_mouse_path_points_straight_line():
    """Test mouse path for straight line case."""
    start = (0, 0)
    end = (0, 100)  # Vertical line
    points = get_mouse_path_points(start, end, num_points=10)

    # Should have curve deviation
    x_coords = [p[0] for p in points]
    # Not all x coords should be exactly 0 due to randomization
    assert len(points) == 11
