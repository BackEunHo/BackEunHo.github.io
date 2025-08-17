---
title: "Race Condition과 해결 전략"
categories:
  - Computer Science
  - Concurrency
tags:
  - Race Condition
  - Java
  - Thread Safety
---

## Race Condition이란?

Race Condition(경쟁 상태)은 멀티스레드 환경에서 두 개 이상의 스레드가 공유 자원에 동시에 접근할 때, 실행 순서에 따라 결과가 달라지는 상황을 말합니다. 이는 프로그램의 예측 불가능성과 버그를 야기하는 주요 원인 중 하나입니다.

### Race Condition 발생 조건

Race Condition이 발생하기 위해서는 다음 세 가지 조건이 모두 만족되어야 합니다:

1. **Mutual Exclusion (상호 배제)**: 공유 자원이 존재
2. **Hold and Wait (점유 대기)**: 스레드가 자원을 점유한 상태에서 다른 자원을 기다림
3. **No Preemption (선점 불가)**: 다른 스레드가 강제로 자원을 빼앗을 수 없음

## Race Condition 시퀀스 다이어그램

다음은 재고 관리 시스템에서 발생하는 전형적인 Race Condition을 보여주는 시퀀스 다이어그램입니다

![Race Condition 시퀀스 다이어그램](/assets/img/posts/race-condition-sequence.webp)

*출처: [Phantom Reads & Race Condition on Database](https://levelup.gitconnected.com/phantom-reads-race-condition-on-database-45a2990efc97)*

### 다이어그램 설명

이 다이어그램은 두 사용자가 동시에 재고 1개인 상품을 구매하려고 할 때 발생하는 Race Condition을 보여줍니다:

1. **초기 상태**: 데이터베이스에 재고 1개 (`count: 1`)
2. **User 1**: 재고 확인 → 1개 확인 → 주문 가능 판단 → 재고 감소 요청
3. **User 2**: 동시에 재고 확인 → 1개 확인 → 주문 가능 판단 → 재고 감소 요청
4. **결과**: 두 사용자 모두 주문 성공했지만, 재고는 -1이 됨

이는 **Read-Modify-Write 패턴**이 원자적이지 않아서 발생하는 전형적인 Race Condition입니다.

### 이 문제의 해결 방법

#### 1. 데이터베이스 락 사용

**SQL 예시:**
```sql
-- 비관적 락 (Pessimistic Lock)
SELECT count FROM inventory WHERE item_id = ? FOR UPDATE;
UPDATE inventory SET count = count - 1 WHERE item_id = ?;

-- 원자적 연산
UPDATE inventory SET count = count - 1 WHERE item_id = ? AND count > 0;

-- 낙관적 락 (Optimistic Lock)
UPDATE inventory SET count = count - 1, version = version + 1 
WHERE item_id = ? AND version = ? AND count > 0;
```

**Spring Boot 예시:**

```java
@Service
@Transactional
public class InventoryService {
  
  @Autowired
  private InventoryRepository inventoryRepository;
  
  // 비관적 락 사용
  public boolean purchaseWithPessimisticLock(Long itemId, int quantity) {
    Inventory inventory = inventoryRepository.findByIdWithLock(itemId);
    
    if (inventory.getCount() >= quantity) {
      inventory.setCount(inventory.getCount() - quantity);
      inventoryRepository.save(inventory);
      return true;
    }
    return false;
  }
  
  // 원자적 연산 사용
  public boolean purchaseWithAtomicOperation(Long itemId, int quantity) {
    int updatedRows = inventoryRepository.decreaseCountIfAvailable(itemId, quantity);
    return updatedRows > 0;
  }
  
  // 낙관적 락 사용
  public boolean purchaseWithOptimisticLock(Long itemId, int quantity, int version) {
    try {
      int updatedRows = inventoryRepository.decreaseCountWithVersion(
        itemId, quantity, version);
      return updatedRows > 0;
    } catch (OptimisticLockingFailureException e) {
      // 버전 충돌 발생 시 재시도 로직
      return retryPurchase(itemId, quantity);
    }
  }
}
```

```java
@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Long> {
  
  // 비관적 락을 위한 쿼리
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT i FROM Inventory i WHERE i.id = :itemId")
  Inventory findByIdWithLock(@Param("itemId") Long itemId);
  
  // 원자적 연산을 위한 쿼리
  @Modifying
  @Query("UPDATE Inventory i SET i.count = i.count - :quantity " +
         "WHERE i.id = :itemId AND i.count >= :quantity")
  int decreaseCountIfAvailable(@Param("itemId") Long itemId, 
                              @Param("quantity") int quantity);
  
  // 낙관적 락을 위한 쿼리
  @Modifying
  @Query("UPDATE Inventory i SET i.count = i.count - :quantity, i.version = i.version + 1 " +
         "WHERE i.id = :itemId AND i.version = :version AND i.count >= :quantity")
  int decreaseCountWithVersion(@Param("itemId") Long itemId, 
                              @Param("quantity") int quantity, 
                              @Param("version") int version);
}
```

**비관적 락 (Pessimistic Lock)**은 데이터베이스 레벨에서 행을 잠그는 방식입니다. `FOR UPDATE` 절을 사용하여 특정 행에 대한 배타적 락을 획득하고, 다른 트랜잭션이 해당 행을 수정할 수 없도록 합니다. 이 방법은 데이터 일관성을 보장하지만, 락을 기다리는 동안 성능 저하가 발생할 수 있습니다.

**원자적 연산**은 단일 SQL 문으로 읽기와 쓰기를 동시에 수행하는 방식입니다. `UPDATE` 문의 `WHERE` 절에서 조건을 확인하고 동시에 값을 변경하므로, Race Condition을 방지할 수 있습니다. 이 방법은 성능이 우수하고 구현이 간단하지만, 복잡한 비즈니스 로직에는 적용하기 어렵습니다.

**낙관적 락 (Optimistic Lock)**은 버전 필드를 사용하여 데이터 변경을 추적하는 방식입니다. 트랜잭션이 시작될 때 버전을 읽고, 업데이트 시 버전이 변경되지 않았는지 확인합니다. 버전이 다르면 다른 트랜잭션이 데이터를 수정한 것이므로 재시도 로직을 수행합니다. 이 방법은 성능이 우수하지만 구현이 복잡하고 재시도 로직이 필요합니다.

#### 2. Spring의 @Transactional과 격리 수준 설정

```java
@Service
public class TransactionalInventoryService {
  
  @Autowired
  private InventoryRepository inventoryRepository;
  
  // SERIALIZABLE 격리 수준으로 Race Condition 방지
  @Transactional(isolation = Isolation.SERIALIZABLE)
  public boolean purchaseWithSerializable(Long itemId, int quantity) {
    Inventory inventory = inventoryRepository.findById(itemId)
      .orElseThrow(() -> new RuntimeException("상품을 찾을 수 없습니다."));
    
    if (inventory.getCount() >= quantity) {
      inventory.setCount(inventory.getCount() - quantity);
      inventoryRepository.save(inventory);
      return true;
    }
    return false;
  }
  
  // REPEATABLE_READ 격리 수준으로 Phantom Read 방지
  @Transactional(isolation = Isolation.REPEATABLE_READ)
  public boolean purchaseWithRepeatableRead(Long itemId, int quantity) {
    Inventory inventory = inventoryRepository.findById(itemId)
      .orElseThrow(() -> new RuntimeException("상품을 찾을 수 없습니다."));
    
    if (inventory.getCount() >= quantity) {
      inventory.setCount(inventory.getCount() - quantity);
      inventoryRepository.save(inventory);
      return true;
    }
    return false;
  }
}
```

**SERIALIZABLE 격리 수준**은 가장 엄격한 격리 수준으로, 트랜잭션들이 순차적으로 실행되는 것처럼 동작합니다. 이는 모든 Race Condition을 방지할 수 있지만, 성능 저하가 심각할 수 있습니다. 특히 동시성이 높은 환경에서는 사용을 피하는 것이 좋습니다.

**REPEATABLE_READ 격리 수준**은 트랜잭션 내에서 동일한 쿼리를 여러 번 실행해도 같은 결과를 보장합니다. Phantom Read는 방지하지만, 일부 Race Condition은 여전히 발생할 수 있습니다. 대부분의 경우에 적절한 성능과 일관성의 균형을 제공합니다.

### 해결 방법별 장단점

| 방법               | 장점                          | 단점                        | 사용 시기                 |
| ------------------ | ----------------------------- | --------------------------- | ------------------------- |
| **비관적 락**      | 데이터 일관성 보장, 구현 간단 | 성능 저하, 데드락 위험      | 높은 일관성이 필요한 경우 |
| **낙관적 락**      | 성능 우수, 데드락 없음        | 구현 복잡, 재시도 로직 필요 | 충돌이 적은 경우          |
| **원자적 연산**    | 성능 우수, 구현 간단          | 복잡한 로직 처리 어려움     | 단순한 증감 연산          |
| **격리 수준 조정** | 데이터베이스 레벨 보장        | 성능 영향, 복잡한 설정      | 데이터베이스 중심 해결    |

이러한 방법들을 상황에 맞게 선택하여 Race Condition을 효과적으로 방지할 수 있습니다.
