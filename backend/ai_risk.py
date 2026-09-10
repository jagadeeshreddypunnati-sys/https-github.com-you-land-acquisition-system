# backend/ai_risk.py
"""AI Delay Risk Prediction Engine
Risk Score = 30% * Pending Approvals + 25% * Compensation Delay + 20% * Litigation + 15% * R&R Delay + 10% * Timeline Delay
"""
from typing import Tuple

def calculate_risk_score(pending_approvals: int, pending_compensation: int,
                         litigation_cases: int, rr_pending_percent: float,
                         days_overdue: int) -> Tuple[int, str, str, str]:
    """
    Returns: (risk_score, risk_level, reason, recommended_action)
    """
    # Normalize each factor to its weight
    s1 = min(30, pending_approvals * 8)           # max 30 (5 approvals * 8 = 40, capped at 30)
    s2 = min(25, (pending_compensation / 50) * 25) # max 25 (50 cases = 25)
    s3 = min(20, (litigation_cases / 15) * 20)    # max 20 (15 cases = 20)
    s4 = min(15, (rr_pending_percent / 100) * 15) # max 15 (100% = 15)
    s5 = min(10, days_overdue * 0.5)              # max 10 (20 days = 10)

    score = round(s1 + s2 + s3 + s4 + s5)
    score = max(0, min(100, score))

    if score <= 30:
        level = "LOW"
    elif score <= 60:
        level = "MEDIUM"
    elif score <= 80:
        level = "HIGH"
    else:
        level = "CRITICAL"

    reasons = []
    if s1 > 10: reasons.append(f"{pending_approvals} pending approvals")
    if s2 > 10: reasons.append(f"{pending_compensation} compensation cases pending")
    if s3 > 10: reasons.append(f"{litigation_cases} litigation cases")
    if s4 > 7: reasons.append(f"R&R {rr_pending_percent:.0f}% pending")
    if s5 > 5: reasons.append(f"{days_overdue} days overdue")
    reason = " | ".join(reasons) if reasons else "All parameters within normal range"

    if level == "CRITICAL":
        action = "URGENT: Prioritize PFMS verification + legal review (RFCTLARR §§26–30). Escalate to Central Admin."
    elif level == "HIGH":
        action = "Escalate to State Officer this week. Clear pending approvals & compensation."
    elif level == "MEDIUM":
        action = "Monitor weekly. Focus on document pendency & R&R completion."
    else:
        action = "On track. Continue standard monitoring."

    return score, level, reason, action