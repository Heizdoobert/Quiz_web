"""Unit tests for GameOps Sentinel deterministic tools and guardrails."""

import time

from app.tools import (
    analyze_split_times,
    apply_account_ban,
    fetch_recent_attempts,
    fetch_sync_metrics,
    request_human_confirmation,
    soft_quarantine_attempt,
)


def test_fetch_recent_attempts() -> None:
    """Verifies that attempts can be fetched with expected schema."""
    attempts = fetch_recent_attempts(limit=2)
    assert len(attempts) == 2
    assert "attempt_id" in attempts[0]
    assert "timestamps" in attempts[0]
    assert "status" in attempts[0]


def test_analyze_split_times_bot_anomaly() -> None:
    """Verifies that sub-second/instantaneous completions are detected as bot anomalies."""
    now = int(time.time() * 1000)
    # 5 questions answered in 120ms total (< 25ms per question)
    bot_timestamps = [now, now + 25, now + 50, now + 80, now + 120]
    result = analyze_split_times(bot_timestamps)

    assert result["is_bot_anomaly"] is True
    assert result["confidence"] >= 0.95
    assert result["total_duration_ms"] == 120
    assert "CRITICAL_BOT_ANOMALY" in result["assessment"]


def test_analyze_split_times_normal_human() -> None:
    """Verifies that normal human split times are not flagged as anomalies."""
    now = int(time.time() * 1000)
    # 5 questions answered in 12 seconds with natural variance
    human_timestamps = [now, now + 2400, now + 5100, now + 7900, now + 11500]
    result = analyze_split_times(human_timestamps)

    assert result["is_bot_anomaly"] is False
    assert result["confidence"] <= 0.1
    assert "NORMAL_HUMAN_PLAY" in result["assessment"]


def test_analyze_split_times_insufficient_data() -> None:
    """Verifies graceful handling of insufficient timestamp data."""
    result = analyze_split_times([1000])
    assert result["is_bot_anomaly"] is False
    assert "error" in result


def test_soft_quarantine_attempt() -> None:
    """Verifies that soft-quarantine marks attempt status correctly and records audit info."""
    res = soft_quarantine_attempt("att_test_999", reason="Unrealistic split speed")
    assert res["status"] == "quarantined"
    assert res["audit_logged"] is True
    assert res["attempt_id"] == "att_test_999"


def test_fetch_sync_metrics() -> None:
    """Verifies mobile sync queue telemetry aggregation."""
    metrics = fetch_sync_metrics()
    assert metrics["status"] == "HEALTHY"
    assert metrics["sync_error_rate_percent"] < 1.0
    assert metrics["streak_grace_window_violations"] == 0


def test_hitl_approval_gate_blocks_unauthorized_ban() -> None:
    """Verifies that destructive account bans are rejected when approval token is missing."""
    res = apply_account_ban("usr_bad_actor", duration_hours=24, admin_approval_token="")
    assert res["status"] == "BLOCKED"
    assert "error" in res


def test_hitl_approval_gate_accepts_valid_token() -> None:
    """Verifies that destructive account bans succeed when confirmed with a valid token."""
    confirmation = request_human_confirmation(
        "ban_user", "usr_bad_actor", "Confirmed bot script"
    )
    token = confirmation["approval_token"]
    assert token.startswith("APPROVAL_TOKEN_")

    res = apply_account_ban(
        "usr_bad_actor", duration_hours=24, admin_approval_token=token
    )
    assert res["status"] == "SUCCESS"
    assert res["action"] == "account_suspended"
