NEGATIVE_KEYWORDS = [
    "no", "nope", "nah", "not possible", "can't", "cannot", "won't", "not happening", "never", "not interested"
]

def investor_says_no(text: str) -> bool:
    t = (text or "").lower().strip()
    # Match exact 'no' or similar, or as a standalone word
    return any(re.fullmatch(k, t) or re.search(rf"\b{k}\b", t) for k in NEGATIVE_KEYWORDS)
# negotiator.py
"""
Real-time negotiator with dynamic target floors and concession behavior.
- Dynamic floors: 12-15 => aim 12, 15-18 => 15, 18-21 => 18, generalized by 3% buckets.
- Bot no longer repeats the same borrower proposal; instead concedes toward investor when investor pushes back.
- Keeps investor numeric separate from bot counters (investor_offer stores investor's last numeric).
- Handles explicit final messages and short negations.
"""

import re
import json
from typing import Dict, Any, List, Optional, Tuple

# -----------------------------
# Base configuration
# -----------------------------
BASE_MIN_FLOOR = 12.0       # baseline floor for 12-15 range
BUCKET_SIZE = 3.0           # bucket width (3%)
MAX_SANE_RATE = 100.0      # sanity cap for parsed rates
ACCEPT_CLOSE_DELTA = 0.3   # within this of the dynamic target consider acceptance
GIVEAWAY_ALPHA = 0.25   # fraction of gap the bot will concede when investor gives a numeric
MIN_NUDGE = 0.05        # minimal step the bot will move (percentage points)
FINAL_KEYWORDS = [
    "final", "last", "take it or leave it", "best i can do", "that's my final", "no lower",
    "cannot go lower", "cant go lower", "only go till", "this is my final", "my final offer",
    "final offer", "i'm firm", "i'm firm on this"
]
SHORT_NEGATION_RE = re.compile(r"^\s*(no|nope|nah|cant|can't|cannot|not|we cant|we can't|we cannot)\b", flags=re.IGNORECASE)


# -----------------------------
# Helpers
# -----------------------------
def extract_rate_and_tenure(text: str) -> Tuple[Optional[float], Optional[int]]:
    t = (text or "").lower()
    rate: Optional[float] = None
    months: Optional[int] = None

    m = re.search(r"(\d+(?:\.\d+)?)\s*%+", t)
    if m:
        try:
            r = float(m.group(1))
            if 0 < r < MAX_SANE_RATE:
                rate = r
        except ValueError:
            rate = None

    m2 = re.search(r"(\d{1,2})\s*(months|month|mos|mo|m)\b", t, flags=re.IGNORECASE)
    if m2:
        try:
            months = int(m2.group(1))
        except ValueError:
            months = None

    return rate, months


def investor_says_final(text: str) -> bool:
    t = (text or "").lower()
    return any(k in t for k in FINAL_KEYWORDS)


def parse_numeric_from_text(text: str) -> Optional[float]:
    m = re.search(r"(\d+(?:\.\d+)?)\s*%+", (text or "").lower())
    if not m:
        return None
    try:
        return float(m.group(1))
    except:
        return None


def find_last_investor_numeric(history: List[Dict[str, str]]) -> Optional[float]:
    for e in reversed(history):
        if e.get("from") == "investor":
            v = parse_numeric_from_text(e.get("text", ""))
            if v is not None:
                return float(v)
    return None


def pretty(s: str) -> str:
    return s


def compute_dynamic_floor(rate: float) -> float:
    """
    Compute dynamic target floor for a given investor rate.
    Bucket size = 3%. Treat exact boundary like 15.0 as lower bucket (15 -> 12).
    """
    BASE_MIN_FLOOR = 12.0
    BUCKET = 3.0

    if rate <= BASE_MIN_FLOOR:
        return BASE_MIN_FLOOR

    eps = 1e-9
    offset = rate - BASE_MIN_FLOOR
    if abs((offset / BUCKET) - round(offset / BUCKET)) < eps:
        offset = max(0.0, offset - eps)

    k = int((offset) // BUCKET)
    return round(BASE_MIN_FLOOR + BUCKET * k, 2)


# -----------------------------
# Single negotiation round
# -----------------------------
def negotiate_round(
    investor_offer: Dict[str, Any],
    investor_message: str,
    history: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """
    Run one negotiation round. investor_offer represents the investor's last numeric (not bot counters).
    """
    if history is None:
        history = []

    # parse investor numeric info (update investor_offer only when investor provides numbers)
    parsed_rate, parsed_months = extract_rate_and_tenure(investor_message)
    if parsed_rate is not None:
        investor_offer["interest_annual_pct"] = parsed_rate
    if parsed_months is not None:
        investor_offer["tenure_months"] = parsed_months

    # investor_last_rate is the investor's last stated numeric (may be None)
    investor_last_rate = investor_offer.get("interest_annual_pct")
    try:
        investor_last_rate = float(investor_last_rate) if investor_last_rate is not None else None
    except Exception:
        investor_last_rate = None

    # append investor message to history
    history.append({"from": "investor", "text": investor_message})

    # 1) explicit final/firm -> accept investor numeric (prefer numeric in same message)
    if investor_says_final(investor_message):
        final_rate = parsed_rate if parsed_rate is not None else find_last_investor_numeric(history)
        if final_rate is not None:
            investor_offer["interest_annual_pct"] = final_rate
            msg = pretty(f"Understood — since you say this is your final offer at {final_rate}%, we accept.")
            history.append({"from": "borrower", "text": msg})
            return {"status": "accepted", "message": msg, "updated_offer": investor_offer, "history": history}
        else:
            ask_msg = pretty("I understand this is final — please confirm the percentage (e.g., '13.2%').")
            history.append({"from": "borrower", "text": ask_msg})
            return {"status": "continue", "message": ask_msg, "updated_offer": investor_offer, "history": history}

    # 2) short negation handling (e.g., "we cant", "no") -> use last investor numeric in history
    if SHORT_NEGATION_RE.match(investor_message.strip().lower()):
        # After a clear 'no', prompt for their best offer instead of proposing a new rate
        ask_msg = pretty("Understood. What is the best rate you can offer?")
        history.append({"from": "borrower", "text": ask_msg})
        return {"status": "continue", "message": ask_msg, "updated_offer": investor_offer, "history": history}

    # 3) If no numeric from investor yet, ask for one
    if investor_last_rate is None:
        ask_msg = pretty("Please provide an interest percentage (e.g., '13.5% for 6 months').")
        history.append({"from": "borrower", "text": ask_msg})
        return {"status": "continue", "message": ask_msg, "updated_offer": investor_offer, "history": history}

    # 4) compute dynamic floor and accept if close enough
    dynamic_floor = compute_dynamic_floor(investor_last_rate)
    if investor_last_rate <= dynamic_floor or (investor_last_rate - dynamic_floor) <= ACCEPT_CLOSE_DELTA:
        investor_offer["interest_annual_pct"] = investor_last_rate
        msg = pretty(f"{investor_last_rate}% is acceptable relative to our target of {dynamic_floor}%. We accept.")
        history.append({"from": "borrower", "text": msg})
        return {"status": "accepted", "message": msg, "updated_offer": investor_offer, "history": history}

    # 5) Determine last borrower proposal (if any)
    last_borrower_rate: Optional[float] = None
    for entry in reversed(history):
        if entry.get("from") == "borrower":
            last_val = parse_numeric_from_text(entry.get("text", ""))
            if last_val is not None:
                last_borrower_rate = float(last_val)
            break

    # 6) compute step & raw proposal toward dynamic floor (based on investor_last_rate)
    diff = investor_last_rate - dynamic_floor
    if diff > 6.0:
        step = min(2.0, diff / 4.0)
    elif diff > 3.0:
        step = min(1.5, diff / 3.0)
    elif diff > 1.0:
        step = min(1.0, diff / 2.5)
    else:
        step = round(diff / 2.0, 2) if diff > 0.2 else 0.1

    raw_proposed = round(max(dynamic_floor, investor_last_rate - step), 2)

    # helper: find previous investor numeric before current
    def find_prev_investor_numeric(hist: List[Dict[str, str]]) -> Optional[float]:
        for e in reversed(hist[:-1]):
            if e.get("from") == "investor":
                v = parse_numeric_from_text(e.get("text", ""))
                if v is not None:
                    return float(v)
        return None

    prev_investor_numeric = find_prev_investor_numeric(history)

    # 7) MONOTONICITY + CONCESSION logic
    # If raw_proposed would be more aggressive than last borrower proposal, handle specially
    if last_borrower_rate is not None and raw_proposed < last_borrower_rate:
        # If bot had asked explicitly for dynamic_floor previously and investor improved (vs prev_investor_numeric), accept
        if last_borrower_rate == dynamic_floor and prev_investor_numeric is not None and investor_last_rate < prev_investor_numeric:
            investor_offer["interest_annual_pct"] = investor_last_rate
            msg = pretty(f"Understood — accepting your improved offer of {investor_last_rate}%.")
            history.append({"from": "borrower", "text": msg})
            return {"status": "accepted", "message": msg, "updated_offer": investor_offer, "history": history}

        # If investor is close to last borrower proposal, accept investor_last_rate
        if (investor_last_rate - last_borrower_rate) <= ACCEPT_CLOSE_DELTA:
            investor_offer["interest_annual_pct"] = investor_last_rate
            msg = pretty(f"Your offer of {investor_last_rate}% is close to our last proposal of {last_borrower_rate}%. We accept {investor_last_rate}%.")
            history.append({"from": "borrower", "text": msg})
            return {"status": "accepted", "message": msg, "updated_offer": investor_offer, "history": history}

        # NEW: Concede toward investor rather than repeating last_borrower_rate
        # Compute midpoint between last_borrower_rate and investor_last_rate, but ensure it's valid
                # NEW: Concession policy — make smaller, controlled concessions instead of a 50% midpoint.
        # Determine whether investor message was a short negation (e.g., "no") — if so, be conservative.
        is_short_neg = SHORT_NEGATION_RE.match(investor_message.strip().lower()) is not None

        # alpha: fraction of the gap we concede. Conservative for "no", more generous if investor gave a numeric.
        if is_short_neg:
            alpha = GIVEAWAY_ALPHA  # e.g., 0.25
        else:
            alpha = 0.5  # be fairer if investor supplied a numeric improvement

        gap = investor_last_rate - last_borrower_rate
        # compute concession toward investor: last_borrower_rate + alpha * gap
        midpoint = last_borrower_rate + (alpha * gap)

        # ensure a minimal nudge above last_borrower_rate
        if midpoint - last_borrower_rate < MIN_NUDGE:
            midpoint = last_borrower_rate + MIN_NUDGE

        # don't propose >= investor_last_rate; keep a small buffer
        proposed_rate = round(min(investor_last_rate - 0.05, midpoint), 2)

        # ensure not below dynamic floor
        proposed_rate = max(proposed_rate, dynamic_floor)

        # final sanity: ensure proposed_rate < investor_last_rate and > last_borrower_rate
        if proposed_rate >= investor_last_rate:
            # can't propose lower — nudge slightly below investor or repeat last proposal nudge
            proposed_rate = round(min(investor_last_rate - 0.05, last_borrower_rate + MIN_NUDGE), 2)
        if proposed_rate <= last_borrower_rate:
            proposed_rate = round(last_borrower_rate + MIN_NUDGE, 2)


        parsed_note = f"Okay — can we meet at {proposed_rate}% (for the same tenure)?"
    else:
        # normal path: use raw_proposed
        proposed_rate = raw_proposed
        parsed_note = f"Can we settle at {proposed_rate}% (for the same tenure)?"

    # 8) sanity check — ensure proposed_rate is lower than investor_last_rate
    if proposed_rate >= investor_last_rate:
        msg = pretty(f"I cannot propose a lower rate than {investor_last_rate}%. Please confirm if you can go lower or if this is final.")
        history.append({"from": "borrower", "text": msg})
        return {"status": "continue", "message": msg, "updated_offer": investor_offer, "history": history}

    # 9) return bot counter (do NOT overwrite investor_offer)
    bot_msg = pretty(parsed_note)
    history.append({"from": "borrower", "text": bot_msg})
    return {"status": "continue", "message": bot_msg, "updated_offer": investor_offer, "history": history}


# -----------------------------
# Interactive runner
# -----------------------------
if __name__ == "__main__":
    print("=== Real-time negotiator (dynamic target floors + concessions) ===")
    print("Type investor messages (e.g. 'I can do 13.5% for 6 months', 'my final is 13.2%', 'we cant', or 'no').")
    print("Type 'exit' to quit.\n")

    current_offer: Dict[str, Any] = {"interest_annual_pct": None, "tenure_months": None}
    history: List[Dict[str, str]] = []

    while True:
        inv_msg = input("👤 Investor: ").strip()
        if not inv_msg:
            continue
        if inv_msg.lower() in ("exit", "quit", "q"):
            print("Exiting.")
            break

        result = negotiate_round(current_offer, inv_msg, history)
        current_offer = result["updated_offer"]
        history = result["history"]

        print(f"🤖 Bot: {result['message']}\n")

        if result["status"] == "accepted":
            print("✅ Negotiation accepted. Final terms:")
            print(json.dumps(current_offer, indent=2))
            break
        elif result["status"] == "rejected":
            print("❌ Negotiation rejected.")
            break
