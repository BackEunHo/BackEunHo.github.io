---
title: "백준 1316번 - 그룹 단어 체커"
categories:
  - Algorithm
  - Baekjoon
tags:
  - String
  - Implementation
toc: true
toc_sticky: true
---

## 문제

그룹 단어란 단어에 존재하는 모든 문자에 대해서, 각 문자가 연속해서 나타나는 경우만을 말한다. 예를 들면, ccazzzzbb는 c, a, z, b가 모두 연속해서 나타나고, kin도 k, i, n이 연속해서 나타나기 때문에 그룹 단어이지만, aabbbccb는 b가 떨어져서 나타나기 때문에 그룹 단어가 아니다.

단어 N개를 입력으로 받아 그룹 단어의 개수를 출력하는 프로그램을 작성하시오.

## 입력

첫째 줄에 단어의 개수 N이 들어온다. N은 100보다 작거나 같은 자연수이다. 둘째 줄부터 N개의 줄에 단어가 들어온다. 단어는 알파벳 소문자로만 되어있고 중복되지 않으며, 길이는 최대 100이다.

## 출력

첫째 줄에 그룹 단어의 개수를 출력한다.

## 예제

### 입력 예제 1
```
3
happy
new
year
```

### 출력 예제 1
```
3
```

### 입력 예제 2
```
4
aba
abab
abcabc
a
```

### 출력 예제 2
```
1
```

## 문제 풀이

### 접근 방법
- Set으로 중복을 제거한 후, 이전 문자와 다를 때 그 문자가 Set에 존재하면 그룹 단어가 아님을 확인할 수 있다.
- 문자열의 길이가 1인 경우 그룹단어로 판별한다.

### 구현 코드

```java

import java.util.HashSet;
import java.util.Scanner;
import java.util.Set;

public class Main {
    
    public static void main(String[] args) {
        try (Scanner sc = new Scanner(System.in)) {
            int n = sc.nextInt();
            int cnt = 0;
            for (int i = 0; i < n; i++) {
                String word = sc.next();
                if (word.length() == 1) {
                    cnt++;
                    continue;
                }
                if (isGroupWordCheck(word)) {
                    cnt++;
                }
            }
            System.out.println(cnt);
        }
        catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static boolean isGroupWordCheck(String word) {
        Set<Character> set = new HashSet<>();
        char prev = word.charAt(0);
        set.add(prev);
        for (int i = 1; i < word.length(); i++) {
            if (prev != word.charAt(i)) {
                if (set.contains(word.charAt(i))) {
                    return false;
                }
                set.add(word.charAt(i));
            }
            prev = word.charAt(i);
        }
        return true;
    }
}


```

### 시간 복잡도

입력 단어의 개수(n)만큼 반복하며, 각 반복마다 문자열의 길이(m)만큼 한 번 순회한다. 따라서 선형 시간 복잡도 O(N)을 유지한다.

### 공간 복잡도

입력 단어의 길이와 최대 26자의 알파벳을 저장하는 Set으로 인해 선형 공간 복잡도 O(N)을 유지한다.

