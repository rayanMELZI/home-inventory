package com.homestock.meal;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.homestock.config.AppProperties;
import com.homestock.meal.MealDtos.Suggestion;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Asks the model what could be cooked, and insists on JSON.
 *
 * The reply is pinned to a response schema rather than parsed out of prose:
 * without it every third answer arrives wrapped in a paragraph of friendly
 * preamble and the screen has nothing reliable to render.
 */
@Component
public class MealSuggestClient {

    /** Shapes the reply. Anything not in here the model is not allowed to send. */
    private static final Map<String, Object> RESPONSE_SCHEMA = Map.of(
            "type", "ARRAY",
            "items", Map.of(
                    "type", "OBJECT",
                    "properties", Map.of(
                            "title", Map.of("type", "STRING"),
                            "minutes", Map.of("type", "INTEGER"),
                            "uses", Map.of("type", "ARRAY", "items", Map.of("type", "STRING")),
                            "missing", Map.of("type", "ARRAY", "items", Map.of("type", "STRING")),
                            "steps", Map.of("type", "ARRAY", "items", Map.of("type", "STRING"))),
                    "required", List.of("title", "minutes", "uses", "missing", "steps")));

    private final AppProperties props;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public MealSuggestClient(AppProperties props, ObjectMapper objectMapper) {
        this.props = props;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder()
                .baseUrl(props.meals().baseUrl())
                .requestFactory(requestFactory())
                .build();
    }

    private static ClientHttpRequestFactory requestFactory() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(10));
        // Generous: the model routinely takes twenty seconds to answer, and a
        // timeout here reads to the user as the feature being broken.
        factory.setReadTimeout(Duration.ofSeconds(45));
        return factory;
    }

    public boolean isEnabled() {
        String key = props.meals().apiKey();
        return key != null && !key.isBlank();
    }

    /** Throws on any transport or parse failure; the caller turns that into a message. */
    public List<Suggestion> suggest(String prompt) {
        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "responseSchema", RESPONSE_SCHEMA));

        String raw = restClient.post()
                .uri("/models/{model}:generateContent?key={key}",
                        props.meals().model(), props.meals().apiKey())
                .body(body)
                .retrieve()
                .body(String.class);

        return parse(raw);
    }

    private List<Suggestion> parse(String raw) {
        JsonNode root = objectMapper.readTree(raw);
        JsonNode text = root.path("candidates").path(0).path("content").path("parts").path(0)
                .path("text");
        if (text.isMissingNode()) {
            throw new IllegalStateException("The model returned no content");
        }

        JsonNode parsed = objectMapper.readTree(text.stringValue());
        List<Suggestion> suggestions = new ArrayList<>();
        for (JsonNode node : parsed) {
            suggestions.add(new Suggestion(
                    node.path("title").stringValue(),
                    node.path("minutes").asInt(),
                    strings(node.path("uses")),
                    strings(node.path("missing")),
                    strings(node.path("steps"))));
        }
        return suggestions;
    }

    private static List<String> strings(JsonNode array) {
        List<String> values = new ArrayList<>();
        for (JsonNode node : array) {
            values.add(node.stringValue());
        }
        return values;
    }
}
