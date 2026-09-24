# Calculadora de sueldo neto en Bizkaia

Calculadora web para pasar de bruto a neto, de neto a bruto y calcular el coste para la empresa en Bizkaia, con el IRPF foral y las cotizaciones a la Seguridad Social de 2026.

https://davsed.github.io/calculadora-bizkaia/

## Qué calcula

- **Cotizaciones de 2026** del trabajador y de la empresa: contingencias comunes, desempleo (indefinido o temporal), FOGASA, formación profesional, MEI y accidentes de trabajo, con la base máxima y la cotización de solidaridad.
- **IRPF foral de Bizkaia**: bonificación de los rendimientos del trabajo, tarifa del 23 % al 49 %, minoración de cuota y deducción por hijos (entera o a medias con el otro progenitor).
- **La nómina** de un mes normal y de la paga extra, con 12 o 14 pagas.

El IRPF que muestra es el que corresponde pagar en el año (el de la declaración), repartido entre las pagas. La retención real de la nómina sale de la tabla de retenciones de Bizkaia y puede ser algo distinta.

No tiene en cuenta otros ingresos, aportaciones a EPSV o planes de pensiones, la tributación conjunta, la discapacidad ni otras deducciones.

## Parámetros

Están todos en `PARAMETROS`, al principio de `calculadora.js`:

| Concepto | 2026 | Norma |
| --- | --- | --- |
| Base máxima de cotización | 5.101,20 €/mes | Orden PJC/297/2026 |
| Cotización del trabajador (indefinido) | 4,70 % + 1,55 % + 0,10 % + MEI 0,15 % | Orden PJC/297/2026 |
| Cotización de la empresa (indefinido) | 23,60 % + 5,50 % + 0,20 % + 0,60 % + MEI 0,75 % + AT/EP | Orden PJC/297/2026 |
| Cotización de solidaridad | 1,15 % / 1,25 % / 1,46 % del exceso | Ley General de la Seguridad Social |
| Tarifa del IRPF | 23 % hasta 18.080 € … 49 % desde 208.390 € | NF 13/2013, art. 75 (NF 7/2025) |
| Bonificación del trabajo | 8.000 € hasta 14.800 €, baja hasta 3.000 € desde 23.000 € | NF 13/2013, art. 23 (NF 2/2025) |
| Minoración de cuota | 1.615 € | NF 13/2013, art. 77 (NF 7/2025) |
| Deducción por hijos | 682 / 844 / 1.421 / 1.680 / 2.195 € + 394 € por menor de 6 años | NF 13/2013, art. 79 (NF 7/2025) |

Los límites intermedios de la tarifa (77.430 €, 107.240 € y 142.940 €) son los de 2024-2025 deflactados un 2 %; conviene contrastarlos con el texto de la NF 7/2025. La diferencia posible es de unos pocos euros al año.

## Estructura

- `index.html`: la página y sus estilos.
- `calculadora.js`: la lógica de cálculo, sin DOM. Se usa en el navegador y en los tests.
- `app.js`: la interfaz (formulario, resultados, gráfico y enlace para compartir).
- `tests/`: tests con `node:test`.

## Tests

```sh
npm test
```

## Actualizar a un año nuevo

1. Cambiar `PARAMETROS` en `calculadora.js`.
2. Revisar los textos de `index.html` que citan importes y el año.
3. Ajustar los tests y ejecutar `npm test`.
