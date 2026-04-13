const fetch = require("node-fetch");
const { TwitterApi } = require("twitter-api-v2");

const posts = require("./posts.json");

// rotate posts
const index = new Date().getHours() % posts.length;
const post = posts[index];

const message = post.text;
const keyword = post.keyword;

// get image from Pexels
async function getPexelsImage(query) {
  const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`, {
    headers: {
      Authorization: process.env.PEXELS_API_KEY,
    },
  });

  const data = await res.json();

  if (data.photos && data.photos.length > 0) {
    return data.photos[0].src.large;
  }

  return null;
}

// Twitter client
const twitterClient = new TwitterApi({
  appKey: process.env.TW_API_KEY,
  appSecret: process.env.TW_API_SECRET,
  accessToken: process.env.TW_ACCESS_TOKEN,
  accessSecret: process.env.TW_ACCESS_SECRET,
});

async function postTwitter(message, imageUrl) {
  const mediaId = await twitterClient.v1.uploadMedia(imageUrl);
  await twitterClient.v2.tweet({
    text: message,
    media: { media_ids: [mediaId] },
  });
}

async function postFacebook(message, imageUrl) {
  await fetch(`https://graph.facebook.com/v18.0/${process.env.FB_PAGE_ID}/photos`, {
    method: "POST",
    body: new URLSearchParams({
      url: imageUrl,
      caption: message,
      access_token: process.env.FB_ACCESS_TOKEN,
    }),
  });
}

async function postLinkedIn(message, imageUrl) {
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
}

async function run() {
  const imageUrl = await getPexelsImage(keyword);

  if (!imageUrl) return;

  await postTwitter(message, imageUrl);
  await postFacebook(message, imageUrl);
  await postLinkedIn(message, imageUrl);
}

run();
