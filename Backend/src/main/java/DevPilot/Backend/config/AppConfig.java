package devPilot.backend.config;

import java.util.concurrent.Executor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.client.RestClient;

import com.openai.client.OpenAIClient;
import com.openai.client.OpenAIClientAsync;
import com.openai.client.OpenAIClientAsyncImpl;
import com.openai.client.OpenAIClientImpl;
import com.openai.core.ClientOptions;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.OpenAiEmbeddingModel;
import org.springframework.ai.openai.OpenAiEmbeddingOptions;
import org.springframework.ai.openai.http.okhttp.SpringAiOpenAiHttpClient;

@Configuration
@EnableAsync
@EnableScheduling
public class AppConfig {

    private static final Logger log = LoggerFactory.getLogger(AppConfig.class);

    @Bean
    RestClient.Builder restClientBuilder() {
        return RestClient.builder();
    }

    @Bean(name = "indexingExecutor")
    Executor indexingExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("index-");
        executor.initialize();
        return executor;
    }

    /**
     * Dedicated Groq ChatModel using Groq's blazing-fast OpenAI-compatible API.
     * Uses model llama-3.1-8b-instant.
     */
    @Bean
    @Primary
    public ChatModel chatModel(@Value("${app.groq.api-key:${GROQ_API_KEY:}}") String groqApiKey) {
        String key = (groqApiKey != null) ? groqApiKey.trim() : "";
        log.info("Configuring Groq ChatModel (llama-3.1-8b-instant). Key length: {}", key.length());

        ClientOptions clientOptions = ClientOptions.builder()
                .baseUrl("https://api.groq.com/openai/v1")
                .apiKey(key)
                .httpClient(SpringAiOpenAiHttpClient.builder().build())
                .build();

        OpenAIClient syncClient = new OpenAIClientImpl(clientOptions);
        OpenAIClientAsync asyncClient = new OpenAIClientAsyncImpl(clientOptions);

        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .model("llama-3.1-8b-instant")
                .build();

        return OpenAiChatModel.builder()
                .openAiClient(syncClient)
                .openAiClientAsync(asyncClient)
                .options(options)
                .build();
    }

    /**
     * Dedicated Python Embedder EmbeddingModel targeting the external Python FastAPI service.
     * Generates 384-dimensional embeddings using all-MiniLM-L6-v2.
     */
    @Bean
    @Primary
    public EmbeddingModel embeddingModel(
            @Value("${app.embedder.base-url:${EMBEDDER_URL:https://embedder-production-f633.up.railway.app}}") String embedderUrl) {
        String url = (embedderUrl != null && !embedderUrl.isBlank())
                ? embedderUrl.trim()
                : "https://embedder-production-f633.up.railway.app";
        log.info("Configuring Python EmbeddingModel (all-MiniLM-L6-v2, 384 dims) targeting: {}", url);

        ClientOptions clientOptions = ClientOptions.builder()
                .baseUrl(url)
                .apiKey("dummy-key")
                .httpClient(SpringAiOpenAiHttpClient.builder().build())
                .build();

        OpenAIClient syncClient = new OpenAIClientImpl(clientOptions);

        OpenAiEmbeddingOptions options = OpenAiEmbeddingOptions.builder()
                .model("all-MiniLM-L6-v2")
                .dimensions(384)
                .build();

        return OpenAiEmbeddingModel.builder()
                .openAiClient(syncClient)
                .options(options)
                .build();
    }
}
