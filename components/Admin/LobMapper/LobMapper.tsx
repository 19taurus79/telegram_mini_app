"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useInitData } from "@/store/InitData";
import { getUnmappedLobs, mapLobs } from "@/lib/api";
import toast from "react-hot-toast";

const AVAILABLE_LOBS = [
  "ЗЗР",
  "Насіння",
  "Мінеральні добрива",
  "Спец. добрива (ПД)",
  "РКД (рідкі комп. добр.)",
  "Аміак (безв. та водн.)",
  "Продукти ВВ",
  "Біопрепарати",
  "Сервіси (агро,тех,фін)",
  "Інше",
];

export const LobMapper = () => {
  const initData = useInitData((state) => state.initData);
  const [unmapped, setUnmapped] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectedLob, setSelectedLob] = useState<string>("");

  const fetchUnmapped = useCallback(async () => {
    if (!initData) return;
    try {
      setLoading(true);
      const data = await getUnmappedLobs(initData);
      setUnmapped(data);
    } catch (e) {
      console.error(e);
      toast.error("Помилка завантаження товарів");
    } finally {
      setLoading(false);
    }
  }, [initData]);

  useEffect(() => {
    fetchUnmapped();
  }, [fetchUnmapped]);

  const toggleSelect = (product: string) => {
    const next = new Set(selectedProducts);
    if (next.has(product)) next.delete(product);
    else next.add(product);
    setSelectedProducts(next);
  };

  const toggleAll = () => {
    if (selectedProducts.size === unmapped.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(unmapped));
    }
  };

  const applyMapping = async () => {
    if (!initData) return;
    if (selectedProducts.size === 0) {
      toast.error("Оберіть хоча б один товар");
      return;
    }
    if (!selectedLob) {
      toast.error("Оберіть Вид Діяльності");
      return;
    }

    const mappings: Record<string, string> = {};
    selectedProducts.forEach((p) => {
      mappings[p] = selectedLob;
    });

    try {
      setLoading(true);
      const res = await mapLobs({ mappings, initData });
      toast.success(res.message + ` (${res.updated_products} зв'язків оновлено)`);
      
      // Remove mapped items from list
      setUnmapped((prev) => prev.filter((p) => !selectedProducts.has(p)));
      setSelectedProducts(new Set());
      setSelectedLob("");
    } catch (e) {
      console.error(e);
      toast.error("Помилка при збереженні");
    } finally {
      setLoading(false);
    }
  };

  const autoRecognize = () => {
    if (!initData) return;
    const rules = [
      { lob: "Насіння", keywords: ["насін", "кукурудз", "соняшн", "пшениц", "піонер", "сингент", "ріпак"] },
      { lob: "Мінеральні добрива", keywords: ["селітр", "карбамід", "npk", "добрив", "амофос"] },
      { lob: "ЗЗР", keywords: ["гербіцид", "фунгіцид", "інсектицид", "раундап", "протруйник"] },
    ];

    let foundCount = 0;
    const mappingsToApply: Record<string, string> = {};

    unmapped.forEach((product) => {
      const lower = product.toLowerCase();
      for (const rule of rules) {
        if (rule.keywords.some((kw) => lower.includes(kw))) {
          mappingsToApply[product] = rule.lob;
          foundCount++;
          break; // Stop at first matched rule
        }
      }
    });

    if (foundCount === 0) {
      toast("Нічого не розпізнано автоматично", { icon: "ℹ️" });
      return;
    }

    if (confirm(`Автоматично розпізнано ${foundCount} товарів. Зберегти їх в базу?`)) {
      setLoading(true);
      mapLobs({ mappings: mappingsToApply, initData })
        .then((res) => {
          toast.success(res.message);
          setUnmapped((prev) => prev.filter((p) => !mappingsToApply[p]));
          setSelectedProducts(new Set());
        })
        .catch(() => toast.error("Помилка збереження авто-розпізнавання"))
        .finally(() => setLoading(false));
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Мапінг Видів Діяльності (LoB)</h1>
        <button
          onClick={autoRecognize}
          disabled={loading || unmapped.length === 0}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          ✨ Авто-розпізнавання
        </button>
      </div>

      <p className="text-gray-600 mb-6">
        Знайдено <strong>{unmapped.length}</strong> унікальних товарів у доставках, для яких не вказано &quot;Вид діяльності&quot;.
      </p>

      <div className="flex gap-4 items-center mb-6 p-4 bg-blue-50 rounded-lg">
        <select
          value={selectedLob}
          onChange={(e) => setSelectedLob(e.target.value)}
          className="p-2 border rounded border-gray-300 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Оберіть Вид Діяльності --</option>
          {AVAILABLE_LOBS.map((lob) => (
            <option key={lob} value={lob}>
              {lob}
            </option>
          ))}
        </select>
        <button
          onClick={applyMapping}
          disabled={loading || selectedProducts.size === 0 || !selectedLob}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          Застосувати до обраних ({selectedProducts.size})
        </button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                <input
                  type="checkbox"
                  checked={unmapped.length > 0 && selectedProducts.size === unmapped.length}
                  onChange={toggleAll}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Назва товару з бази даних
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {unmapped.map((product) => (
              <tr
                key={product}
                onClick={() => toggleSelect(product)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedProducts.has(product)}
                    readOnly
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{product}</td>
              </tr>
            ))}
            {unmapped.length === 0 && !loading && (
              <tr>
                <td colSpan={2} className="px-6 py-10 text-center text-gray-500">
                  Немає товарів для розмітки. Всі товари мають Вид Діяльності! 🎉
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
