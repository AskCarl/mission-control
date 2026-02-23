#!/usr/bin/env python3
"""
Kalshi BTC Daily Market Monitor
- Signal scoring: 5 technical signals, trade only when >= MIN_SIGNAL_SCORE agree
- Signals: 24h momentum, 1h momentum, 24h range position, Fear & Greed, volume
- Settlement guard: no trades within 90 min of market close
- Duplicate check: skips if an open order or position already exists for the ticker
- Set KALSHI_DRY_RUN=true for paper trading (no real orders placed)
"""

import os
import sys
import json
import datetime
import urllib.request
import urllib.error
import time
import random
from pathlib import Path

# Import auth layer from kalshi.py (same directory — single source of truth for auth)
sys.path.insert(0, str(Path(__file__).parent))
from kalshi import make_request as kalshi_request
from kalshi_paper_tracker import log_paper_trade

# === CONFIG ===
TRADE_LOG = Path(os.environ.get(
    "KALSHI_TRADE_LOG",
    str(Path(__file__).parent.parent / "memory" / "kalshi-btc-trades.md"),
))
DRY_RUN = os.environ.get("KALSHI_DRY_RUN", "false").lower() == "true"

BTC_CACHE_PATH = Path(os.environ.get(
    "BTC_CACHE_PATH",
    str(Path(__file__).parent.parent / "memory" / "kalshi-btc-cache.json"),
))
BTC_CACHE_TTL_SECONDS = int(os.environ.get("BTC_CACHE_TTL_SECONDS", "300"))

MAX_RETRIES = 3
BASE_BACKOFF_SECONDS = 0.5
MAX_BACKOFF_SECONDS = 6.0

# Position sizing
MIN_BET = 100  # dollars
MAX_BET = 300  # dollars

# Market filter params
MAX_ENTRY_COST = 35     # max cents to pay per contract
MIN_DISTANCE_PCT = 2.0  # strike must be >= 2% from current BTC price

# Signal scoring
MIN_24H_MOMENTUM = 0.3   # hard gate: |24h %| must be >= this to proceed at all
MIN_SIGNAL_SCORE = 3     # need >= 3 of 5 signals to fire a trade
MIN_VOLUME_USD = 30e9    # $30B 24h volume threshold for volume signal

SETTLEMENT_GUARD_MINUTES = 90  # no new trades within 90 min of market close

# Time-to-settlement distance scaling
# More time remaining = BTC has more room to move = require wider buffer
# Less time remaining = accept tighter strikes
DISTANCE_SCALE = {
    # (max_hours, min_distance_pct)
    "tiers": [
        (2,  1.0),   # < 2h left: 1.0% distance is enough
        (4,  1.5),   # 2-4h: 1.5%
        (8,  2.0),   # 4-8h: 2.0% (current default equivalent)
        (24, 2.5),   # 8-24h: 2.5% — overnight holds need more buffer
    ],
}


def _scaled_min_distance(minutes_remaining):
    """Return min distance % scaled by time to settlement."""
    if minutes_remaining is None:
        return MIN_DISTANCE_PCT  # fallback to static default
    hours = minutes_remaining / 60
    for max_h, dist in DISTANCE_SCALE["tiers"]:
        if hours <= max_h:
            return dist
    return DISTANCE_SCALE["tiers"][-1][1]  # use largest tier


# === DATA FETCHING ===
def _is_retryable_status(code: int) -> bool:
    return code == 429 or 500 <= code <= 599

def _backoff_delay(attempt: int) -> float:
    base = min(MAX_BACKOFF_SECONDS, BASE_BACKOFF_SECONDS * (2 ** (attempt - 1)))
    jitter = random.uniform(0, base * 0.3)
    return base + jitter

def _fetch_json_with_retry(url: str, timeout: int = 15):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            if _is_retryable_status(e.code) and attempt < MAX_RETRIES:
                delay = _backoff_delay(attempt)
                print(f"[btc] HTTP {e.code} retrying in {delay:.2f}s (attempt {attempt}/{MAX_RETRIES})")
                time.sleep(delay)
                continue
            raise
        except Exception:
            if attempt < MAX_RETRIES:
                delay = _backoff_delay(attempt)
                print(f"[btc] request error retrying in {delay:.2f}s (attempt {attempt}/{MAX_RETRIES})")
                time.sleep(delay)
                continue
            raise

def _write_btc_cache(payload: dict):
    BTC_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    BTC_CACHE_PATH.write_text(json.dumps({
        "timestamp": int(time.time()),
        "data": payload,
    }))

def _read_btc_cache():
    if not BTC_CACHE_PATH.exists():
        return None
    try:
        cached = json.loads(BTC_CACHE_PATH.read_text())
        timestamp = cached.get("timestamp")
        data = cached.get("data")
        if not timestamp or not data:
            return None
        age = int(time.time()) - int(timestamp)
        if age > BTC_CACHE_TTL_SECONDS:
            return None
        data["_from_cache"] = True
        data["_cache_age_sec"] = age
        return data
    except Exception:
        return None

def get_btc_data():
    """Fetch BTC price + 1h/24h change + 24h high/low + volume from CoinGecko"""
    try:
        url = (
            "https://api.coingecko.com/api/v3/coins/markets"
            "?vs_currency=usd&ids=bitcoin&price_change_percentage=1h,24h"
        )
        data = _fetch_json_with_retry(url, timeout=15)[0]
        payload = {
            "price": data["current_price"],
            "change_1h": data.get("price_change_percentage_1h_in_currency") or 0.0,
            "change_24h": data.get("price_change_percentage_24h") or 0.0,
            "high_24h": data.get("high_24h") or 0.0,
            "low_24h": data.get("low_24h") or 0.0,
            "volume_24h": data.get("total_volume") or 0.0,
        }
        _write_btc_cache(payload)
        return payload
    except Exception as e:
        print(f"⚠️  BTC data fetch failed: {e}")
        cached = _read_btc_cache()
        if cached:
            print(f"⚠️  Using cached BTC data ({cached.get('_cache_age_sec')}s old)")
            return cached
        return None


def get_fear_greed():
    """Fetch Fear & Greed Index from alternative.me (0=extreme fear, 100=extreme greed)"""
    try:
        req = urllib.request.Request(
            "https://api.alternative.me/fng/?limit=1",
            headers={"User-Agent": "Mozilla/5.0"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            value = int(data["data"][0]["value"])
            label = data["data"][0]["value_classification"]
            return {"value": value, "label": label}
    except Exception as e:
        print(f"⚠️  Fear & Greed fetch failed: {e}")
        return None


# === MARKET DATA ===
def get_btc_markets():
    """Get open KXBTCD daily BTC markets"""
    result = kalshi_request("GET", "/trade-api/v2/markets?series_ticker=KXBTCD&status=open&limit=50")
    return result.get("markets", [])


# === LOGGING ===
def log_trade(action, details):
    """Append trade or analysis entry to the markdown trade log"""
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S PST")
    TRADE_LOG.parent.mkdir(parents=True, exist_ok=True)
    if not TRADE_LOG.exists():
        TRADE_LOG.write_text("# Kalshi BTC Trading Log\n\n")
    with open(TRADE_LOG, "a") as f:
        f.write(f"\n## {timestamp} - {action}\n")
        for k, v in details.items():
            f.write(f"- **{k}:** {v}\n")
        f.write("\n---\n")


# === DUPLICATE CHECK ===
def has_existing_exposure(ticker):
    """Return True if there's already an open order or position for this ticker"""
    orders = kalshi_request("GET", "/trade-api/v2/portfolio/orders?status=resting")
    if "orders" in orders:
        for o in orders.get("orders", []):
            if o.get("ticker") == ticker:
                return True
    positions = kalshi_request("GET", "/trade-api/v2/portfolio/positions")
    if "market_positions" in positions:
        for p in positions.get("market_positions", []):
            if p.get("ticker") == ticker:
                return True
    return False


# === SIGNAL SCORING ===
def score_signals(btc, fear_greed, bullish):
    """
    Score 5 technical signals. Returns (score, breakdown_dict).
    Trade only if score >= MIN_SIGNAL_SCORE.

    Signals:
      1. 24h momentum strength  (>= 1.0%)
      2. 1h momentum confirms 24h direction
      3. 24h range position     (price near high = bullish, near low = bearish)
      4. Fear & Greed regime    (25-75 = safe to trade; extremes = mean-reversion risk)
      5. Volume                 (>= $30B = elevated, move has conviction)
    """
    score = 0
    breakdown = {}

    # Signal 1: 24h momentum strength
    if abs(btc["change_24h"]) >= 1.0:
        score += 1
        breakdown["1_24h_momentum"] = f"✅ {btc['change_24h']:+.2f}% (strong)"
    else:
        breakdown["1_24h_momentum"] = f"❌ {btc['change_24h']:+.2f}% (weak, need ±1%)"

    # Signal 2: 1h momentum confirms 24h direction
    h1_aligns = (btc["change_1h"] > 0) == bullish
    if h1_aligns and abs(btc["change_1h"]) >= 0.1:
        score += 1
        breakdown["2_1h_momentum"] = f"✅ {btc['change_1h']:+.2f}% (confirms direction)"
    else:
        breakdown["2_1h_momentum"] = f"❌ {btc['change_1h']:+.2f}% (conflicts or flat)"

    # Signal 3: 24h range position
    range_size = btc["high_24h"] - btc["low_24h"]
    if range_size > 0:
        range_pos = (btc["price"] - btc["low_24h"]) / range_size
        if bullish and range_pos >= 0.6:
            score += 1
            breakdown["3_range_position"] = f"✅ {range_pos:.0%} of range (near high — bullish)"
        elif not bullish and range_pos <= 0.4:
            score += 1
            breakdown["3_range_position"] = f"✅ {range_pos:.0%} of range (near low — bearish)"
        else:
            direction = "bullish" if bullish else "bearish"
            breakdown["3_range_position"] = f"❌ {range_pos:.0%} of range (not confirming {direction})"
    else:
        breakdown["3_range_position"] = "⚠️  range data unavailable"

    # Signal 4: Fear & Greed regime filter
    # Extremes (< 25 or > 75) = high mean-reversion risk, don't trade WITH momentum
    # Mid-range (25-75) = momentum can sustain, safe to trade
    if fear_greed:
        fg = fear_greed["value"]
        label = fear_greed["label"]
        if 25 <= fg <= 75:
            score += 1
            breakdown["4_fear_greed"] = f"✅ {fg} — {label} (neutral zone — momentum can sustain)"
        else:
            extreme = "extreme fear" if fg < 25 else "extreme greed"
            breakdown["4_fear_greed"] = f"❌ {fg} — {label} ({extreme} — mean-reversion risk)"
    else:
        breakdown["4_fear_greed"] = "⚠️  unavailable (not counted)"

    # Signal 5: Volume conviction
    vol_b = btc["volume_24h"] / 1e9
    if btc["volume_24h"] >= MIN_VOLUME_USD:
        score += 1
        breakdown["5_volume"] = f"✅ ${vol_b:.1f}B (elevated — move has conviction)"
    else:
        breakdown["5_volume"] = f"❌ ${vol_b:.1f}B (low — need ${MIN_VOLUME_USD/1e9:.0f}B+)"

    return score, breakdown


# === STRATEGY ===
def find_best_market(markets, btc_price, bullish):
    """
    Among qualifying markets, return the one with the smallest distance
    from current price that still meets entry cost and distance filters.
    Nearest strike = highest win probability while maintaining a buffer.
    """
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    best = None
    best_distance = float("inf")

    for m in markets:
        ticker = m.get("ticker", "")

        # Settlement time guard
        close_time_str = m.get("close_time", "")
        minutes_remaining = None
        if close_time_str:
            try:
                close_time = datetime.datetime.fromisoformat(close_time_str.replace("Z", "+00:00"))
                minutes_remaining = (close_time - now_utc).total_seconds() / 60
                if minutes_remaining < SETTLEMENT_GUARD_MINUTES:
                    continue
            except ValueError:
                pass

        # Scale distance requirement by time to settlement
        min_dist = _scaled_min_distance(minutes_remaining)

        # Extract strike from ticker (e.g. KXBTCD-26FEB0317-T78499.99)
        try:
            strike = float(ticker.split("-T")[1])
        except (IndexError, ValueError):
            continue

        yes_bid = m.get("yes_bid") or 0
        yes_ask = m.get("yes_ask") or 0
        no_ask = (100 - yes_bid) if yes_bid else 0

        # BULLISH: BUY YES — betting BTC closes above strike
        if bullish and strike < btc_price and yes_ask > 0:
            distance_pct = (btc_price - strike) / btc_price * 100
            if distance_pct >= min_dist and yes_ask <= MAX_ENTRY_COST:
                if distance_pct < best_distance:
                    best_distance = distance_pct
                    best = {
                        "action": "BUY YES",
                        "ticker": ticker,
                        "strike": f"${strike:,.2f}",
                        "current_price": f"${btc_price:,.2f}",
                        "distance": f"{distance_pct:.2f}%",
                        "implied_prob": f"{yes_ask}%",
                        "cost": f"{yes_ask}¢",
                        "potential_profit": f"{100 - yes_ask}¢",
                        "_settlement_time": close_time_str,
                    }

        # BEARISH: BUY NO — betting BTC closes below strike
        if not bullish and strike > btc_price and no_ask > 0:
            distance_pct = (strike - btc_price) / btc_price * 100
            if distance_pct >= min_dist and no_ask <= MAX_ENTRY_COST:
                if distance_pct < best_distance:
                    best_distance = distance_pct
                    best = {
                        "action": "BUY NO",
                        "ticker": ticker,
                        "strike": f"${strike:,.2f}",
                        "current_price": f"${btc_price:,.2f}",
                        "distance": f"{distance_pct:.2f}%",
                        "implied_prob": f"{no_ask}%",
                        "cost": f"{no_ask}¢",
                        "potential_profit": f"{100 - no_ask}¢",
                        "_settlement_time": close_time_str,
                    }

    return best


# === EXECUTION (live only) ===
def size_position(cost_cents):
    """Return (contracts, total_cost_usd) using MIN_BET/MAX_BET sizing"""
    contracts = max(1, int(MIN_BET * 100 / cost_cents))
    if contracts * cost_cents / 100 > MAX_BET:
        contracts = int(MAX_BET * 100 / cost_cents)
    return contracts, round(contracts * cost_cents / 100, 2)


def execute_trade(recommendation, data_quality=None):
    """Place a live order. Returns trade details dict or None on failure."""
    ticker = recommendation["ticker"]
    action = recommendation["action"]
    cost_cents = int(recommendation["cost"].replace("¢", ""))
    side = "no" if "NO" in action else "yes"
    contracts, total_cost = size_position(cost_cents)

    data = {
        "ticker": ticker,
        "action": "buy",
        "side": side,
        "type": "limit",
        "count": contracts,
        "yes_price": cost_cents if side == "yes" else None,
        "no_price": cost_cents if side == "no" else None,
    }
    data = {k: v for k, v in data.items() if v is not None}

    result = kalshi_request("POST", "/trade-api/v2/portfolio/orders", data)

    trade_preview = {**recommendation, "contracts": contracts, "total_cost": f"${total_cost:.2f}"}
    if data_quality:
        trade_preview["data_quality"] = data_quality

    if "error" not in result:
        order = result.get("order", {})
        trade_details = {
            **trade_preview,
            "order_id": order.get("order_id", "unknown"),
            "status": order.get("status", "unknown"),
        }
        log_trade("TRADE EXECUTED", trade_details)
        return trade_details
    else:
        log_trade("TRADE FAILED", {"error": result["error"], **recommendation})
        return None


# === MAIN ===
def run_monitor():
    """Main entry point"""
    print(f"\n{'='*50}")
    print(f"BTC Monitor - {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S PST')}")
    if DRY_RUN:
        print("  *** DRY RUN MODE — no real orders will be placed ***")
    print("=" * 50)

    # Verify API connectivity via balance check
    result = kalshi_request("GET", "/trade-api/v2/portfolio/balance")
    if "error" in result:
        print(f"❌ API error: {result['error']}")
        sys.exit(1)

    balance = result.get("balance", 0) / 100
    print(f"\n💰 Balance: ${balance:,.2f}")

    if balance < MIN_BET and not DRY_RUN:
        print(f"❌ Balance ${balance:.2f} is below minimum bet ${MIN_BET}. Exiting.")
        return

    # Fetch BTC data
    btc = get_btc_data()
    if not btc:
        print("❌ Could not fetch BTC data or cache. No trade.")
        log_trade("NO TRADE", {
            "reason": "BTC data unavailable (live + cache failed)",
        })
        return

    print(f"₿  BTC:  ${btc['price']:,.2f}  |  1h: {btc['change_1h']:+.2f}%  |  24h: {btc['change_24h']:+.2f}%")
    print(f"   Range: ${btc['low_24h']:,.0f} – ${btc['high_24h']:,.0f}  |  Vol: ${btc['volume_24h']/1e9:.1f}B")
    data_quality = "cached" if btc.get("_from_cache") else "live"
    if btc.get("_from_cache"):
        print("⚠️  Data quality: cached (degraded)")

    # Hard momentum gate
    if abs(btc["change_24h"]) < MIN_24H_MOMENTUM:
        print(f"\n😴 24h momentum too low ({btc['change_24h']:+.2f}%) — staying flat")
        log_trade("NO TRADE", {
            "btc_price": f"${btc['price']:,.2f}",
            "change_24h": f"{btc['change_24h']:+.2f}%",
            "reason": f"24h momentum {btc['change_24h']:+.2f}% below ±{MIN_24H_MOMENTUM}% gate",
            "data_quality": data_quality,
        })
        return

    bullish = btc["change_24h"] > 0

    # Fetch Fear & Greed
    fear_greed = get_fear_greed()

    # Score signals
    score, breakdown = score_signals(btc, fear_greed, bullish)

    direction = "BULLISH" if bullish else "BEARISH"
    print(f"\n📡 Signal Score: {score}/{len(breakdown)} — {direction} bias")
    for key, val in breakdown.items():
        label = key.split("_", 1)[1].replace("_", " ").title()
        print(f"   {label}: {val}")

    if score < MIN_SIGNAL_SCORE:
        print(f"\n😴 Score {score} < {MIN_SIGNAL_SCORE} required — staying flat")
        log_trade("NO TRADE", {
            "btc_price": f"${btc['price']:,.2f}",
            "change_24h": f"{btc['change_24h']:+.2f}%",
            "signal_score": f"{score}/{len(breakdown)}",
            "reason": f"Insufficient signal confluence (need {MIN_SIGNAL_SCORE})",
            "data_quality": data_quality,
            **{k: v for k, v in breakdown.items()},
        })
        return

    # Fetch markets and find best setup
    markets = get_btc_markets()
    if not markets:
        print("❌ No open KXBTCD markets found.")
        return
    print(f"\n📊 {len(markets)} open KXBTCD markets")

    recommendation = find_best_market(markets, btc["price"], bullish)

    if not recommendation:
        print("\n😴 No market meets distance/cost criteria — staying flat")
        log_trade("NO TRADE", {
            "btc_price": f"${btc['price']:,.2f}",
            "signal_score": f"{score}/{len(breakdown)}",
            "reason": "No market met MIN_DISTANCE_PCT or MAX_ENTRY_COST filter",
            "data_quality": data_quality,
        })
        return

    # Add thesis to recommendation
    direction_str = f"up {btc['change_24h']:+.1f}%" if bullish else f"down {btc['change_24h']:+.1f}%"
    side_str = "above" if bullish else "below"
    recommendation["thesis"] = (
        f"BTC {direction_str} 24h, score {score}/{len(breakdown)}. "
        f"Betting it closes {side_str} ${float(recommendation['strike'].replace('$','').replace(',','')):,.0f} at settlement."
    )

    print(f"\n🎯 Best opportunity:")
    for k, v in recommendation.items():
        print(f"   {k}: {v}")

    # Duplicate check (live mode only — paper trades always log)
    ticker = recommendation["ticker"]
    if not DRY_RUN and has_existing_exposure(ticker):
        print(f"\n⚠️  Already have exposure on {ticker} — skipping")
        log_trade("SKIPPED", {**recommendation, "reason": "Existing order or position", "data_quality": data_quality})
        return

    # Strip internal metadata key before passing to execution/logging
    settlement_time = recommendation.pop("_settlement_time", None)

    if DRY_RUN:
        contracts, total_cost = size_position(int(recommendation["cost"].replace("¢", "")))
        trade_id = log_paper_trade(recommendation, score, breakdown, btc, settlement_time)
        print(f"\n📝 [DRY RUN] Paper trade logged — ID: {trade_id}")
        print(f"   Would place: {contracts}x {recommendation['action'].split()[1]} {ticker} @ {recommendation['cost']} (${total_cost:.2f})")
    else:
        print(f"\n⚡ Executing trade...")
        trade = execute_trade(recommendation, data_quality=data_quality)
        if trade:
            print(f"✅ Order placed: {trade['contracts']} contracts @ {recommendation['cost']}")
            print(f"   Order ID: {trade.get('order_id')}")
        else:
            print("❌ Trade execution failed — check trade log for details")


if __name__ == "__main__":
    run_monitor()
