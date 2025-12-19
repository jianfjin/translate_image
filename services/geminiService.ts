
import { GoogleGenAI } from "@google/genai";
import { UploadedImage, OutputSettings } from "../types";

const extractBase64Data = (dataUrl: string): { mimeType: string; data: string } => {
  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid base64 string");
  }
  return { mimeType: matches[1], data: matches[2] };
};

export const processImagesWithGemini = async (
  prompt: string,
  images: UploadedImage[],
  settings: OutputSettings
): Promise<{ textResponse: string; generatedImages: { originalId: string; dataUrl: string; originalName: string }[] }> => {
  
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey });
  const results = [];
  let combinedTextResponse = "";

  const geminiResolution = settings.resolution === 'original' ? '1K' : settings.resolution;

  for (const img of images) {
    const { mimeType, data } = extractBase64Data(img.url);

    try {
      let areaRestriction = "";
      if (img.selections && img.selections.length > 0) {
        const boxesStr = img.selections.map((sel, idx) => 
          `[ymin: ${sel.y}, xmin: ${sel.x}, ymax: ${sel.y + sel.height}, xmax: ${sel.x + sel.width}]`
        ).join(', ');
        
        areaRestriction = `
          CRITICAL RESTRICTION: You MUST ONLY translate and modify text found within the following normalized coordinate boxes: ${boxesStr}.
          ANY TEXT OUTSIDE THESE BOXES MUST NOT BE TOUCHED.
          THE REST OF THE IMAGE BACKGROUND, COLORS, AND UNSELECTED TEXT MUST REMAIN EXACTLY AS THEY ARE.
        `;
      } else {
        areaRestriction = "Translate all visible text in the image.";
      }

      const qualityNote = settings.format === 'jpeg' ? `\nExport as high-quality JPEG (Quality: ${settings.quality}%).` : "Export as lossless PNG.";

      const finalPrompt = `
        TASK: ${prompt}
        TARGET LANGUAGE: Ensure ALL translated text is in the requested language (e.g., if instruction is Chinese, use simplified Chinese characters).
        STYLING: Match the original font family, size, color, and orientation perfectly.
        ${areaRestriction}
        ${qualityNote}
        OUTPUT: Provide the modified image.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ inlineData: { mimeType, data } }, { text: finalPrompt }]
        },
        config: {
          imageConfig: {
            imageSize: geminiResolution as any,
          }
        }
      });

      if (response.candidates?.[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            results.push({
              originalId: img.id,
              originalName: img.name,
              dataUrl: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`
            });
          } else if (part.text) {
            combinedTextResponse += `[${img.name}] ${part.text}\n`;
          }
        }
      }
    } catch (error: any) {
      combinedTextResponse += `Error processing ${img.name}: ${error.message}\n`;
    }
  }

  return {
    textResponse: combinedTextResponse.trim() || "Batch translation complete.",
    generatedImages: results
  };
};
