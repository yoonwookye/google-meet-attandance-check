// 타입 정의
interface ChromeMessage {
  action: string;
}

interface ChromeResponse {
  attendees: string[];
}

interface AttendanceResult {
  teamMembers: string[];
  attendees: string[];
  absentees: string[];
  allAttendees: string[];
}

// DOM 요소들
const teamMembersTextarea = document.getElementById(
  "teamMembers"
) as HTMLTextAreaElement;
const saveTeamMembersButton = document.getElementById(
  "saveTeamMembers"
) as HTMLButtonElement;
const checkAttendanceButton = document.getElementById(
  "checkAttendance"
) as HTMLButtonElement;
const statusDiv = document.getElementById("status") as HTMLDivElement;
const resultsDiv = document.getElementById("results") as HTMLDivElement;
const summaryDiv = document.getElementById("summary") as HTMLDivElement;
const attendeesDiv = document.getElementById("attendees") as HTMLDivElement;
const absenteesDiv = document.getElementById("absentees") as HTMLDivElement;
const allAttendeesDiv = document.getElementById(
  "allAttendees"
) as HTMLDivElement;

// 팀원 목록을 스토리지에서 로드
async function loadTeamMembers(): Promise<void> {
  try {
    const result = await chrome.storage.sync.get(["teamMembers"]);
    if (result.teamMembers) {
      teamMembersTextarea.value = result.teamMembers as string;
    }
  } catch (error) {
    console.error("팀원 목록 로드 실패:", error);
  }
}

// 팀원 목록을 스토리지에 저장
async function saveTeamMembers(): Promise<void> {
  try {
    const teamMembers: string = teamMembersTextarea.value.trim();
    await chrome.storage.sync.set({ teamMembers: teamMembers });
    showStatus("팀원 목록이 저장되었습니다.", "success");
  } catch (error) {
    console.error("팀원 목록 저장 실패:", error);
    showStatus("팀원 목록 저장에 실패했습니다.", "error");
  }
}

// 상태 메시지 표시
function showStatus(
  message: string,
  type: "info" | "success" | "error" = "info"
): void {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.classList.remove("hidden");

  // 3초 후 자동으로 숨기기
  setTimeout(() => {
    statusDiv.classList.add("hidden");
  }, 3000);
}

// 팀원 목록 파싱
function parseTeamMembers(text: string): string[] {
  return text
    .split("\n")
    .map((name: string) => name.trim())
    .filter((name: string) => name.length > 0);
}

// 출석체크 실행
async function checkAttendance(): Promise<void> {
  try {
    showStatus("출석체크를 실행하고 있습니다...", "info");

    // 팀원 목록 가져오기
    const teamMembersText: string = teamMembersTextarea.value.trim();
    if (!teamMembersText) {
      showStatus("팀원 목록을 먼저 입력하세요.", "error");
      return;
    }

    const teamMembers: string[] = parseTeamMembers(teamMembersText);

    // 현재 활성 탭 가져오기
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    // 구글 밋 페이지인지 확인
    if (!tab.url?.includes("meet.google.com")) {
      showStatus("구글 밋 페이지에서 실행해주세요.", "error");
      return;
    }

    // content script에서 참석자 목록 가져오기
    const response = (await chrome.tabs.sendMessage(tab.id!, {
      action: "getAttendees",
    } as ChromeMessage)) as ChromeResponse;

    if (!response || !response.attendees) {
      showStatus(
        '참석자 목록을 가져올 수 없습니다. 구글 밋의 "사람" 탭을 열어두세요.',
        "error"
      );
      return;
    }

    const allAttendees: string[] = response.attendees;

    // 출석체크 로직
    const attendees: string[] = [];
    const absentees: string[] = [];

    teamMembers.forEach((member: string) => {
      const isPresent: boolean = allAttendees.some(
        (attendee: string) =>
          attendee.includes(member) || member.includes(attendee)
      );

      if (isPresent) {
        attendees.push(member);
      } else {
        absentees.push(member);
      }
    });

    // 결과 표시
    displayResults(teamMembers, attendees, absentees, allAttendees);
    showStatus("출석체크가 완료되었습니다.", "success");
  } catch (error) {
    console.error("출석체크 실행 중 오류:", error);
    showStatus("출석체크 실행 중 오류가 발생했습니다.", "error");
  }
}

// 결과 표시
function displayResults(
  teamMembers: string[],
  attendees: string[],
  absentees: string[],
  allAttendees: string[]
): void {
  // 요약 정보
  const totalTeamMembers: number = teamMembers.length;
  const presentCount: number = attendees.length;
  const absentCount: number = absentees.length;
  const attendanceRate: number =
    totalTeamMembers > 0
      ? Math.round((presentCount / totalTeamMembers) * 100)
      : 0;

  summaryDiv.innerHTML = `
        <div class="summary-item">
            <span class="label">총 팀원 수:</span>
            <span class="value">${totalTeamMembers}명</span>
        </div>
        <div class="summary-item">
            <span class="label">참석자 수:</span>
            <span class="value">${presentCount}명</span>
        </div>
        <div class="summary-item">
            <span class="label">미참석자 수:</span>
            <span class="value">${absentCount}명</span>
        </div>
        <div class="summary-item">
            <span class="label">출석률:</span>
            <span class="value">${attendanceRate}%</span>
        </div>
    `;

  // 참석자 목록
  attendeesDiv.innerHTML =
    attendees.length > 0
      ? attendees
          .map(
            (name: string) => `<span class="name-tag present">${name}</span>`
          )
          .join("")
      : '<span class="no-data">참석자가 없습니다.</span>';

  // 미참석자 목록
  absenteesDiv.innerHTML =
    absentees.length > 0
      ? absentees
          .map((name: string) => `<span class="name-tag absent">${name}</span>`)
          .join("")
      : '<span class="no-data">모든 팀원이 참석했습니다! 🎉</span>';

  // 전체 참석자 목록
  allAttendeesDiv.innerHTML =
    allAttendees.length > 0
      ? allAttendees
          .map((name: string) => `<span class="name-tag">${name}</span>`)
          .join("")
      : '<span class="no-data">참석자 정보를 가져올 수 없습니다.</span>';

  // 결과 영역 표시
  resultsDiv.classList.remove("hidden");
}

// 이벤트 리스너 등록
document.addEventListener("DOMContentLoaded", (): void => {
  loadTeamMembers();

  saveTeamMembersButton.addEventListener("click", saveTeamMembers);
  checkAttendanceButton.addEventListener("click", checkAttendance);

  // 엔터 키로 출석체크 실행
  teamMembersTextarea.addEventListener("keydown", (e: KeyboardEvent): void => {
    if (e.ctrlKey && e.key === "Enter") {
      checkAttendance();
    }
  });
});
