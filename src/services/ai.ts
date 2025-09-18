
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Gera sugestões de tarefas com base em um objetivo principal usando a API do Gemini.
 * @param goal O objetivo que o usuário quer alcançar.
 * @param apiKey A chave de API do Gemini.
 * @returns Um array de objetos de tarefa sugeridos.
 */
export async function generateTaskSuggestions(goal: string, apiKey: string): Promise<{ name: string; priority: string }[]> {
  if (!apiKey) {
    throw new Error("A chave de API do Gemini não foi configurada.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
    Com base no seguinte objetivo: "${goal}", gere 5 sugestões de tarefas 
    claras e acionáveis para uma equipe de projeto. Para cada tarefa, atribua uma prioridade 
    (urgent, high, normal, low). Retorne a resposta como um array de objetos JSON VÁLIDO e nada mais,
    no formato: [{ "name": "...", "priority": "..." }].
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Limpa a resposta para garantir que seja um JSON válido
    const jsonString = text.replace('```json', '').replace('```', '').trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Erro na API do Gemini ao gerar sugestões de tarefas:", error);
    // Retorna um array vazio em caso de erro para não quebrar a aplicação
    return [];
  }
}