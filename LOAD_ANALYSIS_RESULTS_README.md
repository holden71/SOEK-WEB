# Инструкции по применению изменений для сохранения результатов расчетов

## Проблема
Результаты расчетов анализа нагрузки (delta T и delta P) не сохранялись в базу данных.

## Решение
Добавлены новые поля в таблицу `SRTN_EK_SEISM_DATA` для хранения результатов расчетов.

## Необходимые действия

### 1. Применить SQL скрипт к базе данных

Выполните SQL скрипт `add_load_analysis_results_columns.sql` в вашей базе данных Oracle:

```sql
-- Добавляем поля для результатов расчетов ПЗ
ALTER TABLE SRTN_EK_SEISM_DATA ADD (
    DELTA_T_PZ NUMBER NULL,
    RATIO_P_PZ NUMBER NULL
);

-- Добавляем поля для результатов расчетов МРЗ
ALTER TABLE SRTN_EK_SEISM_DATA ADD (
    DELTA_T_MRZ NUMBER NULL,
    RATIO_P_MRZ NUMBER NULL
);

-- Добавляем комментарии к полям для документации
COMMENT ON COLUMN SRTN_EK_SEISM_DATA.DELTA_T_PZ IS 'Результат расчета ΔT для ПЗ (T2 - T1)';
COMMENT ON COLUMN SRTN_EK_SEISM_DATA.RATIO_P_PZ IS 'Результат расчета ΔP для ПЗ (P2 / P1)';
COMMENT ON COLUMN SRTN_EK_SEISM_DATA.DELTA_T_MRZ IS 'Результат расчета ΔT для МРЗ (T2 - T1)';
COMMENT ON COLUMN SRTN_EK_SEISM_DATA.RATIO_P_MRZ IS 'Результат расчета ΔP для МРЗ (P2 / P1)';
```

### 2. Проверить, что поля добавлены

Выполните запрос для проверки:

```sql
SELECT column_name, data_type, nullable
FROM user_tab_columns
WHERE table_name = 'SRTN_EK_SEISM_DATA'
AND column_name IN ('DELTA_T_PZ', 'RATIO_P_PZ', 'DELTA_T_MRZ', 'RATIO_P_MRZ')
ORDER BY column_name;
```

### 3. Перезапустить приложение

После применения изменений в базе данных перезапустите backend сервер.

## Что было изменено

### Frontend (`LoadAnalysisTab.jsx`)
- Кнопка переименована в "Розрахувати"
- Расчеты выполняются только при нажатии кнопки
- Результаты расчетов сохраняются в базу данных
- При загрузке параметров также загружаются сохраненные результаты

### Backend
- Добавлены новые поля в модель `LoadAnalysisParams`
- Обновлены API endpoints для сохранения и загрузки результатов
- Добавлены новые поля в SQL запросы

### База данных
- Добавлены новые поля: `DELTA_T_PZ`, `RATIO_P_PZ`, `DELTA_T_MRZ`, `RATIO_P_MRZ`
- Обновлен файл `columns.json`

## Проверка работы

1. Откройте вкладку "Анализ нагрузки"
2. Введите параметры для расчета
3. Нажмите кнопку "Розрахувати"
4. Проверьте, что результаты отображаются
5. Перезагрузите страницу
6. Проверьте, что результаты загружаются из базы данных 