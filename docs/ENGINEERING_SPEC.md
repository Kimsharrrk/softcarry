# 🚀 EDCS 엔지니어링 & 포트폴리오 고도화 전략
> **부하 테스트(Load Testing), 대용량 트래픽 처리, Gemini AI 연동 및 성능 최적화**

---

## 🎯 1. 포트폴리오 핵심 컨셉: 왜 EDCS가 최고의 백엔드/풀스택 포트폴리오인가?

EDCS는 단순한 CRUD 웹사이트가 아닙니다.  
**"수많은 기기에서 터미널로 실시간 스크립트를 호출하고, 대규모 설치 텔레메트리를 수집하며, 최신 AI로 패키지를 지능적으로 추천하는 고가용성 시스템"**으로 확장할 수 있습니다.

```
[클라이언트 터미널 수만 대] ──▶ [Cloudflare Edge / CDN] 
                                    │ (Cache Hit 98%)
                                    ▼ (Cache Miss)
                             [API Gateway & Rate Limiter]
                                    │
                             [EDCS Core API Server] ──▶ [Gemini 3.8 / 2.5 AI Agent]
                                    │                     (자연어 분석 & 스마트 팩 생성)
                                    ├─▶ [Redis Cache] (템플릿 & 프리셋 초고속 서빙)
                                    ├─▶ [PostgreSQL] (유저 & 앱 레지스트리)
                                    │
[설치 완료 텔레메트리] ───────────▶ [Message Queue (Redis Streams / BullMQ)]
                                    │ (비동기 버퍼링 & 부하 분산)
                                    ▼
                             [Worker Process] ──▶ [ClickHouse / TimeSeries DB]
                                                   (실시간 통계 & 대시보드)
```

---

## 📊 2. 부하 테스트(Load Testing) 시나리오 & 성능 튜닝 로드맵

면접관에게 가장 매력적인 스토리는 **"기존 방식에서 병목(Bottleneck)을 발견하고, 기술적 해결책을 적용하여 성능을 N배 끌어올린 경험"**입니다.

### [테스트 도구]
- **k6** (Grafana Labs의 최신 부하 테스트 도구 - JS 스크립트로 작성 가능)
- **Prometheus & Grafana** (실시간 CPU, 메모리, TPS, Latency 모니터링)

### [부하 테스트 시나리오]
| 단계 | 부하 조건 | 테스트 대상 엔드포인트 | 주요 관찰 지표 |
| :--- | :--- | :--- | :--- |
| **Stage 1: 기본 스트레스 테스트** | 동시 접속자(VU) 1,000명 ~ 5,000명 점진 증가 | `GET /run/:presetId` (원라이너 스크립트 서빙) | TPS, P95/P99 지연 시간, DB 커넥션 풀 고갈 여부 |
| **Stage 2: 피크 부하 (Spike Test)** | 순간 10,000건의 동시 스크립트 호출 급증 | `GET /run/:presetId` | 서버 다운 여부, 에러율(5xx), Rate Limiting 정상 동작 여부 |
| **Stage 3: 쓰기 부하 (High-Throughput)** | 초당 3,000건의 설치 로그 전송 | `POST /api/telemetry/install` | 메시지 큐 버퍼링 및 DB 병목 현상 |

### [성능 최적화 전/후 비교 지표 (포트폴리오용 목표치)]
- **Before (튜닝 전)**: DB 직접 조회 + 템플릿 매번 렌더링
  - 최대 TPS: ~150 TPS
  - P99 지연 시간: 1,800ms
  - 1,000명 동시 요청 시 DB Connection Timeout 발생 및 500 에러 급증
- **After (튜닝 후)**: Multi-Layer Caching (Cloudflare Edge Cache + Redis In-Memory Cache) + Go/Fastify 경량 엔진
  - 최대 TPS: **5,000+ TPS (30배 이상 향상)**
  - P99 지연 시간: **15ms 이하 (99% 개선)**
  - 에러율: **0.00%** 달성

---

## ⚡ 3. 대용량 데이터 & 실시간 비동기 파이프라인

수천 대의 PC에서 프로그램이 깔리는 동안 발생하는 설치 성공/실패 로그와 설치 시간 메트릭을 실시간 수집·분석합니다.

1. **비동기 메시지 큐 (BullMQ / Redis Streams / Kafka)**
   - 클라이언트에서 보내는 설치 텔레메트리(`POST /api/telemetry`)를 DB에 바로 쓰지 않고, 큐에 먼저 넣고 즉시 202 Accepted 반환 (응답 시간 < 5ms).
2. **배치 벌크 인서트 (Batch Bulk Insert)**
   - 백그라운드 워커가 1초 단위 또는 500건 단위로 모아서 DB에 일괄 저장(Bulk Insert)하여 DB I/O 부하 90% 이상 절감.
3. **실시간 대시보드 & 통계 집계**
   - "현재 전 세계/국내에서 실시간 설치 중인 소프트웨어 Top 10"
   - "OS별 평균 설치 소요 시간 (Windows 3.2분 vs Mac 2.1분)"

---

## 🤖 4. Gemini 모델 실무 연동: "AI 스마트 패커 (Smart Packer)"

단순한 챗봇이 아니라, 백엔드 파이프라인의 핵심 기능으로 Gemini를 통합합니다.

### 1) 자연어 프롬프트 ➡️ 최적 소프트웨어 팩 자동 구성
- **유저 입력**: *"나 컴공과 2학년인데 이번 학기 자료구조(C언어)랑 스프링부트 웹 백엔드 프로젝트 해. 카톡이랑 디스코드도 깔아줘."*
- **Gemini의 역할**:
  - 사용자 요구사항 분석 후 내부 앱 레지스트리에서 정확한 패키지 매칭:
    `[gcc, cmake, vscode, intellij-idea-community, openjdk-17, git, postman, kakaotalk, discord]`
  - 누락된 필수 도구 자동 추천 (예: "스프링 개발을 위해 Docker와 DBeaver를 추가했습니다")
  - **Structured Outputs (JSON Schema)**를 적용하여 정형 데이터로 완벽 파싱.

### 2) AI 엔지니어링 최적화 포인트 (포트폴리오 어필 포인트)
- **시맨틱 캐싱 (Semantic Caching)**:
  - 유사한 자연어 요청(예: "자바 웹개발자 세팅" vs "스프링부트 백엔드 세팅")이 들어왔을 때 매번 LLM API를 호출하지 않고, 유사도 검색(Embedding Vector) 또는 Redis 키 캐시를 거쳐 **API 비용 80% 절감 & 응답 속도 2.5초 ➡️ 50ms로 단축**.
- **Fallback & Resilience**:
  - LLM Rate Limit 또는 네트워크 장애 발생 시 사전에 정의된 정적 템플릿(Fallback Rule)으로 자동 전환되는 탄력적 아키텍처 설계.

---

## 💼 5. 이력서 / 포트폴리오 작성 예시 (STAR 기법)

이 프로젝트를 마친 후 이력서에 작성할 수 있는 가장 강력한 한 줄 예시들입니다:

- **대용량 트래픽 최적화**:  
  > *"k6를 이용한 부하 테스트 환경을 구축하고, 5,000명의 동시 요청(VU) 시 발생하는 DB 커넥션 병목을 발견하여 Redis 기반 2계층 캐싱 아키텍처를 도입. 초당 처리량(TPS)을 150에서 5,200으로 약 34배 개선하고 P99 지연 시간을 1,800ms에서 15ms로 99% 단축."*

- **비동기 이벤트 파이프라인**:  
  > *"수천 대 클라이언트의 실시간 설치 텔레메트리 수집 시 발생하는 DB I/O 부하를 방지하기 위해 Redis Streams 기반 비동기 큐잉 및 Bulk Insert 워커를 구현하여 DB 부하율을 85% 절감."*

- **최신 LLM(Gemini) 프로덕션 서빙**:  
  > *"Gemini Structured Outputs를 활용하여 자연어 요구사항을 정확한 소프트웨어 패키지 명세로 변환하는 'AI Smart Packer' 엔진 개발. 임베딩 기반 시맨틱 캐싱을 설계하여 LLM API 호출 비용을 78% 절감하고 응답 속도를 2초에서 0.1초로 개선."*
