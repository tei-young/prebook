// src/constants/messageTemplates.ts
interface MessageTemplate {
    title: string;
    content: string;
    requiresCustomization: boolean;
  }
  
  export const MESSAGE_TEMPLATES = {
    DEPOSIT_GUIDE: {
      title: '예약금 안내',
      content: `•예약금 안내•
  ❗예약금 5만원 입금 후 예약완료 됩니다. 
  동반예약은 1명이 같이 신청하는 경우는 2명분 입금부탁드립니다.
  *입금기한 : 1시간 이내로 입금해주시면 예약확정*
  3333113961313 카카오뱅크 김도희
  - 키뮤에서는 100% 예약제로 운영되며, 
  고객님 한 분만을 위하여 예약시간을 비워놓습니다.
  이러한 특성상 예약금은 약속보증의 의미로 미리 선입금 받고있으며, 시술금액에서 미리 입금하신 예약금 5만원은 차감됩니다.
  - 상세위치 안내는 예약금 입금 확인 이후에 안내드립니다. (신사역 8번출구 도보 10분거리)
  - 1인샵 특성상 한분 한분에게 최선의 집중을 위하여 하루 전 예약취소 및 노쇼로 인한 예약금은 환불 불가합니다. 신중한 예약을 부탁드립니다.`,
      requiresCustomization: false
    },
    CONFIRMATION: {
      title: '예약 확정 안내',
      content: `•예약 확정 안내•
  예약금 확인 완료되어, 예약확정 안내드립니다🎀
  아래 내용 확인 부탁드리며, 시술 당일날 다시한 번 연락드리겠습니다 :) 
  ▶ 예약일 : {appointmentDate}
  ▶ 예약 시간 : {appointmentTime}
  ▶ 예약자 {customerName}님
  ▶ 찾아오실 주소 :
  서울시 강남구 압구정로 2길 6(신사동), 코스모 403호
  **모든 이벤트 비용은 현금가 기준입니다. (계좌이체 가능)
  카드 결제 시, 정가로 청구되는 점 참고부탁드립니다.
  ▪ 예약일 2일전 - 날짜, 시간 변경 가능
  ▪ 예약 당일/예약일 1일 전 - 날짜, 시간 변경불가 x
    *예약 취소 시, 예약금 환불 불가합니다.      (예약금 소멸됨)
  ▪ 예약시간 10분이상 늦으시는 경우, 예약 자동 취소 (예약금 환불 불가, 소멸됨)`,
      requiresCustomization: true
    }
  } as const;
  
  // 메시지 변수 치환 함수
  export const customizeMessage = (
    template: MessageTemplate, 
    variables: { [key: string]: string }
  ): string => {
    if (!template.requiresCustomization) return template.content;
    
    let content = template.content;
    Object.entries(variables).forEach(([key, value]) => {
      content = content.replace(`{${key}}`, value);
    });
    return content;
  };