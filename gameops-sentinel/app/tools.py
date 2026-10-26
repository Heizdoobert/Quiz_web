"""Tools for GameOps Sentinel telemetry analysis, anomaly detection, and remediation."""

import time
from typing import Any


def fetch_recent_attempts(
    limit: int = 10, since_minutes: int = 60
) -> list[dict[str, Any]]:
    """Fetches recent trivia duel attempts and split-time metrics from the database.

    Args:
        limit: Maximum number of attempts to fetch (default: 10).
        since_minutes: Lookback window in minutes (default: 60).

    Returns:
        List of attempt records with user, quiz, total duration, question timestamps, and status.
    """
    now = int(time.time() * 1000)
    # Simulated realistic database telemetry with both normal players and bot submissions
    attempts = [
        {
            "attempt_id": "att_human_001",
            "user_id": "usr_player_alice",
            "quiz_id": "quiz_geography_05",
            "timestamps": [now - 12000, now - 9500, now - 7100, now - 4800, now - 2200],
            "total_duration_ms": 9800,
            "status": "completed",
            "score": 5,
        },
        {
            "attempt_id": "att_bot_002",
            "user_id": "usr_speedy_bot",
            "quiz_id": "quiz_geography_05",
            "timestamps": [now - 1000, now - 970, now - 940, now - 910, now - 870],
            "total_duration_ms": 130,
            "status": "completed",
            "score": 5,
        },
        {
            "attempt_id": "att_human_003",
            "user_id": "usr_player_bob",
            "quiz_id": "quiz_history_01",
            "timestamps": [
                now - 18000,
                now - 14200,
                now - 11000,
                now - 7500,
                now - 3100,
            ],
            "total_duration_ms": 14900,
            "status": "completed",
            "score": 4,
        },
    ]
    return attempts[:limit]


def analyze_split_times(
    timestamps: list[int], question_count: int = 5
) -> dict[str, Any]:
    """Analyzes split times between consecutive answers to detect automated bot behavior.

    Args:
        timestamps: Millisecond timestamps when each question was answered.
        question_count: Expected number of questions in the pack.

    Returns:
        Analysis dictionary containing total duration, average split, variance, and anomaly confidence.
    """
    if len(timestamps) < 2:
        return {
            "error": "Insufficient timestamps to compute split analysis.",
            "is_bot_anomaly": False,
            "confidence": 0.0,
        }

    splits = [timestamps[i] - timestamps[i - 1] for i in range(1, len(timestamps))]
    total_duration = timestamps[-1] - timestamps[0]
    avg_split = total_duration / len(splits) if splits else 0
    variance = sum((s - avg_split) ** 2 for s in splits) / len(splits) if splits else 0

    # Inhuman threshold: < 250ms total or < 50ms average split time
    is_anomaly = (
        total_duration < 250 or avg_split < 50 or (avg_split < 100 and variance < 15)
    )
    confidence = 0.98 if is_anomaly else 0.05

    return {
        "splits_ms": splits,
        "total_duration_ms": total_duration,
        "avg_split_ms": round(avg_split, 2),
        "split_variance_ms": round(variance, 2),
        "is_bot_anomaly": is_anomaly,
        "confidence": confidence,
        "assessment": (
            "CRITICAL_BOT_ANOMALY: Impossible human reaction and answer submission time (<250ms total)."
            if is_anomaly
            else "NORMAL_HUMAN_PLAY: Split times and variance within natural human parameters."
        ),
    }


def soft_quarantine_attempt(attempt_id: str, reason: str) -> dict[str, Any]:
    """Soft-quarantines an attempt, removing it from public leaderboards while preserving records.

    Args:
        attempt_id: Unique identifier of the attempt.
        reason: Specific reason for the quarantine.

    Returns:
        Confirmation dictionary with quarantine status and audit timestamp.
    """
    return {
        "attempt_id": attempt_id,
        "status": "quarantined",
        "action": "soft_quarantine",
        "reason": reason,
        "audit_logged": True,
        "timestamp": int(time.time()),
        "message": f"Attempt {attempt_id} has been soft-quarantined and hidden from public leaderboards.",
    }


def fetch_sync_metrics(window_minutes: int = 60) -> dict[str, Any]:
    """Retrieves mobile answer synchronization queue telemetry and streak grace window health.

    Args:
        window_minutes: Lookback window in minutes.

    Returns:
        Sync queue metrics, error rates, and overall system health status.
    """
    return {
        "window_minutes": window_minutes,
        "total_synced_answers": 482,
        "pending_queue_count": 3,
        "sync_error_rate_percent": 0.2,
        "streak_grace_window_violations": 0,
        "status": "HEALTHY",
        "recommendation": "Mobile sync operating within normal thresholds. No intervention needed.",
    }


def request_human_confirmation(
    action: str, target_user: str, reason: str
) -> dict[str, Any]:
    """Initiates a Human-In-The-Loop (HITL) confirmation request for destructive actions.

    Args:
        action: The destructive action requested (e.g. 'ban_user', 'purge_scores').
        target_user: The username or ID of the user.
        reason: Detailed justification for the action.

    Returns:
        Structured approval request payload. Destructive actions will not proceed without confirmation.
    """
    token = f"APPROVAL_TOKEN_{abs(hash(target_user + action)) % 1000000:06d}"
    return {
        "requires_human_approval": True,
        "action": action,
        "target_user": target_user,
        "reason": reason,
        "approval_token": token,
        "confirmation_prompt": (
            f"⚠️ HUMAN APPROVAL REQUIRED: Confirm {action} for user '{target_user}' (Reason: {reason})? "
            f"To execute, confirm with token '{token}'."
        ),
    }


def apply_account_ban(
    target_user: str, duration_hours: int, admin_approval_token: str
) -> dict[str, Any]:
    """Applies an account ban/suspension. MUST have a valid admin approval token.

    Args:
        target_user: The user to ban.
        duration_hours: Ban duration in hours.
        admin_approval_token: The confirmation token issued by request_human_confirmation.

    Returns:
        Action outcome or rejection error if confirmation token is missing.
    """
    if not admin_approval_token or not admin_approval_token.startswith(
        "APPROVAL_TOKEN_"
    ):
        return {
            "error": "Action rejected: Missing or invalid admin approval token. Destructive actions require explicit human confirmation.",
            "status": "BLOCKED",
        }

    return {
        "status": "SUCCESS",
        "target_user": target_user,
        "ban_duration_hours": duration_hours,
        "action": "account_suspended",
        "timestamp": int(time.time()),
        "message": f"User {target_user} suspended for {duration_hours} hours. Audit log created.",
    }
