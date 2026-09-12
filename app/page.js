"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// ค่าเริ่มต้นของฟอร์มเพิ่มคอร์สใหม่
const emptyForm = {
  sku: '',
  name: '',
  price: '',
  stock: '',
  unit: '',
};

export default function HomePage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // ฟอร์มสำหรับเพิ่มคอร์สใหม่
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // state สำหรับแก้ไขแบบ inline: เก็บ id ของแถวที่กำลังแก้ไข + ค่าที่กำลังแก้
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);

  // ดึงรายการคอร์สทั้งหมดจาก Supabase เรียงตามวันที่สร้างล่าสุดก่อน
  const fetchCourses = async () => {
    setLoading(true);
    setErrorMsg('');
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMsg('โหลดข้อมูลคอร์สไม่สำเร็จ: ' + error.message);
    } else {
      setCourses(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // จัดการค่าที่พิมพ์ในฟอร์มเพิ่มคอร์สใหม่
  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // เพิ่มคอร์สใหม่ลงตาราง courses
  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!form.sku || !form.name || !form.price || !form.stock || !form.unit) {
      setErrorMsg('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    const { error } = await supabase.from('courses').insert([
      {
        sku: form.sku,
        name: form.name,
        price: Number(form.price),
        stock: Number(form.stock),
        unit: form.unit,
      },
    ]);

    if (error) {
      setErrorMsg('เพิ่มคอร์สไม่สำเร็จ: ' + error.message);
    } else {
      setForm(emptyForm);
      await fetchCourses();
    }
    setSubmitting(false);
  };

  // ลบคอร์ส
  const handleDelete = async (id) => {
    const confirmed = window.confirm('ยืนยันการลบคอร์สนี้หรือไม่?');
    if (!confirmed) return;

    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) {
      setErrorMsg('ลบคอร์สไม่สำเร็จ: ' + error.message);
    } else {
      await fetchCourses();
    }
  };

  // เริ่มแก้ไขแถว: โหลดค่าปัจจุบันของคอร์สนั้นเข้า editForm
  const startEdit = (course) => {
    setEditingId(course.id);
    setEditForm({
      sku: course.sku,
      name: course.name,
      price: course.price,
      stock: course.stock,
      unit: course.unit,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  // บันทึกการแก้ไขคอร์ส
  const handleSaveEdit = async (id) => {
    setErrorMsg('');
    const { error } = await supabase
      .from('courses')
      .update({
        sku: editForm.sku,
        name: editForm.name,
        price: Number(editForm.price),
        stock: Number(editForm.stock),
        unit: editForm.unit,
      })
      .eq('id', id);

    if (error) {
      setErrorMsg('บันทึกการแก้ไขไม่สำเร็จ: ' + error.message);
    } else {
      cancelEdit();
      await fetchCourses();
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: 20 }}>รายการคอร์สเรียนทั้งหมด</h1>

      {errorMsg && (
        <div
          className="card"
          style={{ background: '#fdecea', color: '#b91c1c', border: '1px solid #f5c2c0' }}
        >
          {errorMsg}
        </div>
      )}

      {/* ฟอร์มเพิ่มคอร์สใหม่ */}
      <div className="card">
        <h2 style={{ marginBottom: 16, fontSize: '1.1rem' }}>เพิ่มคอร์สใหม่</h2>
        <form
          onSubmit={handleAddCourse}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}
        >
          <input
            name="sku"
            placeholder="รหัสคอร์ส (sku)"
            value={form.sku}
            onChange={handleFormChange}
          />
          <input
            name="name"
            placeholder="ชื่อคอร์ส"
            value={form.name}
            onChange={handleFormChange}
          />
          <input
            name="price"
            type="number"
            step="0.01"
            placeholder="ราคา"
            value={form.price}
            onChange={handleFormChange}
          />
          <input
            name="stock"
            type="number"
            placeholder="ที่นั่งคงเหลือ"
            value={form.stock}
            onChange={handleFormChange}
          />
          <input
            name="unit"
            placeholder="หน่วย (เช่น ที่นั่ง)"
            value={form.unit}
            onChange={handleFormChange}
          />
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" disabled={submitting}>
              {submitting ? 'กำลังบันทึก...' : 'เพิ่มคอร์ส'}
            </button>
          </div>
        </form>
      </div>

      {/* ตารางแสดงรายการคอร์ส */}
      <div className="card">
        {loading ? (
          <p>กำลังโหลดข้อมูล...</p>
        ) : courses.length === 0 ? (
          <p>ยังไม่มีคอร์สในระบบ</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>รหัสคอร์ส</th>
                <th>ชื่อคอร์ส</th>
                <th>ราคา</th>
                <th>ที่นั่งคงเหลือ</th>
                <th>หน่วย</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => {
                const isEditing = editingId === course.id;
                return (
                  <tr key={course.id}>
                    {isEditing ? (
                      <>
                        <td>
                          <input name="sku" value={editForm.sku} onChange={handleEditChange} />
                        </td>
                        <td>
                          <input name="name" value={editForm.name} onChange={handleEditChange} />
                        </td>
                        <td>
                          <input
                            name="price"
                            type="number"
                            step="0.01"
                            value={editForm.price}
                            onChange={handleEditChange}
                          />
                        </td>
                        <td>
                          <input
                            name="stock"
                            type="number"
                            value={editForm.stock}
                            onChange={handleEditChange}
                          />
                        </td>
                        <td>
                          <input name="unit" value={editForm.unit} onChange={handleEditChange} />
                        </td>
                        <td style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleSaveEdit(course.id)}>บันทึก</button>
                          <button
                            onClick={cancelEdit}
                            style={{ background: '#6b7280' }}
                          >
                            ยกเลิก
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{course.sku}</td>
                        <td>{course.name}</td>
                        <td>{course.price}</td>
                        <td>{course.stock}</td>
                        <td>{course.unit}</td>
                        <td style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => startEdit(course)}>แก้ไข</button>
                          <button
                            onClick={() => handleDelete(course.id)}
                            style={{ background: '#dc2626' }}
                          >
                            ลบ
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
