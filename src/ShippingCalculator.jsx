import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Trash2, Upload, Calculator, FileText, Package } from 'lucide-react';
import * as XLSX from 'xlsx';

const ShippingCalculator = () => {
  const [exchangeRates, setExchangeRates] = useState({
    RUB: 90,
    BYN: 3.25,
    KZT: 450
  });

  const [ratesLoaded, setRatesLoaded] = useState(true);

  const [tariffsData, setTariffsData] = useState({
    belarus: null,
    kazakhstan: null
  });

  // Список товаров в посылке
  const [items, setItems] = useState([
    {
      id: 1,
      name: '',
      weight: '',
      price: '',
      priceCurrency: 'RUB',
      quantity: 1,
      retailPrice: ''
    }
  ]);

  // Настройки посылки
  const [packageSettings, setPackageSettings] = useState({
    commissionPercent: 10,
    destination: 'Россия'
  });

  const [additionalExpenses, setAdditionalExpenses] = useState([
    { name: '', amount: '', currency: 'USD' }
  ]);

  const [selectedCountry, setSelectedCountry] = useState('belarus');
  const [results, setResults] = useState(null);

  // Список популярных направлений
  
  // Загрузка курсов валют
  useEffect(() => {
    fetch('https://api.exchangerate.host/latest?base=USD&symbols=RUB,BYN,KZT')
      .then(res => res.json())
      .then(data => {
        setRatesLoaded(true);
        setExchangeRates({
          RUB: data.rates.RUB,
          BYN: data.rates.BYN,
          KZT: data.rates.KZT
        });
      })
      .catch(() => {
        setRatesLoaded(false);
        alert('Не удалось загрузить курсы валют. Введите их вручную ниже.')
      });
  }, []);

  // Восстановление тарифов из localStorage
  useEffect(() => {
    const savedBelarus = localStorage.getItem('tariffs_belarus');
    const savedKazakhstan = localStorage.getItem('tariffs_kazakhstan');
    setTariffsData({
      belarus: savedBelarus ? JSON.parse(savedBelarus) : null,
      kazakhstan: savedKazakhstan ? JSON.parse(savedKazakhstan) : null
    });
  }, []);
const destinations = [
    'Россия', 'США', 'Германия', 'Австрия', 'Англия', 'Франция', 'Италия',
    'Испания', 'Польша', 'Чехия', 'Турция', 'Китай', 'Япония', 'Канада',
    'Австралия', 'Швейцария', 'Нидерланды', 'Бельгия', 'Швеция', 'Норвегия'
  ];

  // Функция для загрузки Excel файлов
  const handleFileUpload = useCallback((event, country) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        setTariffsData(prev => {
        localStorage.setItem(`tariffs_${country}`, JSON.stringify(jsonData));
        return {
          ...prev,
          [country]: jsonData
                };
      });
      } catch (error) {
        alert('Ошибка при загрузке файла. Убедитесь, что это корректный Excel файл.');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  // Функция для конвертации валют в доллары
  const convertToUSD = (amount, currency) => {
    const numAmount = parseFloat(amount) || 0;
    switch (currency) {
      case 'USD': return numAmount;
      case 'RUB': return numAmount / exchangeRates.RUB;
      case 'BYN': return numAmount / exchangeRates.BYN;
      case 'KZT': return numAmount / exchangeRates.KZT;
      default: return numAmount;
    }
  };

  // Функция для получения тарифа доставки с учетом разных форматов таблиц
  const getShippingCost = (weight, country, destination) => {
    const tariffs = tariffsData[country];
    if (!tariffs || tariffs.length === 0) return 0;

    const weightKg = parseFloat(weight);
    let shippingCost = 0;

    // Для таблицы первого типа (с весовыми диапазонами в колонках)
    if (tariffs[0] && typeof tariffs[0]['0.15 кг'] !== 'undefined') {
      const destinationRow = tariffs.find(row => 
        row['Страна'] && row['Страна'].toLowerCase().includes(destination.toLowerCase())
      );
      
      if (destinationRow) {
        // Определяем нужную колонку по весу
        const weightColumns = [
          '0.15 кг', '0.5 кг', '1 кг', '1.5 кг', '2 кг', '2.5 кг', '3 кг', '3.5 кг', '4 кг',
          '4.5 кг', '5 кг', '5.5 кг', '6 кг', '6.5 кг', '7 кг', '7.5 кг', '8 кг', '8.5 кг',
          '9 кг', '9.5 кг', '10 кг'
        ];
        
        for (let col of weightColumns) {
          const colWeight = parseFloat(col.replace(' кг', ''));
          if (weightKg <= colWeight && destinationRow[col]) {
            shippingCost = parseFloat(destinationRow[col]) || 0;
            break;
          }
        }
      }
    }
    // Для таблицы второго типа (с весовыми диапазонами в строках)
    else if (tariffs[0] && typeof tariffs[0]['до 2 кг'] !== 'undefined') {
      const destinationRow = tariffs.find(row => 
        row['Страна'] && row['Страна'].toLowerCase().includes(destination.toLowerCase())
      );
      
      if (destinationRow) {
        if (weightKg <= 0.5) shippingCost = parseFloat(destinationRow['0-500']) || 0;
        else if (weightKg <= 1) shippingCost = parseFloat(destinationRow['501-1000']) || 0;
        else if (weightKg <= 2) shippingCost = parseFloat(destinationRow['до 2 кг']) || 0;
        else if (weightKg <= 3) shippingCost = parseFloat(destinationRow['3 кг']) || 0;
        else if (weightKg <= 4) shippingCost = parseFloat(destinationRow['4 кг']) || 0;
        else if (weightKg <= 5) shippingCost = parseFloat(destinationRow['5 кг']) || 0;
        else if (weightKg <= 6) shippingCost = parseFloat(destinationRow['6 кг']) || 0;
        else if (weightKg <= 7) shippingCost = parseFloat(destinationRow['7 кг']) || 0;
        else if (weightKg <= 8) shippingCost = parseFloat(destinationRow['8 кг']) || 0;
        else if (weightKg <= 9) shippingCost = parseFloat(destinationRow['9 кг']) || 0;
        else if (weightKg <= 10) shippingCost = parseFloat(destinationRow['10 кг']) || 0;
      }
    }

    // Конвертируем в доллары в зависимости от страны
    const currency = country === 'belarus' ? 'BYN' : 'KZT';
    return convertToUSD(shippingCost, currency);
  };

  // Добавление товара
  const addItem = () => {
    const newId = Math.max(...items.map(item => item.id)) + 1;
    setItems([...items, {
      id: newId,
      name: '',
      weight: '',
      price: '',
      priceCurrency: 'RUB',
      quantity: 1,
      retailPrice: ''
    }]);
  };

  // Удаление товара
  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  // Обновление товара
  const updateItem = (id, field, value) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Добавление дополнительного расхода
  const addExpense = () => {
    setAdditionalExpenses([...additionalExpenses, { name: '', amount: '', currency: 'USD' }]);
  };

  // Удаление дополнительного расхода
  const removeExpense = (index) => {
    setAdditionalExpenses(additionalExpenses.filter((_, i) => i !== index));
  };

  // Обновление дополнительного расхода
  const updateExpense = (index, field, value) => {
    const updated = [...additionalExpenses];
    updated[index][field] = value;
    setAdditionalExpenses(updated);
  };

  // Расчет результатов
  const calculateResults = () => {
    // Общий вес и стоимость всех товаров
    let totalWeight = 0;
    let totalItemCost = 0;
    let totalRetailPrice = 0;

    items.forEach(item => {
      const weight = parseFloat(item.weight) || 0;
      const quantity = parseInt(item.quantity) || 1;
      const itemCost = convertToUSD(item.price, item.priceCurrency);
      const retailPrice = parseFloat(item.retailPrice) || 0;

      totalWeight += weight * quantity;
      totalItemCost += itemCost * quantity;
      totalRetailPrice += retailPrice * quantity;
    });

    // Комиссия площадки
    const commission = (totalRetailPrice * parseFloat(packageSettings.commissionPercent)) / 100;
    
    // Дополнительные расходы в USD
    const additionalCosts = additionalExpenses.reduce((sum, expense) => {
      return sum + convertToUSD(expense.amount, expense.currency);
    }, 0);
    
    // Стоимость доставки для выбранной страны
    const shippingCostSelected = getShippingCost(totalWeight, selectedCountry, packageSettings.destination);
    
    // Стоимость доставки для альтернативной страны
    const alternativeCountry = selectedCountry === 'belarus' ? 'kazakhstan' : 'belarus';
    const shippingCostAlternative = getShippingCost(totalWeight, alternativeCountry, packageSettings.destination);
    
    // Общие расходы
    const totalCosts = totalItemCost + shippingCostSelected + additionalCosts + commission;
    
    // Маржа
    const margin = totalRetailPrice - totalCosts;
    const marginPercent = totalRetailPrice > 0 ? (margin / totalRetailPrice) * 100 : 0;

    setResults({
      itemCost: totalItemCost,
      totalWeight,
      shippingCostSelected,
      shippingCostAlternative,
      additionalCosts,
      commission,
      retailPrice: totalRetailPrice,
      totalCosts,
      margin,
      marginPercent,
      selectedCountry: selectedCountry === 'belarus' ? 'Беларусь' : 'Казахстан',
      alternativeCountry: alternativeCountry === 'belarus' ? 'Беларусь' : 'Казахстан',
      savings: shippingCostSelected - shippingCostAlternative,
      destination: packageSettings.destination
    });
  };
    const resetAll = () => {
    if (!confirm('Сбросить все данные калькулятора?')) return;
    localStorage.clear();
    window.location.reload();
};

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Калькулятор доставки
        </h1>

        {/* Загрузка тарифных таблиц */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FileText className="mr-2" size={20} />
              Тарифы Беларуси (BYN)
            </h3>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleFileUpload(e, 'belarus')}
              className="w-full p-2 border border-gray-300 rounded"
            />
            {tariffsData.belarus && (
              <p className="text-green-600 mt-2">✓ Загружено {tariffsData.belarus.length} направлений</p>
            )}
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FileText className="mr-2" size={20} />
              Тарифы Казахстана (KZT)
            </h3>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleFileUpload(e, 'kazakhstan')}
              className="w-full p-2 border border-gray-300 rounded"
            />
            {tariffsData.kazakhstan && (
              <p className="text-green-600 mt-2">✓ Загружено {tariffsData.kazakhstan.length} направлений</p>
            )}
          </div>
        </div>

        {/* Курсы валют */}
        
      {!ratesLoaded && (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-300 mb-6">
          <h3 className="font-semibold mb-2">💱 Курсы валют (введите вручную):</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <label>RUB к USD</label>
              <input
                type="number"
                step="0.01"
                value={exchangeRates.RUB}
                onChange={(e) => setExchangeRates({...exchangeRates, RUB: parseFloat(e.target.value) || 0})}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label>BYN к USD</label>
              <input
                type="number"
                step="0.01"
                value={exchangeRates.BYN}
                onChange={(e) => setExchangeRates({...exchangeRates, BYN: parseFloat(e.target.value) || 0})}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label>KZT к USD</label>
              <input
                type="number"
                step="0.01"
                value={exchangeRates.KZT}
                onChange={(e) => setExchangeRates({...exchangeRates, KZT: parseFloat(e.target.value) || 0})}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
          </div>
        </div>
      )}
<div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold mb-2">Курсы валют (к USD):</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>RUB: {exchangeRates.RUB}</div>
            <div>BYN: {exchangeRates.BYN}</div>
            <div>KZT: {exchangeRates.KZT}</div>
          </div>
        </div>

        {/* Настройки посылки */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Страна назначения</label>
            <select
              value={packageSettings.destination}
              onChange={(e) => setPackageSettings({...packageSettings, destination: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded bg-white"
            >
              {destinations.map(dest => (
                <option key={dest} value={dest}>{dest}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Комиссия площадки (%)</label>
            <input
              type="number"
              step="0.1"
              value={packageSettings.commissionPercent}
              onChange={(e) => setPackageSettings({...packageSettings, commissionPercent: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
        </div>

        {/* Товары в посылке */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Package className="mr-2" size={20} />
              Товары в посылке
            </h3>
            <button
              onClick={addItem}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <Plus size={16} className="mr-2" />
              Добавить товар
            </button>
          </div>
          
          {items.map((item, index) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Товар {index + 1}</h4>
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Название товара</label>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Вес (кг)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={item.weight}
                    onChange={(e) => updateItem(item.id, 'weight', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Количество</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Цена товара</label>
                  <div className="flex">
                    <input
                      type="number"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-l text-sm"
                    />
                    <select
                      value={item.priceCurrency}
                      onChange={(e) => updateItem(item.id, 'priceCurrency', e.target.value)}
                      className="p-2 border border-gray-300 rounded-r bg-white text-sm"
                    >
                      <option value="RUB">RUB</option>
                      <option value="USD">USD</option>
                      <option value="BYN">BYN</option>
                      <option value="KZT">KZT</option>
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Розничная цена (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.retailPrice}
                    onChange={(e) => updateItem(item.id, 'retailPrice', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Дополнительные расходы */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Дополнительные расходы</h3>
            <button
              onClick={addExpense}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <Plus size={16} className="mr-2" />
              Добавить
            </button>
          </div>
          
          {additionalExpenses.map((expense, index) => (
            <div key={index} className="flex items-center gap-2 mb-2">
              <input
                type="text"
                placeholder="Название расхода"
                value={expense.name}
                onChange={(e) => updateExpense(index, 'name', e.target.value)}
                className="flex-1 p-2 border border-gray-300 rounded"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Сумма"
                value={expense.amount}
                onChange={(e) => updateExpense(index, 'amount', e.target.value)}
                className="w-24 p-2 border border-gray-300 rounded"
              />
              <select
                value={expense.currency}
                onChange={(e) => updateExpense(index, 'currency', e.target.value)}
                className="p-2 border border-gray-300 rounded bg-white"
              >
                <option value="USD">USD</option>
                <option value="RUB">RUB</option>
                <option value="BYN">BYN</option>
                <option value="KZT">KZT</option>
              </select>
              <button
                onClick={() => removeExpense(index)}
                className="p-2 text-red-500 hover:text-red-700"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Выбор страны отправки */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Страна отправки</label>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded bg-white"
          >
            <option value="belarus">Беларусь</option>
            <option value="kazakhstan">Казахстан</option>
          </select>
        </div>

        {/* Кнопка расчета */}
        <button
          onClick={calculateResults}
          className="w-full flex items-center justify-center px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 text-lg font-semibold"
        >
          <Calculator className="mr-2" size={20} />
          Рассчитать
        </button>

        {/* Результаты */}
        {results && (
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">
                Расчет доставки в {results.destination} через {results.selectedCountry}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Стоимость товаров:</span>
                  <span>${results.itemCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Общий вес посылки:</span>
                  <span>{results.totalWeight.toFixed(2)} кг</span>
                </div>
                <div className="flex justify-between">
                  <span>Стоимость доставки:</span>
                  <span>${results.shippingCostSelected.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Дополнительные расходы:</span>
                  <span>${results.additionalCosts.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Комиссия площадки:</span>
                  <span>${results.commission.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Общие расходы:</span>
                  <span>${results.totalCosts.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Розничная цена:</span>
                  <span>${results.retailPrice.toFixed(2)}</span>
                </div>
                <div className={`flex justify-between font-semibold ${results.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <span>Маржа:</span>
                  <span>${results.margin.toFixed(2)} ({results.marginPercent.toFixed(1)}%)</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">Сравнение с {results.alternativeCountry}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Доставка через {results.selectedCountry}:</span>
                  <span>${results.shippingCostSelected.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Доставка через {results.alternativeCountry}:</span>
                  <span>${results.shippingCostAlternative.toFixed(2)}</span>
                </div>
                <div className={`flex justify-between font-semibold ${results.savings <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <span>Экономия/переплата:</span>
                  <span>${Math.abs(results.savings).toFixed(2)} {results.savings <= 0 ? '(экономия)' : '(переплата)'}</span>
                </div>
                <div className="mt-4 p-3 bg-white rounded border">
                  <p className="text-sm">
                    <strong>Рекомендация:</strong><br/>
                    {results.savings <= 0 
                      ? `Отправка через ${results.selectedCountry} выгоднее на $${Math.abs(results.savings).toFixed(2)}`
                      : `Отправка через ${results.alternativeCountry} была бы выгоднее на $${results.savings.toFixed(2)}`
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShippingCalculator;