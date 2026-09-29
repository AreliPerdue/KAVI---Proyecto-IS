#!/bin/bash
# Revisión visual de la presentación, sin depender de PowerPoint.
#
# PowerPoint solo exporta por AppleScript, y eso falla en cuanto queda un proceso
# colgado o el archivo está abierto. LibreOffice convierte sin intervención.
#
#   ./revisar.sh ../../../Presentacion-KAVI.pptx
set -e
PPTX="${1:-../../../Presentacion-KAVI.pptx}"
OUT="$(mktemp -d)"
/Applications/LibreOffice.app/Contents/MacOS/soffice --headless \
  -env:UserInstallation="file://$OUT/perfil" \
  --convert-to pdf --outdir "$OUT" "$PPTX" >/dev/null 2>&1
echo "PDF: $OUT/$(basename "${PPTX%.pptx}").pdf"
echo "Para verlas como imágenes: node render-pdf.mjs (con el PDF como deck.pdf)"
