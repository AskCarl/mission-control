import io
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError


os.environ.setdefault("KALSHI_API_KEY_ID", "test-key")
sys.path.insert(0, str(Path(__file__).parent))

import kalshi  # noqa: E402


class DummyResponse:
    def __init__(self, payload: bytes):
        self._payload = payload

    def read(self):
        return self._payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


def make_http_error(code: int):
    body = io.BytesIO(b'{"error":"rate limit"}')
    return HTTPError(url="http://example", code=code, msg="error", hdrs=None, fp=body)


class RateLimitRetryTest(unittest.TestCase):
    @patch("kalshi.time.sleep", return_value=None)
    @patch("kalshi.sign_request", return_value="sig")
    @patch("kalshi.load_private_key", return_value=object())
    @patch("urllib.request.urlopen")
    def test_make_request_retries_on_429(self, mock_urlopen, _load_key, _sign, _sleep):
        mock_urlopen.side_effect = [
            make_http_error(429),
            make_http_error(429),
            DummyResponse(b'{"ok": true}'),
        ]

        result = kalshi.make_request("GET", "/trade-api/v2/portfolio/balance")

        self.assertTrue(result.get("ok"))
        self.assertEqual(mock_urlopen.call_count, 3)


if __name__ == "__main__":
    unittest.main()
