---
title: "비동기 환경에서 컨텍스트 정보 전달 전략"
categories:
  - Java
  - Spring Framework
  - Concurrency
tags:
  - MDC
  - SecurityContext
  - ThreadLocal
  - Async
  - Context Propagation
---

## 비동기 환경에서 컨텍스트 정보 전달의 문제점

비동기 환경에서는 스레드가 변경되면서 ThreadLocal에 저장된 컨텍스트 정보가 손실되는 문제가 발생합니다. 이는 로깅, 보안, 트랜잭션 추적 등에서 심각한 문제를 야기할 수 있습니다.

### ThreadLocal과 컨텍스트 정보

ThreadLocal은 각 스레드별로 독립적인 변수를 저장할 수 있는 Java의 기능입니다. 이를 통해 다음과 같은 컨텍스트 정보들을 관리합니다:

1. **MDC (Mapped Diagnostic Context)**: 로깅 시 요청별 식별자, 사용자 정보 등
2. **SecurityContext**: 인증/인가 정보
3. **TransactionContext**: 트랜잭션 정보
4. **RequestContext**: HTTP 요청 정보

### 문제 발생 원인

동기 환경에서는 하나의 요청이 하나의 스레드에서 처리되므로 ThreadLocal에 저장된 정보가 요청 전체에서 유지됩니다. 하지만 비동기 환경에서는 다음과 같은 상황이 발생합니다:

1. **스레드 전환**: 비동기 작업이 다른 스레드에서 실행됨
2. **컨텍스트 손실**: 원본 스레드의 ThreadLocal 정보가 새 스레드에 전달되지 않음
3. **추적 어려움**: 로그에서 요청별 추적이 불가능해짐

## 해결 전략의 핵심 개념

### 1. 컨텍스트 전달 패턴

컨텍스트 정보를 비동기 작업에 전달하는 방법은 크게 세 가지 패턴으로 나눌 수 있습니다:

#### 1.1 수동 전달 패턴

수동 전달 패턴은 개발자가 직접 컨텍스트 정보를 복사하고 복원하는 방법입니다. 이 패턴의 핵심은 다음과 같습니다:

**기본 원리**
- 현재 스레드의 ThreadLocal 정보를 Map 형태로 복사
- 비동기 작업 시작 시점에 새 스레드에 컨텍스트 정보 복원
- 작업 완료 후 컨텍스트 정보 정리

**장점**
- **직관적**: 컨텍스트 전달 과정을 명확히 이해할 수 있음
- **유연성**: 필요한 컨텍스트만 선택적으로 전달 가능
- **제어 가능**: 전달 시점과 정리 시점을 세밀하게 제어

**단점**
- **코드 중복**: 매번 동일한 패턴의 코드를 반복 작성
- **실수 가능성**: 컨텍스트 정리 누락으로 인한 메모리 누수 위험
- **유지보수성**: 비동기 작업이 많아질수록 관리가 어려워짐

**적용 시나리오**
- 소규모 프로젝트나 프로토타입
- 특별한 컨텍스트 전달 로직이 필요한 경우
- 기존 코드에 최소한의 변경으로 적용하고 싶은 경우

**구현 예시**

```java
@Service
public class UserService {
  
  public CompletableFuture<User> getUserAsync(Long id) {
    // 현재 MDC 정보 복사
    Map<String, String> mdcContext = MDC.getCopyOfContextMap();
    SecurityContext securityContext = SecurityContextHolder.getContext();
    
    return CompletableFuture.supplyAsync(() -> {
      try {
        // 새 스레드에서 컨텍스트 정보 복원
        if (mdcContext != null) {
          MDC.setContextMap(mdcContext);
        }
        if (securityContext != null) {
          SecurityContextHolder.setContext(securityContext);
        }
        
        log.info("비동기 사용자 정보 조회 시작");
        User user = userRepository.findById(id)
          .orElseThrow(() -> new UserNotFoundException(id));
        
        log.info("비동기 사용자 정보 조회 완료");
        return user;
      } finally {
        // 컨텍스트 정리
        MDC.clear();
        SecurityContextHolder.clearContext();
      }
    });
  }
}
```

**주의사항**
- 컨텍스트 복사 시점과 복원 시점을 정확히 파악해야 함
- finally 블록에서 반드시 컨텍스트를 정리해야 메모리 누수 방지
- SecurityContext는 스레드 안전하지 않을 수 있으므로 주의 필요

#### 1.2 자동화 패턴

자동화 패턴은 프레임워크나 유틸리티를 사용하여 컨텍스트 전달을 자동화하는 방법입니다. 이 패턴의 핵심은 다음과 같습니다:

**Spring TaskDecorator 활용**
- Spring의 TaskDecorator 인터페이스를 구현하여 비동기 작업 실행 전후에 자동으로 컨텍스트 설정/정리
- ThreadPoolTaskExecutor에 TaskDecorator를 설정하여 모든 비동기 작업에 적용
- @Async 어노테이션이 적용된 메서드에 자동으로 컨텍스트 전달

**유틸리티 클래스 패턴**
- 재사용 가능한 유틸리티 메서드로 컨텍스트 전달 로직 캡슐화
- CompletableFuture, Runnable, Callable 등 다양한 비동기 작업 타입 지원
- 람다 표현식과 함께 사용하여 코드 가독성 향상

**AOP(Aspect-Oriented Programming) 활용**
- AspectJ를 사용하여 @Async 어노테이션이 적용된 메서드에 자동으로 컨텍스트 전달
- 비즈니스 로직과 컨텍스트 전달 로직을 분리하여 관심사 분리 실현
- 설정 기반으로 컨텍스트 전달 범위 제어 가능

**장점**
- **일관성**: 모든 비동기 작업에서 동일한 컨텍스트 전달 로직 적용
- **유지보수성**: 중앙화된 컨텍스트 전달 로직으로 관리 용이
- **안정성**: 컨텍스트 정리 누락 위험 최소화
- **확장성**: 새로운 컨텍스트 타입 추가 시 유틸리티만 수정

**단점**
- **학습 곡선**: 프레임워크나 유틸리티 사용법 학습 필요
- **디버깅 복잡성**: 자동화된 로직으로 인한 디버깅 어려움
- **성능 오버헤드**: 모든 비동기 작업에 적용되어 불필요한 오버헤드 발생 가능

**적용 시나리오**
- 대규모 프로젝트나 팀 프로젝트
- 일관된 컨텍스트 전달이 중요한 경우
- 코드 품질과 유지보수성을 우선시하는 경우

**구현 예시**

**1. Spring TaskDecorator 활용**

```java
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {
  
  @Override
  public Executor getAsyncExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(10);
    executor.setMaxPoolSize(20);
    executor.setQueueCapacity(500);
    executor.setThreadNamePrefix("Async-");
    executor.setTaskDecorator(new ContextTaskDecorator());
    executor.initialize();
    return executor;
  }
}

public class ContextTaskDecorator implements TaskDecorator {
  
  @Override
  public Runnable decorate(Runnable runnable) {
    SecurityContext securityContext = SecurityContextHolder.getContext();
    Map<String, String> mdcContext = MDC.getCopyOfContextMap();
    
    return () -> {
      try {
        SecurityContextHolder.setContext(securityContext);
        if (mdcContext != null) {
          MDC.setContextMap(mdcContext);
        }
        runnable.run();
      } finally {
        SecurityContextHolder.clearContext();
        MDC.clear();
      }
    };
  }
}
```

**2. 유틸리티 클래스 패턴**

```java
public class ContextPropagationUtil {
  
  public static <T> CompletableFuture<T> withContext(
      Supplier<T> supplier, 
      Executor executor) {
    
    Map<String, String> mdcContext = MDC.getCopyOfContextMap();
    SecurityContext securityContext = SecurityContextHolder.getContext();
    
    return CompletableFuture.supplyAsync(() -> {
      try {
        if (mdcContext != null) {
          MDC.setContextMap(mdcContext);
        }
        if (securityContext != null) {
          SecurityContextHolder.setContext(securityContext);
        }
        return supplier.get();
      } finally {
        MDC.clear();
        SecurityContextHolder.clearContext();
      }
    }, executor);
  }
  
  public static CompletableFuture<Void> withContext(
      Runnable runnable, 
      Executor executor) {
    
    Map<String, String> mdcContext = MDC.getCopyOfContextMap();
    SecurityContext securityContext = SecurityContextHolder.getContext();
    
    return CompletableFuture.runAsync(() -> {
      try {
        if (mdcContext != null) {
          MDC.setContextMap(mdcContext);
        }
        if (securityContext != null) {
          SecurityContextHolder.setContext(securityContext);
        }
        runnable.run();
      } finally {
        MDC.clear();
        SecurityContextHolder.clearContext();
      }
    }, executor);
  }
}
```

**3. AOP 활용**

```java
@Aspect
@Component
public class AsyncContextAspect {
  
  @Around("@annotation(org.springframework.scheduling.annotation.Async)")
  public Object propagateContext(ProceedingJoinPoint joinPoint) throws Throwable {
    Map<String, String> mdcContext = MDC.getCopyOfContextMap();
    SecurityContext securityContext = SecurityContextHolder.getContext();
    
    try {
      if (mdcContext != null) {
        MDC.setContextMap(mdcContext);
      }
      if (securityContext != null) {
        SecurityContextHolder.setContext(securityContext);
      }
      return joinPoint.proceed();
    } finally {
      MDC.clear();
      SecurityContextHolder.clearContext();
    }
  }
}
```

**사용 예시**

```java
@Service
public class UserService {
  
  @Autowired
  private Executor asyncExecutor;
  
  // TaskDecorator가 자동으로 적용됨
  @Async
  public CompletableFuture<User> getUserAsync(Long id) {
    log.info("비동기 사용자 정보 조회 시작");
    User user = userRepository.findById(id)
      .orElseThrow(() -> new UserNotFoundException(id));
    log.info("비동기 사용자 정보 조회 완료");
    return CompletableFuture.completedFuture(user);
  }
  
  // 유틸리티 클래스 사용
  public CompletableFuture<List<Order>> getUserOrdersAsync(Long id) {
    return ContextPropagationUtil.withContext(() -> {
      log.info("비동기 주문 정보 조회 시작");
      List<Order> orders = orderRepository.findByUserId(id);
      log.info("비동기 주문 정보 조회 완료");
      return orders;
    }, asyncExecutor);
  }
}
```

**설정 및 주의사항**
- TaskDecorator는 모든 @Async 메서드에 자동 적용됨
- 유틸리티 클래스는 명시적으로 호출해야 함
- AOP는 @Async 어노테이션이 있는 메서드에만 적용됨
- 성능 오버헤드를 고려하여 필요한 경우에만 사용

#### 1.3 프레임워크 지원 패턴
Spring WebFlux의 ReactiveSecurityContextHolder나 Micrometer의 ContextPropagation 같은 프레임워크 레벨에서 제공하는 기능을 활용하는 방법입니다.

## 성능과 메모리 고려사항

### 1. 컨텍스트 전달 오버헤드

컨텍스트 정보를 전달할 때 발생하는 성능 영향은 다음과 같습니다:

#### 1.1 메모리 사용량
- **Map 복사**: MDC 컨텍스트 복사로 인한 메모리 할당
- **객체 참조**: SecurityContext 복사로 인한 메모리 증가
- **ThreadLocal 정리**: 적절한 메모리 해제 필요

#### 1.2 CPU 오버헤드
- **컨텍스트 복사**: Map 복사 연산 비용
- **스레드 전환**: 컨텍스트 설정/정리 연산
- **동기화**: 멀티스레드 환경에서의 동기화 비용

### 2. 최적화 전략

#### 2.1 조건부 전달
빈 컨텍스트인 경우 전달하지 않아 불필요한 오버헤드를 줄일 수 있습니다.

#### 2.2 객체 재사용
컨텍스트 정보를 불변 객체로 캐싱하여 메모리 사용량을 최적화할 수 있습니다.

#### 2.3 비동기 풀 관리
적절한 스레드 풀 크기와 큐 크기를 설정하여 리소스 사용을 최적화할 수 있습니다.

## 모니터링과 디버깅 전략

### 1. 로그 추적

#### 1.1 로그 패턴 설계
요청별 식별자와 사용자 정보를 포함한 로그 패턴을 설계하여 추적성을 향상시킬 수 있습니다.

#### 1.2 컨텍스트 정보 확인
AOP나 인터셉터를 사용하여 비동기 작업 실행 시점의 컨텍스트 정보를 로깅할 수 있습니다.

### 2. 성능 모니터링

#### 2.1 메트릭 수집
- **컨텍스트 전달 시간**: 전달에 소요되는 시간 측정
- **메모리 사용량**: 컨텍스트 관련 메모리 사용량 모니터링
- **스레드 풀 상태**: 비동기 작업 처리 상태 확인

#### 2.2 알림 설정
컨텍스트 전달 실패나 성능 저하 시 적절한 알림을 설정할 수 있습니다.
## 결론

비동기 환경에서 컨텍스트 정보를 전달하는 것은 복잡하지만 중요한 작업입니다. 적절한 전략을 선택하여 로깅, 보안, 모니터링의 일관성을 유지해야 합니다.

### 핵심 고려사항

1. **아키텍처 선택**: 동기 vs 비동기, 리액티브 vs 명령형
2. **성능 최적화**: 컨텍스트 전달 오버헤드 최소화
3. **메모리 관리**: 적절한 컨텍스트 정리와 메모리 해제
4. **모니터링**: 컨텍스트 전달 상태와 성능 지표 수집

### 권장사항

1. **Spring의 TaskDecorator 활용**: 가장 표준적이고 안정적인 방법
2. **유틸리티 클래스 작성**: 재사용 가능한 컨텍스트 전달 로직
3. **성능 모니터링**: 컨텍스트 전달로 인한 오버헤드 측정
4. **테스트 코드 작성**: 컨텍스트 전달이 올바르게 동작하는지 검증

이러한 방법들을 통해 비동기 환경에서도 일관된 컨텍스트 정보를 유지할 수 있습니다.

