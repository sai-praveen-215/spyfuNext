export default async function handler(req, res) {
  const { domain } = req.query;

  // if (!domain) return res.status(400).json({ error: "Missing domain" });

  try {
    const spyfuRes = await fetch(
      `https://www.spyfu.com/apis/core_api/get_domain_competitors_us?domain=${domain}&isOrganic=true&r=2&api_key=UX8BMIBN`
    );

    const data = await spyfuRes.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
