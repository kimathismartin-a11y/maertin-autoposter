import fetch from "node-fetch";
import { TwitterApi } from "twitter-api-v2";
import { readFileSync } from "fs";

const posts = JSON.parse(readFileSync("./posts.json", "utf-8"));
const index = new Date().getHours() % posts.length;
const { text: message, keyword } = posts[index];

if (!message || !keyword) {
  console.error("❌ Invalid post entry at index", index);
  process.exit(1);
}

console.log(`📋 Post #${index}: "${message.slice(0, 60)}..."`);
console.log(`🔍 Keyword: ${keyword}`);

async function getPexelsImage(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
  const res = await fetch(url, {
    headers: { Authorization: process.env.PEXELS_API_KEY },
  });
  if (!res.ok) throw new Error(`Pexels error: ${res.status}`);
  const data = await res.json();
  if (!data.photos || data.photos.length === 0) throw new Error(`No images for: "${query}"`);
  const pick = data.photos[Math.floor(Math.random() * data.photos.length)];
  return pick.src.large2x || pick.src.large;
}

const twitter = new TwitterApi({
  appKey: process.env.TW_API_KEY,
  appSecret: process.env.TW_API_SECRET,
  accessToken: process.env.TW_ACCESS_TOKEN,
  accessSecret: process.env.TW_ACCESS_SECRET,
});

async function postTwitter(text, imageUrl) {
  const imageRes = await fetch(imageUrl);
  const buffer = Buffer.from(await imageRes.arrayBuffer());
  const mediaId = await twitter.v1.uploadMedia(buffer, { mimeType: "image/jpeg" });
  await twitter.v2.tweet({ text, media: { media_ids: [mediaId] } });
  console.log("✅ Twitter posted");
}

async function postFacebook(text, imageUrl) {
  const res = await fetch(`https://graph.facebook.com/v18.0/${process.env.FB_PAGE_ID}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: imageUrl,
      caption: text,
      access_token: process.env.FB_ACCESS_TOKEN,
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(`Facebook error: ${data.error?.message}`);
  console.log("✅ Facebook posted — ID:", data.id);
}

async function postLinkedIn(text, imageUrl) {
  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LI_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: process.env.LI_PERSON_URN,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "ARTICLE",
          media: [{ status: "READY", originalUrl: imageUrl }],
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`LinkedIn error: ${data.message}`);
  console.log("✅ LinkedIn posted — URN:", data.id);
}

async function run() {
  const results = { twitter: false, facebook: false, linkedin: false };

  let imageUrl;
  try {
    imageUrl = await getPexelsImage(keyword);
    console.log("🖼️  Image:", imageUrl);
  } catch (err) {
    console.error("❌ Image fetch failed:", err.message);
    process.exit(1);
  }

  await Promise.allSettled([
    postTwitter(message, imageUrl).then(() => (results.twitter = true)).catch(e => console.error("❌ Twitter:", e.message)),
    postFacebook(message, imageUrl).then(() => (results.facebook = true)).catch(e => console.error("❌ Facebook:", e.message)),
    postLinkedIn(message, imageUrl).then(() => (results.linkedin = true)).catch(e => console.error("❌ LinkedIn:", e.message)),
  ]);

  console.log("\n📊 Summary:");
  console.log(`  Twitter  : ${results.twitter  ? "✅" : "❌"}`);
  console.log(`  Facebook : ${results.facebook ? "✅" : "❌"}`);
  console.log(`  LinkedIn : ${results.linkedin ? "✅" : "❌"}`);

  if (Object.values(results).every(v => !v)) {
    console.error("❌ All platforms failed.");
    process.exit(1);
  }
}

run();
