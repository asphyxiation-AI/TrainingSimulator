import { useState, useMemo, useCallback } from 'react';
import { 
  Database, 
  Settings, 
  BarChart3, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Droplets,
  Flame,
  RotateCcw,
  FileText,
  X
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Material, defaultMaterials } from './types';

/**
 * Результаты расчета шихты
 */
interface SinterBalance {
  totalDryMass: number;      // Общая сухая масса шихты
  totalWeight: number;       // Общий вес шихты (влажный)
  avgLoss: number;           // Средний ППП
  fePercent: number;         // Содержание Fe в агломерате, %
  caoPercent: number;        // Содержание CaO в агломерате, %
  sio2Percent: number;       // Содержание SiO2 в агломерате, %
  basicity: number;          // Основность (CaO/SiO2)
  cost: number;              // Себестоимость, руб
  sinterMass: number;         // Масса агломерата после спекания
}

/**
 * Оценка состояния шихты
 */
interface ChargeAssessment {
  status: 'good' | 'warning' | 'danger';
  message: string;
  details: string[];
}

/**
 * Цвета для круговой диаграммы
 */
const COLORS = ['#3B82F6', '#F97316', '#6B7280', '#1F2937'];

/**
 * Идеальные значения для сравнения
 */
const IDEAL_VALUES = {
  basicity: 1.3,
  fe: 58,
  cao: 12,
  sio2: 9
};

/**
 * Основной компонент приложения - Учебный тренажер
 */
function App() {
  // Состояние для хранения весов материалов (в кг)
  const [weights, setWeights] = useState<Record<string, number>>(
    Object.fromEntries(defaultMaterials.map(m => [m.id, 0]))
  );

  // Состояние для модального окна отчета
  const [showReport, setShowReport] = useState(false);
  const [reportContent, setReportContent] = useState('');

  /**
   * Расчет материального баланса шихты
   */
  const calculateSinterBalance = (currentWeights: Record<string, number>): SinterBalance => {
    // Начальные значения
    let totalWetWeight = 0;      // Общий влажный вес
    let totalDryMass = 0;        // Общая сухая масса
    let totalFeMass = 0;         // Общая масса железа
    let totalCaoMass = 0;        // Общая масса CaO
    let totalSio2Mass = 0;       // Общая масса SiO2
    let weightedLoss = 0;        // Взвешенный ППП
    let totalCost = 0;           // Общая стоимость

    // Проходим по всем материалам
    defaultMaterials.forEach((material: Material) => {
      const weight = currentWeights[material.id] || 0;
      if (weight > 0) {
        // Сухая масса материала (учитываем влажность)
        const dryMass = weight * (1 - material.moisture / 100);
        
        totalWetWeight += weight;
        totalDryMass += dryMass;
        
        // Масса каждого элемента в сухом материале
        totalFeMass += dryMass * (material.fe / 100);
        totalCaoMass += dryMass * (material.cao / 100);
        totalSio2Mass += dryMass * (material.sio2 / 100);
        
        // Взвешенный ППП (вносит вклад в уменьшение массы при спекании)
        weightedLoss += dryMass * (material.loss / 100);
        
        // Стоимость (цена в руб/т, переводим в руб/кг)
        totalCost += weight * (material.cost / 1000);
      }
    });

    // Средний ППП
    const avgLoss = totalDryMass > 0 ? (weightedLoss / totalDryMass) * 100 : 0;
    
    // Масса агломерата после спекания (учитываем ППП)
    const sinterMass = totalDryMass - weightedLoss;
    
    // Процентное содержание элементов в агломерате
    const fePercent = sinterMass > 0 ? (totalFeMass / sinterMass) * 100 : 0;
    const caoPercent = sinterMass > 0 ? (totalCaoMass / sinterMass) * 100 : 0;
    const sio2Percent = sinterMass > 0 ? (totalSio2Mass / sinterMass) * 100 : 0;
    
    // Основность (отношение CaO к SiO2)
    const basicity = sio2Percent > 0 ? caoPercent / sio2Percent : 0;

    return {
      totalDryMass,
      totalWeight: totalWetWeight,
      avgLoss,
      fePercent,
      caoPercent,
      sio2Percent,
      basicity,
      cost: totalCost,
      sinterMass,
    };
  };

  /**
   * Оценка состояния шихты
   */
  const assessCharge = (balance: SinterBalance): ChargeAssessment => {
    const details: string[] = [];
    let status: 'good' | 'warning' | 'danger' = 'good';
    let mainMessage = '';

    // Проверка основности
    if (balance.sio2Percent > 0) {
      if (balance.basicity >= 1.2 && balance.basicity <= 1.4) {
        details.push('✓ Основность в оптимальном диапазоне (1.2–1.4)');
      } else if (balance.basicity > 1.4) {
        details.push('⚠ Высокая основность — избыток флюса');
        status = 'warning';
      } else if (balance.basicity < 1.2 && balance.basicity > 0) {
        details.push('⚠ Низкая основность — недостаток флюса');
        status = 'warning';
      }
    }

    // Проверка содержания железа
    if (balance.fePercent >= 55) {
      details.push('✓ Высокое содержание Fe (≥55%)');
    } else if (balance.fePercent >= 50) {
      details.push('⚠ Среднее содержание Fe (50–55%)');
      if (status === 'good') status = 'warning';
    } else if (balance.fePercent > 0) {
      details.push('✗ Низкое качество агломерата (Fe < 50%)');
      status = 'danger';
    }

    // Проверка баланса компонентов
    const limestoneWeight = weights['limestone'] || 0;
    const cokeWeight = weights['coke'] || 0;
    const total = balance.totalWeight;

    if (total > 0) {
      const limestonePercent = (limestoneWeight / total) * 100;

      if (limestonePercent > 20) {
        details.push('⚠ Избыток известняка — повышенный расход флюса');
      }
      if (cokeWeight > 0 && limestonePercent < 5) {
        details.push('⚠ Недостаточно флюса для шлакообразования');
        if (status === 'good') status = 'warning';
      }
    }

    // Формируем итоговое сообщение
    if (status === 'good' && details.length > 0) {
      mainMessage = 'Шихта сбалансирована';
    } else if (status === 'warning') {
      mainMessage = 'Требуется корректировка состава';
    } else if (status === 'danger') {
      mainMessage = 'Критическое качество агломерата';
    } else {
      mainMessage = 'Введите количество материалов для расчета';
    }

    return { status, message: mainMessage, details };
  };

  // Расчеты с использованием useMemo для автоматического пересчета
  const balance = useMemo(() => calculateSinterBalance(weights), [weights]);
  const assessment = useMemo(() => assessCharge(balance), [balance]);

  // Оптимизированный обработчик копирования отчета
  const handleCopyReport = useCallback(() => {
    navigator.clipboard.writeText(reportContent);
    alert('Отчет успешно скопирован в буфер обмена!');
  }, [reportContent]);

  // Данные для круговой диаграммы
  const pieData = useMemo(() => {
    return defaultMaterials
      .filter(m => weights[m.id] > 0)
      .map(m => ({
        name: m.name,
        value: weights[m.id],
        percent: balance.totalWeight > 0 ? ((weights[m.id] / balance.totalWeight) * 100).toFixed(1) : 0
      }));
  }, [weights, balance.totalWeight]);

  // Данные для радарной диаграммы
  const radarData = useMemo(() => [
    { subject: 'Основность (B)', current: Math.min(balance.basicity / IDEAL_VALUES.basicity, 1.5) * 50, ideal: 50 },
    { subject: 'Fe (%)', current: Math.min(balance.fePercent / IDEAL_VALUES.fe, 1.5) * 50, ideal: 50 },
    { subject: 'CaO (%)', current: Math.min(balance.caoPercent / IDEAL_VALUES.cao, 1.5) * 50, ideal: 50 },
    { subject: 'SiO₂ (%)', current: Math.min(balance.sio2Percent / IDEAL_VALUES.sio2, 1.5) * 50, ideal: 50 },
  ], [balance]);

  // Обработчик изменения веса материала
  const handleWeightChange = (id: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setWeights(prev => ({ ...prev, [id]: 0 }));
      return;
    }
    setWeights(prev => ({
      ...prev,
      [id]: Math.max(0, Math.min(1000, numValue)),
    }));
  };

  // Обработчик изменения веса через слайдер
  const handleSliderChange = (id: string, value: number) => {
    setWeights((prev: Record<string, number>) => ({
      ...prev,
      [id]: value,
    }));
  };

  // Сброс всех весов
  const handleReset = () => {
    setWeights(Object.fromEntries(defaultMaterials.map(m => [m.id, 0])));
  };

  // Формирование отчета
  const generateReport = () => {
    const report = `
═══════════════════════════════════════════════════════════════
                    ОТЧЕТ ПО РАСЧЕТУ ШИХТЫ
═══════════════════════════════════════════════════════════════

ДАТА: ${new Date().toLocaleDateString('ru-RU')}
ВРЕМЯ: ${new Date().toLocaleTimeString('ru-RU')}

───────────────────────────────────────────────────────────────
1. СОСТАВ ШИХТЫ (входные данные)
───────────────────────────────────────────────────────────────
${defaultMaterials.map(m => `   ${m.name.padEnd(15)} ${weights[m.id].toString().padStart(6)} кг`).join('\n')}

ОБЩИЙ ВЕС ШИХТЫ: ${balance.totalWeight.toFixed(1)} кг

───────────────────────────────────────────────────────────────
2. РЕЗУЛЬТАТЫ РАСЧЕТА АГЛОМЕРАТА
───────────────────────────────────────────────────────────────
   Сухая масса шихты:      ${balance.totalDryMass.toFixed(1)} кг
   Потери при прокаливании: ${balance.avgLoss.toFixed(2)} %
   Масса агломерата:       ${balance.sinterMass.toFixed(1)} кг

───────────────────────────────────────────────────────────────
3. ХИМИЧЕСКИЙ СОСТАВ АГЛОМЕРАТА
───────────────────────────────────────────────────────────────
   Железо (Fe):           ${balance.fePercent.toFixed(2)} %
   Оксид кальция (CaO):   ${balance.caoPercent.toFixed(2)} %
   Диоксид кремния (SiO₂): ${balance.sio2Percent.toFixed(2)} %
   Основность (B):         ${balance.basicity.toFixed(3)}
   
   Эталонные значения:     Fe = ${IDEAL_VALUES.fe}%, B = ${IDEAL_VALUES.basicity}

───────────────────────────────────────────────────────────────
4. ЭКОНОМИЧЕСКИЕ ПОКАЗАТЕЛИ
───────────────────────────────────────────────────────────────
   Себестоимость шихты:   ${balance.cost.toFixed(2)} руб

───────────────────────────────────────────────────────────────
5. ОЦЕНКА КАЧЕСТВА ШИХТЫ
───────────────────────────────────────────────────────────────
   Вердикт: ${assessment.message}
${assessment.details.map(d => `   • ${d}`).join('\n')}

═══════════════════════════════════════════════════════════════
`;

    setReportContent(report);
    setShowReport(true);
    console.log(report);
  };

  // Функция для определения цвета основности
  const getBasicityColor = (basicity: number) => {
    if (basicity >= 1.2 && basicity <= 1.4) {
      return { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-600' };
    } else if (basicity > 1.4) {
      return { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-600' };
    } else if (basicity > 0 && basicity < 1.2) {
      return { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-600' };
    }
    return { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-600' };
  };

  const basicityColors = getBasicityColor(balance.basicity);

  // Функция для определения цвета железа
  const getFeColor = (fe: number) => {
    if (fe >= 55) return { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-600' };
    if (fe >= 50) return { bg: 'bg-yellow-50', border: 'border-yellow-500', text: 'text-yellow-600' };
    if (fe > 0) return { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-700' };
    return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600' };
  };

  const feColors = getFeColor(balance.fePercent);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 text-gray-900 w-full">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-xl">
        <div className="max-w-[1800px] mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold">Учебный тренажер: Расчет шихты</h1>
                <p className="text-slate-300 text-sm mt-1">
                  Моделирование процесса доменной плавки
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Сбросить шихту
              </button>
              <button
                onClick={generateReport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4" />
                Сформировать отчет
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content FHD 1920x1080 */}
      <main className="max-w-[1800px] mx-auto px-8 py-8">
        <div className="grid grid-cols-12 gap-6">
          
          {/* Materials Panel */}
          <div className="col-span-4">
            <div className="bg-white backdrop-blur rounded-2xl border border-gray-200 p-6 shadow-xl shadow-gray-200/50">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-blue-50 rounded-lg">
                  <Database className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Доступные материалы</h2>
              </div>
              <div className="space-y-3">
                {defaultMaterials.map((material) => (
                  <div
                    key={material.id}
                    className="group bg-gray-50 border border-gray-200 hover:border-blue-300 rounded-xl p-4 transition-all duration-300 hover:bg-blue-50/30"
                  >
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                      {material.id === 'concentrate' && <Droplets className="w-4 h-4 text-blue-500" />}
                      {material.id === 'ore' && <Flame className="w-4 h-4 text-orange-500" />}
                      {material.id === 'limestone' && <Settings className="w-4 h-4 text-gray-500" />}
                      {material.id === 'coke' && <BarChart3 className="w-4 h-4 text-gray-600" />}
                      {material.name}
                    </h3>
                    <div className="grid grid-cols-2 gap-1.5 text-xs text-gray-600">
                      <div>Fe: <span className="font-semibold text-gray-800">{material.fe}%</span></div>
                      <div>CaO: <span className="font-semibold text-gray-800">{material.cao}%</span></div>
                      <div>SiO₂: <span className="font-semibold text-gray-800">{material.sio2}%</span></div>
                      <div>ППП: <span className="font-semibold text-gray-800">{material.loss}%</span></div>
                      <div>Цена: <span className="font-semibold text-gray-800">{material.cost} ₽/т</span></div>
                      <div>Влага: <span className="font-semibold text-gray-800">{material.moisture}%</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Calculator Panel */}
          <div className="col-span-8">
            <div className="bg-white backdrop-blur rounded-2xl border border-gray-200 p-6 shadow-xl shadow-gray-200/50">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-emerald-50 rounded-lg">
                  <Settings className="w-5 h-5 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Панель расчета шихты</h2>
              </div>
              <p className="text-gray-600 mb-5 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Введите количество каждого материала в килограммах:
              </p>
              <div className="grid grid-cols-2 gap-4">
                {defaultMaterials.map((material) => (
                  <div key={material.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 transition-all duration-300 hover:border-emerald-300">
                    <div className="flex items-center gap-4 mb-3">
                      <label className="w-32 font-semibold text-gray-700">{material.name}:</label>
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        step="5"
                        value={weights[material.id] || ''}
                        onChange={(e) => handleWeightChange(material.id, e.target.value)}
                        className="flex-1 px-4 py-2.5 bg-white border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-gray-900 text-sm transition-all duration-300"
                        placeholder="0"
                      />
                      <span className="text-gray-500 font-medium w-14">кг</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      step="5"
                      value={weights[material.id] || 0}
                      onChange={(e) => handleSliderChange(material.id, parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="mt-2.5 text-sm text-blue-600 bg-blue-50 rounded-lg px-3 py-1.5 inline-block">
                      Сухая масса: {(weights[material.id] * (1 - material.moisture / 100)).toFixed(1)} кг
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Results Panel */}
          <div className="col-span-12">
            <div className="bg-white backdrop-blur rounded-2xl border border-gray-200 p-6 shadow-xl shadow-gray-200/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-violet-50 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-violet-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Результаты расчета</h2>
              </div>
              
              {/* Main Stats */}
              <div className="grid grid-cols-4 gap-5 mb-7">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-5 text-center">
                  <p className="text-sm text-gray-600 font-medium mb-1">Общий вес шихты</p>
                  <p className="text-3xl font-bold text-blue-600">{balance.totalWeight.toFixed(1)} кг</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-5 text-center">
                  <p className="text-sm text-gray-600 font-medium mb-1">Сухая масса</p>
                  <p className="text-3xl font-bold text-emerald-600">{balance.totalDryMass.toFixed(1)} кг</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-5 text-center">
                  <p className="text-sm text-gray-600 font-medium mb-1">Средний ППП</p>
                  <p className="text-3xl font-bold text-orange-600">{balance.avgLoss.toFixed(2)}%</p>
                </div>
                <div className="bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200 rounded-2xl p-5 text-center">
                  <p className="text-sm text-gray-600 font-medium mb-1">Себестоимость</p>
                  <p className="text-3xl font-bold text-violet-600">{balance.cost.toFixed(2)} ₽</p>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-2 gap-6 mb-7">
                {/* Pie Chart */}
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-700">
                    <PieChart className="w-5 h-5 text-gray-500" />
                    Структура шихты
                  </h3>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${Number(percent || 0)}%`}
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => `${value} кг`}
                          contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderRadius: '12px' }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-gray-500">
                      Введите количество материалов для отображения диаграммы
                    </div>
                  )}
                </div>

                {/* Radar Chart */}
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-700">
                    <Activity className="w-5 h-5 text-gray-500" />
                    Сравнение с эталонными показателями
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#d1d5db" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 75]} tick={{ fill: '#6b7280' }} />
                      <Radar
                        name="Эталон"
                        dataKey="ideal"
                        stroke="#22c55e"
                        fill="#22c55e"
                        fillOpacity={0.15}
                      />
                      <Radar
                        name="Текущее значение"
                        dataKey="current"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.25}
                      />
                      <Legend />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderRadius: '12px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Эталон: Основность = {IDEAL_VALUES.basicity}, Fe = {IDEAL_VALUES.fe}%, CaO = {IDEAL_VALUES.cao}%, SiO₂ = {IDEAL_VALUES.sio2}%
                  </p>
                </div>
              </div>

              {/* Chemical Composition */}
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-700">
                <Activity className="w-5 h-5 text-gray-500" />
                Химический состав полученного агломерата:
              </h3>
              <div className="grid grid-cols-5 gap-5 mb-6">
                <div className={`rounded-2xl p-5 text-center border-2 ${feColors.bg} ${feColors.border}`}>
                  <p className="text-sm text-gray-600 font-medium">Железо (Fe)</p>
                  <p className={`text-3xl font-bold ${feColors.text}`}>{balance.fePercent.toFixed(2)}%</p>
                  {balance.fePercent > 0 && balance.fePercent < 50 && (
                    <div className="mt-2.5 flex items-center justify-center gap-1.5 text-xs text-red-600 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Низкое качество
                    </div>
                  )}
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl p-5 text-center">
                  <p className="text-sm text-gray-600 font-medium">Оксид кальция (CaO)</p>
                  <p className="text-3xl font-bold text-blue-600">{balance.caoPercent.toFixed(2)}%</p>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl p-5 text-center">
                  <p className="text-sm text-gray-600 font-medium">Диоксид кремния (SiO₂)</p>
                  <p className="text-3xl font-bold text-gray-700">{balance.sio2Percent.toFixed(2)}%</p>
                </div>
                <div className={`rounded-2xl p-5 text-center border-2 ${basicityColors.bg} ${basicityColors.border}`}>
                  <p className="text-sm text-gray-600 font-medium">Основность (B)</p>
                  <p className={`text-3xl font-bold ${basicityColors.text}`}>{balance.basicity.toFixed(3)}</p>
                  <p className="text-xs text-gray-500 mt-1">оптимальный диапазон: 1.2–1.4</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-200 rounded-2xl p-5 text-center">
                  <p className="text-sm text-gray-600 font-medium">Масса агломерата</p>
                  <p className="text-3xl font-bold text-amber-600">{balance.sinterMass.toFixed(1)} кг</p>
                </div>
              </div>

              {/* Status Panel */}
              <div className={`rounded-2xl p-6 border-2 ${
                assessment.status === 'good' ? 'bg-green-50 border-green-300' :
                assessment.status === 'warning' ? 'bg-yellow-50 border-yellow-300' :
                assessment.status === 'danger' ? 'bg-red-50 border-red-300' :
                'bg-gray-50 border-gray-300'
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  {assessment.status === 'good' && <CheckCircle className="w-7 h-7 text-green-600" />}
                  {assessment.status === 'warning' && <AlertTriangle className="w-7 h-7 text-yellow-600" />}
                  {assessment.status === 'danger' && <AlertTriangle className="w-7 h-7 text-red-600" />}
                  <h4 className={`text-xl font-bold ${
                    assessment.status === 'good' ? 'text-green-700' :
                    assessment.status === 'warning' ? 'text-yellow-700' :
                    assessment.status === 'danger' ? 'text-red-700' :
                    'text-gray-600'
                  }`}>
                    {assessment.message}
                  </h4>
                </div>
                {assessment.details.length > 0 && (
                  <ul className="space-y-1.5">
                    {assessment.details.map((detail, index) => (
                      <li key={index} className={`text-sm ${
                        detail.startsWith('✓') ? 'text-green-700' :
                        detail.startsWith('⚠') ? 'text-yellow-700' :
                        detail.startsWith('✗') ? 'text-red-700' :
                        'text-gray-700'
                      }`}>
                        {detail}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {balance.totalWeight === 0 && (
                <p className="text-center text-gray-500 mt-6 italic text-lg">
                  Введите количество материалов для начала расчета
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-slate-700 to-slate-600 text-white mt-8 py-4">
        <div className="max-w-[1800px] mx-auto px-8 text-center text-sm">
          <p>Учебный тренажер для моделирования доменной плавки</p>
        </div>
      </footer>

      {/* Report Modal */}
      {showReport && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 max-w-4xl w-full max-h-[85vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6" />
                <h3 className="font-bold text-xl">Отчет по расчету шихты</h3>
              </div>
              <button
                onClick={() => setShowReport(false)}
                className="hover:bg-white/10 rounded-xl p-1.5 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
              <pre className="whitespace-pre-wrap font-mono text-sm text-slate-200 bg-slate-900/50 p-5 rounded-xl border border-slate-700">
                {reportContent}
              </pre>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={handleCopyReport}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl flex items-center gap-2 transition-all duration-300 shadow-lg shadow-emerald-600/20"
                >
                  <FileText className="w-4 h-4" />
                  Копировать в буфер обмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
