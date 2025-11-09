"""
selector.py

This module selects the best investor offer from a list of offers based on
weighted scoring of principal amount and interest rate. It can process input
from files, stdin, or direct JSON strings.
"""

import argparse
import sys
import json
from typing import Any, Dict, List, Optional, Union, TypedDict


class Offer(TypedDict, total=False):
    """Type definition for an investor offer."""
    investor_id: str
    principal: float
    interest_annual_pct: float
    tenure_months: int
    composite_score: Optional[float]

def _normalize(value: float, vmin: float, vmax: float) -> float:
    """Normalize a value between 0 and 1 based on min and max values.
    
    Args:
        value: The value to normalize
        vmin: The minimum value in the range
        vmax: The maximum value in the range
        
    Returns:
        float: Normalized value between 0 and 1
        
    Raises:
        TypeError: If inputs are not numeric
        ValueError: If vmax < vmin
    """
    if not isinstance(value, (int, float)) or not isinstance(vmin, (int, float)) or not isinstance(vmax, (int, float)):
        raise TypeError("All arguments must be numeric")
    if vmax < vmin:
        raise ValueError("vmax must be greater than or equal to vmin")
    if vmax == vmin:
        return 0.0
    return (value - vmin) / (vmax - vmin)


def select_best_offer(offers: List[Offer], w_principal: float = 0.6, w_interest: float = 0.4) -> Optional[Offer]:
    """Select the best offer based on weighted scoring of principal and interest rate.
    
    Args:
        offers: List of Offer dictionaries
        w_principal: Weight for principal score (default: 0.6)
        w_interest: Weight for interest rate score (default: 0.4)
        
    Returns:
        Optional[Offer]: The best offer with its composite score, or None if no offers
        
    Raises:
        ValueError: If weights don't sum to 1.0 or are negative
    """
    if not isinstance(offers, list):
        raise TypeError("offers must be a list of dictionaries")
    if not offers:
        return None
    
    if not 0 <= w_principal <= 1 or not 0 <= w_interest <= 1:
        raise ValueError("Weights must be between 0 and 1")
    if abs(w_principal + w_interest - 1.0) > 0.0001:
        raise ValueError("Weights must sum to 1.0")
    
    principals = [float(o['principal']) for o in offers]
    interests = [float(o['interest_annual_pct']) for o in offers]
    pmin, pmax = min(principals), max(principals)
    imin, imax = min(interests), max(interests)
    
    best = None
    for o in offers:
        p_score = _normalize(o['principal'], pmin, pmax)
        i_score = 1.0 - _normalize(o['interest_annual_pct'], imin, imax)  # Lower interest is better
        score = w_principal * p_score + w_interest * i_score
        o['composite_score'] = score
        if best is None or score > best['composite_score']:
            best = o
    
    return best


def load_offers_from_file(path: str) -> List[Offer]:
    """Load offers from a JSON file.
    
    Args:
        path: Path to the JSON file
        
    Returns:
        List[Offer]: List of parsed offers
        
    Raises:
        ValueError: If file doesn't contain a list of offers
    """
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, list):
        raise ValueError("JSON file must contain a list of offer objects")
    return data


def load_offers_from_stdin() -> List[Offer]:
    """Read JSON offers from stdin. Backend can pipe data into this script.
    
    Returns:
        List[Offer]: List of parsed offers
        
    Raises:
        ValueError: If stdin is empty or doesn't contain a list
    """
    text = sys.stdin.read().strip()
    if not text:
        raise ValueError("No input received on stdin")
    data = json.loads(text)
    if not isinstance(data, list):
        raise ValueError("stdin JSON must be a list of offer objects")
    return data


def load_offers_from_json_arg(json_str: str) -> List[Offer]:
    """Parse offers from a JSON string.
    
    Args:
        json_str: JSON string containing offers
        
    Returns:
        List[Offer]: List of parsed offers
        
    Raises:
        ValueError: If JSON string doesn't contain a list
    """
    data = json.loads(json_str)
    if not isinstance(data, list):
        raise ValueError("JSON argument must be a list of offer objects")
    return data

def serialize_offer(o: Offer) -> Dict[str, Any]:
    """Return a JSON-serializable dict for output.
    
    Args:
        o: The offer to serialize
        
    Returns:
        Dict[str, Any]: JSON-serializable offer dictionary
    """
    return {
        "investor_id": o.get("investor_id"),
        "principal": float(o.get("principal")) if o.get("principal") is not None else None,
        "interest_annual_pct": float(o.get("interest_annual_pct")) if o.get("interest_annual_pct") is not None else None,
        "tenure_months": int(o.get("tenure_months")) if o.get("tenure_months") is not None else None,
        "composite_score": float(o.get("composite_score")) if o.get("composite_score") is not None else None,
    }


def main() -> None:
    """Command-line interface for selecting the best investor offer.
    
    Exit codes:
        0: Success or no offers available
        2: Input parsing error
        3: Processing error
    """
    parser = argparse.ArgumentParser(
        description="Select best investor offer from JSON input",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--file", "-f", help="Path to JSON file containing list of offers")
    group.add_argument("--stdin", action="store_true", help="Read JSON list from STDIN")
    group.add_argument("--json", "-j", help="JSON string containing list of offers")

    parser.add_argument("--w_principal", type=float, default=0.6,
                       help="Weight for principal score (0-1)")
    parser.add_argument("--w_interest", type=float, default=0.4,
                       help="Weight for interest score (0-1)")

    args = parser.parse_args()

    # Validate weights
    if not 0 <= args.w_principal <= 1 or not 0 <= args.w_interest <= 1:
        print(json.dumps({"error": "Weights must be between 0 and 1"}))
        sys.exit(2)
    if abs(args.w_principal + args.w_interest - 1.0) > 0.0001:
        print(json.dumps({"error": "Weights must sum to 1.0"}))
        sys.exit(2)

    try:
        if args.file:
            offers = load_offers_from_file(args.file)
        elif args.stdin:
            offers = load_offers_from_stdin()
        else:
            offers = load_offers_from_json_arg(args.json)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(2)

    try:
        best = select_best_offer(offers, w_principal=args.w_principal, w_interest=args.w_interest)
        if best is None:
            print(json.dumps({"error": "no_offers"}))
            sys.exit(0)
        print(json.dumps({"best_offer": serialize_offer(best)}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(3)


if __name__ == "__main__":
    main()
