package devPilot.backend.controllers;

import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/debug")
public class DebugController {

    private final ChatModel chatModel;
    private final EmbeddingModel embeddingModel;

    @Value("${GROQ_API_KEY:${app.groq.api-key:}}")
    private String groqApiKey;

    @Value("${OPENAI_API_KEY:}")
    private String openAiApiKey;

    public DebugController(ChatModel chatModel, EmbeddingModel embeddingModel) {
        this.chatModel = chatModel;
        this.embeddingModel = embeddingModel;
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getDebugStatus() {
        Map<String, Object> map = new HashMap<>();

        String gKey = (groqApiKey != null && !groqApiKey.isBlank()) ? groqApiKey.trim() : System.getenv("GROQ_API_KEY");
        map.put("groqApiKeyConfigured", gKey != null && !gKey.isBlank());
        map.put("groqApiKeyPrefix", (gKey != null && gKey.length() > 6) ? gKey.substring(0, 7) : "none");
        map.put("openaiApiKeyConfigured", openAiApiKey != null && !openAiApiKey.isBlank());

        // 1. Test embedding with python embedder
        try {
            float[] embed = embeddingModel.embed("test query");
            map.put("embeddingSuccess", true);
            map.put("embeddingDims", embed != null ? embed.length : 0);
        } catch (Exception e) {
            map.put("embeddingSuccess", false);
            map.put("embeddingError", e.getClass().getName() + ": " + e.getMessage());
        }

        // 2. Test chat completion with Groq
        try {
            String reply = chatModel.call("Say hello in one word");
            map.put("chatSuccess", true);
            map.put("chatReply", reply);
        } catch (Exception e) {
            map.put("chatSuccess", false);
            map.put("chatError", e.getClass().getName() + ": " + e.getMessage());
        }

        return ResponseEntity.ok(map);
    }
}
