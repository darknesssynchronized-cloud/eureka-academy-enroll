"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function EnrollPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [quantity, setQuantity] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ดึงรายการคอร์สทั้งหมดมาใช้ใน dropdown
  const fetchCourses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      setErrorMsg('โหลดรายการคอร์สไม่สำเร็จ: ' + error.message);
    } else {
      setCourses(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // คอร์สที่กำลังถูกเลือกอยู่ในปัจจุบัน (ใช้คำนวณยอดรวมและเช็ค stock)
  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  // คำนวณยอดรวม = ราคา x จำนวน (ถ้ากรอกไม่ครบให้เป็น 0)
  const totalPrice =
    selectedCourse && quantity && Number(quantity) > 0
      ? selectedCourse.price * Number(quantity)
      : 0;

  const resetForm = () => {
    setSelectedCourseId('');
    setQuantity('');
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // ตรวจสอบข้อมูลเบื้องต้น
    if (!selectedCourseId) {
      setErrorMsg('กรุณาเลือกคอร์สที่ต้องการลงทะเบียน');
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setErrorMsg('กรุณากรอกจำนวนที่นั่งให้ถูกต้อง');
      return;
    }

    setSubmitting(true);

    // ดึงข้อมูลคอร์สล่าสุดจาก DB อีกครั้งก่อนบันทึก เพื่อกัน stock ไม่ตรงกับที่แสดงบนหน้าจอ
    const { data: freshCourse, error: fetchError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', selectedCourseId)
      .single();

    if (fetchError || !freshCourse) {
      setErrorMsg('ไม่พบข้อมูลคอร์สนี้ในระบบ กรุณาลองใหม่');
      setSubmitting(false);
      return;
    }

    // ตรวจสอบว่าที่นั่งคงเหลือเพียงพอหรือไม่
    if (freshCourse.stock < qty) {
      setErrorMsg(
        `ที่นั่งคงเหลือไม่เพียงพอ (เหลือ ${freshCourse.stock} ${freshCourse.unit})`
      );
      setSubmitting(false);
      return;
    }

    const total = freshCourse.price * qty;

    // 1. บันทึกรายการลงตาราง enrollments
    const { error: insertError } = await supabase.from('enrollments').insert([
      {
        course_id: freshCourse.id,
        course_name: freshCourse.name,
        quantity: qty,
        total_price: total,
        enrolled_at: new Date().toISOString(),
      },
    ]);

    if (insertError) {
      setErrorMsg('บันทึกการลงทะเบียนไม่สำเร็จ: ' + insertError.message);
      setSubmitting(false);
      return;
    }

    // 2. อัปเดต stock ในตาราง courses ให้ลดลงตามจำนวนที่ลงทะเบียน
    const { error: updateError } = await supabase
      .from('courses')
      .update({ stock: freshCourse.stock - qty })
      .eq('id', freshCourse.id);

    if (updateError) {
      // แจ้งเตือนกรณีอัปเดต stock ไม่สำเร็จ แม้ enrollment จะถูกบันทึกไปแล้ว
      setErrorMsg(
        'ลงทะเบียนสำเร็จ แต่ปรับปรุงที่นั่งคงเหลือไม่สำเร็จ: ' + updateError.message
      );
      setSubmitting(false);
      await fetchCourses();
      return;
    }

    setSuccessMsg(
      `ลงทะเบียนคอร์ส "${freshCourse.name}" จำนวน ${qty} ${freshCourse.unit} สำเร็จ`
    );
    resetForm();
    await fetchCourses();
    setSubmitting(false);
  };

  return (
    <div>
      <h1 style={{ marginBottom: 20 }}>ลงทะเบียนเรียน</h1>

      {errorMsg && (
        <div
          className="card"
          style={{ background: '#fdecea', color: '#b91c1c', border: '1px solid #f5c2c0' }}
        >
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div
          className="card"
          style={{ background: '#eafaf0', color: '#166534', border: '1px solid #bbf0d0' }}
        >
          {successMsg}
        </div>
      )}

      <div className="card">
        {loading ? (
          <p>กำลังโหลดรายการคอร์ส...</p>
        ) : (
          <form onSubmit={handleEnroll}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                เลือกคอร์ส
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
              >
                <option value="">-- กรุณาเลือกคอร์ส --</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name} — {course.price} บาท (คงเหลือ {course.stock} {course.unit})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                จำนวนที่นั่ง
              </label>
              <input
                type="number"
                min="1"
                placeholder="จำนวนที่นั่งที่ต้องการลงทะเบียน"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            {/* แสดงยอดรวมแบบเรียลไทม์ก่อนยืนยัน */}
            <div
              style={{
                marginBottom: 20,
                padding: 12,
                background: '#f0f2f5',
                borderRadius: 6,
                fontWeight: 600,
              }}
            >
              ยอดรวม: {totalPrice.toLocaleString('th-TH')} บาท
            </div>

            <button type="submit" disabled={submitting}>
              {submitting ? 'กำลังบันทึก...' : 'ยืนยันลงทะเบียน'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
