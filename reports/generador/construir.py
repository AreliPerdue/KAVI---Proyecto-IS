# -*- coding: utf-8 -*-
"""Ensambla el informe de cierre en .docx.

La portada NO se redibuja: se reutiliza tal cual del .docx de referencia de la
materia —logo, encabezado verde, tabla de datos y tipografias—, cambiando solo
el titulo. El resto del documento se genera con los mismos estilos.

    python3 reports/generador/construir.py referencia.docx salida.docx [otra.docx ...]
"""
import os
import re
import shutil
import sys
import zipfile
from xml.sax.saxutils import escape

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)

import datos as D                      # noqa: E402
import contenido, contenido2, contenido3   # noqa: E402

TITULO_NUEVO = 'Proyecto Final'
TITULO_VIEJO = 'Avance de Proyecto'

CAPTURAS = {
    'sonar': (os.path.join(AQUI, 'capturas', 'sonarqube.png'), 'Panel de SonarQube Cloud'),
    'csp': (D.ruta('reports/seguridad/sin-style-inline.png'), 'KAVI sin estilos en linea'),
}


def portada(doc_xml):
    """Devuelve el XML de la portada del documento de referencia, con el titulo cambiado."""
    ini = doc_xml.index('<w:body>') + len('<w:body>')
    i = doc_xml.index(TITULO_VIEJO)
    fin = doc_xml.index('</w:p>', i) + len('</w:p>')
    return doc_xml[ini:fin].replace(TITULO_VIEJO, escape(TITULO_NUEVO))


def sect_pr(doc_xml):
    j = doc_xml.rindex('<w:sectPr')
    return doc_xml[j:doc_xml.index('</w:sectPr>', j) + len('</w:sectPr>')]


def main(referencia, salidas):
    destino = os.path.join(AQUI, '.build')
    shutil.rmtree(destino, ignore_errors=True)
    with zipfile.ZipFile(referencia) as z:
        z.extractall(destino)
    # Un .docx ajeno puede traer enlaces simbolicos; fuera antes de tocar nada.
    for raiz, _, archivos in os.walk(destino):
        for f in archivos:
            p = os.path.join(raiz, f)
            if os.path.islink(p):
                os.unlink(p)

    doc_xml = open(os.path.join(destino, 'word', 'document.xml'), encoding='utf-8').read()
    cabecera = doc_xml[:doc_xml.index('<w:body>') + len('<w:body>')]
    tapa = portada(doc_xml)
    sect = sect_pr(doc_xml)

    # ── Medios: se conserva el logo (image1) y se sustituye lo demas ──
    media = os.path.join(destino, 'word', 'media')
    for f in os.listdir(media):
        if f != 'image1.png':
            os.remove(os.path.join(media, f))

    img = {}
    rels_img = []
    for n, (clave, (origen, nombre)) in enumerate(CAPTURAS.items(), start=1):
        if not os.path.exists(origen):
            raise SystemExit(f'falta la captura: {origen}')
        destino_img = f'captura{n}.png'
        shutil.copy(origen, os.path.join(media, destino_img))
        w, h = D.png(origen)
        rid = f'rIdImg{n}'
        img[clave] = {'rid': rid, 'w': w, 'h': h, 'nombre': nombre}
        rels_img.append((rid, f'media/{destino_img}', 'image'))

    # ── Enlaces externos de la bibliografia ──
    rid_url = {}
    rels_url = []
    for n, (_, url) in enumerate(contenido3.BIBLIOGRAFIA, start=1):
        rid = f'rIdUrl{n}'
        rid_url[url] = rid
        rels_url.append((rid, url, 'hyperlink'))

    # ── Cuerpo ──
    bloques = contenido.construir(img)
    contenido2.agregar(bloques.append, img)
    contenido3.agregar(bloques.append, img, rid_url)

    documento = cabecera + tapa + ''.join(bloques) + sect + '</w:body></w:document>'
    with open(os.path.join(destino, 'word', 'document.xml'), 'w', encoding='utf-8') as fh:
        fh.write(documento)

    # ── Relaciones: se rehacen desde cero, conservando las de infraestructura ──
    TIPO = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/'
    fijas = [('rId1', 'numbering.xml', 'numbering'), ('rId2', 'styles.xml', 'styles'),
             ('rId3', 'settings.xml', 'settings'), ('rId4', 'webSettings.xml', 'webSettings'),
             ('rId5', 'media/image1.png', 'image'),      # el logo de la portada
             ('rId22', 'fontTable.xml', 'fontTable'), ('rId23', 'theme/theme1.xml', 'theme')]
    filas = []
    for rid, destino_rel, tipo in fijas + rels_img:
        filas.append(f'<Relationship Id="{rid}" Type="{TIPO}{tipo}" Target="{destino_rel}"/>')
    for rid, url, tipo in rels_url:
        filas.append(f'<Relationship Id="{rid}" Type="{TIPO}{tipo}" '
                     f'Target="{escape(url, {chr(34): "&quot;"})}" TargetMode="External"/>')
    rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            + ''.join(filas) + '</Relationships>')
    with open(os.path.join(destino, 'word', '_rels', 'document.xml.rels'), 'w',
              encoding='utf-8') as fh:
        fh.write(rels)

    # ── Empaquetado ──
    for salida in salidas:
        if os.path.exists(salida):
            os.remove(salida)
        with zipfile.ZipFile(salida, 'w', zipfile.ZIP_DEFLATED) as z:
            for raiz, _, archivos in os.walk(destino):
                for f in archivos:
                    p = os.path.join(raiz, f)
                    z.write(p, os.path.relpath(p, destino))
        print(f'generado: {salida} ({os.path.getsize(salida) // 1024} KB)')


if __name__ == '__main__':
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2:])
