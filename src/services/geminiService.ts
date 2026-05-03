import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { DigitizationMode, VisualElement } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function digitizeNotes(image: string, mode: DigitizationMode): Promise<string | VisualElement[]> {
  const base64Data = image.split(',')[1];
  
  const prompt = mode === 'structured' 
    ? `Digitize these handwritten notes. 
       1. Transcribe text accurately.
       2. Format tables as Markdown tables.
       3. Convert diagrams to Mermaid.js code blocks.
       4. Use Markdown headings, bullets, and lists.
       5. Maintain logical flow and hierarchy.`
    : `Digitize these notes with extreme spatial precision. Create a "Digital Twin".
       
       RULES:
       1. COORDINATES: Provide 'x' and 'y' as percentages (0-100) of image width/height.
       2. GROUPING: Align related elements (e.g., list items) to the EXACT SAME 'x' coordinate.
       3. SPACING: Maintain relative vertical distance.
       4. BREAKDOWN: Every single line of handwriting must be its own separate element. NEVER combine multiple lines into one paragraph.
       5. WIDTH: Estimate the 'width' (0-100) based on how much horizontal space the handwriting actually occupies.
       6. ALIGNMENT: Use 'textAlign: left' for all text.
       7. FONT: Use 'fontSize' for relative scale (32=title, 24=heading, 16=text).
       
       Return JSON array:
       - type: 'heading1'|'heading2'|'heading3'|'paragraph'|'list-item'|'diagram'
       - text: transcribed text (include prefixes like '(i)', '1.')
       - mermaidCode: Mermaid.js code (for diagrams)
       - x, y: position (0-100)
       - fontSize: relative size
       - fontWeight: 'bold'|'semibold'|'medium'|'normal'
       - width: % width (0-100)
       - textAlign: 'left'`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data,
          },
        },
        {
          text: prompt,
        },
      ],
    },
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: mode === 'visual' ? 'application/json' : undefined
    }
  });

  if (!response.text) {
    throw new Error("No content generated");
  }

  if (mode === 'visual') {
    try {
      return JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse visual JSON:", response.text);
      throw new Error("Failed to parse visual layout data");
    }
  }

  return response.text;
}
