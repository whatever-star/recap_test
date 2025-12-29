
import { GoogleGenAI, Type } from "@google/genai";
import { Memory, AIAnalysis } from "../types";

export const generateMonthlyRecap = async (monthName: string, memories: Memory[]): Promise<AIAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Updated prompt to explicitly request Korean output
  const prompt = `
    다음은 ${monthName}의 사진 캡션과 태그 목록입니다.
    이 데이터들을 바탕으로 이 달의 추억을 회상하는 아름답고, 향수를 불러일으키며, 시적인 짧은 요약(이야기)을 **한국어**로 작성해 주세요.
    또한, 이 달의 전체적인 분위기(Mood)를 한 단어로 정의하고, 가장 기억에 남는 3가지 하이라이트를 **한국어**로 추출해 주세요.

    추억 데이터:
    ${memories.map(m => `- 캡션: ${m.caption} (태그: ${m.tags.join(', ')})`).join('\n')}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            story: { type: Type.STRING, description: '이 달을 요약하는 시적인 이야기 (한국어)' },
            mood: { type: Type.STRING, description: '전체적인 분위기 (예: 아늑함, 활기참, 성찰적인 등 한국어 단어)' },
            keyHighlights: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: '이 달의 주요 하이라이트 3가지 (한국어)'
            },
          },
          required: ["story", "mood", "keyHighlights"],
        },
      },
    });

    const result = JSON.parse(response.text);
    return result;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      story: "조용히 흐르는 시간 속에서 소중한 성장의 흔적을 발견한 한 달이었습니다. 따뜻한 기억들이 바람처럼 스쳐 지나가며 일상의 소소한 행복을 남겼습니다.",
      mood: "감성적인",
      keyHighlights: ["고요한 산책", "개인적인 성장", "평온한 저녁 시간"]
    };
  }
};
