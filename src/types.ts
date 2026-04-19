/**
 * Интерфейс материала для учебного тренажера
 */
export interface Material {
  id: string;
  name: string;
  fe: number;      // Железо (Iron), %
  cao: number;     // Оксид кальция (CaO), %
  sio2: number;    // Диоксид кремния (SiO2), %
  loss: number;    // Потери при прокаливании (ППП), %
  cost: number;    // Цена, руб/т
  moisture: number; // Влажность, %
}

/**
 * Массив материалов по умолчанию
 */
export const defaultMaterials: Material[] = [
  {
    id: 'concentrate',
    name: 'Концентрат',
    fe: 65,
    cao: 1,
    sio2: 5,
    loss: 0,
    cost: 2500,
    moisture: 8,
  },
  {
    id: 'ore',
    name: 'Руда',
    fe: 52,
    cao: 0.5,
    sio2: 12,
    loss: 2,
    cost: 1800,
    moisture: 6,
  },
  {
    id: 'limestone',
    name: 'Известняк',
    fe: 0,
    cao: 52,
    sio2: 2,
    loss: 42,
    cost: 800,
    moisture: 3,
  },
  {
    id: 'coke',
    name: 'Кокс',
    fe: 0,
    cao: 1,
    sio2: 5,
    loss: 12,
    cost: 4500,
    moisture: 4,
  },
];
