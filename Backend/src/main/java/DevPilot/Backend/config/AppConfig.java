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
import okhttp3.Request;
import okhttp3.Response;

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
            HttpUrl url = request.url();

            // Guard against any Gemini URL missing /v1beta/openai prefix
            if ("generativelanguage.googleapis.com".equalsIgnoreCase(url.host())) {
                String path = url.encodedPath();
                if (!path.startsWith("/v1beta/openai")) {
                    HttpUrl rewrittenUrl = url.newBuilder()
                            .encodedPath("/v1beta/openai/chat/completions")
                            .build();
                    log.info("Rewrote Gemini URL from {} to {}", url, rewrittenUrl);
                    request = request.newBuilder().url(rewrittenUrl).build();
                }
            }


            log.info("AI HTTP request: {} {}", request.method(), request.url());
            Response response = chain.proceed(request);
            if (!response.isSuccessful()) {
                log.warn("AI HTTP response returned code {}: {}", response.code(), request.url());
            }
            return response;
        });
    }
}

