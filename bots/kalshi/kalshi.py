#!/usr/bin/env python3
"""
Kalshi CLI - Prediction market trading
"""

import os
import sys
import json
import base64
import datetime
import urllib.request
import urllib.error
from pathlib import Path

# Config
API_KEY_ID = os.environ.get("KALSHI_API_KEY_ID")
if not API_KEY_ID:
    raise EnvironmentError("KALSHI_API_KEY_ID is not set — add it to your environment.")
PRIVATE_KEY_PATH = Path(__file__).parent.parent / "vault" / "kalshi_private_key.pem"
BASE_URL = "https://api.elections.kalshi.com"  # Production
# BASE_URL = "https://demo-api.kalshi.co"  # Demo

def load_private_key():
    """Load RSA private key from file"""
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.backends import default_backend
    
    with open(PRIVATE_KEY_PATH, "rb") as key_file:
        private_key = serialization.load_pem_private_key(
            key_file.read(),
            password=None,
            backend=default_backend()
        )
    return private_key

def sign_request(private_key, timestamp_str: str, method: str, path: str) -> str:
    """Sign request with RSA-PSS"""
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import padding
    
    # Strip query params for signing
    path_without_query = path.split('?')[0]
    message = f"{timestamp_str}{method}{path_without_query}".encode('utf-8')
    
    signature = private_key.sign(
        message,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.DIGEST_LENGTH
        ),
        hashes.SHA256()
    )
    return base64.b64encode(signature).decode('utf-8')

def make_request(method: str, path: str, data: dict = None) -> dict:
    """Make authenticated request to Kalshi API"""
    private_key = load_private_key()
    
    timestamp = int(datetime.datetime.now().timestamp() * 1000)
    timestamp_str = str(timestamp)
    
    signature = sign_request(private_key, timestamp_str, method, path)
    
    headers = {
        'KALSHI-ACCESS-KEY': API_KEY_ID,
        'KALSHI-ACCESS-SIGNATURE': signature,
        'KALSHI-ACCESS-TIMESTAMP': timestamp_str,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    url = f"{BASE_URL}{path}"
    
    if data:
        req_data = json.dumps(data).encode('utf-8')
    else:
        req_data = None
    
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else str(e)
        return {"error": f"HTTP {e.code}: {error_body}"}
    except Exception as e:
        return {"error": str(e)}

def get_balance():
    """Get account balance"""
    result = make_request("GET", "/trade-api/v2/portfolio/balance")
    if "error" in result:
        print(f"❌ {result['error']}")
        return
    
    balance = result.get("balance", 0) / 100  # Convert cents to dollars
    print(f"💰 Balance: ${balance:,.2f}")

def get_positions():
    """Get current positions"""
    result = make_request("GET", "/trade-api/v2/portfolio/positions")
    if "error" in result:
        print(f"❌ {result['error']}")
        return
    
    positions = result.get("market_positions", [])
    if not positions:
        print("📭 No open positions")
        return
    
    print(f"📊 Open Positions ({len(positions)}):\n")
    for pos in positions:
        ticker = pos.get("ticker", "???")
        qty = pos.get("position", 0)
        side = "YES" if qty > 0 else "NO"
        print(f"  • {ticker}: {abs(qty)} {side}")

def search_markets(query: str, limit: int = 10):
    """Search for markets"""
    from urllib.parse import quote
    path = f"/trade-api/v2/markets?status=open&limit={limit}"
    result = make_request("GET", path)
    
    if "error" in result:
        print(f"❌ {result['error']}")
        return
    
    markets = result.get("markets", [])
    query_lower = query.lower()
    
    # Filter by query
    matched = [m for m in markets if query_lower in m.get("title", "").lower() 
               or query_lower in m.get("ticker", "").lower()]
    
    if not matched:
        print(f"🔍 No markets found matching '{query}'")
        return
    
    print(f"🔍 Markets matching '{query}':\n")
    for m in matched[:limit]:
        ticker = m.get("ticker", "???")
        title = m.get("title", "No title")[:60]
        yes_price = m.get("yes_ask", 0) / 100 if m.get("yes_ask") else "N/A"
        no_price = m.get("no_ask", 0) / 100 if m.get("no_ask") else "N/A"
        
        if isinstance(yes_price, float):
            print(f"  [{ticker}]")
            print(f"    {title}")
            print(f"    YES: {yes_price:.0%} | NO: {no_price:.0%}\n")
        else:
            print(f"  [{ticker}] {title}\n")

def get_market(ticker: str):
    """Get market details"""
    result = make_request("GET", f"/trade-api/v2/markets/{ticker}")
    
    if "error" in result:
        print(f"❌ {result['error']}")
        return
    
    m = result.get("market", result)
    
    print(f"\n📈 {m.get('title', 'Unknown')}")
    print(f"   Ticker: {m.get('ticker')}")
    print(f"   Status: {m.get('status')}")
    
    yes_bid = m.get('yes_bid', 0)
    yes_ask = m.get('yes_ask', 0)
    if yes_bid and yes_ask:
        print(f"   YES: {yes_bid/100:.0%} bid / {yes_ask/100:.0%} ask")
    
    print(f"   Volume: {m.get('volume', 0):,}")
    print(f"   Open Interest: {m.get('open_interest', 0):,}")
    
    if m.get('close_time'):
        print(f"   Closes: {m.get('close_time')}")

def list_events(limit: int = 10):
    """List active events"""
    result = make_request("GET", f"/trade-api/v2/events?status=open&limit={limit}")
    
    if "error" in result:
        print(f"❌ {result['error']}")
        return
    
    events = result.get("events", [])
    print(f"📅 Active Events ({len(events)}):\n")
    
    for e in events[:limit]:
        title = e.get("title", "???")[:70]
        ticker = e.get("event_ticker", "")
        print(f"  • [{ticker}] {title}")

def place_order(ticker: str, side: str, quantity: int, price: int):
    """Place an order
    
    Args:
        ticker: Market ticker
        side: 'yes' or 'no'
        quantity: Number of contracts
        price: Price in cents (1-99)
    """
    if side.lower() not in ['yes', 'no']:
        print("❌ Side must be 'yes' or 'no'")
        return
    
    if not 1 <= price <= 99:
        print("❌ Price must be between 1 and 99 cents")
        return
    
    data = {
        "ticker": ticker,
        "action": "buy",
        "side": side.lower(),
        "count": quantity,
        "type": "limit",
        "yes_price": price if side.lower() == 'yes' else None,
        "no_price": price if side.lower() == 'no' else None,
    }
    
    # Remove None values
    data = {k: v for k, v in data.items() if v is not None}
    
    result = make_request("POST", "/trade-api/v2/portfolio/orders", data)
    
    if "error" in result:
        print(f"❌ {result['error']}")
        return
    
    order = result.get("order", result)
    print(f"✅ Order placed!")
    print(f"   Order ID: {order.get('order_id')}")
    print(f"   {quantity}x {side.upper()} @ {price}¢")

def get_orders():
    """Get open orders"""
    result = make_request("GET", "/trade-api/v2/portfolio/orders?status=resting")
    
    if "error" in result:
        print(f"❌ {result['error']}")
        return
    
    orders = result.get("orders", [])
    if not orders:
        print("📭 No open orders")
        return
    
    print(f"📋 Open Orders ({len(orders)}):\n")
    for o in orders:
        ticker = o.get("ticker", "???")
        side = o.get("side", "???").upper()
        qty = o.get("remaining_count", 0)
        price = o.get("yes_price") or o.get("no_price") or 0
        print(f"  • {ticker}: {qty}x {side} @ {price}¢")

def print_help():
    print("""
🎰 Kalshi CLI

Usage:
  kalshi balance              - Check account balance
  kalshi positions            - View open positions  
  kalshi orders               - View open orders
  kalshi events               - List active events
  kalshi search <query>       - Search markets
  kalshi market <ticker>      - Get market details
  kalshi buy <ticker> <side> <qty> <price>  - Place order
  
Examples:
  kalshi balance
  kalshi search "trump"
  kalshi market KXPRESIDENCY-2028
  kalshi buy KXPRESIDENCY-2028 yes 10 52
""")

def main():
    if len(sys.argv) < 2:
        print_help()
        sys.exit(0)
    
    cmd = sys.argv[1].lower()
    
    try:
        if cmd == "balance":
            get_balance()
        elif cmd == "positions":
            get_positions()
        elif cmd == "orders":
            get_orders()
        elif cmd == "events":
            limit = int(sys.argv[2]) if len(sys.argv) > 2 else 10
            list_events(limit)
        elif cmd == "search" and len(sys.argv) > 2:
            query = " ".join(sys.argv[2:])
            search_markets(query)
        elif cmd == "market" and len(sys.argv) > 2:
            get_market(sys.argv[2])
        elif cmd == "buy" and len(sys.argv) >= 6:
            ticker = sys.argv[2]
            side = sys.argv[3]
            qty = int(sys.argv[4])
            price = int(sys.argv[5])
            place_order(ticker, side, qty, price)
        else:
            print_help()
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
