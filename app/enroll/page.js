"use client";

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const LOW_STOCK_THRESHOLD = 5;

export default function EnrollPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // เก็บจำนวนที่เลือกของแต่ละคอร์สแบบ { [course_id]: quantity }
  // ถ้าไม่มี key หรือค่าเป็น 0 = ยังไม่ได้เลือกคอร์สนั้น
  const [selections, setSelections] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ดึงรายการคอร์สทั้งหมด
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

  // เปิด/ปิดการเลือกคอร์ส (ติ๊กถูก) — ถ้าเปิดใหม่ ตั้งจำนวนเริ่มต้นเป็น 1
  const toggleCourse = (courseId) => {
    setSelections((prev) => {
      const next = { ...prev };
      if (next[courseId]) {
        delete next[courseId];
      } else {
        next[courseId] = 1;
      }
      return next;
    });
  };

  // แก้ไขจำนวนที่นั่งของคอร์สที่เลือกไว้
  const updateQuantity = (courseId, value) => {
    setSelections((prev) => ({
      ...prev,
      [courseId]: value,
    }));
  };

  // รายการคอร์สที่ถูกเลือกอยู่ พร้อมข้อมูลคอร์สและยอดรวมย่อยของแต่ละคอร์ส
  const selectedItems = useMemo(() => {
    return Object.entries(selections)
      .map(([courseId, qty]) => {
        const course = courses.find((c) => c.id === courseId);
        if (!course) return null;
        const quantity = Number(qty) || 0;
        return {
          course,
          quantity,
          subtotal: quantity > 0 ? course.price * quantity : 0,
        };
      })
      .filter(Boolean);
  }, [selections, courses]);

  // ยอดรวมทั้งหมดจากทุกคอร์สที่เลือก
  const grandTotal = selectedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const totalSeats = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

  const resetForm = () => {
    setSelections({});
  };

  // ส่งข้อความแจ้งเตือนผ่าน API Route ภายใน (ไม่ยิงตรงไป Telegram จาก client)
  // ทำงานแบบไม่บล็อกและไม่ทำให้ระบบขายล้มเหลว แม้ Telegram จะมีปัญหา
  const sendTelegramNotification = async (message) => {
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!data.ok) {
        console.warn('ส่งแจ้งเตือน Telegram ไม่สำเร็จ:', data.error);
      }
    } catch (err) {
      // ไม่ throw ต่อ เพื่อไม่ให้กระทบ flow การขาย
      console.warn('เกิดข้อผิดพลาดขณะส่งแจ้งเตือน Telegram:', err.message);
    }
  };

  // สร้างข้อความแจ้งเตือน "มีรายการขายใหม่"
  const buildOrderMessage = (courseName, quantity, totalPrice, remainingStock) => {
    const now = new Date().toLocaleString('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    return (
      `🛍️ <b>มีรายการขายใหม่!</b>\n` +
      `- สินค้า: ${courseName}\n` +
      `- จำนวน: ${quantity} ชิ้น\n` +
      `- ราคารวม: ${totalPrice.toLocaleString('th-TH')} บาท\n` +
      `- สต๊อกคงเหลือปัจจุบัน: ${remainingStock} ชิ้น\n` +
      `- เวลา: ${now}`
    );
  };

  // สร้างข้อความแจ้งเตือน "สต๊อกใกล้หมด"
  const buildLowStockMessage = (courseName, remainingStock) => {
    return (
      `🚨 <b>[เตือนภัย] สต๊อกสินค้าใกล้หมด!</b>\n` +
      `- สินค้า: ${courseName}\n` +
      `- คงเหลือเพียง: ${remainingStock} ชิ้น\n` +
      `⚠️ กรุณาเติมสต๊อกสินค้าด่วน!`
    );
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // ต้องเลือกอย่างน้อย 1 คอร์ส และทุกคอร์สที่เลือกต้องกรอกจำนวนมากกว่า 0
    const itemsToEnroll = selectedItems.filter((item) => item.quantity > 0);
    if (itemsToEnroll.length === 0) {
      setErrorMsg('กรุณาเลือกอย่างน้อย 1 คอร์ส และระบุจำนวนที่นั่งให้ถูกต้อง');
      return;
    }

    setSubmitting(true);

    // ดึงข้อมูล stock ล่าสุดของทุกคอร์สที่เลือก เพื่อตรวจสอบก่อนบันทึกจริง
    const courseIds = itemsToEnroll.map((item) => item.course.id);
    const { data: freshCourses, error: fetchError } = await supabase
      .from('courses')
      .select('*')
      .in('id', courseIds);

    if (fetchError || !freshCourses) {
      setErrorMsg('ไม่สามารถตรวจสอบข้อมูลคอร์สได้ กรุณาลองใหม่');
      setSubmitting(false);
      return;
    }

    // ตรวจสอบที่นั่งคงเหลือของทุกคอร์สก่อนบันทึกรายการใดๆ
    const insufficient = [];
    for (const item of itemsToEnroll) {
      const fresh = freshCourses.find((c) => c.id === item.course.id);
      if (!fresh || fresh.stock < item.quantity) {
        insufficient.push(
          `${item.course.name} (เหลือ ${fresh ? fresh.stock : 0} ${item.course.unit})`
        );
      }
    }
    if (insufficient.length > 0) {
      setErrorMsg('ที่นั่งคงเหลือไม่เพียงพอสำหรับ: ' + insufficient.join(', '));
      setSubmitting(false);
      return;
    }

    const enrolledAt = new Date().toISOString();

    // บันทึกลง enrollments ทีละคอร์ส (1 แถวต่อ 1 คอร์ส ตามโครงสร้างตารางเดิม)
    const rowsToInsert = itemsToEnroll.map((item) => {
      const fresh = freshCourses.find((c) => c.id === item.course.id);
      return {
        course_id: fresh.id,
        course_name: fresh.name,
        quantity: item.quantity,
        total_price: fresh.price * item.quantity,
        enrolled_at: enrolledAt,
      };
    });

    const { error: insertError } = await supabase.from('enrollments').insert(rowsToInsert);

    if (insertError) {
      setErrorMsg('บันทึกการลงทะเบียนไม่สำเร็จ: ' + insertError.message);
      setSubmitting(false);
      return;
    }

    // อัปเดต stock ของแต่ละคอร์สที่ลงทะเบียนไป และยิงแจ้งเตือน Telegram
    for (const item of itemsToEnroll) {
      const fresh = freshCourses.find((c) => c.id === item.course.id);
      const newStock = fresh.stock - item.quantity;

      const { error: updateError } = await supabase
        .from('courses')
        .update({ stock: newStock })
        .eq('id', fresh.id);

      if (updateError) {
        setErrorMsg(
          `ลงทะเบียนสำเร็จ แต่ปรับปรุงที่นั่งคงเหลือของ "${fresh.name}" ไม่สำเร็จ: ` +
            updateError.message
        );
        continue; // ข้ามการแจ้งเตือนถ้าตัด stock ไม่สำเร็จ
      }

      // แจ้งเตือน Order ใหม่ (ยิงแบบไม่รอผล ไม่กระทบ flow หลัก)
      sendTelegramNotification(
        buildOrderMessage(fresh.name, item.quantity, fresh.price * item.quantity, newStock)
      );

      // ถ้าสต๊อกเหลือน้อย ยิงแจ้งเตือนเพิ่มอีก 1 ข้อความ
      if (newStock <= LOW_STOCK_THRESHOLD) {
        sendTelegramNotification(buildLowStockMessage(fresh.name, newStock));
      }
    }

    setSuccessMsg(
      `ลงทะเบียนสำเร็จ ${itemsToEnroll.length} คอร์ส รวม ${totalSeats} ที่นั่ง`
    );
    resetForm();
    await fetchCourses();
    setSubmitting(false);
  };

  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>ลงทะเบียนเรียน</h1>

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

      {/* สรุปยอดรวม — วางไว้บนสุด ตัวใหญ่ อ่านง่าย เห็นทันทีก่อนกดยืนยัน */}
      <div
        className="card"
        style={{
          background: '#1a2332',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
            เลือกแล้ว {selectedItems.length} คอร์ส / {totalSeats} ที่นั่ง
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>
            {grandTotal.toLocaleString('th-TH')} บาท
          </div>
        </div>
        <button
          onClick={handleEnroll}
          disabled={submitting || selectedItems.length === 0}
          style={{ fontSize: '1.05rem', padding: '12px 24px' }}
        >
          {submitting ? 'กำลังบันทึก...' : 'ยืนยันลงทะเบียนทั้งหมด'}
        </button>
      </div>

      {/* รายการคอร์สแบบเลือกได้หลายรายการ (checkbox + จำนวน) */}
      <div className="card">
        {loading ? (
          <p>กำลังโหลดรายการคอร์ส...</p>
        ) : courses.length === 0 ? (
          <p>ยังไม่มีคอร์สในระบบ</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {courses.map((course) => {
              const isSelected = Boolean(selections[course.id]);
              const outOfStock = course.stock <= 0;
              const quantity = selections[course.id] || '';

              return (
                <div
                  key={course.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: isSelected ? '2px solid #2563eb' : '1px solid #e4e7eb',
                    background: isSelected ? '#eff4ff' : '#fafbfc',
                    opacity: outOfStock ? 0.6 : 1,
                    flexWrap: 'wrap',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={outOfStock}
                    onChange={() => toggleCourse(course.id)}
                    style={{ width: 18, height: 18 }}
                  />

                  <div style={{ flex: '1 1 220px', minWidth: 180 }}>
                    <div style={{ fontWeight: 700 }}>{course.name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      {course.price.toLocaleString('th-TH')} บาท / {course.unit} • คงเหลือ{' '}
                      {course.stock} {course.unit}
                    </div>
                  </div>

                  {isSelected && (
                    <>
                      <input
                        type="number"
                        min="1"
                        max={course.stock}
                        value={quantity}
                        onChange={(e) => updateQuantity(course.id, e.target.value)}
                        style={{ width: 90 }}
                      />
                      <div style={{ minWidth: 110, textAlign: 'right', fontWeight: 700 }}>
                        {(course.price * (Number(quantity) || 0)).toLocaleString('th-TH')} บาท
                      </div>
                    </>
                  )}

                  {outOfStock && (
                    <span style={{ color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>
                      ที่นั่งเต็ม
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
