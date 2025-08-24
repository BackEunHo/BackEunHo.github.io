---
title: "시리얼 번호"
categories:
  - Algorithm
  - BaekJoon
tags:
  - Sorting
  - String
toc: true
toc_sticky: true
---

## 문제

다솜이는 기타를 많이 가지고 있다. 그리고 각각의 기타는 모두 다른 시리얼 번호를 가지고 있다. 다솜이는 기타를 빨리 찾아서 빨리 사람들에게 연주해주기 위해서 기타를 시리얼 번호 순서대로 정렬하고자 한다.

모든 시리얼 번호는 알파벳 대문자 (A-Z)와 숫자 (0-9)로 이루어져 있다.

시리얼 번호 A가 시리얼 번호 B의 앞에 오는 경우는 다음과 같다:

1. A와 B의 길이가 다르면, 짧은 것이 먼저 온다.
2. 만약 서로 길이가 같다면, A의 모든 자리수의 합과 B의 모든 자리수의 합을 비교해서 작은 합을 가지는 것이 먼저온다. (숫자인 것만 더한다)
3. 만약 1,2번 둘 조건으로도 비교할 수 없다면, 사전순으로 비교한다. 숫자가 알파벳보다 사전순으로 작다.

다솜이의 기타가 주어졌을 때, 위의 조건을 만족하는 정렬을 하는 프로그램을 작성하시오.

## 입력

첫째 줄에 기타의 개수 N이 주어진다. N은 1,000보다 작거나 같다. 둘째 줄부터 N개의 줄에 시리얼 번호가 하나씩 주어진다. 시리얼 번호의 길이는 최대 50이고, 알파벳 대문자 또는 숫자로만 이루어져 있고, 중복되지 않는다.

## 출력

첫째 줄부터 차례대로 N개의 줄에 정렬한 결과를 출력한다.

## 예제

### 입력 예제 1
```
5
ABCD
145C
A
A910
Z321
```

### 출력 예제 1
```
A
ABCD
Z321
145C
A910
```

### 입력 예제 2
```
2
Z19
Z20
```

### 출력 예제 2
```
Z20
Z19
```

### 입력 예제 3
```
4
34H2BJS6N
PIM12MD7RCOLWW09
PYF1J14TF
FIPJOTEA5
```

### 출력 예제 3
```
FIPJOTEA5
PYF1J14TF
34H2BJS6N
PIM12MD7RCOLWW09
```

### 입력 예제 4
```
5
ABCDE
BCDEF
ABCDA
BAAAA
ACAAA
```

### 출력 예제 4
```
ABCDA
ABCDE
ACAAA
BAAAA
BCDEF
```

## 문제 풀이

### 접근 방법

1. **Comparator를 사용한 정렬**: Java의 `Arrays.sort()`에 커스텀 Comparator를 전달하여 모든 조건을 한 번에 처리합니다.

2. **정렬 우선순위**:
   - 1순위: 길이가 짧은 것이 먼저
   - 2순위: 길이가 같으면 숫자 합이 작은 것이 먼저
   - 3순위: 숫자 합도 같으면 사전순

3. **숫자 합 계산**: `getDigitSum()` 메서드로 문자열에서 숫자만 추출하여 합을 계산합니다.

### 구현 코드

```java
import java.util.Arrays;
import java.util.Scanner;

public class Main {
  public static void main(String[] args) {

    // 입력받을 시리얼 번호
    Scanner sc = new Scanner(System.in);
    int n = sc.nextInt();
    String[] serialNumbers = new String[n];
    for (int i = 0; i < n; i++) {
      serialNumbers[i] = sc.next();
    }

    // 모든 조건을 한 번에 처리하는 정렬(따로 정렬 진행하니 마지막 정렬만 적용)
    Arrays.sort(serialNumbers, (a, b) -> {
      // 1. 길이가 다르면 짧은 것이 먼저
      if (a.length() != b.length()) {
        return a.length() - b.length();
      }
      
      // 2. 길이가 같으면 숫자 합이 작은 것이 먼저
      int sumA = getDigitSum(a);
      int sumB = getDigitSum(b);
      if (sumA != sumB) {
        return sumA - sumB;
      }
      
      // 3. 숫자 합도 같으면 사전순
      return a.compareTo(b);
    });

    // 출력
    for (String serialNumber : serialNumbers) {
      System.out.println(serialNumber);
    }

    sc.close();
  }

  // 시리얼 번호에서 숫자만 추출하여 합을 계산하는 메서드
  private static int getDigitSum(String serial) {
    int sum = 0;
    for (char c : serial.toCharArray()) {
      if (Character.isDigit(c)) {
        sum += c - '0'; // 문자를 숫자로 변환
      }
    }
    return sum;
  }
}
```

### 시간 복잡도

- **정렬**: O(N log N) - Arrays.sort()의 시간 복잡도
- **숫자 합 계산**: O(L) - 각 문자열의 길이만큼 반복
- **전체**: O(N log N × L) - N은 시리얼 번호 개수, L은 평균 문자열 길이

### 공간 복잡도

- **입력 배열**: O(N × L) - N개의 시리얼 번호 저장
- **정렬**: O(log N) - Arrays.sort()의 재귀 호출 스택
- **전체**: O(N × L)

