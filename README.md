# Cheques App (Electron + React + Tailwind)

Aplicación de escritorio para emitir e imprimir cheques sobre papel preimpreso.

## Desarrollo

```bash
npm install
npm run dev
```

## Compilar

```bash
npm run build
```

## Generar el instalable de Windows (.exe portable)

```bash
npm run dist:win
```

El ejecutable queda en `dist/`.

## Datos

Los trabajadores, el historial de cheques y la calibración de impresión se guardan como
archivos JSON en la carpeta de datos de la app (`%APPDATA%\ChequesApp\data\`), no dentro
del programa, así que sobreviven actualizaciones.

## Impresión

Al presionar "Imprimir" siempre se abre el diálogo nativo de impresión de Windows, donde se
puede elegir la impresora antes de imprimir. En la pantalla de Calibración se puede fijar una
impresora predeterminada opcional (o dejar que siempre pregunte).

## Primer uso

1. Ve a **Trabajadores** y agrega los nombres del catálogo.
2. Ve a **Calibración**, imprime una página de prueba sobre un cheque en blanco y ajusta las
   posiciones X/Y hasta que el texto caiga en el lugar correcto.
3. Ve a **Emitir Cheque** y empieza a trabajar.
