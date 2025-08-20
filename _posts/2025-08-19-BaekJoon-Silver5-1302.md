---
title: "백준 1302번: 베스트셀러"
categories:
  - Algorithm
  - BaekJoon
tags:
  - String
  - Hash
toc: true
toc_sticky: true
---

## 문제

김형택은 탑문고의 직원이다. 김형택은 계산대에서 계산을 하는 직원이다. 김형택은 그날 근무가 끝난 후에, 오늘 판매한 책의 제목을 보면서 가장 많이 팔린 책의 제목을 칠판에 써놓는 일도 같이 하고 있다.

오늘 하루 동안 팔린 책의 제목이 입력으로 들어왔을 때, 가장 많이 팔린 책의 제목을 출력하는 프로그램을 작성하시오.

## 입력

첫째 줄에 오늘 하루 동안 팔린 책의 개수 N이 주어진다. 이 값은 1,000보다 작거나 같은 자연수이다. 둘째부터 N개의 줄에 책의 제목이 입력으로 들어온다. 책의 제목의 길이는 50보다 작거나 같고, 알파벳 소문자로만 이루어져 있다.

## 출력

첫째 줄에 가장 많이 팔린 책의 제목을 출력한다. 만약 가장 많이 팔린 책이 여러 개일 경우에는 사전 순으로 가장 앞서는 제목을 출력한다.

## 예제

### 입력 예제 1
```
5
top
top
top
top
kimtop
```

### 출력 예제 1
```
top
```

### 입력 예제 2
```
9
table
chair
table
table
lamp
door
lamp
table
chair
```

### 출력 예제 2
```
table
```

### 입력 예제 3
```
6
a
a
a
b
b
b
```

### 출력 예제 3
```
a
```

### 입력 예제 4
```
8
icecream
peanuts
peanuts
chocolate
candy
chocolate
icecream
apple
```

### 출력 예제 4
```
chocolate
```

### 입력 예제 5
```
1
soul
```

### 출력 예제 5
```
soul
```

## 문제 풀이

### 접근 방법

**해시맵(HashMap) 활용**: 각 책의 제목을 키로 하고, 판매 횟수를 값으로 하는 해시맵을 사용하여 빈도를 카운트.
   - **HashMap 선택 이유**: 
     - 평균 O(1) 시간복잡도로 삽입/조회가 가능
     - 해시 함수를 사용하여 빠른 접근
     - 순서가 보장되지 않지만 이 문제에서는 순서가 중요하지 않음
   - **다른 Map 구현체들**: TreeMap(정렬된 순서), LinkedHashMap(삽입 순서) 등이 있지만, 이 문제에서는 순서가 중요하지 않기 떄문에 HashMap을 선택

### 구현 코드

```java

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        ArrayList<String> cntArrayList = new ArrayList<>();
        HashMap<String, Integer> bookList = new HashMap<>();

        for (int i = 0; i < n; i++) {
            String bookTitle = sc.next();
            // HashMap에 책 제목별 카운트 추가
            bookList.put(bookTitle, bookList.getOrDefault(bookTitle, 0) + 1);
        }
        
        // 최대 판매 횟수 찾기
        int maxCount = 0;
        for (int count : bookList.values()) {
            maxCount = Math.max(maxCount, count);
        }
        
        // 최대 판매 횟수와 같은 책들을 찾아서 사전순으로 정렬
        for (String bookTitle : bookList.keySet()) {
            if (bookList.get(bookTitle) == maxCount) {
                cntArrayList.add(bookTitle);
            }
        }
        
        // 사전순 정렬 후 첫 번째 책 출력
        cntArrayList.sort(null);
        System.out.println(cntArrayList.get(0));


        sc.close();
    }
}

```

### 시간 복잡도

  - **입력 처리**: O(n) - n개의 책 제목을 입력받고 HashMap에 저장
  - **최대값 찾기**: O(k) - k는 고유한 책 제목의 개수 (최악의 경우 n)
  - **최대값과 같은 책 찾기**: O(k) - HashMap의 모든 키를 순회
  - **정렬**: O(m log m) - m은 최대 판매량을 가진 책의 개수
  - **전체 시간복잡도**: O(n + k + m log m) = O(n + m log m)
    - 일반적으로 m ≤ k ≤ n이므로, 최악의 경우 O(n log n)

### 공간 복잡도

  - **HashMap**: O(k) - 고유한 책 제목의 개수만큼 저장 (최악의 경우 O(n))
  - **ArrayList**: O(m) - 최대 판매량을 가진 책들을 저장 (최악의 경우 O(n))
  - **기타 변수들**: O(1) - Scanner, 정수형 변수들
  - **전체 공간복잡도**: O(k + m) = O(n) (최악의 경우)

