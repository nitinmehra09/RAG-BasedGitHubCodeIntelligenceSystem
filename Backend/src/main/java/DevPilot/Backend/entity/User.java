package DevPilot.Backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "github_id", unique = true, nullable = false)
    private long githubId;

    @Column(name = "github_username", unique = true, nullable = false)
    private String githubUsername;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "access_token", columnDefinition = "TEXT", nullable = false)
    private String accessToken;

    @Column(name = "token_scope", length = 500)
    private String tokenScopes;

    @Column(name = "create_time", updatable = false, nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate(){
        if(createdAt == null){
            createdAt = Instant.now();
        }
    }

}
