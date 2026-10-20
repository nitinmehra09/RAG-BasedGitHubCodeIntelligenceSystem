package devPilot.backend.config;

import java.util.concurrent.Executor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.openai.http.okhttp.OpenAiHttpClientBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.client.RestClient;

import okhttp3.HttpUrl;
import okhttp3.MediaType;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okio.Buffer;
import java.io.IOException;

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

    @Bean
    OpenAiHttpClientBuilderCustomizer openAiHttpClientCustomizer() {
        return builder -> builder.interceptor(chain -> {
            Request request = chain.request();
            String authHeader = request.header("Authorization");
            String apiKey = (authHeader != null && authHeader.startsWith("Bearer "))
                    ? authHeader.substring(7).trim() : "";

            HttpUrl groqUrl = HttpUrl.parse("https://api.groq.com/openai/v1/chat/completions");
            Request.Builder reqBuilder = request.newBuilder().url(groqUrl);

            // Ensure model is set to llama-3.1-8b-instant
            RequestBody body = request.body();
            if (body != null) {
                try {
                    Buffer buffer = new Buffer();
                    body.writeTo(buffer);
                    String bodyStr = buffer.readUtf8();
                    if (!bodyStr.contains("\"llama-3.1-8b-instant\"")) {
                        String updatedBody = bodyStr.replaceAll("\"model\"\\s*:\\s*\"[^\"]+\"", "\"model\":\"llama-3.1-8b-instant\"");
                        MediaType contentType = body.contentType();
                        reqBuilder.method(request.method(), RequestBody.create(updatedBody, contentType));
                    }
                } catch (IOException e) {
                    log.warn("Failed to rewrite model in request body: {}", e.getMessage());
                }
            }

            Request finalRequest = reqBuilder.build();
            log.info("AI HTTP Request [Groq]: {} {}", finalRequest.method(), finalRequest.url());
            Response response = chain.proceed(finalRequest);
            log.info("AI HTTP Response [Groq]: status={} for {}", response.code(), finalRequest.url());
            return response;
        });
    }
}


