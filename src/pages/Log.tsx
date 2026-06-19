import { useState, useEffect } from 'react';
import { saveDailyLog, getDailyLog } from '../services/firestore';
import { useAuth } from '../contexts/AuthContext';

const symptomsList = ['Đau bụng', 'Đau đầu', 'Đầy hơi', 'Nổi mụn', 'Mệt mỏi'];
const moodList = ['Vui vẻ', 'Buồn bã', 'Cáu kỉnh', 'Lo âu', 'Bình tĩnh'];
const bleedingMap: Record<string, string> = { 'light': 'Ít', 'medium': 'Vừa', 'heavy': 'Nhiều' };

const Log = () => {
  const { currentUser } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [bleeding, setBleeding] = useState<'light' | 'medium' | 'heavy' | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [mood, setMood] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchLog = async () => {
      if (!currentUser) return;
      const log = await getDailyLog(currentUser.uid, date);
      if (log) {
        setBleeding(log.bleeding);
        setSymptoms(log.symptoms || []);
        setMood(log.mood || []);
      } else {
        setBleeding(null);
        setSymptoms([]);
        setMood([]);
      }
    };
    fetchLog();
  }, [date, currentUser]);

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
      mood
    });
    setSaving(false);
    alert('Đã lưu thông tin thành công!');
  };

  return (
    <div className="animate-fade-in">
      <h1>Ghi chép hằng ngày</h1>
      
      <div className="card">
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Ngày</label>
        <input 
          type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '16px' }}
        />
      </div>

      <div className="card">
        <h2>Lượng máu</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          {['light', 'medium', 'heavy'].map(level => (
            <button 
              key={level}
              onClick={() => setBleeding(bleeding === level ? null : level as any)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: `2px solid ${bleeding === level ? 'var(--primary)' : 'var(--border)'}`,
                background: bleeding === level ? 'var(--primary-light)' : 'transparent',
                fontWeight: 600,
                textTransform: 'capitalize'
              }}
            >
              {bleedingMap[level]}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Triệu chứng</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {symptomsList.map(sym => (
            <button
              key={sym}
              onClick={() => toggleArrayItem(symptoms, setSymptoms, sym)}
              className="btn-secondary"
              style={{
                background: symptoms.includes(sym) ? 'var(--primary)' : 'var(--border)',
                color: symptoms.includes(sym) ? 'white' : 'var(--text-main)'
              }}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Tâm trạng</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {moodList.map(m => (
            <button
              key={m}
              onClick={() => toggleArrayItem(mood, setMood, m)}
              className="btn-secondary"
              style={{
                background: mood.includes(m) ? 'var(--secondary)' : 'var(--border)',
                color: mood.includes(m) ? 'var(--text-main)' : 'var(--text-main)'
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <button className="btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Đang lưu...' : 'Lưu thông tin'}
      </button>
    </div>
  );
};

export default Log;
