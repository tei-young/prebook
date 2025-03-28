'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import Calendar from '@/components/calendar/Calendar';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { isSameDay } from 'date-fns';
import type { TimeSlot, BookedSlot } from '@/components/calendar/Calendar';
import { serviceTypes, SERVICE_MAP } from '@/components/calendar/Calendar';
import { cn } from '@/lib/utils';

interface DesiredSlot {
  date: string;
  time: string;
 }

 interface FormData {
  termsAgreed: boolean;
  name: string;
  gender: string;
  age: string;
  phone: string;
  desiredService: keyof typeof serviceTypes;
  referralSource: string;
  desired_slots: TimeSlot[];  // Calendar의 TimeSlot 타입 사용
  priorExperience: string;
  frontPhoto: File | null;
  closedPhoto: File | null;
}

const CustomerReservationPage = () => {
  const [formData, setFormData] = useState<FormData>({
    termsAgreed: false,
    name: '',
    gender: '',
    age: '',
    phone: '',
    desiredService: '' as keyof typeof serviceTypes, 
    referralSource: '',
    desired_slots: [],
    priorExperience: '',
    frontPhoto: null,
    closedPhoto: null
  });
 
 const [reservedSlots, setReservedSlots] = useState<BookedSlot[]>([]);
 const [submitted, setSubmitted] = useState(false);

 const handleServiceSelect = (serviceType: keyof typeof serviceTypes) => {
  setFormData(prev => ({
    ...prev,
    desiredService: serviceType,
    desired_slots: []  // 시술 변경시 선택된 시간 초기화
  }));
};

 useEffect(() => {
  async function fetchReservedSlots() {
    const { data, error } = await supabase
      .from('reservations')
      .select('desired_slots, status, selected_slot, desired_service');  // desired_service 추가

    if (error) {
      console.error('예약 데이터 조회 실패:', error);
      return;
    }

    const slots: BookedSlot[] = data.flatMap(reservation => 
      reservation.desired_slots.map((slot: TimeSlot) => ({
        date: slot.date,
        time: slot.time,
        status: reservation.status,
        selected_slot: reservation.selected_slot,
        serviceType: reservation.desired_service  // serviceType 추가
      }))
    );

    setReservedSlots(slots);
  }

  fetchReservedSlots();
}, []);

 const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (!formData.termsAgreed) {
    alert('예약 전 숙지사항 확인이 필요합니다.');
    return;
  }
  
  try {
    // 0. 중복 예약 방지로, 먼저 동일 예약 있는지 확인
    const { data: existingReservations } = await supabase
    .from('reservations')
    .select('*')
    .eq('phone', formData.phone)
    .eq('status', 'pending');

  if (existingReservations && existingReservations.length > 0) {
    alert('이미 처리 중인 예약이 있습니다.');
    return;
  }

    // 1. 이미지 업로드
    let frontPhotoUrl = null;
    let closedPhotoUrl = null;

    if (formData.frontPhoto) {
      const frontPhotoPath = `reservation-photos/${Date.now()}_front`;
      const { data: frontData, error: frontError } = await supabase.storage
        .from('photos')
        .upload(frontPhotoPath, formData.frontPhoto);
      
      if (frontError) throw frontError;
      frontPhotoUrl = frontData.path;
    }

    if (formData.closedPhoto) {
      const closedPhotoPath = `reservation-photos/${Date.now()}_closed`;
      const { data: closedData, error: closedError } = await supabase.storage
        .from('photos')
        .upload(closedPhotoPath, formData.closedPhoto);
      
      if (closedError) throw closedError;
      closedPhotoUrl = closedData.path;
    }

    // 2. 예약 데이터 저장
    const { data, error } = await supabase
      .from('reservations')
      .insert([{
        customer_name: formData.name,
        gender: formData.gender,
        age: parseInt(formData.age),
        phone: formData.phone,
        desired_service: formData.desiredService,
        referral_source: formData.referralSource,
        desired_slots: formData.desired_slots,  // 새로 추가된 필드
        prior_experience: formData.priorExperience,
        front_photo_url: frontPhotoUrl,
        closed_photo_url: closedPhotoUrl,
        status: 'pending'
      }])
      .select();

    if (error) throw error;

    console.log('예약 요청 성공:', data);
    setSubmitted(true);
  } catch (error) {
    console.error('예약 요청 중 오류 발생:', error);
    alert('예약 요청 중 오류가 발생했습니다.');
  }
};

 const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
   const { name, value, type } = e.target;
   if (type === 'file') {
     const fileInput = e.target as HTMLInputElement;
     setFormData(prev => ({
       ...prev,
       [name]: fileInput.files?.[0] || null
     }));
   } else {
     setFormData(prev => ({
       ...prev,
       [name]: value
     }));
   }
 };

 return (
   <div className="min-h-screen bg-gray-50 p-4">
     <div className="max-w-2xl mx-auto pt-8">
       <Card>
         <CardHeader>
           <CardTitle className="text-center text-2xl">예약 요청</CardTitle>
         </CardHeader>
         <CardContent>
           {submitted ? (
             <Alert>
               <AlertDescription>
                 예약 요청이 접수되었습니다. 원장님 확인 후 예약 확정 메시지를 보내드리겠습니다.
               </AlertDescription>
             </Alert>
           ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 숙지사항 체크 */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="terms"
                      checked={formData.termsAgreed}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, termsAgreed: checked as boolean }))
                      }
                    />
                    <Label htmlFor="terms">예약 전 숙지사항 필독하셨나요?</Label>
                  </div>
                </div>

                {/* 기본 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">성함</Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">성별</Label>
                    <select
                      id="gender"
                      name="gender"
                      className="w-full h-10 px-3 border rounded-md"
                      required
                      value={formData.gender}
                      onChange={handleChange}
                    >
                      <option value="">선택해주세요</option>
                      <option value="female">여성</option>
                      <option value="male">남성</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="age">나이</Label>
                    <Input
                      id="age"
                      name="age"
                      type="number"
                      required
                      value={formData.age}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">연락처</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* 시술 정보 */}
                {/* 시술 선택 섹션 */}
                <div className="space-y-2">
                  <Label htmlFor="desiredService">희망시술</Label>
                  
                  {/* 시술 선택 버튼 그룹 */}
                  <div className="space-y-4">
                    {/* 눈썹문신 그룹 */}
                    <div>
                      <h3 className="font-medium mb-2">눈썹문신</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'natural', name: '자연눈썹', desc: '키뮤원장과 상담 후 자연눈썹 디자인으로 시술 진행해드려요!' },
                          { id: 'combo', name: '콤보눈썹', desc: '키뮤원장과 상담 후 콤보눈썹 디자인으로 시술 진행해드려요!' },
                          { id: 'shadow', name: '섀도우눈썹', desc: '키뮤원장과 상담 후 섀도우눈썹 디자인으로 시술 진행해드려요!' },
                          { id: 'recommend', name: '키뮤원장 추천시술', desc: '키뮤원장과 상담 후 맞춤시술 진행해드려요!' },
                          { id: 'retouch', name: '리터치', desc: '눈썹문신 시술 후 n회 무료 리터치' }
                        ].map((service) => (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => handleServiceSelect(service.id as keyof typeof serviceTypes)}
                            className={cn(
                              "p-4 border rounded-lg text-left",
                              formData.desiredService === service.id 
                                ? "border-blue-500 bg-blue-50" 
                                : "hover:border-gray-400"
                            )}
                          >
                            <div className="font-medium">{service.name}</div>
                            <div className="text-sm text-gray-500 mt-1">{service.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 기타 시술 그룹 */}
                    <div>
                      <h3 className="font-medium mb-2">기타 시술</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'brownline', name: '브라운아이라인', desc: '아이라인을 브라운 이쁘게' },
                          { id: 'removal', name: '잔흔제거', desc: '키뮤디자인을 완벽하게 하기 위한 잔흔 시술!' },
                        ].map((service) => (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => handleServiceSelect(service.id as keyof typeof serviceTypes)}
                            className={cn(
                              "p-4 border rounded-lg text-left",
                              formData.desiredService === service.id 
                                ? "border-blue-500 bg-blue-50" 
                                : "hover:border-gray-400"
                            )}
                          >
                            <div className="font-medium">{service.name}</div>
                            <div className="text-sm text-gray-500 mt-1">{service.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referralSource">방문 경로 (선택사항)</Label>
                  <Input
                    id="referralSource"
                    name="referralSource"
                    placeholder="ex) 인스타그램 광고, 지인추천"
                    value={formData.referralSource}
                    onChange={handleChange}
                  />
                </div>

                {/* 캘린더 교체 부분 */}
                <div className="space-y-4">
                <Label htmlFor="desiredDates">희망 시술일정 (1~3개 선택)</Label>
                <Calendar
                  bookedSlots={reservedSlots}
                  selectedSlots={formData.desired_slots}
                  onSelectSlot={(slot) => {
                    setFormData(prev => ({
                      ...prev,
                      desired_slots: [...prev.desired_slots, slot]
                    }));
                  }}
                  onRemoveSlot={(slotToRemove) => {
                    setFormData(prev => ({
                      ...prev,
                      desired_slots: prev.desired_slots.filter(
                        slot => slot.date !== slotToRemove.date || slot.time !== slotToRemove.time
                      )
                    }));
                  }}
                  maxSelections={3}
                  serviceType={formData.desiredService}
                />
                
                {formData.desired_slots.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium">선택된 시간</h4>
                    <div className="space-y-2">
                      {formData.desired_slots.map((slot, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 bg-green-50 rounded"
                        >
                          <span>
                            {format(new Date(slot.date), 'M월 d일', { locale: ko })} {slot.time}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                desired_slots: prev.desired_slots.filter((_, i) => i !== index)
                              }));
                            }}
                          >
                            삭제
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

                <div className="space-y-2">
                  <Label htmlFor="priorExperience">시술 경험 (선택사항)</Label>
                  <Textarea
                    id="priorExperience"
                    name="priorExperience"
                    value={formData.priorExperience}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">사진첨부</h3>
                  <p className="text-sm text-gray-600">
                    기본카메라로 노메이크업 상태의 정면눈썹 사진 2장 전송부탁드립니다.
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="frontPhoto">정면 사진 (눈 뜬 상태)</Label>
                    <Input
                      id="frontPhoto"
                      name="frontPhoto"
                      type="file"
                      accept="image/*"
                      required
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="closedPhoto">정면 사진 (눈 감은 상태)</Label>
                    <Input
                      id="closedPhoto"
                      name="closedPhoto"
                      type="file"
                      accept="image/*"
                      required
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  예약 요청하기
                </Button>
              </form>
           )}
         </CardContent>
       </Card>
     </div>
   </div>
 );
};

export default CustomerReservationPage;