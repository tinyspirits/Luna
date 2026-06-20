import { useEffect, useState, useRef, useCallback } from 'react';
import { getLatestCycle, startNewCycle, addHistoricalCycle, getAllCycles } from '../services/firestore';
import type { Cycle } from '../services/firestore';
import { getGlobalCycleDay, getGlobalPregnancyChance, calculateSmartPredictions, isDatePredicted, getNextEvents } from '../utils/cycleCalculations';
import { differenceInDays, format, addDays, subDays, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import CycleCalendarModal from '../components/CycleCalendarModal';
import DailyCheckinModal from '../components/DailyCheckinModal';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Info, CheckCircle2, AlertCircle } from 'lucide-react';

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const Home = () => {
  const { currentUser, profile, viewingUid, usePartnerData, setUsePartnerData } = useAuth();
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [allCycles, setAllCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [showTrendInfo, setShowTrendInfo] = useState(false);
  const [showDailyCheckin, setShowDailyCheckin] = useState(false);

  // Swipe gesture state for day strip
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const stripRef = useRef<HTMLDivElement>(null);
  const isSwiping = useRef(false);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Swipe gesture state for main circle
  const circleTouchStartX = useRef<number | null>(null);
  const circleTouchStartY = useRef<number | null>(null);
  const circleTouchDeltaX = useRef(0);
  const isCircleSwiping = useRef(false);
  const [circleSlide, setCircleSlide] = useState({ offset: 0, transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)', opacity: 1 });

  useEffect(() => {
    const fetchCycle = async () => {
      if (!viewingUid) return;
      setLoading(true);
      const [data, history] = await Promise.all([
        getLatestCycle(viewingUid),
        getAllCycles(viewingUid)
      ]);
      setCycle(data);
      setAllCycles(history);
      setLoading(false);
    };
    fetchCycle();
  }, [viewingUid]);

  // Reset selected date when switching partner view
  useEffect(() => {
    setSelectedDate(new Date());
    setWeekOffset(0);
  }, [usePartnerData]);

  // Show daily checkin modal once a day
  useEffect(() => {
    if (!currentUser || profile?.gender === 'male' || usePartnerData) return;
    
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const lastCheckinDate = localStorage.getItem(`lastCheckinDate_${currentUser.uid}`);
    
    if (lastCheckinDate !== todayStr) {
      const timer = setTimeout(() => {
        setShowDailyCheckin(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentUser, profile?.gender, usePartnerData]);

  const handleCloseDailyCheckin = () => {
    if (currentUser) {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      localStorage.setItem(`lastCheckinDate_${currentUser.uid}`, todayStr);
    }
    setShowDailyCheckin(false);
  };

  // Swipe handlers for day strip
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchDeltaX.current = 0;
    isSwiping.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    
    // Only swipe horizontally if horizontal movement > vertical
    if (!isSwiping.current && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isSwiping.current = true;
    }
    
    if (isSwiping.current) {
      e.preventDefault();
      touchDeltaX.current = deltaX;
      setSwipeOffset(deltaX * 0.4); // dampen the offset
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    const SWIPE_THRESHOLD = 50;
    if (Math.abs(touchDeltaX.current) > SWIPE_THRESHOLD) {
      if (touchDeltaX.current > 0) {
        // Swipe right → previous week
        setWeekOffset(w => w - 1);
      } else {
        // Swipe left → next week
        setWeekOffset(w => w + 1);
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
    touchDeltaX.current = 0;
    isSwiping.current = false;
    setSwipeOffset(0);
  }, []);

  // Swipe handlers for main circle
  const handleCircleTouchStart = useCallback((e: React.TouchEvent) => {
    circleTouchStartX.current = e.touches[0].clientX;
    circleTouchStartY.current = e.touches[0].clientY;
    circleTouchDeltaX.current = 0;
    isCircleSwiping.current = false;
  }, []);

  const handleCircleTouchMove = useCallback((e: React.TouchEvent) => {
    if (circleTouchStartX.current === null || circleTouchStartY.current === null) return;
    const deltaX = e.touches[0].clientX - circleTouchStartX.current;
    const deltaY = e.touches[0].clientY - circleTouchStartY.current;
    
    if (!isCircleSwiping.current && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isCircleSwiping.current = true;
    }
    
    if (isCircleSwiping.current) {
      e.preventDefault();
      circleTouchDeltaX.current = deltaX;
      // 1:1 tracking for immediate feel, fade out slightly as it moves away
      setCircleSlide({ 
        offset: deltaX, 
        transition: 'none', 
        opacity: Math.max(0.4, 1 - Math.abs(deltaX) / 300) 
      });
    }
  }, []);

  const handleCircleTouchEnd = useCallback(() => {
    const SWIPE_THRESHOLD = 50;
    const deltaX = circleTouchDeltaX.current;
    
    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
      const isSwipingRight = deltaX > 0;
      
      // Animate out completely
      setCircleSlide({ 
        offset: isSwipingRight ? 300 : -300, 
        transition: 'transform 0.25s ease-out, opacity 0.2s ease-out', 
        opacity: 0 
      });

      // Wait for out-animation to finish
      setTimeout(() => {
        setSelectedDate(prev => {
          const newDate = isSwipingRight ? subDays(prev, 1) : addDays(prev, 1);
          // Auto-adjust week offset if moving to another week
          if (!isSameDay(startOfWeek(newDate, { weekStartsOn: 1 }), startOfWeek(prev, { weekStartsOn: 1 }))) {
            setWeekOffset(w => isSwipingRight ? w - 1 : w + 1);
          }
          return newDate;
        });

        // Instantly move to opposite side for slide-in
        setCircleSlide({ 
          offset: isSwipingRight ? -300 : 300, 
          transition: 'none', 
          opacity: 0 
        });

        // Trigger slide-in on next frame
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setCircleSlide({ 
              offset: 0, 
              transition: 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s ease-in', 
              opacity: 1 
            });
          });
        });
      }, 200);

    } else {
      // Snap back if threshold not met
      setCircleSlide({ 
        offset: 0, 
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease', 
        opacity: 1 
      });
    }

    circleTouchStartX.current = null;
    circleTouchStartY.current = null;
    circleTouchDeltaX.current = 0;
    isCircleSwiping.current = false;
  }, []);

  const handleStartPeriod = async () => {
    if (!currentUser) return;
    setLoading(true);
    await startNewCycle(currentUser.uid, new Date(), { averageCycleLength: 28, averagePeriodLength: 5 });
    const [data, history] = await Promise.all([
      getLatestCycle(currentUser.uid),
      getAllCycles(currentUser.uid)
    ]);
    setCycle(data);
    setAllCycles(history);
    setLoading(false);
  };

  const handleAddHistory = async (cycles: { startDate: Date; endDate: Date }[]) => {
    if (!currentUser) return;
    setLoading(true);
    setShowHistoryModal(false);
    for (const c of cycles) {
      await addHistoricalCycle(currentUser.uid, c.startDate, c.endDate, { averageCycleLength: 28, averagePeriodLength: 5 });
    }
    const [data, history] = await Promise.all([
      getLatestCycle(currentUser.uid),
      getAllCycles(currentUser.uid)
    ]);
    setCycle(data);
    setAllCycles(history);
    setLoading(false);
    alert('Đã thêm chu kỳ cũ thành công!');
  };

  if (loading) {
    return <div className="animate-fade-in"><p>Đang tải dữ liệu của bạn...</p></div>;
  }

  const today = new Date();
  const cycleDay = (cycle && allCycles.length > 0) ? getGlobalCycleDay(selectedDate, allCycles) : 0;
  const smartPred = allCycles.length > 0 ? calculateSmartPredictions(allCycles) : null;
  const { nextOvulationDate, daysUntilNextPeriod, daysUntilNextOvulation } = getNextEvents(selectedDate, allCycles);

  const isMale = profile?.gender === 'male';

  // Build week days for the day strip
  const baseDate = addDays(today, weekOffset * 7);
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 }); // Start on Monday
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Get pregnancy chance for a specific date
  const getChanceForDate = (date: Date) => {
    if (!cycle || allCycles.length === 0) return 'Chưa rõ';
    return getGlobalPregnancyChance(date, allCycles);
  };

  // Get marker class for day strip
  const getMarkerClass = (chance: string) => {
    switch (chance) {
      case 'Đang Hành Kinh': 
      case 'Dự đoán hành kinh': return 'period';
      case 'Trứng rụng': return 'ovulation';
      case 'Cao': return 'fertile';
      case 'Thấp': return 'low';
      case 'An toàn': return 'safe';
      default: return '';
    }
  };

  const selectedChance = (cycle && allCycles.length > 0) ? getGlobalPregnancyChance(selectedDate, allCycles) : 'Chưa rõ';
  const isSelectedToday = isSameDay(selectedDate, today);
  const isPredicted = (cycle && allCycles.length > 0) ? isDatePredicted(selectedDate, allCycles) : false;
  
  const showCountdownOverride = !isPredicted && ((daysUntilNextPeriod !== null && daysUntilNextPeriod > 0 && daysUntilNextPeriod <= 3) || (daysUntilNextOvulation !== null && daysUntilNextOvulation > 0 && daysUntilNextOvulation <= 3));
  const isTransparentCircle = isPredicted || showCountdownOverride;

  // If male and not connected to a partner, show empty state immediately
  if (isMale && !profile?.partnerUid) {
    return (
      <div className="animate-fade-in">
        <h1>Chào buổi sáng 👋</h1>
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <h2>Chưa kết nối bạn đời</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>
            Hãy vào phần <strong>Cài đặt</strong> và nhập mã của bạn đời để bắt đầu theo dõi chu kỳ của cô ấy nhé!
          </p>
        </div>
      </div>
    );
  }

  // Check if partner tab should be shown:
  // Female + Female partner: show toggle tab (can view both)
  // Male + Female partner: NO tab, always show partner data (handled by AuthContext)
  const isFemale = profile?.gender !== 'male';
  const partnerIsFemale = profile?.partnerGender !== 'male';
  const showPartnerTab = !!(profile?.partnerUid && isFemale && partnerIsFemale);

  // Whether user is in read-only mode (viewing partner's data or is male)
  const isReadOnly = isMale || usePartnerData;

  // Get daily insight text based on pregnancy chance
  const getDailyTip = (chance: string) => {
    switch (chance) {
      case 'Trứng rụng':
        return 'Hôm nay cơ thể ở trạng thái dễ thụ thai nhất. Nhiệt độ cơ thể tăng nhẹ, dịch nhầy trong và dai.';
      case 'Cao':
        return 'Đang trong cửa sổ thụ thai. Hormone estrogen tăng cao, tâm trạng thường tốt hơn.';
      case 'Đang Hành Kinh':
      case 'Dự đoán hành kinh':
        return 'Cơ thể đang hành kinh (hoặc dự kiến hành kinh). Nên uống nhiều nước ấm, nghỉ ngơi và bổ sung sắt.';
      case 'Thấp':
        return 'Giai đoạn tỉ lệ thụ thai thấp. Cơ thể đang chuẩn bị cho pha hoàng thể.';
      case 'An toàn':
        return 'Giai đoạn an toàn. Hormone ổn định, cơ thể ở trạng thái bình thường.';
      default:
        return 'Ghi chép chu kỳ để nhận phân tích chi tiết hơn nhé!';
    }
  };

  const getSymptomHint = (chance: string) => {
    switch (chance) {
      case 'Trứng rụng':
        return 'Có thể đau nhẹ bụng dưới (đau giữa chu kỳ), tăng ham muốn, da sáng đẹp hơn.';
      case 'Cao':
        return 'Có thể thấy dịch nhầy nhiều hơn, tâm trạng phấn chấn, năng lượng cao.';
      case 'Đang Hành Kinh':
      case 'Dự đoán hành kinh':
        return 'Đau bụng kinh, mệt mỏi, đau lưng, thay đổi tâm trạng là bình thường.';
      case 'Thấp':
        return 'Có thể xuất hiện mụn, chướng bụng nhẹ, tâm trạng thay đổi.';
      case 'An toàn':
        return 'Cơ thể thường ở trạng thái ổn định nhất, ít triệu chứng bất thường.';
      default:
        return 'Theo dõi cơ thể và ghi chép để nhận phân tích chính xác hơn.';
    }
  };

  return (
    <>
    <div className="animate-fade-in">
      {/* Partner toggle tab - only show when partner is female */}
      {showPartnerTab && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: 'var(--surface)', padding: '4px', borderRadius: '8px' }}>
          <button style={{ flex: 1, padding: '8px', borderRadius: '6px', background: !usePartnerData ? 'var(--primary)' : 'transparent', color: !usePartnerData ? 'white' : 'var(--text-main)', fontWeight: !usePartnerData ? 'bold' : 'normal' }} onClick={() => setUsePartnerData(false)}>Của mình</button>
          <button style={{ flex: 1, padding: '8px', borderRadius: '6px', background: usePartnerData ? 'var(--secondary)' : 'transparent', color: usePartnerData ? 'var(--text-main)' : 'var(--text-main)', fontWeight: usePartnerData ? 'bold' : 'normal' }} onClick={() => setUsePartnerData(true)}>Của {profile?.partnerName || 'bạn đời'}</button>
        </div>
      )}

      {/* Day Strip Header - Month title + Calendar icon */}
      <div className="day-strip-header">
        <h2>{format(weekDays[3] || today, "d 'tháng' M", { locale: vi })}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="calendar-icon-btn" onClick={() => { setWeekOffset(w => w - 1); }} title="Tuần trước">
            <ChevronLeft size={18} />
          </button>
          <button 
            className="calendar-icon-btn" 
            onClick={() => { setWeekOffset(0); setSelectedDate(new Date()); }} 
            title="Hôm nay"
            style={weekOffset === 0 ? { background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' } : {}}
          >
            <CalendarIcon size={16} />
          </button>
          <button className="calendar-icon-btn" onClick={() => { setWeekOffset(w => w + 1); }} title="Tuần sau">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="day-strip-weekdays">
        {WEEKDAY_LABELS.map((label, idx) => (
          <span key={label} className={idx >= 5 ? 'weekend' : ''}>{label}</span>
        ))}
      </div>

      {/* Day Strip - 7 days grid with swipe */}
      <div 
        className="day-strip-swipe-container"
        ref={stripRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="day-strip" 
          style={{ 
            transform: `translateX(${swipeOffset}px)`,
            transition: swipeOffset === 0 ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
          }}
        >
          {weekDays.map(day => {
            const chance = getChanceForDate(day);
            const markerClass = getMarkerClass(chance);
            const isActive = isSameDay(day, selectedDate);
            const isDayToday = isSameDay(day, today);

            return (
              <div
                key={day.toISOString()}
                className={`day-strip-item ${isActive ? 'active' : ''} ${isDayToday ? 'today' : ''}`}
                onClick={() => setSelectedDate(day)}
              >
                <span className={`day-num ${markerClass || ''}`}>{format(day, 'd')}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Heading */}
      <h1>{isReadOnly ? `Chu kỳ của ${profile?.partnerName || 'bạn đời'} 👋` : 'Chào buổi sáng 👋'}</h1>
      <p style={{ marginBottom: '24px' }}>
        {isMale 
          ? `Theo dõi chu kỳ của ${profile?.partnerName || 'cô ấy'} tại đây`
          : usePartnerData 
            ? `Đang xem chu kỳ của ${profile?.partnerName || 'bạn đời'}`
            : 'Hôm nay cơ thể bạn cảm thấy thế nào?'
        }
      </p>

      {/* Main Circle with Ovulation Countdown */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginBottom: '32px', 
          padding: '10px', 
          margin: '0 -10px 22px -10px',
          overflow: 'hidden', 
          touchAction: 'pan-y',
          cursor: 'grab' 
        }}
        onTouchStart={handleCircleTouchStart}
        onTouchMove={handleCircleTouchMove}
        onTouchEnd={handleCircleTouchEnd}
      >
        <div style={{
          width: '250px',
          height: '250px',
          borderRadius: '50%',
          background: isTransparentCircle ? 'transparent' : (cycle ? 'var(--surface)' : 'var(--border)'),
          border: isTransparentCircle ? 'none' : `10px solid ${selectedChance === 'Trứng rụng' ? 'var(--secondary)' : (selectedChance === 'Đang Hành Kinh' || selectedChance === 'Dự đoán hành kinh') ? '#e84393' : 'var(--primary-light)'}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isTransparentCircle ? 'none' : (selectedChance === 'Trứng rụng' 
            ? '0 0 30px rgba(253, 203, 110, 0.3)' 
            : 'var(--shadow-md)'),
          transform: `translateX(${circleSlide.offset}px)`,
          opacity: circleSlide.opacity,
          transition: `${circleSlide.transition}, box-shadow 0.4s ease, border-color 0.4s ease, background 0.4s ease`,
          willChange: 'transform, opacity'
        }}>
          {showCountdownOverride ? (
            <>
              <span style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '1rem', marginBottom: '8px' }}>
                {daysUntilNextPeriod !== null && daysUntilNextPeriod <= 3 ? 'Hành kinh sau' : 'Rụng trứng sau'}
              </span>
              <h2 style={{ fontSize: '3.5rem', margin: '4px 0', color: 'var(--text-main)', lineHeight: 1.1, fontWeight: 800, textAlign: 'center' }}>
                {(daysUntilNextPeriod !== null && daysUntilNextPeriod <= 3) ? daysUntilNextPeriod : daysUntilNextOvulation} ngày nữa
              </h2>
            </>
          ) : isPredicted ? (
            <>
              <span style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '1rem', marginBottom: '8px' }}>
                Dự đoán:
              </span>
              <h2 style={{ fontSize: '2.5rem', margin: '0', color: 'var(--text-main)', lineHeight: 1.1, fontWeight: 800, textAlign: 'center' }}>
                {selectedChance === 'Dự đoán hành kinh' 
                  ? `Ngày có kinh ${cycleDay}` 
                  : selectedChance === 'Trứng rụng' 
                  ? 'Ngày rụng trứng' 
                  : daysUntilNextOvulation !== null && daysUntilNextPeriod !== null && daysUntilNextOvulation < daysUntilNextPeriod
                  ? `Rụng trứng sau ${daysUntilNextOvulation} ngày`
                  : daysUntilNextPeriod !== null && daysUntilNextOvulation !== null && daysUntilNextPeriod < daysUntilNextOvulation
                  ? `Hành kinh sau ${daysUntilNextPeriod} ngày`
                  : `Ngày thứ ${cycleDay}`}
              </h2>
            </>
          ) : cycle ? (
            <>
              {selectedChance === 'Đang Hành Kinh' || selectedChance === 'Dự đoán hành kinh' ? (
                <>
                  <h2 style={{ fontSize: '3.5rem', margin: 0, color: 'var(--primary)', lineHeight: 1 }}>
                    {cycleDay > 0 ? cycleDay : 1}
                  </h2>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500, marginTop: '8px' }}>
                    Ngày của chu kỳ
                  </span>
                </>
              ) : selectedChance === 'Trứng rụng' ? (
                <>
                  <span style={{ color: 'var(--secondary)', fontWeight: 700, fontSize: '0.9rem' }}>
                    🥚 Hôm nay
                  </span>
                  <h2 style={{ fontSize: '2rem', margin: '8px 0', color: 'var(--secondary)', lineHeight: 1.2, fontWeight: 800 }}>
                    Rụng trứng
                  </h2>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>
                    Đỉnh điểm thụ thai
                  </span>
                </>
              ) : daysUntilNextOvulation !== null && daysUntilNextPeriod !== null && daysUntilNextOvulation < daysUntilNextPeriod ? (
                <>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.85rem' }}>
                    Rụng trứng sau
                  </span>
                  <h2 style={{ fontSize: '3.5rem', margin: '4px 0', color: 'var(--secondary)', lineHeight: 1, fontWeight: 800 }}>
                    {daysUntilNextOvulation}
                  </h2>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.9rem' }}>
                    ngày
                  </span>
                </>
              ) : daysUntilNextPeriod !== null && daysUntilNextOvulation !== null && daysUntilNextPeriod < daysUntilNextOvulation ? (
                <>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.85rem' }}>
                    Hành kinh sau
                  </span>
                  <h2 style={{ fontSize: '3.5rem', margin: '4px 0', color: 'var(--primary)', lineHeight: 1, fontWeight: 800 }}>
                    {daysUntilNextPeriod}
                  </h2>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.9rem' }}>
                    ngày nữa
                  </span>
                </>
              ) : (
                <>
                  <h2 style={{ fontSize: '3.5rem', margin: 0, color: 'var(--primary)', lineHeight: 1 }}>
                    {cycleDay > 0 ? cycleDay : 1}
                  </h2>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500, marginTop: '8px' }}>
                    Ngày của chu kỳ
                  </span>
                </>
              )}
              
              {/* Pregnancy chance badge */}
              <div style={{ 
                marginTop: '12px',                    
                boxShadow: `0 0 20px ${selectedChance === 'Trứng rụng' ? 'rgba(253, 203, 110, 0.4)' 
                          : selectedChance === 'Cao' ? 'rgba(155, 89, 182, 0.3)' 
                          : selectedChance === 'Thấp' ? 'rgba(52, 152, 219, 0.2)'
                          : selectedChance === 'An toàn' ? 'rgba(46, 204, 113, 0.2)' 
                          : 'rgba(232, 67, 147, 0.2)'}`, 
                padding: '6px 14px', 
                borderRadius: '20px', 
                fontSize: '0.8rem', 
                fontWeight: 'bold',
                whiteSpace: 'nowrap' as const,
                border: `2px solid ${selectedChance === 'Trứng rụng' ? 'var(--secondary)' 
                      : selectedChance === 'Cao' ? 'var(--primary)' 
                      : selectedChance === 'Thấp' ? '#3498db'
                      : selectedChance === 'An toàn' ? '#27ae60' 
                      : '#e84393'}`,
                color: selectedChance === 'Trứng rụng' ? 'var(--text-main)'
                     : selectedChance === 'Cao' ? 'var(--primary)' 
                     : selectedChance === 'Thấp' ? '#3498db'
                     : selectedChance === 'An toàn' ? '#27ae60' 
                     : '#e84393'
              }}>
                {selectedChance === 'Đang Hành Kinh' || selectedChance === 'Dự đoán hành kinh' 
                  ? selectedChance 
                  : `Thụ thai: ${selectedChance === 'Trứng rụng' ? 'Đỉnh điểm' : selectedChance}`}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <h3 style={{ color: 'var(--text-muted)' }}>Chưa có dữ liệu</h3>
            </div>
          )}
        </div>
      </div>

      {/* Ovulation date info banner */}
      {cycle && nextOvulationDate && (
        <div style={{
          background: 'var(--surface)',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border)'
        }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🥚 Ngày rụng trứng dự kiến
          </span>
          <span style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--secondary)' }}>
            {format(nextOvulationDate, 'dd/MM/yyyy')}
          </span>
        </div>
      )}

      {/* Countdown banner */}
      {cycle && daysUntilNextPeriod !== null && (
        <div style={{
          background: daysUntilNextPeriod <= 3 ? 'linear-gradient(135deg, var(--primary), var(--primary-light))' : 'var(--surface)',
          borderRadius: '12px',
          padding: '14px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border)'
        }}>
          <span style={{ fontSize: '0.9rem', color: daysUntilNextPeriod <= 3 ? '#fff' : 'var(--text-muted)' }}>Kỳ kinh tiếp theo</span>
          <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: daysUntilNextPeriod <= 3 ? '#fff' : 'var(--primary)' }}>
            {daysUntilNextPeriod <= 0 ? 'Đã đến hạn!' : `Còn ${daysUntilNextPeriod} ngày`}
          </span>
        </div>
      )}

      {/* Chu kỳ của tôi (My Cycle Stats) */}
      {allCycles.length >= 2 && (() => {
        const sortedDesc = [...allCycles].sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
        const prevCycle = sortedDesc[1];
        const currentCycle = sortedDesc[0];
        
        const prevCycleLength = differenceInDays(currentCycle.startDate, prevCycle.startDate);
        const rawPeriodLen = prevCycle.endDate ? (differenceInDays(prevCycle.endDate, prevCycle.startDate) + 1) : 5;
        const prevPeriodLength = rawPeriodLen > 10 ? 5 : rawPeriodLen; // Kỳ kinh không thể > 10 ngày, nếu > 10 thì endDate là ngày cuối chu kỳ chứ không phải ngày cuối kinh
        
        const lengths: number[] = [];
        for (let i = 0; i < sortedDesc.length - 1; i++) {
          lengths.push(differenceInDays(sortedDesc[i].startDate, sortedDesc[i+1].startDate));
        }
        const validLengths = lengths.filter(l => l > 15 && l < 60);
        const minLen = validLengths.length > 0 ? Math.min(...validLengths) : prevCycleLength;
        const maxLen = validLengths.length > 0 ? Math.max(...validLengths) : prevCycleLength;

        const isCycleNormal = prevCycleLength >= 21 && prevCycleLength <= 35;
        const isPeriodNormal = prevPeriodLength >= 2 && prevPeriodLength <= 7;
        const isRegular = maxLen - minLen <= 7;

        return (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ marginBottom: '16px' }}>Chu kỳ của tôi</h2>
            <div style={{
              background: 'var(--surface)',
              borderRadius: '16px',
              padding: '0 16px',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--border)'
            }}>
              {/* Row 1 */}
              <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Độ dài chu kỳ trước</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{prevCycleLength} ngày</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isCycleNormal ? '#27ae60' : '#e67e22', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  {isCycleNormal ? <CheckCircle2 size={16} color="#27ae60" fill="#e8f8f5" /> : <AlertCircle size={16} color="#e67e22" fill="#fef5e7" />}
                  {isCycleNormal ? 'BÌNH THƯỜNG' : 'BẤT THƯỜNG'}
                </div>
              </div>
              
              {/* Row 2 */}
              <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Độ dài kỳ kinh trước</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{prevPeriodLength} ngày</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isPeriodNormal ? '#27ae60' : '#e67e22', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  {isPeriodNormal ? <CheckCircle2 size={16} color="#27ae60" fill="#e8f8f5" /> : <AlertCircle size={16} color="#e67e22" fill="#fef5e7" />}
                  {isPeriodNormal ? 'BÌNH THƯỜNG' : 'BẤT THƯỜNG'}
                </div>
              </div>
              
              {/* Row 3 */}
              <div style={{ padding: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Thay đổi về độ dài chu kỳ</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{minLen === maxLen ? `${minLen} ngày` : `${minLen}-${maxLen} ngày`}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isRegular ? '#27ae60' : '#e67e22', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  {isRegular ? <CheckCircle2 size={16} color="#27ae60" fill="#e8f8f5" /> : <AlertCircle size={16} color="#e67e22" fill="#fef5e7" />}
                  {isRegular ? 'ĐỀU' : 'KHÔNG ĐỀU'}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Xu hướng chu kỳ - Cycle Trend Chart */}
      {allCycles.length >= 2 && (() => {
        const sortedCycles = [...allCycles].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
        const cycleLengths: { label: string; length: number; startDate: Date }[] = [];
        
        for (let i = 1; i < sortedCycles.length; i++) {
          const len = differenceInDays(sortedCycles[i].startDate, sortedCycles[i - 1].startDate);
          if (len > 15 && len < 60) {
            cycleLengths.push({
              label: format(sortedCycles[i - 1].startDate, 'd/M'),
              length: len,
              startDate: sortedCycles[i - 1].startDate,
            });
          }
        }
        // Add current cycle
        const lastCycle = sortedCycles[sortedCycles.length - 1];
        const currentLen = differenceInDays(today, lastCycle.startDate);
        if (currentLen > 0) {
          cycleLengths.push({
            label: 'Nay',
            length: currentLen,
            startDate: lastCycle.startDate,
          });
        }

        // Show max 6 recent cycles for cleaner display
        const displayCycles = cycleLengths.slice(-6);
        if (displayCycles.length < 2) return null;

        const avgLen = smartPred?.averageCycleLength ?? 28;
        const minLen = Math.min(...displayCycles.map(c => c.length));
        const maxLen = Math.max(...displayCycles.map(c => c.length));
        const range = Math.max(maxLen - minLen, 6);
        const paddedMin = minLen - 3;
        const paddedRange = range + 6;

        // SVG dimensions - larger for better readability
        const svgWidth = 340;
        const svgHeight = 180;
        const padX = 20;
        const padTop = 30;
        const padBottom = 28;
        const chartW = svgWidth - padX * 2;
        const chartH = svgHeight - padTop - padBottom;

        const points = displayCycles.map((c, i) => {
          const x = padX + (i / (displayCycles.length - 1)) * chartW;
          const y = padTop + chartH - ((c.length - paddedMin) / paddedRange) * chartH;
          return { x, y, ...c };
        });

        // Create smooth curve path
        const pathD = points.reduce((acc, pt, i) => {
          if (i === 0) return `M ${pt.x} ${pt.y}`;
          const prev = points[i - 1];
          const cpx1 = prev.x + (pt.x - prev.x) * 0.35;
          const cpx2 = pt.x - (pt.x - prev.x) * 0.35;
          return `${acc} C ${cpx1} ${prev.y} ${cpx2} ${pt.y} ${pt.x} ${pt.y}`;
        }, '');

        // Average line Y
        const avgY = padTop + chartH - ((avgLen - paddedMin) / paddedRange) * chartH;
        const ABNORMAL_THRESHOLD = 5;

        return (
          <div className="card cycle-trend-card">
            <div className="cycle-trend-header">
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Xu hướng chu kỳ</h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {cycleLengths.length} chu kỳ · TB {avgLen} ngày
                </span>
              </div>
              <Info size={18} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
            </div>
            
            <div className="cycle-trend-chart">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="xMidYMid meet" width="100%">
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e84393" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#e84393" stopOpacity="0.02" />
                  </linearGradient>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#e84393" />
                    <stop offset="50%" stopColor="#f8a5c2" />
                    <stop offset="100%" stopColor="#e84393" />
                  </linearGradient>
                </defs>

                {/* Subtle grid lines */}
                {[0, 0.5, 1].map((frac, i) => {
                  const gy = padTop + chartH * (1 - frac);
                  return (
                    <line key={i} x1={padX} y1={gy} x2={svgWidth - padX} y2={gy}
                      stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4,4" opacity="0.5" />
                  );
                })}

                {/* Average reference line */}
                {avgY > padTop && avgY < padTop + chartH && (
                  <>
                    <line x1={padX} y1={avgY} x2={svgWidth - padX} y2={avgY}
                      stroke="var(--primary)" strokeWidth="1.2" strokeDasharray="8,4" opacity="0.4" />
                    <rect x={svgWidth - padX - 32} y={avgY - 10} width="36" height="16" rx="4"
                      fill="var(--primary)" opacity="0.15" />
                    <text x={svgWidth - padX - 14} y={avgY + 1} textAnchor="middle" fontSize="8" fontWeight="600" fill="var(--primary)" opacity="0.8">
                      TB {avgLen}
                    </text>
                  </>
                )}

                {/* Area fill under curve */}
                <path
                  d={`${pathD} L ${points[points.length - 1].x} ${padTop + chartH} L ${points[0].x} ${padTop + chartH} Z`}
                  fill="url(#trendGradient)"
                />

                {/* Main curve line with gradient */}
                <path d={pathD} fill="none" stroke="url(#lineGradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Data points and labels */}
                {points.map((pt, i) => {
                  const isAbnormal = Math.abs(pt.length - avgLen) >= ABNORMAL_THRESHOLD;
                  const isHigh = pt.length > avgLen;
                  return (
                    <g key={i}>
                      {/* Abnormal glow ring */}
                      {isAbnormal && (
                        <circle cx={pt.x} cy={pt.y} r="14"
                          fill={isHigh ? 'rgba(232,67,147,0.12)' : 'rgba(253,203,110,0.18)'}
                        />
                      )}
                      
                      {/* Point */}
                      <circle cx={pt.x} cy={pt.y} r={isAbnormal ? '5' : '4'}
                        fill={isAbnormal ? (isHigh ? '#e84393' : '#fbc531') : '#f8a5c2'}
                        stroke="white" strokeWidth="2"
                      />
                      
                      {/* Cycle length number above point */}
                      <text x={pt.x} y={pt.y - (isAbnormal ? 20 : 12)}
                        textAnchor="middle" fontSize={isAbnormal ? '10' : '9'} 
                        fontWeight={isAbnormal ? '800' : '600'}
                        fill={isAbnormal ? (isHigh ? '#e84393' : '#d4850e') : 'var(--text-main)'}>
                        {pt.length}
                      </text>

                      {/* Abnormal label below number */}
                      {isAbnormal && (
                        <text x={pt.x} y={pt.y - (isHigh ? 30 : 30)}
                          textAnchor="middle" fontSize="6.5" fontWeight="700" letterSpacing="0.5"
                          fill={isHigh ? '#e84393' : '#d4850e'} opacity="0.85">
                          BẤT THƯỜNG
                        </text>
                      )}

                      {/* X-axis label */}
                      <text x={pt.x} y={svgHeight - 6} textAnchor="middle" fontSize="9" fill="var(--text-muted)" fontWeight="500">
                        {pt.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div style={{ marginTop: '16px', background: 'var(--surface)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)' }}>
              <div 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => setShowTrendInfo(!showTrendInfo)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Info size={18} color="var(--primary)" />
                  <span>Tìm hiểu về Biểu đồ xu hướng</span>
                </div>
                {showTrendInfo ? <ChevronLeft style={{ transform: 'rotate(90deg)' }} size={18} /> : <ChevronRight style={{ transform: 'rotate(90deg)' }} size={18} />}
              </div>
              
              {showTrendInfo && (
                <div className="animate-fade-in" style={{ marginTop: '16px', fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
                  <p style={{ marginBottom: '12px' }}>
                    Biểu đồ xu hướng chu kỳ là một "bảng điều khiển sức khỏe", giúp nhận diện quy luật sinh học của cơ thể. Điểm lệch ≥{ABNORMAL_THRESHOLD} ngày so với trung bình sẽ được đánh dấu bất thường.
                  </p>
                  
                  <h4 style={{ margin: '16px 0 4px', color: 'var(--primary)', fontSize: '0.95rem' }}>1. Trực quan hóa dữ liệu</h4>
                  <p style={{ color: 'var(--text-muted)' }}>Theo dõi độ dài chu kỳ và số ngày hành kinh qua từng tháng, giúp dễ dàng nhìn thấy chu kỳ của mình đang ổn định hay dao động.</p>
                  
                  <h4 style={{ margin: '16px 0 4px', color: 'var(--primary)', fontSize: '0.95rem' }}>2. Cảnh báo sức khỏe (Anomaly Detection)</h4>
                  <p style={{ color: 'var(--text-muted)' }}>Nhận diện ngay lập tức sự không đều: các chu kỳ quá dài (trên 35 ngày), quá ngắn (dưới 21 ngày). Đây là manh mối sớm cho các vấn đề như mất cân bằng nội tiết, PCOS, tuyến giáp, căng thẳng hoặc thay đổi cân nặng.</p>

                  <h4 style={{ margin: '16px 0 4px', color: 'var(--primary)', fontSize: '0.95rem' }}>3. Nâng cao độ chính xác dự đoán</h4>
                  <p style={{ color: 'var(--text-muted)' }}>Dữ liệu lịch sử là "nguồn thức ăn" cho AI. Càng ghi nhận nhiều chu kỳ, thuật toán càng hiểu rõ quy luật cá nhân của bạn, từ đó dự báo tương lai chính xác hơn.</p>

                  <h4 style={{ margin: '16px 0 4px', color: 'var(--primary)', fontSize: '0.95rem' }}>4. Báo cáo Y tế chuyên nghiệp</h4>
                  <p style={{ color: 'var(--text-muted)' }}>Khi thăm khám bác sĩ, dữ liệu trực quan này cung cấp một bệnh sử y khoa rõ ràng, hỗ trợ chẩn đoán nhanh và chuẩn xác hơn thay vì phải tường thuật bằng trí nhớ.</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}



      {/* Quick Actions */}
      <div className="card">
        <h2>Thao tác nhanh</h2>
        {isMale ? (
          /* Nam: chỉ xem, không cần cập nhật kỳ kinh */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {cycle ? (
              <>
                <p><strong>Kỳ kinh tiếp theo:</strong> {cycle.expectedNextPeriod.toLocaleDateString()}</p>
                <p><strong>Ngày rụng trứng:</strong> {cycle.expectedOvulation.toLocaleDateString()}</p>
              </>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                {profile?.partnerName || 'Bạn đời'} chưa có dữ liệu chu kỳ nào.
              </p>
            )}
          </div>
        ) : usePartnerData ? (
          /* Nữ đang xem bạn đời nữ: read-only */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              🔒 Đang xem chu kỳ của {profile?.partnerName || 'bạn đời'}. Chỉ {profile?.partnerName || 'bạn đời'} mới có thể cập nhật dữ liệu.
            </p>
            {cycle && (
              <>
                <p><strong>Kỳ kinh tiếp theo:</strong> {cycle.expectedNextPeriod.toLocaleDateString()}</p>
                <p><strong>Ngày rụng trứng:</strong> {cycle.expectedOvulation.toLocaleDateString()}</p>
              </>
            )}
          </div>
        ) : (
          /* Nữ xem dữ liệu của mình: có thể chỉnh sửa */
          <>
            {!cycle ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>Bạn chưa có dữ liệu chu kỳ nào. Hãy bắt đầu!</p>
                <button className="btn-primary" onClick={handleStartPeriod}>
                  Bắt đầu chu kỳ hôm nay
                </button>
                <button className="btn-secondary" style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)' }} onClick={() => setShowHistoryModal(true)}>
                  📅 Nhập chu kỳ cũ (Lịch sử)
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p><strong>Kỳ kinh tiếp theo:</strong> {cycle.expectedNextPeriod.toLocaleDateString()}</p>
                <p><strong>Ngày rụng trứng:</strong> {cycle.expectedOvulation.toLocaleDateString()}</p>
                <button className="btn-secondary" style={{ width: '100%', marginTop: '10px' }} onClick={handleStartPeriod}>
                  Bắt đầu chu kỳ mới
                </button>
                <button className="btn-secondary" style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)' }} onClick={() => setShowHistoryModal(true)}>
                  📅 Nhập chu kỳ cũ (Lịch sử)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Today's Status Detail */}
      <div className="card">
        <h2>Tình trạng {isSelectedToday ? 'hôm nay' : format(selectedDate, "d 'thg' M")}</h2>
        {cycle ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '16px', borderRadius: '8px', background: 'var(--surface)', borderLeft: `4px solid ${selectedChance === 'Trứng rụng' ? 'var(--secondary)' : selectedChance === 'Cao' ? '#f8a5c2' : selectedChance === 'Thấp' ? '#3498db' : selectedChance === 'An toàn' ? '#2ecc71' : '#e84393'}` }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Tỉ lệ thụ thai: <span style={{ color: 'var(--primary)' }}>{selectedChance === 'Trứng rụng' ? 'Đỉnh điểm' : selectedChance}</span></h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                {selectedChance === 'Trứng rụng' && 'Hôm nay là ngày rụng trứng! Khả năng thụ thai đạt đỉnh điểm. Nếu không muốn có thai, hãy sử dụng biện pháp tránh thai an toàn.'}
                {selectedChance === 'Cao' && 'Bạn đang trong cửa sổ thụ thai (khoảng thời gian dễ mang thai nhất trong tháng). Hãy lưu ý nhé!'}
                {selectedChance === 'Thấp' && 'Khả năng thụ thai thấp, tuy nhiên vẫn có một phần trăm nhỏ xác suất xảy ra do thời gian rụng trứng có thể xê dịch.'}
                {selectedChance === 'An toàn' && 'Hôm nay là ngày an toàn. Tỉ lệ mang thai gần như bằng 0, cơ thể đang ở trạng thái ổn định.'}
                {(selectedChance === 'Đang Hành Kinh' || selectedChance === 'Dự đoán hành kinh') && 'Đang trong kỳ kinh nguyệt (hoặc dự kiến). Hãy giữ ấm cơ thể và nghỉ ngơi nhiều hơn.'}
              </p>
            </div>

            {/* Symptom & Tip detail */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(251, 197, 49, 0.08)', border: '1px solid rgba(251, 197, 49, 0.2)' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '6px' }}>💡 Triệu chứng</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{getSymptomHint(selectedChance)}</p>
              </div>
              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(155, 89, 182, 0.06)', border: '1px solid rgba(155, 89, 182, 0.15)' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '6px' }}>🌸 Lời khuyên</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{getDailyTip(selectedChance)}</p>
              </div>
            </div>
          </div>
        ) : (
          <p>Hãy bắt đầu chu kỳ để xem các phân tích chi tiết nhé!</p>
        )}
      </div>
    </div>

      {showHistoryModal && (
        <CycleCalendarModal
          existingCycles={allCycles}
          onClose={() => setShowHistoryModal(false)}
          onSave={handleAddHistory}
        />
      )}

      {showDailyCheckin && (
        <DailyCheckinModal
          onClose={handleCloseDailyCheckin}
        />
      )}
    </>
  );
};

export default Home;
