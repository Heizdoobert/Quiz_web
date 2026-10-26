# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types

from .tools import (
    analyze_split_times,
    apply_account_ban,
    fetch_recent_attempts,
    fetch_sync_metrics,
    request_human_confirmation,
    soft_quarantine_attempt,
)

MODEL = "gemini-3.8-flash"

telemetry_monitor_agent = Agent(
    name="telemetry_monitor_agent",
    model=Gemini(
        model=MODEL,
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    description="Specialist agent that analyzes trivia duel split-time metrics, detects bot anomalies, and inspects mobile synchronization queue health.",
    instruction="""You are the Telemetry Monitor Specialist for Quick Quiz GameOps.
Your role:
1. Fetch and examine recent duel attempts using fetch_recent_attempts.
2. Analyze question split times using analyze_split_times to detect automated bot submissions (e.g. total duration < 250ms or per-question duration < 50ms).
3. Check mobile client synchronization telemetry and streak grace window health using fetch_sync_metrics.
4. Report objective statistical findings clearly to the coordinator, noting anomaly scores and affected attempt IDs.
Always use your tools to obtain real metrics rather than estimating.""",
    tools=[fetch_recent_attempts, analyze_split_times, fetch_sync_metrics],
)

remediation_agent = Agent(
    name="remediation_agent",
    model=Gemini(
        model=MODEL,
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    description="Specialist agent that executes soft-quarantines for confirmed bot anomalies and manages Human-In-The-Loop approval gates for destructive account actions.",
    instruction="""You are the Remediation Specialist for Quick Quiz GameOps.
Your role:
1. When bot anomalies are detected, call soft_quarantine_attempt to remove the compromised score from public leaderboards.
2. CRITICAL SAFETY GUARDRAIL: Never execute destructive actions (such as account bans or streak resets) autonomously.
3. For user bans or account penalties, ALWAYS call request_human_confirmation first to generate a structured confirmation prompt and token.
4. Only call apply_account_ban if an explicit admin_approval_token starting with 'APPROVAL_TOKEN_' is provided by a human operator.
5. Report all actions taken and audit logs clearly.""",
    tools=[soft_quarantine_attempt, request_human_confirmation, apply_account_ban],
)

root_agent = Agent(
    # Keep in sync with create_params.root_agent_name in agents-cli-manifest.yaml:
    name="gameops_sentinel_coordinator",
    model=Gemini(
        model=MODEL,
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction="""You are the GameOps Sentinel Coordinator for Quick Quiz.
Your mission is to maintain competitive integrity, monitor real-time duel telemetry, and orchestrate incident remediation across web and mobile platforms.

Delegation Strategy:
- Delegate telemetry analysis, split-time checks, and mobile sync health inspections to `telemetry_monitor_agent`.
- Delegate quarantine enforcement, audit logging, and human approval requests to `remediation_agent`.
- Provide concise, operational summaries to the human administrator.

Safety Constraints:
- Soft-quarantines of illegitimate scores can be executed autonomously upon detecting bot anomalies.
- Destructive actions (account bans, score purges) strictly require human confirmation before execution.
- Maintain professional, precise incident reporting.""",
    sub_agents=[telemetry_monitor_agent, remediation_agent],
    tools=[
        fetch_recent_attempts,
        analyze_split_times,
        soft_quarantine_attempt,
        fetch_sync_metrics,
        request_human_confirmation,
        apply_account_ban,
    ],
)

app = App(
    root_agent=root_agent,
    name="app",
)
