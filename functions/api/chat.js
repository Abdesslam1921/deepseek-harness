export async function onRequestPost(context) {
  try {
    const { messages, systemPrompt } = await context.request.json();
    const lastMsg = messages[messages.length - 1]?.content || "";

    const GROQ_KEY = context.env.GROQ_API_KEY;
    const DEEPSEEK_KEY = context.env.DEEPSEEK_API_KEY;

    // الروتر: يقرر إذا المهمة معقدة ولا بسيطة
    function isComplex(text) {
      const t = text.toLowerCase();
      if (t.length > 300) return true;
      if (t.includes("```")) return true;
      const keys = ["كود", "code", "bug", "تحليل", "رياضيات", "algorithm", "projet", "اشرح بالتفصيل", "خوارزمية", "reason", "فكر بعمق"];
      return keys.some(k => t.includes(k));
    }

    const complex = isComplex(lastMsg);
    let apiUrl, apiKey, model, brain;

    if (complex) {
      apiUrl = "https://api.deepseek.com/chat/completions";
      apiKey = DEEPSEEK_KEY;
      model = "deepseek-reasoner";
      brain = "🧠 DeepSeek - مهمة معقدة";
    } else {
      apiUrl = "https://api.groq.com/openai/v1/chat/completions";
      apiKey = GROQ_KEY;
      model = "llama-3.3-70b-versatile";
      brain = "⚡ Groq - مهمة سريعة";
    }

    if (!apiKey) throw new Error("المفتاح ناقص");

    const finalPrompt = `${complex? "انت DeepSeek R1، فكر خطوة بخطوة بعمق." : "انت Groq، جاوب بسرعة ومباشرة."} \n ${systemPrompt || ""}`;

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "system", content: finalPrompt },...messages],
        temperature: complex? 0.3 : 0.7
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message);

    data.brain_used = brain;
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
