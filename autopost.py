#!/usr/bin/env python3
"""
Maertin K Autoposter
Posts to Maertin K Facebook page — 4 posts per day, every 6 hours.
Triggered by GitHub Actions cron schedule.
"""
import os
import json
import requests
from datetime import datetime

# ── Config ────────────────────────────────────────────────────────────────────
PAGE_ACCESS_TOKEN = os.environ.get("FACEBOOK_PAGE_ACCESS_TOKEN")
PAGE_ID           = "111221800684391"  # Maertin K Facebook Page
POSTS_FILE        = os.path.join(os.path.dirname(__file__), "posts.json")

# ── Post schedule (UTC hours → post index) ────────────────────────────────────
SCHEDULE = {
    6:  0,   # 6 AM UTC  → post index 0
    12: 1,   # 12 PM UTC → post index 1
    18: 2,   # 6 PM UTC  → post index 2
    0:  3,   # 12 AM UTC → post index 3
}

# ── Helpers ───────────────────────────────────────────────────────────────────
def load_posts(filepath: str) -> list:
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

def publish_to_facebook(page_id: str, token: str, message: str) -> dict:
    url     = f"https://graph.facebook.com/v19.0/{page_id}/feed"
    payload = {"message": message, "access_token": token}
    resp    = requests.post(url, data=payload, timeout=30)
    return resp.json()

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    if not PAGE_ACCESS_TOKEN:
        raise EnvironmentError("Missing secret: FACEBOOK_PAGE_ACCESS_TOKEN")

    posts = load_posts(POSTS_FILE)
    hour  = datetime.utcnow().hour

    print(f"[{datetime.utcnow().isoformat()}] Maertin K Autoposter — UTC hour: {hour}")

    if hour not in SCHEDULE:
        print(f"No post scheduled at UTC hour {hour}. Skipping.")
        return

    index = SCHEDULE[hour]

    if index >= len(posts):
        print(f"Post index {index} not found. Only {len(posts)} posts in file. Skipping.")
        return

    post = posts[index]

    print(f"Publishing post index {index} (scheduled hour: {hour})...")
    print(f"Preview: {str(post['content'])[:100]}...")

    result = publish_to_facebook(PAGE_ID, PAGE_ACCESS_TOKEN, post["content"])

    if "id" in result:
        print(f"SUCCESS — Post published. Facebook ID: {result['id']}")
    else:
        print(f"FAILED — API response: {result}")
        raise RuntimeError(f"Facebook API error: {result}")

if __name__ == "__main__":
    main()