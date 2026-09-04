/** 자동 확정이 어려운 항목 — 검사 항목 페이지 하단 수동 체크 가이드 */

export type ManualGuideFix = {
  label: string;
  /** 코드면 code, 아니면 설명 문장 */
  code?: string;
  text?: string;
};

export type ManualGuide = {
  /** 무엇을 확인할지 */
  check: string[];
  /** 수정·해결 방안 */
  fixes: ManualGuideFix[];
};

export const MANUAL_GUIDES: Record<string, ManualGuide> = {
  'wa-04-linear': {
    check: [
      '화면 시각 순서와 HTML(DOM) 읽는 순서가 같은지 확인하세요.',
      'CSS를 끄거나 스크린리더로 읽었을 때도 의미가 통하는지 확인하세요.',
    ],
    fixes: [
      {
        label: '수정 방향',
        text: '화면에 보이는 순서대로 HTML을 배치하세요. order·절대배치만으로 의미 순서를 바꾸지 마세요.',
      },
    ],
  },
  'wa-05-instructions': {
    check: [
      '지시 문구가 「빨간 버튼」「오른쪽 위」처럼 색·위치·모양만으로 대상을 가리키는지 확인하세요.',
    ],
    fixes: [
      {
        label: '수정 예시',
        text: '색·위치 대신 컨트롤 이름으로 안내하세요. 예: 「저장 버튼을 눌러 주세요.」',
      },
      {
        label: '다른 해결 방법',
        text: '아이콘 버튼에 보이는 이름 또는 숨김(blind) 이름을 두고, 지시도 그 이름을 쓰세요. (이름과 안내를 한 예시에 중복으로 넣지 마세요.)',
      },
    ],
  },
  'wa-06-color-alone': {
    check: [
      '필수·오류·상태·범주가 색만으로 구분되는지 확인하세요. (CSS·계산된 색 포함)',
      '색 외에 텍스트·무늬·아이콘 등 다른 단서가 있는지 확인하세요.',
    ],
    fixes: [
      {
        label: '수정 방향',
        text: '색과 함께 텍스트(예: 「필수」)나 아이콘·무늬 등 색 없이도 구분되는 수단을 제공하세요. 구체 색코드는 환경마다 다르므로 지정하지 않습니다.',
      },
    ],
  },
  'wa-09-adjacent': {
    check: [
      '이웃한 카드·공지·본문/사이드가 한 덩어리로 붙어 보이지 않는지 확인하세요.',
    ],
    fixes: [
      {
        label: '구조로 나누기',
        code: `<ul class="list">
  <li><strong>첫 공지</strong><p>내용…</p></li>
  <li><strong>다음 공지</strong><p>내용…</p></li>
</ul>`,
      },
      {
        label: '시각 구분만 할 때',
        text: '여백·구분선·배경 차이로 구역이 구별되게 하세요. (수치·색코드는 제시하지 않음)',
      },
    ],
  },
  'wa-13-char-key': {
    check: [
      '글자·숫자만으로(수정키 없이) 메뉴·검색 등이 실행되는지 확인하세요.',
      '있다면 끄기·키 변경·해당 UI 포커스 중에만 동작하는지 확인하세요.',
    ],
    fixes: [
      {
        label: '수정 방향',
        text: '문자만으로 동작하는 단축키를 끄거나 재할당하거나, 해당 컴포넌트에 포커스가 있을 때만 동작하게 하세요. Alt 등과 함께 쓰는 단축키는 해당하지 않을 수 있습니다.',
      },
    ],
  },
  'wa-15-pause': {
    check: [
      '캐러셀·자동 배너가 사용자 조작 없이 계속 바뀌는지 확인하세요.',
      '정지·일시정지 수단이 있는지 확인하세요.',
    ],
    fixes: [
      {
        label: '수정 방향',
        text: '자동으로 바뀌는 콘텐츠에 정지(또는 일시정지) 컨트롤을 제공하세요. 가능하면 기본은 정지 상태로 두세요.',
      },
    ],
  },
  'wa-20-fixed-ref': {
    check: ['전자출판 등 고정 참조 위치가 필요한 콘텐츠인지, 제공되는지 확인하세요.'],
    fixes: [
      {
        label: '수정 방향',
        text: '해당 형식이면 고정된 위치·쪽 등 참조 정보를 제공하세요. 일반 웹 페이지에는 해당이 적은 항목입니다.',
      },
    ],
  },
  'wa-21-pointer': {
    check: [
      '핀치·복잡한 경로 제스처만으로 동작하는지 확인하세요.',
      '한 번 탭·클릭 등 단일 포인터로도 같은 기능을 쓸 수 있는지 확인하세요.',
    ],
    fixes: [
      {
        label: '수정 방향',
        text: '다중·경로 제스처에 의존하지 말고, 단일 포인터(탭/클릭)로도 동등하게 조작할 수 있게 하세요.',
      },
    ],
  },
  'wa-22-pointer-cancel': {
    check: [
      '포인터를 누르자마자 바로 실행되어 취소할 수 없는지 확인하세요.',
      '떼기(up)·이동 후 취소 등이 가능한지 확인하세요.',
    ],
    fixes: [
      {
        label: '수정 방향',
        text: '다운이 아니라 업에서 실행하거나, 포인터를 밖으로 옮기면 취소되는 등 취소 가능한 방식으로 구현하세요.',
      },
    ],
  },
  'wa-24-motion': {
    check: ['기기 흔들기·기울이기만으로 동작하는 기능이 있는지 확인하세요.'],
    fixes: [
      {
        label: '수정 방향',
        text: '동작 기반 작동에는 UI 버튼 등 대체 조작 수단을 제공하세요.',
      },
    ],
  },
  'wa-27-help': {
    check: ['도움말·고객센터 링크가 있으면 여러 페이지에서 찾기 쉬운 위치에 있는지 확인하세요.'],
    fixes: [
      {
        label: '수정 방향',
        text: '도움 정보는 페이지마다 동일한 위치·방법으로 찾을 수 있게 두세요.',
      },
    ],
  },
  'wa-28-error': {
    check: [
      '입력 오류 시 무엇이 잘못됐는지, 어떻게 고치면 되는지 안내가 있는지 확인하세요.',
    ],
    fixes: [
      {
        label: '수정 방향',
        text: '오류 필드와 수정 방법을 텍스트로 알려 주세요. 색만으로 오류를 표시하지 마세요.',
      },
    ],
  },
  'wa-30-auth': {
    check: ['인증·캡차 등이 인지·운동 제약 없이 대안 수단을 제공하는지 확인하세요.'],
    fixes: [
      {
        label: '수정 방향',
        text: '인지 퍼즐만 강제하지 말고, 접근 가능한 인증 수단(대체 인증 등)을 제공하세요.',
      },
    ],
  },
  'wa-31-redundant-entry': {
    check: ['같은 정보를 여러 단계에서 반복 입력하게 하지 않는지 확인하세요.'],
    fixes: [
      {
        label: '수정 방향',
        text: '이미 입력한 정보는 자동 채움·선택 입력으로 다시 치지 않게 하세요.',
      },
    ],
  },
  'wa-33-webapp': {
    check: [
      '페이지에 포함된 웹앱·위젯도 키보드·이름·초점 등 접근성 항목을 만족하는지 확인하세요.',
    ],
    fixes: [
      {
        label: '수정 방향',
        text: '커스텀 위젯에 네이티브에 준하는 역할·이름·키보드 조작·초점을 제공하세요. 개별 DOM 문제는 자동 항목에서도 잡힐 수 있습니다.',
      },
    ],
  },
  'html-validate-recommended': {
    check: ['마크업 중첩·열고 닫음·속성 오류가 없는지 검증 도구로 확인하세요.'],
    fixes: [
      {
        label: '수정 방향',
        text: '잘못된 태그 중첩·미닫힘·잘못된 속성을 수정하세요. (현재 앱 자동 연동 전)',
      },
    ],
  },
  'compat-html': {
    check: [
      'W3C Markup Validator(또는 동등 도구)로 페이지 HTML을 검사하세요.',
      'HTML5 문법·최신 웹표준 적용 여부, 열고 닫음·중첩·속성 선언을 확인하세요.',
    ],
    fixes: [
      {
        label: '보이지 않는 특수문자·BOM',
        text: '문서 맨 앞(1행)에 있는 보이지 않는 문자·BOM을 제거하세요.',
      },
      {
        label: '문자 부호화 meta 중복',
        text: 'charset 선언 meta는 하나만 두세요. 중복·구식 http-equiv Content-Type charset 선언은 제거하세요.',
      },
      {
        label: 'HTML5에서 부적절한 meta',
        text: 'HTML4 시절 meta(허용되지 않는 name·http-equiv 값 등)는 제거하고 HTML5에서 허용되는 값만 쓰세요.',
      },
      {
        label: 'img 필수 속성',
        code: '<img src="..." alt="설명" width="100" height="50" />',
      },
      {
        label: 'img width·height 단위',
        text: 'HTML 속성 height/width에는 px 단위를 넣지 마세요. height="50px" → height="50"',
      },
      {
        label: '잘못된 포함 관계',
        text: 'p 안에 p, span 안에 p처럼 허용되지 않는 중첩은 div로 바꾸거나 구조를 고치세요.',
      },
      {
        label: '특수문자 엔티티',
        code: '&lt;할머니의 여름휴가&gt;',
      },
      {
        label: 'title 필수',
        text: '스크립트로 제목을 바꿔도 HTML에 <title>텍스트</title> 값은 비워 두지 마세요.',
      },
      {
        label: '속성·값 따옴표',
        text: '속성은 속성="값" 형태로 쓰고, 값 안에 따옴표가 필요하면 따옴표 종류를 섞어 깨지지 않게 하세요.',
      },
      {
        label: 'a 태그 닫기',
        text: '<a ... />처럼 셀프 클로징하지 마세요. <a href="...">텍스트</a>로 여닫으세요.',
      },
    ],
  },
  'compat-css': {
    check: [
      'W3C CSS Validator로 스타일시트·인라인 CSS를 검사하세요.',
      '크기·색·배치·정렬·여백 등 시각 속성이 CSS 표준으로 작성됐는지 확인하세요.',
    ],
    fixes: [
      {
        label: '주석 오류',
        text: '닫는 주석 */가 잘못 남아 있으면 제거하세요. 주석은 /* … */ 쌍을 맞추세요.',
      },
      {
        label: 'aspect-ratio 값',
        code: 'aspect-ratio: 19 / 2;',
      },
      {
        label: 'CSS 변수 이름 공백',
        text: 'var(--이름) 하이픈 사이 공백을 없애세요. 예: var(--swiper-pagination-bullet-horizontal-gap, 2px)',
      },
      {
        label: '@규칙 줄바꿈',
        text: '@ 바로 다음에 줄바꿈을 넣지 마세요. 예: @-moz-document url-prefix() { … }',
      },
    ],
  },
  'compat-utf8': {
    check: [
      '문서·서버 응답의 문자 부호화가 UTF-8인지 확인하세요.',
      'meta charset과 실제 파일·HTTP Content-Type이 일치하는지 확인하세요.',
    ],
    fixes: [
      {
        label: '수정 예시',
        code: '<meta charset="utf-8" />',
      },
      {
        label: '다른 해결 방법',
        text: '서버에서 Content-Type: text/html; charset=utf-8 을 내려주고, 파일도 UTF-8로 저장하세요. charset meta는 중복하지 마세요.',
      },
    ],
  },
  'compat-js': {
    check: [
      'Chrome 등에서 개발자 도구 콘솔을 열고 초기 로딩 시 JavaScript 오류·DOM 경고가 없는지 확인하세요.',
      '스크립트가 의도한 기능이 정상 동작하는지도 함께 확인하세요.',
    ],
    fixes: [
      {
        label: '콘솔 오류·경고',
        text: '페이지 로드 직후 콘솔 오류·경고가 나오지 않게 원인을 제거하세요.',
      },
      {
        label: '로그인 등 입력 autocomplete (DOM 경고 예)',
        code: '<input type="password" name="password" autocomplete="current-password" />',
      },
    ],
  },
  'compat-plugin': {
    check: [
      'Flash·ActiveX·Java 애플릿 등 비표준 플러그인에 의존하는지 확인하세요.',
      '행정안전부 「공공 웹사이트 플러그인 제거 가이드라인」 준수 여부를 확인하세요.',
    ],
    fixes: [
      {
        label: '수정 방향',
        text: '플러그인 없이 HTML·CSS·JavaScript(표준 웹)로 동일 기능을 제공하세요.',
      },
    ],
  },
  'compat-func': {
    check: [
      'Chrome·Edge·Whale(또는 지침에서 정한 브라우저) 최신 버전에서 동적 기능이 동등하게 동작하는지 확인하세요.',
      '메뉴·폼·팝업·슬라이더 등 주요 제어가 특정 브라우저에서만 실패하지 않는지 확인하세요.',
    ],
    fixes: [
      {
        label: '수정 방향',
        text: '특정 브라우저 전용 API·비표준 이벤트에만 의존하지 말고, 표준 DOM·널리 지원되는 API로 기능을 구현하세요.',
      },
    ],
  },
  'compat-display': {
    check: [
      'Chrome·Edge·Whale 등에서 레이아웃·폰트·정렬이 동등하게 보이는지 확인하세요.',
      '브라우저마다 깨짐·잘림·겹침이 없는지 확인하세요.',
    ],
    fixes: [
      {
        label: '수정 방향',
        text: '벤더 전용 CSS에만 의존하지 말고, 표준 CSS로 맞추고 필요 시 접두사·폴백을 함께 두세요.',
      },
    ],
  },
  'compat-m-func': {
    check: [
      '모바일 전용(반응형 또는 별도 모바일 페이지)이 있는지 확인하세요. 없으면 감점(0점) 대상입니다.',
      'iOS Safari·Android Chrome 등에서 동적 기능이 PC와 동등하게 동작하는지 확인하세요.',
    ],
    fixes: [
      {
        label: '수정 방향',
        text: '반응형 또는 모바일 전용 페이지를 제공하고, 터치·뷰포트에서도 같은 기능을 쓸 수 있게 하세요.',
      },
    ],
  },
  'compat-m-display': {
    check: [
      '모바일에서 PC 화면만 축소 표시되지 않는지 확인하세요. PC 화면만이면 감점(0점) 대상입니다.',
      'iOS·Android에서 모바일용 레이아웃으로 보이는지 확인하세요.',
    ],
    fixes: [
      {
        label: '수정 예시',
        code: '<meta name="viewport" content="width=device-width, initial-scale=1" />',
      },
      {
        label: '수정 방향',
        text: '뷰포트·미디어쿼리(또는 모바일 전용 URL)로 모바일용 화면을 제공하세요.',
      },
    ],
  },
};
