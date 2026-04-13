// FIXED fetch (works with node-fetch v3)
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const { TwitterApi } = require("twitter-api-v2");
const posts = require("./posts.json");

// rotate posts
const index = new Date().getHours() % posts.length;
const currentPost = posts[index];

const message = currentPost.text;
const keyword = currentPost.keyword;

// get image from Pexels
async function getPexelsImage(query) {
  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const data = await response.json();

    if (data.photos && data.photos.length > 0) {
      return data.photos[0].src.large;
    }

    console.log("No Pexels image found");
    return null;
  } catch (error) {
    console.error("Pexels error:", error);
    return null;
  }
}

// Twitter setup
const twitterClient = new TwitterApi({
  appKey: process.env.TW_API_KEY,
  appSecret: process.env.TW_API_SECRET,
  accessToken: process.env.TW_ACCESS_TOKEN,
  accessSecret: process.env.TW_ACCESS_SECRET,
});

// Twitter post
async function postTwitter(text, imageUrl) {
  try {
    const mediaId = await twitterClient.v1.uploadMedia(imageUrl);

    await twitterClient.v2.tweet({
      text,
      media: { media_ids: [mediaId] },
    });

    console.log("Twitter posted ✅");
  } catch (error) {
    console.error("Twitter error:", error);
  }
}

// Facebook post
async function postFacebook(text, imageUrl) {
  try {
    await fetch(
      `https://graph.facebook.com/v18.0/${process.env.FB_PAGE_ID}/photos`,
      {
        method: "POST",
        body: new URLSearchParams({
          url: imageUrl,
          caption: text,
          access_token: process.env.FB_ACCESS_TOKEN,
        }),
      }
    );

    console.log("Facebook posted ✅");
  } catch (error) {
    console.error("Facebook error:", error);
  }
}

// LinkedIn post
async function postLinkedIn(text, imageUrl) {
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
            shareCommentary: { text },
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
  } catch (error) {
    console.error("LinkedIn error:", error);
  }
}

// main runner
async function run() {
  try {
    const imageUrl = await getPexelsImage(keyword);

    if (!imageUrl) {
      console.log("No image — skipping post ❌");
      return;
    }

    await postTwitter(message, imageUrl);
    await postFacebook(message, imageUrl);
    await postLinkedIn(message, imageUrl);

    console.log("All platforms posted 🚀");
  } catch (error) {
    console.error("Run error:", error);
  }
}

run();
