import { useState, useEffect } from 'react';
import { saveDailyLog, getDailyLog } from '../services/firestore';
import { useAuth } from '../contexts/AuthContext';
import DatePicker from '../components/DatePicker';
import { format } from 'date-fns';

const symptomsList = [
  'Đau bụng', 'Chuột rút', 'Đau lưng', 'Đau đầu',
  'Đầy hơi', 'Nổi mụn', 'Mệt mỏi', 'Nhạy cảm ngực', 'Thèm ăn'
];
const moodList = [
  'Vui vẻ', 'Tình cảm', 'Hưng phấn',
  'Bình tĩnh', 'Buồn bã', 'Cáu kỉnh',
  'Lo âu', 'Trầm cảm', 'Căng thẳng'
];
const dischargeOptions = [
  { value: 'none', label: 'Không có' },
  { value: 'light', label: 'Ít / Khô' },
  { value: 'creamy', label: 'Màu kem' },
  { value: 'eggwhite', label: '🥚 Dạng trứng (dễ thụ thai)' },
  { value: 'heavy', label: 'Nhiều' },
];
const bleedingMap: Record<string, string> = { 'light': 'Ít', 'medium': 'Vừa', 'heavy': 'Nhiều' };

const Log = () => {
  const { currentUser, viewingUid, usePartnerData } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [bleeding, setBleeding] = useState<'light' | 'medium' | 'heavy' | null>(null);
  const [discharge, setDischarge] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [mood, setMood] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchLog = async () => {
      if (!viewingUid) return;
      const log = await getDailyLog(viewingUid, date);
      if (log) {
        setBleeding(log.bleeding);
        setSymptoms(log.symptoms || []);
        setMood(log.mood || []);
        setNotes(log.notes || '');
        setDischarge((log as any).discharge || null);
      } else {
        setBleeding(null);
        setDischarge(null);
        setSymptoms([]);
        setMood([]);
        setNotes('');
      }
    };
    fetchLog();
  }, [date, viewingUid]);

  const toggleArrayItem = (array: string[], setArray: (val: string[]) => void, item: string) => {
    if (array.includes(item)) {
      setArray(array.filter(i => i !== item));
    } else {
      setArray([...array, item]);
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    await saveDailyLog(currentUser.uid, date, {
      date: new Date(date),
      bleeding,
      symptoms,
      mood,
      notes,
      discharge,
    } as any);
    setSaving(false);
    alert('Đã lưu thông tin thành công!');
  };

  const chipStyle = (active: boolean, color = 'var(--primary)') => ({
    padding: '8px 14px',
    borderRadius: '20px',
    border: `2px solid ${active ? color : 'var(--border)'}`,
    background: active ? color : 'transparent',
    color: active ? 'white' : 'var(--text-main)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: active ? '600' : '400',
    transition: 'all 0.2s',
  });

  return (
    <div className="animate-fade-in">
      <h1>Ghi chép hằng ngày {usePartnerData && '(Chế độ xem Bạn đời)'}</h1>

      <div className="card">
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Ngày</label>
        <DatePicker value={date} onChange={setDate} />
      </div>

      {usePartnerData ? (
        <div className="card">
          <h2 style={{ marginBottom: '16px' }}>Chi tiết ngày {format(new Date(date), "dd/MM/yyyy")}</h2>
          {!bleeding && !discharge && symptoms.length === 0 && mood.length === 0 && !notes ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
              Người ấy chưa ghi chép gì vào ngày này.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {bleeding && (
                <div>
                  <span style={{ fontWeight: 600 }}>🩸 Lượng máu: </span>
                  <span style={{ color: 'var(--primary)' }}>{bleedingMap[bleeding]}</span>
                </div>
              )}
              {discharge && (
                <div>
                  <span style={{ fontWeight: 600 }}>💧 Dịch tiết: </span>
                  <span style={{ color: 'var(--secondary)' }}>{dischargeOptions.find(o => o.value === discharge)?.label}</span>
                </div>
              )}
              {symptoms.length > 0 && (
                <div>
                  <span style={{ fontWeight: 600 }}>🤕 Triệu chứng: </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {symptoms.map(s => <span key={s} style={{ padding: '4px 10px', background: 'var(--border)', borderRadius: '12px', fontSize: '0.85rem' }}>{s}</span>)}
                  </div>
                </div>
              )}
              {mood.length > 0 && (
                <div>
                  <span style={{ fontWeight: 600 }}>😶‍🌫️ Tâm trạng: </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {mood.map(m => <span key={m} style={{ padding: '4px 10px', background: 'var(--border)', borderRadius: '12px', fontSize: '0.85rem' }}>{m}</span>)}
                  </div>
                </div>
              )}
              {notes && (
                <div>
                  <span style={{ fontWeight: 600 }}>📝 Ghi chú: </span>
                  <p style={{ background: 'var(--surface)', padding: '12px', borderRadius: '8px', marginTop: '8px', fontStyle: 'italic' }}>{notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="card">
            <h2>🩸 Lượng máu</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              {(['light', 'medium', 'heavy'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setBleeding(bleeding === level ? null : level)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '8px',
                    border: `2px solid ${bleeding === level ? 'var(--primary)' : 'var(--border)'}`,
                    background: bleeding === level ? 'var(--primary-light)' : 'transparent',
                    fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  {bleedingMap[level]}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>💧 Dịch tiết</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {dischargeOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDischarge(discharge === opt.value ? null : opt.value)}
                  style={chipStyle(discharge === opt.value, 'var(--secondary)')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {discharge === 'eggwhite' && (
              <p style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--secondary)', padding: '8px', background: 'rgba(248,165,194,0.1)', borderRadius: '6px' }}>
                🥚 Dịch tiết dạng trứng thường xuất hiện gần ngày rụng trứng — dấu hiệu dễ thụ thai!
              </p>
            )}
          </div>

          <div className="card">
            <h2>🤒 Triệu chứng</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {symptomsList.map(sym => (
                <button
                  key={sym}
                  onClick={() => toggleArrayItem(symptoms, setSymptoms, sym)}
                  style={chipStyle(symptoms.includes(sym))}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>😊 Tâm trạng</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {moodList.map(m => (
                <button
                  key={m}
                  onClick={() => toggleArrayItem(mood, setMood, m)}
                  style={chipStyle(mood.includes(m), 'var(--secondary)')}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>📝 Ghi chú</h2>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ghi thêm bất kỳ điều gì bạn muốn nhớ hôm nay..."
              rows={3}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '16px', fontSize: '1rem' }}>
            {saving ? 'Đang lưu...' : '💾 Lưu thông tin hôm nay'}
          </button>
        </>
      )}
    </div>
  );
};

export default Log;
