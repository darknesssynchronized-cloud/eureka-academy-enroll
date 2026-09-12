"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function HistoryPage() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // ดึงประวัติการลงทะเบียนทั้งหมด เรียงจากล่าสุดไปเก่าสุด
  const fetchEnrollments = async () => {
    setLoading(true);
    setErrorMsg('');

    const { data, error } = await supabase
      .from('enrollments')
      .select('*')
      .order('enrolled_at', { ascending: false });

    if (error) {
      setErrorMsg('โหลดประวัติการลงทะเบียนไม่สำเร็จ: ' + error.message);
    } else {
      setEnrollments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEnrollments();
  }, []);

  // รวมยอดลงทะเบียนทั้งหมดจากทุกแถว
  const totalAmount = enrollments.reduce(
    (sum, item) => sum + Number(item.total_price || 0),
    0
  );

  // แปลงวันเวลาให้อ่านง่ายตามรูปแบบไทย
  const formatDateTime = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div>
      <h1 style={{ marginBottom: 20 }}>ประวัติการลงทะเบียน</h1>

      {errorMsg && (
        <div
          className="card"
          style={{ background: '#fdecea', color: '#b91c1c', border: '1px solid #f5c2c0' }}
        >
          {errorMsg}
        </div>
      )}

      {/* สรุปยอดลงทะเบียนรวมทั้งหมด */}
      <div
        className="card"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span style={{ fontWeight: 600 }}>ยอดลงทะเบียนรวมทั้งหมด</span>
        <span style={{ fontWeight: 700, fontSize: '1.2rem', color: '#2563eb' }}>
          {totalAmount.toLocaleString('th-TH')} บาท
        </span>
      </div>

      {/* ตารางประวัติการลงทะเบียน */}
      <div className="card">
        {loading ? (
          <p>กำลังโหลดข้อมูล...</p>
        ) : enrollments.length === 0 ? (
          <p>ยังไม่มีประวัติการลงทะเบียน</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>วันเวลาที่ลงทะเบียน</th>
                <th>ชื่อคอร์ส</th>
                <th>จำนวนที่นั่ง</th>
                <th>ยอดรวม</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((item) => (
                <tr key={item.id}>
                  <td>{formatDateTime(item.enrolled_at)}</td>
                  <td>{item.course_name}</td>
                  <td>{item.quantity}</td>
                  <td>{Number(item.total_price).toLocaleString('th-TH')} บาท</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
