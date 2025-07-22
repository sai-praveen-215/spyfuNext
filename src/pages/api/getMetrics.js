export default async function handler(req, res) {
  const { domain } = req.query;
  const API_KEY = process.env.SPYFU_API_KEY;

  if (!domain) return res.status(400).json({ error: "Missing domain" });

  try {
    const spyfuRes = await fetch(
      `https://www.spyfu.com/apis/domain_stats_api/v2/getLatestDomainStats?domain=${domain}&api_key=UX8BMIBN`
    );
    const text = await spyfuRes.text();
  
    const json = JSON.parse(text);
    res.status(200).json(json);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}




