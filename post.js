import fetch from "node-fetch";
import posts from "./posts.json" assert { type: "json" };

const index = new Date().getHours() % posts.length;
const post = posts[index];

const message = post.text;
const keyword = post.keyword;

console.log("Starting autopost...");
console.log("Message:", message);
console.log("Keyword:", keyword);

async function getImage(query) {
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

async function postFacebook(message, imageUrl) {
  const res = await fetch(`https://graph.facebook.com/v18.0/${process.env.FB_PAGE_ID}/photos`, {
    method: "POST",
    body: new URLSearchParams({
      url: imageUrl,
      caption: message,
      access_token: process.env.FB_ACCESS_TOKEN,
    }),
  });

  const data = await res.json();
  console.log("Facebook:", data);
}

async function run() {
  const image = await getImage(keyword);

  console.log("Image:", image);

  if (!image) return;

  await postFacebook(message, image);

  console.log("DONE");
}

run();
