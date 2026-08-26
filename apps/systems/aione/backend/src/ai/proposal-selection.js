/* Pure helper for selecting numbered items from recent 美和AI analysis. */
function selectedIndexes(objective = "") {
  const value = String(objective || "");
  if (!/(?:第|项)/.test(value)) return [];
  return [...new Set((value.match(/\d+/g) || []).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 20))];
}

function recentAssistantPlan(contextSnapshot = {}) {
  const entries = Array.isArray(contextSnapshot?.conversationContext) ? contextSnapshot.conversationContext : [];
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (entry?.type !== "message" || entry?.role !== "assistant" || !entry?.content) continue;
    const lines = String(entry.content).replace(/\r\n?/g, "\n").split("\n");
    const numbered = [];
    for (const line of lines) {
      const match = line.match(/^\s*(\d+)[.、)]\s*(.+?)\s*$/);
      if (match) numbered.push({ index:Number(match[1]), text:match[2].replace(/\*\*/g, "").trim() });
    }
    if (numbered.length) return { content:String(entry.content).slice(0,12000), numbered };
  }
  return null;
}

export function resolveSelectedPlanItems(objective = "", contextSnapshot = {}) {
  const indexes = selectedIndexes(objective);
  if (!indexes.length) return [];
  const plan = recentAssistantPlan(contextSnapshot);
  if (!plan) return [];
  return indexes.slice(0,5).map((index) => {
    const item = plan.numbered.find((candidate) => candidate.index === index);
    return item ? { index, text:item.text } : null;
  }).filter(Boolean);
}
