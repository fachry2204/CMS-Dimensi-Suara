import express from 'express';

const router = express.Router();

const extractArtistId = (url) => {
  if (!url) return '';
  const m1 = String(url).match(/artist\/([a-zA-Z0-9]+)(?:\?|$|\/)/);
  if (m1 && m1[1]) return m1[1];
  const m2 = String(url).match(/spotify:artist:([a-zA-Z0-9]+)/);
  if (m2 && m2[1]) return m2[1];
  return '';
};

router.get('/artist', async (req, res) => {
  try {
    const { url, id } = req.query || {};
    let targetUrl = '';
    if (id) {
      targetUrl = `https://open.spotify.com/artist/${id}`;
    } else if (url) {
      targetUrl = String(url);
    } else {
      return res.status(400).json({ error: 'Missing url or id' });
    }
    const resp = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(targetUrl)}`);
    if (!resp.ok) {
      return res.status(502).json({ error: 'Spotify unavailable' });
    }
    const json = await resp.json();
    const aid = extractArtistId(targetUrl);
    const name = json.title || json.author_name || '';
    res.json({
      id: aid,
      name,
      url: targetUrl,
      thumbnail: json.thumbnail_url || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch artist' });
  }
});

const getClientToken = async () => {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;
  const body = new URLSearchParams();
  body.append('grant_type', 'client_credentials');
  const auth = Buffer.from(`${id}:${secret}`).toString('base64');
  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!resp.ok) return null;
  const json = await resp.json();
  return json.access_token || null;
};

router.get('/search', async (req, res) => {
  try {
    const q = String((req.query?.q || '')).trim();
    if (!q) return res.status(400).json({ error: 'Missing q' });
    const token = await getClientToken();
    if (!token) {
      return res.status(503).json({ error: 'Spotify credentials not configured' });
    }
    const params = new URLSearchParams();
    params.append('q', q);
    params.append('type', 'artist');
    params.append('limit', String(Math.min(Number(req.query?.limit) || 5, 10)));
    const resp = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!resp.ok) {
      return res.status(502).json({ error: 'Spotify search failed' });
    }
    const json = await resp.json();
    const list = (json?.artists?.items || []).map((a) => ({
      id: a.id,
      name: a.name,
      url: a.external_urls?.spotify || `https://open.spotify.com/artist/${a.id}`,
      image: Array.isArray(a.images) && a.images[0] ? a.images[0].url : null,
      followers: a.followers?.total || 0,
      popularity: a.popularity || 0
    }));
    res.json({ items: list });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to search artist' });
  }
});

export default router;
