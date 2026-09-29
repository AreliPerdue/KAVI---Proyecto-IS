# -*- coding: utf-8 -*-
"""Primitivas de WordprocessingML con el formato de las entregas de la materia.

Fuentes y colores salen del .docx de referencia de la propia alumna, no de una
eleccion nuestra: titulos en Arial Black 14 pt verde 00B050, sub-titulos en
Arial Black 14 pt azul 002060, cuerpo en Calibri Light 12 pt justificado.
"""
from xml.sax.saxutils import escape

VERDE = '00B050'
AZUL = '002060'
NEGRO = '000000'
GRIS = '595959'

ANCHO = 9360          # Carta menos los margenes de 1440 dxa por lado
EMU_POR_PULGADA = 914400

# Calibri Light: es la fuente "major" del tema del documento de referencia, pero se
# nombra explicitamente en vez de por tema. Un lector que no resuelva el tema
# —la vista previa de macOS, por ejemplo— cae si no en Times New Roman, que es
# lo que hereda del estilo Normal, y el cuerpo saldria con serifas.
CUERPO = '<w:rFonts w:ascii="Calibri Light" w:hAnsi="Calibri Light" w:cs="Calibri Light"/>'
NEGRA = '<w:rFonts w:ascii="Arial Black" w:hAnsi="Arial Black"/>'
ROMANA = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>'


def run(texto, fuente=CUERPO, sz=24, color=None, b=False, i=False, u=False):
    rpr = fuente
    if b:
        rpr += '<w:b/><w:bCs/>'
    if i:
        rpr += '<w:i/><w:iCs/>'
    if color:
        rpr += f'<w:color w:val="{color}"/>'
    if u:
        rpr += '<w:u w:val="single"/>'
    rpr += f'<w:sz w:val="{sz}"/><w:szCs w:val="{sz}"/><w:lang w:val="es-MX"/>'
    return (f'<w:r><w:rPr>{rpr}</w:rPr>'
            f'<w:t xml:space="preserve">{escape(texto)}</w:t></w:r>')


def parrafo(runs, jc='both', ind=None, num=None, antes=0, despues=120, salto=False):
    ppr = ''
    if salto:
        ppr += '<w:pageBreakBefore/>'
    if num:
        ppr += f'<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="{num}"/></w:numPr>'
    ppr += f'<w:spacing w:before="{antes}" w:after="{despues}" w:line="259" w:lineRule="auto"/>'
    if ind is not None and not num:
        ppr += f'<w:ind w:left="{ind}"/>'
    ppr += f'<w:jc w:val="{jc}"/>'
    cuerpo = ''.join(runs) if isinstance(runs, (list, tuple)) else runs
    return f'<w:p><w:pPr>{ppr}</w:pPr>{cuerpo}</w:p>'


# ── Atajos de alto nivel ─────────────────────────────────────────────────────

def titulo(texto, salto=False):
    """Encabezado de seccion: Arial Black 14 pt, verde."""
    return parrafo([run(texto, NEGRA, 28, VERDE, b=True)],
                   jc='left', antes=280, despues=160, salto=salto)


def subtitulo(texto):
    """Sub-encabezado: Arial Black 14 pt, azul marino."""
    return parrafo([run(texto, NEGRA, 28, AZUL, b=True)],
                   jc='left', antes=240, despues=140)


def texto(t, **kw):
    return parrafo([run(t)], **kw)


def rico(partes, **kw):
    """partes: cadenas, o (texto, {'b':True}) para tramos con formato."""
    rs = []
    for p in partes:
        if isinstance(p, str):
            rs.append(run(p))
        else:
            rs.append(run(p[0], **p[1]))
    return parrafo(rs, **kw)


def vineta(t, **kw):
    return parrafo([run(t)], num=6, despues=80, **kw)


def imagen(rid, px_ancho, px_alto, pulgadas, nombre='Captura'):
    cx = int(pulgadas * EMU_POR_PULGADA)
    cy = int(cx * px_alto / px_ancho)
    return (
        '<w:p><w:pPr><w:spacing w:before="120" w:after="120"/>'
        '<w:jc w:val="center"/></w:pPr>'
        '<w:r><w:rPr><w:noProof/></w:rPr><w:drawing>'
        f'<wp:inline distT="0" distB="0" distL="0" distR="0">'
        f'<wp:extent cx="{cx}" cy="{cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>'
        f'<wp:docPr id="{abs(hash(rid)) % 90000 + 1000}" name="{escape(nombre)}"/>'
        '<wp:cNvGraphicFramePr><a:graphicFrameLocks '
        'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>'
        '</wp:cNvGraphicFramePr>'
        '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
        '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        f'<pic:nvPicPr><pic:cNvPr id="0" name="{escape(nombre)}"/><pic:cNvPicPr/></pic:nvPicPr>'
        f'<pic:blipFill><a:blip r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
        f'<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>'
        '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
        '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>')


def pie(t):
    """Leyenda de una figura."""
    return parrafo([run(t, CUERPO, 18, GRIS, i=True)], jc='center', despues=200)


def tabla(encabezados, filas, pesos, sz=20):
    total = float(sum(pesos))
    anchos = [int(round(p / total * ANCHO)) for p in pesos]
    anchos[-1] += ANCHO - sum(anchos)          # que sumen exactamente el ancho

    bordes = ('<w:tblBorders>'
              + ''.join(f'<w:{x} w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
                        for x in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'))
              + '</w:tblBorders>')
    tblpr = (f'<w:tblPr><w:tblW w:w="{ANCHO}" w:type="dxa"/>{bordes}'
             '<w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/>'
             '<w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar>'
             '<w:tblLook w:val="04A0" w:firstRow="1" w:firstColumn="1" w:noVBand="1"/></w:tblPr>')
    grid = '<w:tblGrid>' + ''.join(f'<w:gridCol w:w="{a}"/>' for a in anchos) + '</w:tblGrid>'

    def celda(t, i, cab=False, negrita=False):
        sombra = '<w:shd w:val="clear" w:color="auto" w:fill="EDF1F7"/>' if cab else ''
        p = (f'<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/>'
             f'<w:jc w:val="{"center" if cab else "left"}"/></w:pPr>'
             f'{run(str(t), CUERPO, sz, b=cab or negrita)}</w:p>')
        return (f'<w:tc><w:tcPr><w:tcW w:w="{anchos[i]}" w:type="dxa"/>{sombra}'
                f'<w:vAlign w:val="center"/></w:tcPr>{p}</w:tc>')

    filas_xml = ['<w:tr><w:trPr><w:tblHeader/></w:trPr>'
                 + ''.join(celda(t, i, cab=True) for i, t in enumerate(encabezados))
                 + '</w:tr>']
    for f in filas:
        filas_xml.append('<w:tr>' + ''.join(celda(t, i, negrita=(i == 0))
                                            for i, t in enumerate(f)) + '</w:tr>')
    return f'<w:tbl>{tblpr}{grid}' + ''.join(filas_xml) + '</w:tbl>'


def espacio(despues=160):
    return f'<w:p><w:pPr><w:spacing w:after="{despues}"/></w:pPr></w:p>'


def fuente_bibliografia(n, texto_ref, url=None, rid=None):
    """Entrada de bibliografia en Times New Roman 11 pt, con el enlace vivo."""
    rs = [run(f'{n}. ', ROMANA, 22), run(texto_ref, ROMANA, 22)]
    if url and rid:
        rs.append(f'<w:hyperlink r:id="{rid}">'
                  + run(' ' + url, ROMANA, 22, '0563C1', u=True) + '</w:hyperlink>')
    return parrafo(rs, jc='both', ind=360, despues=80)
