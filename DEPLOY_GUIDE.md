# 🚗 운행일지 PWA 앱 배포 가이드

## 📋 배포 전 준비사항

1. **GitHub 계정** 만들기 → https://github.com/signup
2. **Vercel 계정** 만들기 → https://vercel.com/signup (GitHub으로 로그인 추천)

---

## 🚀 배포 방법 (10분 소요)

### STEP 1: GitHub에 코드 올리기

1. https://github.com/new 접속
2. Repository name: `driving-log` 입력
3. **Private** 선택 (코드 비공개)
4. `Create repository` 클릭

#### 파일 업로드 방법 (Git 모르셔도 됩니다!)

1. 생성된 저장소 페이지에서 `uploading an existing file` 클릭
2. 다운로드 받은 `driving-log-pwa` 폴더의 **모든 파일**을 드래그&드롭
3. `Commit changes` 클릭

> ⚠️ `node_modules` 폴더는 올리지 마세요! (프로젝트에 포함되어 있지 않습니다)

#### 파일 구조 확인
```
driving-log-pwa/
├── public/
│   ├── favicon.svg
│   ├── icon-192.png
│   └── icon-512.png
├── src/
│   ├── main.jsx
│   └── App.jsx
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
└── .gitignore
```

---

### STEP 2: Vercel에서 배포하기

1. https://vercel.com/dashboard 접속
2. `Add New...` → `Project` 클릭
3. `Import Git Repository`에서 방금 만든 `driving-log` 선택
4. 설정은 자동으로 감지됩니다:
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. `Deploy` 클릭!

> 🎉 약 1~2분 후 배포 완료! `https://driving-log-xxxx.vercel.app` 주소가 생성됩니다.

---

### STEP 3: 스마트폰에 앱 설치하기

#### 📱 아이폰 (Safari)
1. Safari로 배포된 URL 접속
2. 하단 **공유 버튼** (□↑) 탭
3. **"홈 화면에 추가"** 선택
4. **"추가"** 탭
5. → 홈화면에 앱 아이콘이 생깁니다!

#### 📱 안드로이드 (Chrome)
1. Chrome으로 배포된 URL 접속
2. 상단에 **"앱 설치"** 배너가 자동으로 뜸
3. 또는 메뉴(⋮) → **"앱 설치"** 또는 **"홈 화면에 추가"**
4. → 홈화면에 앱 아이콘이 생깁니다!

---

## 🔧 커스텀 도메인 설정 (선택사항)

원하시면 `driving-log.yoursite.com` 같은 도메인을 연결할 수 있습니다.

1. Vercel 대시보드 → 프로젝트 → Settings → Domains
2. 도메인 입력 후 DNS 설정 안내에 따라 진행

---

## 🔒 보안 참고사항

현재 앱은 Supabase anon key를 사용하고 있습니다. 이 키는 클라이언트에서 사용하도록 설계된 공개 키이며, RLS(Row Level Security) 정책으로 데이터가 보호됩니다.

추후 사용자 인증을 추가하려면:
- Supabase Auth를 통한 로그인 기능 추가
- RLS 정책을 사용자별로 변경

---

## 📝 업데이트 방법

코드를 수정하면 GitHub에 push하기만 하면 Vercel이 자동으로 재배포합니다!

1. GitHub에서 파일 수정 (또는 새 파일 업로드)
2. Commit → 자동 배포 시작
3. 1~2분 후 업데이트 완료

---

## 🆘 문제 해결

| 문제 | 해결 방법 |
|------|-----------|
| GPS가 작동 안 함 | HTTPS 필수! Vercel은 자동으로 HTTPS 제공 |
| 앱 설치 버튼 안 보임 | HTTPS + PWA manifest 필요 (이미 설정됨) |
| 데이터 로드 안 됨 | Supabase 프로젝트가 Active 상태인지 확인 |
| 빌드 에러 | Vercel 로그 확인 (Dashboard → Deployments) |
