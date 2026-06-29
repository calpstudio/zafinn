// ZAFINN — Edge Function: Proxy para API Claude
// Suporta texto simples, arquivos (PDF, imagem), chat com histórico e system prompt
// Deploy: Supabase Dashboard > Edge Functions > ai-analyze

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
declare const Deno: { env: { get(key: string): string | undefined } };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { apiKey: clientKey, prompt, model, fileBase64, mimeType, messages: historyMessages, systemPrompt } = await req.json();

    // Usa chave do cliente se fornecida, senão usa secret do ambiente
    const apiKey = clientKey || Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: { message: "Chave da API não configurada. Adicione em Configurações ou peça ao administrador." } }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    let messages;

    if (historyMessages && Array.isArray(historyMessages)) {
      // Modo chat: usa histórico de mensagens passado
      messages = historyMessages;
    } else if (fileBase64 && mimeType) {
      // Modo arquivo: PDF ou imagem
      const isImage = mimeType.startsWith("image/");
      const fileBlock = isImage
        ? { type: "image", source: { type: "base64", media_type: mimeType, data: fileBase64 } }
        : { type: "document", source: { type: "base64", media_type: "application/pdf", data: fileBase64 } };

      messages = [{
        role: "user",
        content: [fileBlock, { type: "text", text: prompt }],
      }];
    } else {
      // Modo texto simples
      messages = [{ role: "user", content: prompt }];
    }

    const isPdf = fileBase64 && mimeType === "application/pdf";
    const anthropicHeaders: Record<string, string> = {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    };
    if (isPdf) {
      anthropicHeaders["anthropic-beta"] = "pdfs-2024-09-25";
    }

    const body: Record<string, unknown> = {
      model: model || "claude-haiku-4-5-20251001",
      max_tokens: 8192,
      messages,
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: anthropicHeaders,
      body: JSON.stringify(body),
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
