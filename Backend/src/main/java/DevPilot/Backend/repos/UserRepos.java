package DevPilot.Backend.repos;

import DevPilot.Backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepos extends JpaRepository<User, UUID> {
    Optional<User> findByGithubId(long githubId);
}
