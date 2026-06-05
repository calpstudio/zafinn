// ZAFINN — Edge Function: Proxy para API Claude
// Suporta texto simples e arquivos (PDF, imagem) via Vision
// Deploy: Supabase Dashboard > Edge Functions > ai-analyze

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { apiKey, prompt, model, fileBase64, mimeType } = await req.json();

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: { message: "apiKey é obrigatório" } }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    let messages;

    if (fileBase64 && mimeType) {
      // Requisição com arquivo (PDF ou imagem)
      const isImage = mimeType.startsWith("image/");

      const fileBlock = isImage
        ? { type: "image", source: { type: "base64", media_type: mimeType, data: fileBase64 } }
        : { type: "document", source: { type: "base64", media_type: "application/pdf", data: fileBase64 } };

      messages = [{
        role: "user",
        content: [fileBlock, { type: "text", text: prompt }],
      }];
    } else {
      // Requisição somente texto
      messages = [{ role: "user", content: prompt }];
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: model || "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages,
      }),
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: { message: String(err) } }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
