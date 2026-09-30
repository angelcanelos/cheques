import { test } from 'node:test'
import assert from 'node:assert/strict'
import { amountToPesosText } from '../src/shared/amountToWords.ts'
import { formatCheckAmount, formatWordsLine, splitCheckDate } from '../src/shared/format.ts'

// Casos tomados del Excel "CHEQUES DE NOM. EJIDA 26.xlsx" de la secretaria.
const casos: [number, string][] = [
  [2140.4, 'SON:  ( DOS MIL CIENTO CUARENTA PESOS 40/100 M.N. )'],
  [2610.4, 'SON:  ( DOS MIL SEISCIENTOS DIEZ PESOS 40/100 M.N. )'],
  [3963, 'SON:  ( TRES MIL NOVECIENTOS SESENTA Y TRES PESOS 00/100 M.N. )'],
  [1837.8, 'SON:  ( UN MIL OCHOCIENTOS TREINTA Y SIETE PESOS 80/100 M.N. )'],
  [1102.6, 'SON:  ( UN MIL CIENTO DOS PESOS 60/100 M.N. )'],
  [2205.2, 'SON:  ( DOS MIL DOSCIENTOS CINCO PESOS 20/100 M.N. )'],
  [3167, 'SON:  ( TRES MIL CIENTO SESENTA Y SIETE PESOS 00/100 M.N. )'],
  [3388.8, 'SON:  ( TRES MIL TRESCIENTOS OCHENTA Y OCHO PESOS 80/100 M.N. )'],
  [3000.6, 'SON:  ( TRES MIL PESOS 60/100 M.N. )'],
  [2212, 'SON:  ( DOS MIL DOSCIENTOS DOCE PESOS 00/100 M.N. )']
]

for (const [monto, esperado] of casos) {
  test(`cantidad con letra de ${monto}`, () => {
    assert.equal(formatWordsLine(amountToPesosText(monto)), esperado)
  })
}

test('casos básicos', () => {
  assert.equal(amountToPesosText(1), 'UN PESO 00/100 M.N.')
  assert.equal(amountToPesosText(21), 'VEINTIÚN PESOS 00/100 M.N.')
  assert.equal(amountToPesosText(1000000), 'UN MILLÓN PESOS 00/100 M.N.')
})

test('el monto en número va sin signo de pesos', () => {
  assert.equal(formatCheckAmount(2140.4), '2,140.40')
  assert.equal(formatCheckAmount(3963), '3,963.00')
})

test('la fecha se separa en día, mes y año', () => {
  assert.deepEqual(splitCheckDate('2026-09-17'), { day: '17', month: '09', year: '2026' })
})
