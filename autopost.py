import os
import json
import requests

# ─── Load posts ───────────────────────────────────────────────────────────────
with open("posts.json", "r") as f:
    posts = json.load(f)

run_index = int(os.environ.get("POST_INDEX", 0))
post = posts[run_index % len(posts)]
message = post["text"]
keyword = post["keyword"]

print(f"\n── Run #{run_index} ──────────────────────────")
print(f"Keyword: {keyword}")
print(f"Post: {message[:60]}...")

# ─── Pexels image ─────────────────────────────────────────────────────────────
def get_image(query):
    try:
        res = requests.get(
            "https://api.pexels.com/v1/search",
            params={"query": query, "per_page": 5, "orientation": "landscape"},
            headers={"Authorization": os.environ["PEXELS_API_KEY"]},
            timeout=10,
        )
        photos = res.json().get("photos", [])
        if photos:
            return photos[run_index % len(photos)]["src"]["large"]
    except Exception as e:
        print(f"Pexels error: {e}")
    return None

# ─── Facebook ─────────────────────────────────────────────────────────────────
def post_facebook(page_id, token, page_name, message, image_url):
    try:
        if image_url:
            endpoint = f"https://graph.facebook.com/v19.0/{page_id}/photos"
            payload = {"url": image_url, "caption": message, "access_token": token}
        else:
            endpoint = f"https://graph.facebook.com/v19.0/{page_id}/feed"
            payload = {"message": message, "access_token": token}
        res = requests.post(endpoint, data=payload, timeout=15)
        data = res.json()
        if "error" in data:
            print(f"Facebook [{page_name}] error: {data['error']['message']}")
        else:
            print(f"✓ Facebook [{page_name}] posted: {data.get('id')}")
    except Exception as e:
        print(f"Facebook [{page_name}] exception: {e}")

# ─── Twitter/X ────────────────────────────────────────────────────────────────
def post_twitter(message):
    try:
        import tweepy
        client = tweepy.Client(
            consumer_key=os.environ["TW_API_KEY"],
            consumer_secret=os.environ["TW_API_SECRET"],
            access_token=os.environ["TW_ACCESS_TOKEN"],
            access_token_secret=os.environ["TW_ACCESS_SECRET"],
        )
        tweet = message[:277] + "..." if len(message) > 280 else message
        result = client.create_tweet(text=tweet)
        print(f"✓ Twitter posted: {result.data['id']}")
    except Exception as e:
        print(f"Twitter exception: {e}")

# ─── LinkedIn ─────────────────────────────────────────────────────────────────
def post_linkedin(message):
    try:
        urn = os.environ["LI_PERSON_URN"]
        token = os.environ["LI_ACCESS_TOKEN"]
        body = {
            "author": urn,
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {"text": message},
                    "shareMediaCategory": "NONE",
                }
            },
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            },
        }
        res = requests.post(
            "https://api.linkedin.com/v2/ugcPosts",
            json=body,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0",
            },
            timeout=15,
        )
        data = res.json()
        if "id" in data:
            print(f"✓ LinkedIn posted: {data['id']}")
        else:
            print(f"LinkedIn error: {data}")
    except Exception as e:
        print(f"LinkedIn exception: {e}")

# ─── Run ──────────────────────────────────────────────────────────────────────
# Facebook:  every run — 10 posts/day per page
# Twitter:   every run — 50 posts/day
# LinkedIn:  every 17th run — 3 posts/day

print("\nFetching image...")
image_url = get_image(keyword)
print(f"Image: {image_url or 'none'}")

print("\nPosting...")

# Facebook — all 3 pages
fb_pages = [
    (os.environ["FB_PAGE_ID_1"], os.environ["FB_ACCESS_TOKEN_1"], "WealthSphere"),
    (os.environ["FB_PAGE_ID_2"], os.environ["FB_ACCESS_TOKEN_2"], "Money Mastery 2.0"),
    (os.environ["FB_PAGE_ID_3"], os.environ["FB_ACCESS_TOKEN_3"], "Maertin K"),
]
for page_id, token, name in fb_pages:
    post_facebook(page_id, token, name, message, image_url)

# Twitter — every run
post_twitter(message)

# LinkedIn — every 17th run (~3 posts/day across 50 runs)
if run_index % 17 == 0:
    post_linkedin(message)
else:
    print(f"LinkedIn — skipping run #{run_index}")

print("\n── Done ──────────────────────────────────\n")
