# Calculadora de sueldo neto en Bizkaia

Calculadora web para ver de un vistazo cuánto cuesta un puesto de trabajo a la empresa, cuánto de eso llega a la cuenta del trabajador y a dónde va el resto, en Bizkaia, con el IRPF foral y las cotizaciones a la Seguridad Social de 2026. Se puede partir del bruto, del neto o del coste para la empresa. Tiene también un modo para socios autónomos que cobran por nómina de su propia sociedad y, en otra pestaña, una calculadora de los dividendos que la sociedad reparte al socio: lo que le cuestan a la sociedad, con el Impuesto sobre Sociedades, y lo que le queda al socio tras el IRPF.

https://davsed.github.io/calculadora-bizkaia/

## Qué calcula

- **El reparto del coste**: coste para la empresa → sueldo bruto → neto para el trabajador, con el porcentaje del coste que llega al trabajador y una cascada paso a paso (cotizaciones de la empresa, cotizaciones del trabajador e IRPF).
- **Cotizaciones de 2026** del trabajador y de la empresa: contingencias comunes, desempleo (indefinido o temporal), FOGASA, formación profesional, MEI y accidentes de trabajo, con la base máxima y la cotización de solidaridad.
- **IRPF foral de Bizkaia**: bonificación de los rendimientos del trabajo, tarifa del 23 % al 49 %, minoración de cuota y deducción por hijos (entera o a medias con el otro progenitor).
- **La nómina** de un mes normal y de la paga extra, con 12 o 14 pagas, con la retención de la tabla oficial de Bizkaia (y el mínimo del 2 % en contratos de menos de un año).
- **La declaración de la renta**: lo que sale a pagar o a devolver comparando lo retenido con el IRPF del año. Con rendimientos del trabajo de hasta 20.000 € brutos al año y sin otros ingresos no hay obligación de declarar, aunque haya varios pagadores, así que el IRPF se queda en lo retenido salvo que compense declarar.

No tiene en cuenta otros ingresos, aportaciones a EPSV o planes de pensiones, la tributación conjunta, la discapacidad ni otras deducciones.

### Socio autónomo

Para el socio que controla su sociedad y está en el RETA (LGSS, art. 305.2.b), con un cargo de administrador sin sueldo por estatutos y una nómina por su trabajo:

- **La cuota de autónomo** sale de sus rendimientos: todo lo que le paga la sociedad por su trabajo (también la cuota, si la paga ella) menos un 3 % de gastos genéricos, repartido por meses. Con eso se busca el tramo de la tabla de 2026 y se aplica un 31,50 % a la base mínima del tramo, que para un socio no baja de la base mínima del grupo 7 del Régimen General (1.424,40 €). También se puede elegir otra base dentro del tramo.
- **El IRPF**: en Bizkaia lo que cobra por su trabajo es rendimiento del trabajo (con la bonificación del art. 23) y la cuota se resta como gasto (art. 22). La cuota es del socio: si la paga la sociedad, cuenta como sueldo en especie. Por eso el sueldo bruto del socio es todo lo que le paga la sociedad, con la cuota dentro, y coincide con el coste para la sociedad. Quién pague la cuota solo cambia la nómina de cada mes (dinero y especie, o todo en dinero y la cuota de su bolsillo); el bruto, el IRPF y el neto del año son los mismos. La retención sale de la tabla general con ese bruto, porque el cargo de administrador no se cobra.
- **La comparación** con lo que le llegaría como asalariado con el mismo coste para la sociedad.
- **Avisos** cuando la cuota mínima se come lo que paga la sociedad o cuando, al subir de tramo, un poco más de sueldo deja menos neto.

No incluye los dividendos, que también cuentan para la cuota de autónomo, ni la tarifa plana. La cuota es la provisional: la Seguridad Social la regulariza al año siguiente con los rendimientos reales.

### Dividendos del socio

En la pestaña «Dividendos» (`dividendos.html`), a partir de lo que le cuesta a la sociedad, del dividendo bruto que le toca al socio en el año o de lo que quiere que le quede:

- **Lo que le cuesta a la sociedad**: el beneficio antes del Impuesto sobre Sociedades que necesita para repartir el dividendo. Con el 20 % de las microempresas y pequeñas empresas, 10.000 € de beneficio dan 8.000 € de dividendo. El tipo se puede cambiar: 24 % si no es pequeña empresa, o menos si aplica deducciones, sin bajar del 15 % de tributación mínima de una pequeña empresa.

- **El IRPF de la base del ahorro**: los dividendos están exentos hasta 1.500 € al año y el resto tributa con la tarifa del ahorro de 2026, del 19 % al 28 %, aparte del sueldo.
- **La retención** del 19 % sobre todo el dividendo, también la parte exenta: lo que cobra en la cuenta al repartir.
- **La declaración de la renta**: lo que sale a pagar o a devolver comparando lo retenido con el IRPF del año. Con más de 1.600 € de dividendos hay que declarar; por debajo compensa hacerlo, porque devuelven lo retenido de más.
- **Un aviso** de que, con el 33 % del capital o el 25 % siendo administrador, los dividendos suman a los rendimientos del RETA y la cuota puede subir al regularizar. No se calcula.

No incluye las sociedades patrimoniales, que desde 2026 tributan con la escala del ahorro, otros rendimientos del ahorro ni la compensación de pérdidas.

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
| Tabla de retenciones | 0 % hasta 20.000 € … 40 % desde 236.060 €, según hijos; mínimo 2 % en contratos de menos de un año | Reglamento del IRPF (DF 47/2014), art. 88 (DF 134/2025) |
| Cuota de autónomo (RETA) | 28,30 % + 1,30 % + cese 0,90 % + FP 0,10 % + MEI 0,90 % = 31,50 % | Orden PJC/297/2026, arts. 18 y 37 |
| Tramos del RETA | 15 tramos de rendimientos mensuales, de 653,59 € a 5.101,20 € de base | Orden PJC/297/2026, art. 18 |
| Rendimientos de un socio para el RETA | Todo lo que cobra de la sociedad menos un 3 %; base mínima de 1.424,40 € | LGSS, art. 308.1.a) regla 4.ª y 308.1.c) reglas 1.ª y 2.ª |
| Tarifa del ahorro | 19 % hasta 7.500 € … 28 % desde 300.000 € | NF 13/2013, art. 76 (NF 2/2025) |
| Exención de dividendos | 1.500 € al año | NF 13/2013, art. 9 |
| Retención sobre dividendos | 19 % | Reglamento del IRPF (DF 47/2014), arts. 89 y 92 |
| Impuesto sobre Sociedades | 20 % microempresas y pequeñas empresas, 24 % general; tributación mínima del 15 % en pequeñas empresas | NF 11/2013, arts. 13, 56 y 59 |

Comprobados en septiembre de 2026 con la [Orden PJC/297/2026 en el BOE](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-7296), con las comparativas oficiales de Hacienda de Bizkaia de los cambios del IRPF en [2026](https://dfb.microsoftcrmportals.com/es-ES/Articulo/?Code=KA-01877) y [2025](https://dfb.microsoftcrmportals.com/es-ES/Articulo/?Code=KA-01876), con la [tabla de retenciones de 2026](https://www.bizkaia.eus/documents/26740887/26976067/tabla-de-retenciones-2026-01.pdf) y el [Reglamento del IRPF](https://www.bizkaia.eus/documents/880307/15187815/ca_47_2014.pdf), y con la [Ley General de la Seguridad Social](https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724) para el RETA. Los tests comprueban la tarifa con las cuotas acumuladas de la tabla oficial.

Los parámetros de los dividendos, en octubre de 2026: la tarifa del ahorro con la [comparativa de 2026](https://dfb.microsoftcrmportals.com/es-ES/Articulo/?Code=KA-01877) (art. 76 en la redacción de la NF 2/2025, con efectos desde el 1 de enero de 2026; los tests usan sus cuotas acumuladas), la exención de 1.500 € y que la minoración solo reduce la cuota general con el [texto consolidado de la Norma Foral 13/2013](https://www.bizkaia.eus/documents/880307/27501802/ca_13_2013.pdf/99c24b02-2b3e-821f-a6c5-5a62df447e32?t=1770098453680) (arts. 9.24 y 74), y la retención del 19 % sobre todo el dividendo, también la parte exenta, con el Reglamento (arts. 89 y 92.1). El Impuesto sobre Sociedades, con el [texto consolidado de la Norma Foral 11/2013](https://www.bizkaia.eus/documents/880307/15187815/ca_11_2013.pdf/5a463c1d-a59b-7e48-6429-80fd22f30bc6?t=1768908575887) actualizado a 1 de enero de 2026 (arts. 13, 56 y 59).

## Estructura

- `index.html` y `app.js`: la calculadora de sueldo (formulario, resumen del coste al neto, cascada, nómina, cálculo detallado y enlace para compartir), para el asalariado y para el socio autónomo.
- `dividendos.html` y `dividendos.js`: la calculadora de dividendos del socio.
- `calculadora.js`: la lógica de cálculo, sin DOM. Se usa en el navegador y en los tests.
- `comun.js`: lo que comparten las dos páginas (formato de importes, casillas de importe, bloques plegables en el móvil, enlace para compartir).
- `estilos.css`: los estilos de las dos páginas.
- `tests/`: tests con `node:test`.

## Tests

```sh
npm test
```

## Actualizar a un año nuevo

1. Cambiar `PARAMETROS` en `calculadora.js`.
2. Revisar los textos de `index.html` y `dividendos.html` que citan importes y el año.
3. Ajustar los tests y ejecutar `npm test`.
