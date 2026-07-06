---
name: terraform-infra
description: AWS EC2/보안그룹/K8s 클러스터/Redis 등 인프라를 Terraform으로 프로비저닝할 때 반드시 사용. 앱 배포가 아닌 인프라 레이어(IaC) 관리. remote state·lock, plan/apply 흐름, outputs를 GitHub Actions로 넘기는 연결점을 다룬다. "terraform", "IaC", "인프라 프로비저닝", "EC2 생성", "보안그룹", "remote state", "plan/apply" 요청 시 즉시 로드하라.
---

# Terraform 인프라 프로비저닝 하네스 (IaC 레이어)

## Why: 역할 경계 — 무엇을 하고 무엇을 안 하는가 (중요)

이 스킬의 Terraform은 **인프라 프로비저닝만** 담당한다. 두 레이어를 명확히 나눈다:

- **Terraform이 담당(인프라 레이어)**: EC2 인스턴스, VPC·서브넷·보안그룹, K8s 클러스터, ElastiCache/Redis, 컨테이너 레지스트리(ECR) 같은 **오래 사는 기반 자원**의 생성·변경·삭제.
- **GitHub Actions가 계속 담당(앱 레이어)**: Docker 이미지 빌드·레지스트리 push·EC2/K8s 롤아웃 같은 **애플리케이션 배포**(`docker-cicd-deploy` 스킬).

**왜 섞지 않는가**:
1. **배포 빈도가 다르다** — 앱은 하루에도 여러 번 배포하지만 인프라는 드물게 바뀐다. 앱 배포마다 `terraform apply`를 태우면 느리고 위험하다.
2. **관심사 분리** — Terraform state가 앱 배포 로그로 오염되면 drift 추적이 무너진다. 파괴적 인프라 변경과 일상적 앱 롤아웃은 서로 다른 승인·리뷰 절차를 가져야 한다.

경계선: **"서버가 존재하게 만드는 일" = Terraform**, **"그 서버 위에서 무엇이 도느냐" = GitHub Actions**.

## 1. 디렉토리 구조 — 모듈화

**Why**: 자원을 한 파일에 몰면 재사용·리뷰가 어렵다. 역할별 파일과 재사용 모듈로 나눈다.

```
infra/terraform/
  main.tf          # 프로바이더·모듈 호출(자원 조립)
  variables.tf     # 입력 변수(리전·인스턴스 타입·태그 등)
  outputs.tf       # 산출물(EC2 IP·레지스트리 URL·Redis 엔드포인트)
  backend.tf       # remote state 설정(아래 2)
  modules/
    network/       # VPC·서브넷·보안그룹
    compute/       # EC2(또는 EKS)
    cache/         # ElastiCache/Redis
```

- 환경(dev/prod)은 변수 파일(`prod.tfvars`)이나 workspace로 분리한다.

## 2. remote state + lock — 로컬 state는 위험하다

**Why**: Terraform은 `terraform.tfstate`에 "지금 무엇이 존재하는가"를 기록한다. 이 파일이 **로컬에만 있으면**: (1) 팀원이 서로의 상태를 몰라 **같은 자원을 중복 생성·충돌**시키고, (2) 동시에 apply하면 **state가 깨지며**, (3) 노트북이 죽으면 **인프라 지도를 통째로 잃는다**. 그래서 state를 **원격에 공유하고 잠근다**.

```hcl
# backend.tf — S3에 state 저장 + DynamoDB로 동시 apply 잠금
terraform {
  backend "s3" {
    bucket         = "myorg-tfstate"        # state 공유 저장소
    key            = "scraping/prod.tfstate"
    region         = "ap-northeast-2"
    dynamodb_table = "tf-locks"             # 락 테이블 → 동시 apply 차단(drift 방지)
    encrypt        = true                   # state에 담긴 민감정보 암호화
  }
}
```

- **S3 backend = 상태 공유**, **DynamoDB lock = 동시 실행 직렬화**. 둘이 함께 drift와 충돌을 막는다.
- state에는 민감정보가 남을 수 있으니 **암호화 + 접근 제한**은 필수. state를 git에 커밋하지 않는다.

## 3. plan/apply 흐름 — 파괴적 변경 방어

**Why**: `apply`는 실서버를 **삭제·교체**할 수 있다. 리뷰 없이 자동 apply하면 오타 하나로 프로덕션 DB가 날아간다. 그래서 **plan(제안)과 apply(실행)를 분리**하고, apply에는 사람 승인을 건다.

- **PR에서 `terraform plan`**: 변경 예정 내역(생성/변경/**삭제**)을 출력해 리뷰어가 파괴적 변경을 눈으로 확인한다.
- **main 머지 시 `terraform apply`**: **수동 승인 게이트**(GitHub Environments protection rule 등)를 거친 뒤 적용한다.
- `-/+`(재생성)·`destroy` 표시가 뜬 자원은 특히 주의 — 데이터 자원이면 중단 없는 대안을 먼저 검토한다.

```bash
terraform init        # backend·프로바이더·모듈 초기화
terraform plan -out=plan.tfplan   # 변경안 저장(리뷰 대상)
terraform apply plan.tfplan       # 승인 후 저장된 계획 그대로 적용
```

## 4. outputs → GitHub Actions 연결점

**Why**: Terraform이 만든 자원의 주소(EC2 IP·레지스트리 URL·Redis 엔드포인트)를 앱 배포가 알아야 한다. 이 값을 **Terraform outputs로 노출**하고 **GitHub Actions 시크릿/변수로 넘겨** 두 레이어를 잇는다.

```hcl
# outputs.tf — 앱 배포가 소비할 접속 정보
output "ec2_public_ip"   { value = module.compute.public_ip }
output "registry_url"    { value = module.compute.ecr_url }
output "redis_endpoint"  { value = module.cache.primary_endpoint }
```

- 연결 방식: `terraform output -json`으로 값을 뽑아 **GitHub Actions 시크릿/변수(`gh secret set`)로 주입**한다. 이후 `docker-cicd-deploy`의 배포 job이 이 값(SSH 대상 IP·레지스트리·Redis 주소)을 사용한다.
- 인프라가 바뀌어 엔드포인트가 달라지면 이 outputs만 다시 넘기면 되고, 앱 배포 워크플로는 그대로다(관심사 분리의 이점).

## 5. 과설계 경고

> 단일 EC2 호스트로 충분한 규모라면 K8s 클러스터·EKS 없이 **docker-compose로 충분**할 수 있다. 트래픽·워커 수·가용성 요구가 실제로 K8s를 정당화할 때만 클러스터를 프로비저닝하라. 규모에 맞게 선택한다.

## 체크리스트

- [ ] Terraform은 인프라(EC2·보안그룹·K8s·Redis·레지스트리)만 다루고, 앱 배포는 GitHub Actions에 남긴다
- [ ] state가 S3 remote backend + DynamoDB lock으로 공유·잠금된다(로컬 state 아님)
- [ ] PR에서 `plan` 리뷰, main에서 수동 승인 후 `apply` 흐름이 있다
- [ ] `destroy`/재생성 표시된 데이터 자원을 배포 전에 검토한다
- [ ] outputs(EC2 IP·레지스트리·Redis)를 GitHub Actions 시크릿/변수로 넘겨 앱 배포와 연결한다
- [ ] 규모가 작으면 K8s 대신 docker-compose를 검토했다

Terraform 프로바이더·리소스 인자·CLI가 불확실하면 추측하지 말고 **Context7 MCP/공식 문서**로 먼저 확인하라.
