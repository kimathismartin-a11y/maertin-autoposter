import fetch from "node-fetch";
import { TwitterApi } from "twitter-api-v2";
import posts from "./posts.json" with { type: "json" };

// ─── Select post based on run index ───────────────────────────────────────────
// GitHub Actions runs this 10x/day. POST_INDEX is passed as env var (0–9).
// Each run picks a different post from the 30-post pool.
const runIndex = parseInt(process.env.POST_INDEX ?? "0", 10);
const post = posts[runIndex % posts.length];
const message = post.text;
const keyword = post.keyword;

console.log(`\n── Run #${runIndex} ──────────────────────────`);
console.log("Post:", message.slice(0, 60) + "...");
console.log("Keyword:", keyword);

// ─── Pexels image fetch ───────────────────────────────────────────────────────
async function getImage(query) {
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
      { headers: { Authorization: process.env.PEXELS_API_KEY } }
    );
    const data = await res.json();
    if (data.photos && data.photos.length > 0) {
      // Rotate image selection based on runIndex to avoid repetition
      const img = data.photos[runIndex % data.photos.length];
      return img.src.large;
    }
    return null;
  } catch (err) {
    console.error("Pexels error:", err.message);
    return null;
  }
}

// ─── Facebook post ────────────────────────────────────────────────────────────
async function postFacebook(message, imageUrl) {
  try {
    const endpoint = imageUrl
      ? `https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/photos`
      : `https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/feed`;

    const body = imageUrl
      ? { url: imageUrl, caption: message, access_token: process.env.FB_ACCESS_TOKEN }
      : { message, access_token: process.env.FB_ACCESS_TOKEN };

    const res = await fetch(endpoint, {
      method: "POST",
      body: new URLSearchParams(body),
    });
    const data = await res.json();

    if (data.error) {
      console.error("Facebook error:", data.error.message);
    } else {
      console.log("✓ Facebook posted — ID:", data.id ?? data.post_id);
    }
  } catch (err) {
    console.error("Facebook exception:", err.message);
  }
}

// ─── Twitter/X post ───────────────────────────────────────────────────────────
async function postTwitter(message) {
  try {
    const client = new TwitterApi({
      appKey: process.env.TW_API_KEY,
      appSecret: process.env.TW_API_SECRET,
      accessToken: process.env.TW_ACCESS_TOKEN,
      accessSecret: process.env.TW_ACCESS_SECRET,
    });

    // Twitter has a 280 char limit — trim if needed
    const tweet = message.length > 280 ? message.slice(0, 277) + "..." : message;
    const result = await client.v2.tweet(tweet);
    console.log("✓ Twitter posted — ID:", result.data.id);
  } catch (err) {
    console.error("Twitter error:", err.message);
  }
}

// ─── LinkedIn post ────────────────────────────────────────────────────────────
async function postLinkedIn(message) {
  try {
    const urn = process.env.LI_PERSON_URN; // e.g. urn:li:organization:13001943
    const body = {
      author: urn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: message },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.LI_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.id) {
      console.log("✓ LinkedIn posted — ID:", data.id);
    } else {
      console.error("LinkedIn error:", JSON.stringify(data));
    }
  } catch (err) {
    console.error("LinkedIn exception:", err.message);
  }
}

// ─── Main runner ──────────────────────────────────────────────────────────────
async function run() {
  console.log("\nFetching image...");
  const imageUrl = await getImage(keyword);
  console.log("Image URL:", imageUrl ?? "none — posting text only");

  console.log("\nPosting to all platforms...");
  await Promise.allSettled([
    postFacebook(message, imageUrl),
    postTwitter(message),
    postLinkedIn(message),
  ]);

  console.log("\n── Done ──────────────────────────────────\n");
}

run();
