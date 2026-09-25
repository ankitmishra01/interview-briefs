function clean(value, limit) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit || 1200);
}

function fallback(body) {
  const lang = body.lang === "fr" ? "fr" : "en";
  const proof = Array.isArray(body.roleProof) && body.roleProof.length ? body.roleProof[0] : "";
  if (lang === "fr") {
    return [
      "Je vais répondre comme un intervieweur.",
      "Ton angle est utile, mais je veux entendre plus vite le lien avec le poste.",
      proof ? `Place cette preuve plus tôt: ${proof}.` : "Place une preuve chiffrée plus tôt.",
      "Côté français, garde des phrases courtes et des verbes simples.",
      "Au lieu de dire je peux aider, dis je peux clarifier, prioriser et livrer.",
      "Pour les partenaires, dis: aligner les partenaires autour d'un KPI.",
      "Phrase à utiliser: je clarifie le problème, je priorise les actions, puis je livre un résultat mesurable."
    ].join(" ");
  }
  return [
    "I will answer like an interviewer.",
    "Your angle is useful, but I need to hear the role fit faster.",
    proof ? `Bring this proof point earlier: ${proof}.` : "Bring a quantified proof point earlier.",
    `The JD signal is: ${clean(body.jd, 220)}`,
    `Next version: direct point, quantified example, role link. ${clean(body.improve, 240)}`
  ].join(" ");
}

async function gateway(body) {
  const token = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  const model = process.env.AI_GATEWAY_MODEL || "openai/gpt-5.4-mini-fast";
  if (!token) return null;
  const system = body.lang === "fr"
    ? "Tu es FitCheck Coach. Donne un feedback parlé, simple, B2-safe, avec verbes français concrets. Ne mentionne aucune donnée privée."
    : "You are FitCheck Coach. Give concise spoken interview feedback grounded in the role and answer. Do not mention private information.";
  const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify({
          role: clean(body.roleTitle, 160),
          jd: clean(body.jd, 300),
          proof: body.roleProof || [],
          improve: clean(body.improve, 300),
          answer: clean(body.answer, 1800)
        }) }
      ],
      temperature: 0.6,
      max_tokens: 240
    })
  });
  if (!response.ok) return null;
  const json = await response.json();
  return clean(json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content, 1000);
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "method_not_allowed" }));
    return;
  }
  try {
    const body = typeof req.body === "object" && req.body ? req.body : JSON.parse(req.body || "{}");
    const reply = await gateway(body);
    res.statusCode = 200;
    res.end(JSON.stringify({ mode: reply ? "ai-gateway" : "local-coach", reply: reply || fallback(body) }));
  } catch (e) {
    res.statusCode = 200;
    res.end(JSON.stringify({ mode: "local-coach", reply: fallback({}) }));
  }
};
