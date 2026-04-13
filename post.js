// FIXED fetch (ESM compatible)
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const { TwitterApi } = require("twitter-api-v2");
const posts = require("./posts.json");

// rotate posts
const index = new Date().getHours() % posts.length;
const post = posts[index];

const message = post.text;
const keyword = post.keyword;

// get image from Pexels
async function getPexelsImage(query) {
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const data = await res.json();

    if (data.photos && data.photos.length > 0) {
      return data.photos[0].src.large;
    }

    return null;
  } catch (err) {
    console.error("Pexels error:", err);
    return null;
  }
}

// Twitter client
const twitterClient = new TwitterApi({
  appKey: process.env.TW_API_KEY,
  appSecret: process.env.TW_API_SECRET,
  accessToken: process.env.TW_ACCESS_TOKEN,
  accessSecret: process.env.TW_ACCESS_SECRET,
});

// Twitter post
async function postTwitter(message, imageUrl) {
  try {
    const mediaId = await twitterClient.v1.uploadMedia(imageUrl);

    await twitterClient.v2.tweet({
      text: message,
      media: { media_ids: [mediaId] },
    });

    console.log("Twitter posted ✅");
  } catch (err) {
    console.error("Twitter error:", err);
  }
}

// Facebook post
async function postFacebook(message, imageUrl) {
  try {
    await fetch(
      `https://graph.facebook.com/v18.0/${process.env.FB_PAGE_ID}/photos`,
      {
        method: "POST",
        body: new URLSearchParams({
          url: imageUrl,
          caption: message,
          access_token: process.env.FB_ACCESS_TOKEN,
        }),
      }
    );

    console.log("Facebook posted ✅");
  } catch (err) {
    console.error("Facebook error:", err);
  }
}

// LinkedIn post
async function postLinkedIn(message, imageUrl) {
  try {
    await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.LI_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        author: process.env.LI_PERSON_URN,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: message },
            shareMediaCategory: "ARTICLE",
            media: [
              {
                status: "READY",
                originalUrl: imageUrl,
              },
            ],
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      }),
    });

    console.log("LinkedIn posted ✅");
  } catch (err) {
    console.error("LinkedIn error:", err);
  }
}

// main runner
async function run() {
  try {
    const imageUrl = await getPexelsImage(keyword);

    if (!imageUrl) {
      console.log("No image found ❌");
      return;
    }

    await postTwitter(message, imageUrl);
    await postFacebook(message, imageUrl);
    await postLinkedIn(message, imageUrl);

    console.log("All posts done 🚀");
  } catch (err) {
    console.error("Run error:", err);
  }
}

run();
