-- Script para corregir fechas de entrenamientos en Turso
-- Problema: Los entrenamientos se guardaron con fecha UTC cuando deberían usar fecha local (Venezuela)
-- Venezuela está en UTC-4, entonces si se guardó algo a las 8PM del 3 de octubre,
-- en UTC sería 4 de octubre 00:00, pero debería ser 3 de octubre

-- ⚠️ NOTA: Este script debe ejecutarse directamente en Turso CLI
-- Los entrenamientos guardados antes de implementar getLocalDate() tienen fechas incorrectas

-- Ver entrenamientos actuales y sus fechas
SELECT 
  id,
  fecha,
  startTime,
  completed,
  createdAt
FROM entrenamientos
ORDER BY fecha DESC;

-- Si necesitas corregir fechas específicas:
-- Ejemplo: Cambiar entrenamiento del 4 de octubre al 3 de octubre (restó 1 día)

-- UPDATE entrenamientos 
-- SET fecha = '2025-10-03'
-- WHERE fecha = '2025-10-04' 
-- AND startTime < '04:00'; -- Solo los que se guardaron antes de las 4AM UTC (12AM Venezuela)

-- O para el entrenamiento del domingo (cambiar del 3 al 4):
-- UPDATE entrenamientos 
-- SET fecha = '2025-10-04'
-- WHERE fecha = '2025-10-03' 
-- AND startTime >= '20:00'; -- Los que se guardaron después de las 8PM local

-- Verificación después de actualizar:
-- SELECT id, fecha, startTime, completed FROM entrenamientos ORDER BY fecha DESC;
