require("dotenv").config();
const express = require("express");
const axios = require("axios");
const qs = require("querystring");
const cors = require("cors");

const app = express();
app.use(cors());

let access_token = "";

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const refresh_token = process.env.REFRESH_TOKEN;

async function refreshAccessToken() {
  const response = await axios.post("https://accounts.spotify.com/api/token",
    qs.stringify({
      grant_type: "refresh_token",
      refresh_token,
    }),
    {
      headers: {
        Authorization: "Basic " + Buffer.from(client_id + ":" + client_secret).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  access_token = response.data.access_token;
}

app.get("/", (req, res) => {
  res.send("🎵 Spotify Now Playing API is running!");
});

app.get("/now-playing", async (req, res) => {
  try {
    if (!access_token) await refreshAccessToken();

    const response = await axios.get("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: {
        Authorization: "Bearer " + access_token,
      },
    });

    const item = response.data?.item;
    if (!item) return res.status(204).send();

    res.json({
      name: item.name,
      artist: item.artists.map(a => a.name).join(", "),
      url: item.external_urls.spotify,
      image: item.album.images?.[0]?.url || "",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch" });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`✅ Server running on port ${port}`));
