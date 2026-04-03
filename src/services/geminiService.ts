import { GoogleGenAI } from "@google/genai";
import { DigitizationMode, VisualElement } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function digitizeNotes(image: string, mode: DigitizationMode): Promise<string | VisualElement[]> {
  const base64Data = image.split(',')[1];
  
  const prompt = mode === 'structured' 
    ? `You are an expert at digitizing handwritten notes and diagrams. 
       Please analyze the provided image and:
       1. Transcribe all handwritten text accurately.
       2. IMPORTANT: Identify any implicit structures like tables, columns, or lists even if they aren't perfectly formatted in the original. 
       3. If you see data that looks like a table (headers and rows), ALWAYS format it as a proper Markdown table.
       4. For any diagrams or drawings, create an equivalent diagram using Mermaid.js code. Wrap this code in a markdown code block with the language 'mermaid'.
       5. Use Markdown formatting to structure the output with proper headings (# for H1, ## for H2, etc.), bullet points, and numbered lists.
       6. CRITICAL: DO NOT use HTML tags like <br> for line breaks. Use standard Markdown syntax (e.g., double space at the end of a line or a blank line between paragraphs).
       7. For lists within table cells, use a single line with clear separators or multiple lines if the table format allows, but NEVER use <br>.
       8. Ensure the layout reflects the logical flow of the original notes.
       9. If you are unsure about some text, transcribe it exactly as it appears.
       10. Maintain proper alignment and hierarchy.`
    : `You are an expert at digitizing handwritten notes and diagrams with extreme spatial precision.
       Analyze the image and return a JSON array of elements. 
       
       CRITICAL INSTRUCTIONS:
       1. EVERY bullet point, numbered list item, or distinct line of text MUST be its own separate element in the JSON array. DO NOT group multiple list items into a single paragraph.
       2. For tabular or columnar layouts, each column header and each item under that header MUST be a separate element.
       3. Use consistent 'x' coordinates for items that are vertically aligned in the same column.
       4. Maintain the exact relative positioning (x, y) of all elements using their TOP-LEFT corner as the reference point.
       5. Differentiate between main headings, subheadings, and normal text based on their size and prominence.
       
       For each element, provide:
       - type: 'heading1', 'heading2', 'heading3', 'paragraph', 'list-item', or 'diagram'
       - text: the transcribed text (for text types). For list items, include the prefix (e.g., '(i)', '1.', etc.)
       - mermaidCode: the Mermaid.js code (for diagram type)
       - x: the top-left horizontal position as a percentage (0-100) of the image width
       - y: the top-left vertical position as a percentage (0-100) of the image height
       - fontSize: a relative font size (e.g., 28 for main heading, 20 for sub-heading, 14 for paragraph/list-item)
       - fontWeight: 'bold' for headings, 'medium' for list items, 'normal' for paragraphs.
       - width: the approximate width as a percentage (0-100) of the image width
       - textAlign: 'left' for list items and paragraphs, 'center' for headings and diagrams.
       
       If you are unsure of some text, transcribe it exactly as it appears.
       Return ONLY the JSON array.`;

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
    config: mode === 'visual' ? { responseMimeType: 'application/json' } : undefined
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
