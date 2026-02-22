#!/usr/bin/env python3
"""
Kalshi Paper Trade Tracker

Commands:
  --resolve   Check settled markets, mark WIN/LOSS, update stats
  --stats     Print current rolling stats

Lifecycle:
  1. kalshi_btc_monitor.py (dry-run) calls log_paper_trade() on each triggered entry
  2. Resolver cron (daily ~2:30 PM PT) calls this with --resolve
  3. Stats update automatically; Telegram ping fires at MILESTONE_SAMPLE_SIZE
"""

import os
import sys
import json
import uuid
import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from kalshi import make_request as kalshi_request

# === PATHS ===
WORKSPACE         = Path(__file__).parent.parent
PAPER_TRADES_JSON = WORKSPACE / "memory" / "kalshi-paper-trades.json"
PAPER_STATS_JSON  = WORKSPACE / "memory" / "kalshi-paper-stats.json"
TRADE_LOG_MD      = WORKSPACE / "memory" / "kalshi-btc-trades.md"

MILESTONE_SAMPLE_SIZE = 20  # Telegram ping when this many trades are resolved


# === PERSISTENCE ===
def _load_trades():
    if PAPER_TRADES_JSON.exists():
        return json.loads(PAPER_TRADES_JSON.read_text())
    return []

def _save_trades(trades):
    PAPER_TRADES_JSON.parent.mkdir(parents=True, exist_ok=True)
    PAPER_TRADES_JSON.write_text(json.dumps(trades, indent=2))

def _load_stats():
    if PAPER_STATS_JSON.exists():
        return json.loads(PAPER_STATS_JSON.read_text())
    return _empty_stats()

def _save_stats(stats):
    PAPER_STATS_JSON.parent.mkdir(parents=True, exist_ok=True)
    PAPER_STATS_JSON.write_text(json.dumps(stats, indent=2))

def _empty_stats():
    return {
        "total_resolved": 0,
        "open_trades": 0,
        "wins": 0,
        "losses": 0,
        "win_rate": 0.0,
        "total_pnl": 0.0,
        "avg_win": 0.0,
        "avg_loss": 0.0,
        "expectancy": 0.0,
        "max_drawdown": 0.0,
        "last_7d_pnl": 0.0,
        "last_30d_pnl": 0.0,
        "last_updated": None,
    }

def _append_md(action, details):
    """Append a section to the markdown trade log"""
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S PST")
    TRADE_LOG_MD.parent.mkdir(parents=True, exist_ok=True)
    if not TRADE_LOG_MD.exists():
        TRADE_LOG_MD.write_text("# Kalshi BTC Trading Log\n\n")
    with open(TRADE_LOG_MD, "a") as f:
        f.write(f"\n## {timestamp} — {action}\n")
        for k, v in details.items():
            f.write(f"- **{k}:** {v}\n")
        f.write("\n---\n")


# === LOG PAPER TRADE (called from monitor) ===
def log_paper_trade(recommendation, signal_score, signals, btc, settlement_time=None):
    """
    Record a dry-run paper trade entry.
    Returns the trade ID string.
    """
    trade_id = str(uuid.uuid4())[:8].upper()
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

    cost_cents = int(recommendation["cost"].replace("¢", ""))
    side = "no" if "NO" in recommendation["action"] else "yes"

    # Mirror live position sizing (must match kalshi_btc_monitor.py constants)
    min_bet, max_bet = 100, 300
    contracts = max(1, int(min_bet * 100 / cost_cents))
    if contracts * cost_cents / 100 > max_bet:
        contracts = int(max_bet * 100 / cost_cents)
    total_cost = round(contracts * cost_cents / 100, 2)
    potential_profit = round(contracts * (100 - cost_cents) / 100, 2)

    trade = {
        "id": trade_id,
        "timestamp": timestamp,
        "ticker": recommendation["ticker"],
        "side": side,
        "action": recommendation["action"],
        "strike": recommendation["strike"],
        "entry_cost_cents": cost_cents,
        "contracts": contracts,
        "hypothetical_cost_usd": total_cost,
        "potential_profit_usd": potential_profit,
        "signal_score": signal_score,
        "signals": signals,
        "btc_price_at_entry": btc["price"],
        "btc_change_24h_at_entry": round(btc["change_24h"], 2),
        "settlement_time": settlement_time,
        "status": "open",
        "result_side": None,
        "realized_pnl": None,
        "resolved_at": None,
    }

    trades = _load_trades()
    trades.append(trade)
    _save_trades(trades)

    _append_md("PAPER TRADE OPENED", {
        "id": trade_id,
        "ticker": trade["ticker"],
        "action": trade["action"],
        "strike": trade["strike"],
        "entry": f"{cost_cents}¢ × {contracts} contracts = ${total_cost:.2f} at risk",
        "if_win": f"+${potential_profit:.2f}",
        "signal_score": f"{signal_score}/5",
        "btc_at_entry": f"${btc['price']:,.2f} ({btc['change_24h']:+.2f}% 24h)",
        "thesis": recommendation.get("thesis", ""),
    })

    return trade_id


# === RESOLVER ===
def resolve_paper_trades():
    """
    For each open paper trade, check if the market has settled.
    Mark WIN/LOSS, compute P&L, recompute rolling stats.

    Returns: (newly_resolved, milestone_reached, stats)
    """
    trades = _load_trades()
    open_trades = [t for t in trades if t["status"] == "open"]

    if not open_trades:
        print("No open paper trades to resolve.")
        return 0, False, _load_stats()

    print(f"Resolving {len(open_trades)} open paper trade(s)...")
    prev_resolved = sum(1 for t in trades if t["status"] in ("win", "loss"))
    newly_resolved = 0

    for trade in trades:
        if trade["status"] != "open":
            continue

        ticker = trade["ticker"]
        result = kalshi_request("GET", f"/trade-api/v2/markets/{ticker}")

        if "error" in result:
            print(f"  ⚠️  {ticker}: API error — {result['error']}")
            continue

        market = result.get("market", result)
        mkt_status = market.get("status", "")

        if mkt_status != "settled":
            print(f"  ⏳ {ticker}: {mkt_status} (not yet settled)")
            continue

        result_side = market.get("result", "")
        trade["result_side"] = result_side
        trade["resolved_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

        cost_cents = trade["entry_cost_cents"]
        contracts = trade["contracts"]

        if result_side == trade["side"]:
            pnl = round(contracts * (100 - cost_cents) / 100, 2)
            trade["status"] = "win"
            trade["realized_pnl"] = pnl
            outcome_str = f"WIN  +${pnl:.2f}"
            emoji = "✅"
        else:
            pnl = round(-contracts * cost_cents / 100, 2)
            trade["status"] = "loss"
            trade["realized_pnl"] = pnl
            outcome_str = f"LOSS -${abs(pnl):.2f}"
            emoji = "❌"

        newly_resolved += 1
        print(f"  {emoji} [{trade['id']}] {ticker} → {outcome_str}")

        _append_md(f"PAPER TRADE {trade['status'].upper()}", {
            "id": trade["id"],
            "ticker": ticker,
            "our_side": trade["side"].upper(),
            "market_result": result_side.upper(),
            "outcome": outcome_str,
            "signal_score": f"{trade['signal_score']}/5",
        })

    _save_trades(trades)

    stats = _compute_stats(trades)
    _save_stats(stats)

    # Milestone: first time crossing MILESTONE_SAMPLE_SIZE resolved trades
    new_resolved_total = stats["total_resolved"]
    milestone_reached = (
        new_resolved_total >= MILESTONE_SAMPLE_SIZE and
        prev_resolved < MILESTONE_SAMPLE_SIZE
    )

    return newly_resolved, milestone_reached, stats


# === STATS ===
def _compute_stats(trades):
    resolved = [t for t in trades if t["status"] in ("win", "loss")]
    wins     = [t for t in resolved if t["status"] == "win"]
    losses   = [t for t in resolved if t["status"] == "loss"]

    now = datetime.datetime.now(datetime.timezone.utc)

    def pnl_since(days):
        cutoff = (now - datetime.timedelta(days=days)).isoformat()
        return round(sum(
            t["realized_pnl"] for t in resolved
            if (t.get("resolved_at") or "") >= cutoff
        ), 2)

    total      = len(resolved)
    win_count  = len(wins)
    loss_count = len(losses)
    win_rate   = win_count / total if total > 0 else 0.0

    avg_win  = sum(t["realized_pnl"] for t in wins)   / win_count  if wins   else 0.0
    avg_loss = sum(abs(t["realized_pnl"]) for t in losses) / loss_count if losses else 0.0
    expectancy = (avg_win * win_rate) - (avg_loss * (1 - win_rate)) if total > 0 else 0.0

    # Max drawdown over cumulative P&L curve
    cumulative = peak = max_dd = 0.0
    for t in sorted(resolved, key=lambda x: x.get("resolved_at", "")):
        cumulative += t["realized_pnl"]
        if cumulative > peak:
            peak = cumulative
        dd = peak - cumulative
        if dd > max_dd:
            max_dd = dd

    total_pnl = sum(t["realized_pnl"] for t in resolved)

    return {
        "total_resolved":  total,
        "open_trades":     sum(1 for t in trades if t["status"] == "open"),
        "wins":            win_count,
        "losses":          loss_count,
        "win_rate":        round(win_rate, 4),
        "total_pnl":       round(total_pnl, 2),
        "avg_win":         round(avg_win, 2),
        "avg_loss":        round(avg_loss, 2),
        "expectancy":      round(expectancy, 2),
        "max_drawdown":    round(max_dd, 2),
        "last_7d_pnl":     pnl_since(7),
        "last_30d_pnl":    pnl_since(30),
        "last_updated":    now.isoformat(),
    }


def print_stats(stats=None):
    """Print formatted rolling stats to stdout"""
    if stats is None:
        stats = _load_stats()

    total = stats["total_resolved"]
    if total == 0:
        print("No resolved paper trades yet.")
        return stats

    verdict = ""
    if total >= 10:
        if stats["expectancy"] > 0 and stats["win_rate"] >= 0.40:
            verdict = "  → ✅ Positive expectancy — monitor for go-live"
        elif stats["expectancy"] < 0:
            verdict = "  → ❌ Negative expectancy — needs tuning"
        else:
            verdict = "  → ⏳ Marginal — collect more data"

    print(f"\n{'─'*42}")
    print(f"📊 Paper Trading  ({total} resolved, {stats['open_trades']} open)")
    print(f"{'─'*42}")
    print(f"  Win Rate:     {stats['win_rate']:.0%}  ({stats['wins']}W / {stats['losses']}L)")
    print(f"  Total P&L:    ${stats['total_pnl']:+.2f}")
    print(f"  Avg Win:      +${stats['avg_win']:.2f}")
    print(f"  Avg Loss:     -${stats['avg_loss']:.2f}")
    print(f"  Expectancy:   ${stats['expectancy']:+.2f} / trade")
    print(f"  Max Drawdown: ${stats['max_drawdown']:.2f}")
    print(f"  7-day P&L:    ${stats['last_7d_pnl']:+.2f}")
    print(f"  30-day P&L:   ${stats['last_30d_pnl']:+.2f}")
    if verdict:
        print(verdict)
    print(f"{'─'*42}")
    return stats


def milestone_telegram_message(stats):
    """Return the Telegram message to send at the milestone threshold"""
    lines = [
        f"🎯 **Kalshi Paper Trading — {stats['total_resolved']}-Trade Milestone**",
        "",
        f"Win Rate:    {stats['win_rate']:.0%}  ({stats['wins']}W / {stats['losses']}L)",
        f"Total P&L:   ${stats['total_pnl']:+.2f}",
        f"Expectancy:  ${stats['expectancy']:+.2f} / trade",
        f"Max Drawdown: ${stats['max_drawdown']:.2f}",
        f"7-day P&L:   ${stats['last_7d_pnl']:+.2f}",
        "",
    ]
    if stats["expectancy"] > 0 and stats["win_rate"] >= 0.40:
        lines.append("✅ Positive expectancy — ready for go-live review")
    elif stats["expectancy"] < 0:
        lines.append("❌ Negative expectancy — tune strategy before going live")
    else:
        lines.append("⏳ Marginal results — collect more data")

    return "\n".join(lines)


# === CLI ===
if __name__ == "__main__":
    if "--resolve" in sys.argv:
        resolved_count, milestone, stats = resolve_paper_trades()
        if stats["total_resolved"] > 0:
            print_stats(stats)
        if milestone:
            # Print milestone message — cron delivery picks this up
            print("\n" + milestone_telegram_message(stats))
        elif resolved_count == 0:
            sys.exit(0)  # Nothing resolved — stay silent
    elif "--stats" in sys.argv:
        print_stats()
    else:
        print("Usage: kalshi_paper_tracker.py [--resolve | --stats]")
        sys.exit(1)
