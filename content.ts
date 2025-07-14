// Chrome Extension API 타입 정의
interface ChromeMessage {
  action: string;
}

interface ChromeResponse {
  attendees: string[];
}

// 구글 밋 참석자 목록을 가져오는 함수
function getAttendeeList(): string[] {
  const attendees: string[] = [];

  // 구글 밋의 참석자 목록 선택자들 (다양한 UI 버전 대응)
  const selectors: string[] = [
    "[data-participant-id]",
    "[data-self-name]",
    "[data-requested-participant-id]",
    'div[role="listitem"] span',
    ".uGOf1d", // 구글 밋 참석자 이름 클래스
    ".zWGUib", // 다른 가능한 클래스명
  ];

  // 각 셀렉터로 참석자 찾기
  selectors.forEach((selector: string) => {
    const elements: NodeListOf<Element> = document.querySelectorAll(selector);
    elements.forEach((element: Element) => {
      const name: string | null = element.textContent?.trim() || null;
      if (name && name.length > 0 && !attendees.includes(name)) {
        attendees.push(name);
      }
    });
  });

  // 현재 사용자 이름도 포함 (자기 자신)
  const selfNameElement: Element | null =
    document.querySelector("[data-self-name]");
  const selfName: string | null = selfNameElement?.textContent?.trim() || null;
  if (selfName && !attendees.includes(selfName)) {
    attendees.push(selfName);
  }

  return attendees;
}

// 더 정확한 참석자 목록 가져오기 (People 패널에서)
function getAttendeesFromPeoplePanel(): string[] {
  const attendees: string[] = [];

  // People 패널의 참석자 목록
  const peoplePanel: Element | null =
    document.querySelector('[data-tab-id="2"]') ||
    document.querySelector('[aria-label*="참가자"]') ||
    document.querySelector('[aria-label*="People"]');

  if (peoplePanel) {
    const nameElements: NodeListOf<Element> =
      peoplePanel.querySelectorAll("span");
    nameElements.forEach((element: Element) => {
      const name: string | null = element.textContent?.trim() || null;
      if (
        name &&
        name.length > 1 &&
        !name.includes("@") &&
        !attendees.includes(name)
      ) {
        attendees.push(name);
      }
    });
  }

  return attendees;
}

// 팝업에서 메시지를 받았을 때 처리
chrome.runtime.onMessage.addListener(
  (
    request: ChromeMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ChromeResponse) => void
  ): boolean => {
    if (request.action === "getAttendees") {
      // 두 가지 방법으로 참석자 목록 가져오기
      let attendees: string[] = getAttendeesFromPeoplePanel();

      // 첫 번째 방법으로 못 가져왔으면 두 번째 방법 시도
      if (attendees.length === 0) {
        attendees = getAttendeeList();
      }

      sendResponse({ attendees: attendees });
    }

    return true; // 비동기 응답을 위해
  }
);

// 페이지 로드 시 참석자 목록 모니터링
let lastAttendeeCount: number = 0;
setInterval((): void => {
  const currentAttendees: string[] = getAttendeesFromPeoplePanel();
  if (currentAttendees.length !== lastAttendeeCount) {
    lastAttendeeCount = currentAttendees.length;
    console.log("참석자 목록 업데이트:", currentAttendees);
  }
}, 2000);
