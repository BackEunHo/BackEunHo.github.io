---
title: Spring Cache에서 @Cacheable, @CachePut, @CacheEvict의 차이점과 활용법
categories:
  - Spring Boot
  - Cache
tags:
  - Spring Cache
toc: true
toc_sticky: true 
---

## 주제

Spring Cache에서 @Cacheable, @CachePut, @CacheEvict는 어떤 차이점이 있고 각각 어떤 상황에서 사용하는 것이 적절한가?

## 문제

위의 질문에 대한 해결책을 찾기 위해 디스코드와 같은 메신저 웹페이지에서 발생할 수 있는 성능 문제에 Spring Cache를 적용했을 때를 상정하곘습니다.

디스코드와 같은 메신저 웹페이지에서 다음과 같은 성능 문제들이 발생할 수 있습니다:

1. **사용자 프로필 조회**: 자주 조회되는 사용자 정보를 매번 데이터베이스에서 가져오는 비효율성
2. **채널 목록 조회**: 서버의 채널 정보가 자주 변경되지 않음에도 불구하고 반복적인 데이터베이스 쿼리
3. **메시지 히스토리**: 최근 메시지들은 자주 조회되지만 데이터베이스 부하가 큼
4. **사용자 권한 확인**: 매번 권한을 확인하는 오버헤드
5. **캐시 무효화**: 사용자 정보나 권한이 변경되었을 때 캐시를 적절히 갱신해야 함


## 접근 방식

다음과 같이 Spring Cache의 세 가지 어노테이션을 활용하겠습니다:

1. **@Cacheable**: 자주 조회되는 데이터를 캐시에 저장하여 반복적인 데이터베이스 접근 방지
2. **@CachePut**: 데이터가 업데이트될 때마다 캐시를 갱신하여 최신 상태 유지
3. **@CacheEvict**: 더 이상 유효하지 않은 데이터를 캐시에서 제거하여 메모리 효율성 확보

적용할 도메인은 UserSerivce, ChannelService, MessageService, CacheManager입니다.

## 코드

### 1. 사용자 서비스 클래스

```java
@Service
@CacheConfig(cacheNames = "users")
public class UserService {

  @Autowired
  private UserRepository userRepository;

  @Autowired
  private PermissionRepository permissionRepository;

  // 사용자 조회 - 캐시에서 먼저 확인
  @Cacheable(key = "#userId", unless = "#result == null")
  public User getUserById(Long userId) {
    log.info("데이터베이스에서 사용자 조회: {}", userId);
    return userRepository.findById(userId)
        .orElseThrow(() -> new UserNotFoundException("사용자를 찾을 수 없습니다: " + userId));
  }

  // 사용자 정보 업데이트 - 캐시 갱신 (리턴된 ID 기준)
  @CachePut(key = "#result.id")
  public User updateUser(User user) {
    log.info("사용자 정보 업데이트: {}", user.getId());
    return userRepository.save(user);
  }

  // 사용자 삭제 - 캐시에서 제거
  @CacheEvict(key = "#userId")
  public void deleteUser(Long userId) {
    log.info("사용자 삭제: {}", userId);
    userRepository.deleteById(userId);
  }

  // 사용자 권한 조회 - 별도의 캐시 사용
  @Cacheable(cacheNames = "permissions", key = "#userId", unless = "#result.isEmpty()")
  public List<Permission> getUserPermissions(Long userId) {
    log.info("데이터베이스에서 권한 조회: {}", userId);
    return permissionRepository.findByUserId(userId);
  }
}

```

### 2. 채널 서비스 클래스

```java
@Service
@CacheConfig(cacheNames = "channels")
public class ChannelService {

  @Autowired
  private ChannelRepository channelRepository;

  // 채널 목록 조회 - 자주 변경되지 않는 데이터 캐시
  @Cacheable(key = "'all'", unless = "#result.isEmpty()")
  public List<Channel> getAllChannels() {
    log.info("데이터베이스에서 모든 채널 조회");
    return channelRepository.findAll();
  }

  // 특정 채널 조회
  @Cacheable(key = "#channelId", unless = "#result == null")
  public Channel getChannelById(Long channelId) {
    log.info("데이터베이스에서 채널 조회: {}", channelId);
    return channelRepository.findById(channelId)
        .orElseThrow(() -> new ChannelNotFoundException("채널을 찾을 수 없습니다: " + channelId));
  }

  // 채널 생성 + 캐시 갱신 + 전체 목록 무효화
  @Caching(
    put = @CachePut(key = "#result.id"),
    evict = @CacheEvict(key = "'all'")
  )
  public Channel createChannel(Channel channel) {
    log.info("새 채널 생성: {}", channel.getName());
    return channelRepository.save(channel);
  }

  // 채널 정보 업데이트 + 캐시 갱신 + 전체 목록 무효화
  @Caching(
    put = @CachePut(key = "#result.id"),
    evict = @CacheEvict(key = "'all'")
  )
  public Channel updateChannel(Channel channel) {
    log.info("채널 정보 업데이트: {}", channel.getId());
    return channelRepository.save(channel);
  }

  // 채널 삭제 + 캐시 제거 + 전체 목록 무효화
  @Caching(
    evict = {
      @CacheEvict(key = "#channelId"),
      @CacheEvict(key = "'all'")
    }
  )
  public void deleteChannel(Long channelId) {
    log.info("채널 삭제: {}", channelId);
    channelRepository.deleteById(channelId);
  }
}

```

### 3. 메시지 서비스 클래스

```java
@Service
@CacheConfig(cacheNames = "messages")
public class MessageService {

  @Autowired
  private MessageRepository messageRepository;

  // 최근 메시지 조회 - 캐시 활용
  @Cacheable(key = "'recent:' + #channelId + ':' + #limit", unless = "#result.isEmpty()")
  public List<Message> getRecentMessages(Long channelId, int limit) {
    log.info("데이터베이스에서 최근 메시지 조회: 채널 {}, 개수 {}", channelId, limit);
    return messageRepository.findRecentMessagesByChannelId(channelId, limit);
  }

  // 새 메시지 생성 → 개별 메시지 캐시 갱신 + 해당 채널 최근 메시지 전체 무효화
  @Caching(
    put = @CachePut(key = "#result.id"),
    evict = @CacheEvict(allEntries = true) // 단순화 (prefix 기반 삭제는 Spring Cache에서 불가)
  )
  public Message createMessage(Message message) {
    log.info("새 메시지 생성: 채널 {}", message.getChannelId());
    return messageRepository.save(message);
  }

  // 메시지 수정 → 캐시 갱신 + 최근 메시지 무효화
  @Caching(
    put = @CachePut(key = "#result.id"),
    evict = @CacheEvict(allEntries = true)
  )
  public Message updateMessage(Message message) {
    log.info("메시지 수정: {}", message.getId());
    return messageRepository.save(message);
  }

  // 메시지 삭제 → 캐시 제거 + 최근 메시지 무효화
  @Caching(
    evict = {
      @CacheEvict(key = "#messageId"),
      @CacheEvict(allEntries = true)
    }
  )
  public void deleteMessage(Long messageId, Long channelId) {
    log.info("메시지 삭제: {}", messageId);
    messageRepository.deleteById(messageId);
  }
}

```

### 4. 캐시 설정 클래스

```java
@Configuration
@EnableCaching
public class CacheConfig {

  @Bean
  public CacheManager cacheManager() {
    SimpleCacheManager cacheManager = new SimpleCacheManager();

    List<Cache> caches = Arrays.asList(
        new ConcurrentMapCache("users"),
        new ConcurrentMapCache("channels"),
        new ConcurrentMapCache("messages"),
        new ConcurrentMapCache("permissions")
    );

    cacheManager.setCaches(caches);
    return cacheManager;
  }
}
```

## 해설

### @Cacheable
- **용도**: 메서드 결과를 캐시에 저장하고, 동일한 파라미터로 호출 시 캐시된 결과 반환
- **사용 시기**: 자주 조회되지만 자주 변경되지 않는 데이터 (사용자 프로필, 채널 정보, 권한 등)
- **장점**: 데이터베이스 부하 감소, 응답 속도 향상
- **주의사항**: `unless` 조건으로 null 값은 캐시하지 않도록 설정

### @CachePut
- **용도**: 메서드 실행 후 결과를 캐시에 저장/갱신
- **사용 시기**: 데이터가 생성/수정된 후 최신 상태를 캐시에 반영해야 할 때
- **장점**: 캐시와 데이터베이스의 일관성 유지
- **주의사항**: 메서드가 항상 실행되므로 캐시 조회용으로는 사용하지 않음

### @CacheEvict
- **용도**: 특정 키 또는 전체 캐시를 무효화
- **사용 시기**: 데이터가 삭제되거나 더 이상 유효하지 않을 때
- **장점**: 메모리 효율성, 데이터 일관성 유지
- **주의사항**: 와일드카드(`*`)를 사용할 때는 주의가 필요

### 캐시 전략
1. **사용자 데이터**: 개별 사용자별로 캐시, 업데이트 시 즉시 갱신
2. **채널 데이터**: 전체 목록과 개별 채널을 별도로 캐시, 변경 시 관련 캐시 모두 무효화
3. **메시지 데이터**: 최근 메시지만 캐시하여 메모리 사용량 제한
4. **권한 데이터**: 사용자별로 캐시하여 반복적인 권한 확인 방지

## 결론

- `@Cacheable`: 읽기 전용 데이터의 반복 조회 방지
- `@CachePut`: 데이터 변경 후 캐시 일관성 유지
- `@CacheEvict`: 무효한 데이터의 메모리 정리

