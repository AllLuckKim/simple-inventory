// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Item {
  id: string;
  name: string;
  sku: string;
  quantity: number;
}

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. 품목 목록 불러오기
  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error(error.message);
    else setItems(data || []);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // 2. 신규 품목 등록
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku) return alert('품목명과 코드를 입력해주세요.');

    setLoading(true);
    const { error } = await supabase.from('items').insert([{ name, sku, quantity: 0 }]);
    setLoading(false);

    if (error) {
      alert(`등록 실패: ${error.message}`);
    } else {
      setName('');
      setSku('');
      fetchItems();
    }
  };

  // 3. 품목 삭제
  const handleDeleteItem = async (item: Item) => {
    const confirmDelete = window.confirm(
      `'${item.name}' 품목을 정말 삭제하시겠습니까?\n(해당 품목의 입출고 이력도 함께 삭제됩니다.)`
    );
    if (!confirmDelete) return;

    const { error } = await supabase.from('items').delete().eq('id', item.id);

    if (error) {
      alert(`삭제 실패: ${error.message}`);
    } else {
      fetchItems();
    }
  };

  // 4. 입/출고 수량 조정 (Supabase RPC 호출)
  const handleStockUpdate = async (itemId: string, type: 'IN' | 'OUT') => {
    const amountStr = prompt(`${type === 'IN' ? '입고' : '출고'}할 수량을 입력하세요:`, '1');
    if (!amountStr) return;

    const amount = parseInt(amountStr, 10);
    if (isNaN(amount) || amount <= 0) return alert('유효한 숫자를 입력하세요.');

    const { error } = await supabase.rpc('handle_stock_change', {
      p_item_id: itemId,
      p_type: type,
      p_amount: amount,
      p_note: '화면 직접 조작',
    });

    if (error) {
      alert(`처리 실패: ${error.message}`);
    } else {
      fetchItems();
    }
  };

  // 검색어 필터링 (품목명 또는 SKU 코드에 검색어가 포함되어 있는지 확인)
  const filteredItems = items.filter((item) => {
    const term = searchTerm.toLowerCase();
    return item.name.toLowerCase().includes(term) || item.sku.toLowerCase().includes(term);
  });

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">📦 재고관리 시스템</h1>

      {/* 품목 추가 폼 */}
      <form onSubmit={handleAddItem} className="flex gap-3 mb-6 bg-gray-50 p-4 rounded-lg border">
        <input
          type="text"
          placeholder="품목명 (예: 볼펜)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 rounded flex-1"
        />
        <input
          type="text"
          placeholder="관리코드 / SKU (예: PEN-001)"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          className="border p-2 rounded flex-1"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 font-medium"
        >
          {loading ? '추가 중...' : '품목 등록'}
        </button>
      </form>

      {/* 검색 바 */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="🔍 품목명 또는 SKU 코드로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 재고 목록 테이블 */}
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b text-sm text-gray-600">
              <th className="p-3">품목명</th>
              <th className="p-3">SKU</th>
              <th className="p-3 text-right">현재 재고</th>
              <th className="p-3 text-center">재고 조정 및 관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center p-6 text-gray-400">
                  {searchTerm ? '검색 결과가 없습니다.' : '등록된 품목이 없습니다.'}
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-900">{item.name}</td>
                  <td className="p-3 text-gray-500 font-mono text-sm">{item.sku}</td>
                  <td className="p-3 text-right font-semibold">
                    <span className={item.quantity === 0 ? 'text-red-500' : 'text-gray-800'}>
                      {item.quantity.toLocaleString()} 개
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleStockUpdate(item.id, 'IN')}
                      className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded mr-1.5 hover:bg-emerald-700"
                    >
                      + 입고
                    </button>
                    <button
                      onClick={() => handleStockUpdate(item.id, 'OUT')}
                      className="bg-amber-600 text-white text-xs px-3 py-1.5 rounded mr-3 hover:bg-amber-700"
                    >
                      - 출고
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item)}
                      className="text-red-600 hover:text-red-800 text-xs border border-red-300 hover:border-red-500 px-2.5 py-1.5 rounded"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}