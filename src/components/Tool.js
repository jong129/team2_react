import axios from 'axios';

const getIP = () => {
  return "localhost";
  // return "121.160.42.13"; // 팀장 학원 주소
<<<<<<< HEAD
  // return "121.160.42.21";
=======
  //return "121.160.42.21";
  // return "121.160.42.28";
>>>>>>> c2b044f455b3507a87f9363138b26b370174d6b9
}

const getCopyright = () => {
  return "Team2";
}

const getNowDate = () => {
  // 현재 날짜와 시간을 가져옵니다.
  const now = new Date();

  // 날짜와 시간을 "YYYY-MM-DD HH:mm:ss" 형식으로 변환합니다.
  const rdate = now.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\./g, '-').replace(/- /g, '-').replace(/ /, ' ').trim().slice(0, -1);

  return rdate.replace(/-([0-9]{2}:)/, ' $1'); // 2024-11-06 16:29:5
}

// 포커스 이동
function enter_chk(e, nextTag) {
  if (e.keyCode === 13) { // 엔터키
    e.preventDefault();
    document.getElementById(nextTag).focus();
  }
}

const axiosInstance = axios.create({
  // 개발 환경과 배포 환경에 따라 baseURL 설정
  // Vite 환경 변수 사용
  // 개발 환경: http://localhost:4000
  // 배포 환경: 상대 경로 ''
  // import.meta.env.PROD : vite 제공 환경 변수 true: 배포, false: 개발,
  // '': 같은 ip에 Backend 서버가 있다는 가정하에 상대경로로 요청을 보냄.
  // baseURL: import.meta.env.PROD ? '' : 'http://121.160.42.46:9100'
  // baseURL: import.meta.env.PROD ? '' : 'http://1.201.17.110:9093'
  baseURL: import.meta.env.PROD ? '' : `http://${getIP()}:9093`,
  withCredentials: true,
})

axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || "";

    if (status === 401) {
      // ✅ /mypage/me(세션 체크)에서 난 401은 루프 원인이므로 여기서 이벤트 쏘지 않음
      if (url.includes("/mypage/me")) {
        return Promise.reject(err);
      }

      // ✅ 이미 로그아웃 상태면(스토리지 없음) 이벤트/리다이렉트 반복 방지
      const hadLogin = !!localStorage.getItem("loginMemberId");

      localStorage.removeItem("loginMemberId");
      localStorage.removeItem("loginLoginId");
      localStorage.removeItem("memberName");

      if (hadLogin) {
        window.dispatchEvent(new Event("auth-change"));
      }

      // (선택) 보호 페이지에서만 /login으로 보내기
      // if (hadLogin && !["/","/login"].includes(window.location.pathname)) {
      //   window.location.replace("/login");
      // }
    }

    return Promise.reject(err);
  }
);



export { getIP, getCopyright, getNowDate, enter_chk, axiosInstance };
// import {getIP, getCopyright, getNowDate, enter_chk} from 'Tool';
