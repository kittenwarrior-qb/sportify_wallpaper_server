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
  const response = await axios.post(
    "https://accounts.spotify.com/api/token",
    qs.stringify({
      grant_type: "refresh_token",
      refresh_token,
    }),
    {
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(client_id + ":" + client_secret).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  access_token = response.data.access_token;
}

app.get("/get", async (req, res) => {
  try {
    if (!access_token) await refreshAccessToken();

    // Lấy trạng thái playback hiện tại
    let response = await axios.get("https://api.spotify.com/v1/me/player", {
      headers: {
        Authorization: "Bearer " + access_token,
      },
    });

    if (response.data && response.data.is_playing && response.data.item) {
      const item = response.data.item;
      return res.json({
        type: "playing",
        name: item.name,
        artist: item.artists.map((a) => a.name).join(", "),
        url: item.external_urls.spotify,
        image: item.album.images?.[0]?.url || null,
        progress_ms: response.data.progress_ms,
        duration_ms: item.duration_ms,
        is_playing: response.data.is_playing,
        device: response.data.device?.name || null,
      });
    }

    // Nếu không có bài đang phát, fallback lấy bài nghe gần nhất
    response = await axios.get(
      "https://api.spotify.com/v1/me/player/recently-played?limit=1",
      {
        headers: {
          Authorization: "Bearer " + access_token,
        },
      }
    );

    const items = response.data?.items;
    if (!items || items.length === 0) return res.status(204).send();

    const latest = items[0].track;

    res.json({
      type: "recent",
      name: latest.name,
      artist: latest.artists.map((a) => a.name).join(", "),
      url: latest.external_urls.spotify,
      image: latest.album.images?.[0]?.url || null,
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch" });
  }
});




const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
