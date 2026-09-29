# -*- coding: utf-8 -*-
"""Cifras del informe, leidas del repositorio en cada ejecucion.

Ninguna cifra del documento se escribe a mano: salen de la cobertura de Jest,
de las metricas de SonarQube, de los reportes de ZAP, de tasks.md y de git.
"""
import collections
import json
import os
import re
import struct
import subprocess
from datetime import date

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ruta = lambda *p: os.path.join(RAIZ, *p)
leer = lambda *p: open(ruta(*p), encoding='utf-8').read()
cargar = lambda *p: json.loads(leer(*p))

MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
         'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
mil = lambda n: f'{int(n):,}'.replace(',', ' ')
pct = lambda v: f'{float(v):.1f}'.replace('.', ',') + ' %'
larga = lambda d: f'{d.day} de {MESES[d.month - 1]} de {d.year}'
corta = lambda d: f'{d.day} de {MESES[d.month - 1][:3]}.'


# ── Cobertura de Jest ────────────────────────────────────────────────────────
_cob = cargar('reports/pruebas/cobertura/coverage-summary.json')['total']
def _m(k):
    d = _cob[k]
    return {'pct': pct(d['pct']), 'cubierto': mil(d['covered']), 'total': mil(d['total']),
            'detalle': f"{mil(d['covered'])} de {mil(d['total'])}"}
COB = {'sentencias': _m('statements'), 'lineas': _m('lines'),
       'ramas': _m('branches'), 'funciones': _m('functions')}

# ── Conteo de pruebas, del listado legible ───────────────────────────────────
_listado = leer('reports/pruebas/Listado de pruebas.md')
def _del_listado(etiqueta, defecto='—'):
    m = re.search(r'\|\s*%s\s*\|\s*\*{0,2}([^|*]+)\*{0,2}\s*\|' % etiqueta, _listado)
    return m.group(1).strip() if m else defecto
PRUEBAS = {'total': _del_listado('Pruebas ejecutadas'),
           'fallidas': _del_listado('Pruebas falladas', '0'),
           'archivos': _del_listado('Archivos de prueba'),
           'duracion': _del_listado('Tiempo de ejecución')}

# ── SonarQube ────────────────────────────────────────────────────────────────
_med = {m['metric']: m['value']
        for m in cargar('reports/calidad/sonarqube-metricas.json')['component']['measures']}
_LETRA = {'1.0': 'A', '2.0': 'B', '3.0': 'C', '4.0': 'D', '5.0': 'E'}
SONAR = {
    'cobertura': pct(_med['coverage']),
    'cobertura_lineas': pct(_med['line_coverage']),
    'cobertura_ramas': pct(_med['branch_coverage']),
    'lineas': mil(_med['ncloc']),
    'deuda': f"{_med['sqale_index']} minutos",
    'smells': _med['code_smells'],
    'bugs': _med['bugs'],
    'vulnerabilidades': _med['vulnerabilities'],
    'hotspots': _med['security_hotspots'],
    'duplicacion': pct(_med['duplicated_lines_density']),
    'ciclomatica': mil(_med['complexity']),
    'cognitiva': mil(_med['cognitive_complexity']),
    'pruebas': mil(_med.get('tests', 0)),
    'mantenibilidad': _LETRA[_med['sqale_rating']],
    'fiabilidad': _LETRA[_med['reliability_rating']],
    'seguridad': _LETRA[_med['security_rating']],
}
HALLAZGOS_ABIERTOS = cargar('reports/calidad/sonarqube-hallazgos.json')['total']

# ── OWASP ZAP ────────────────────────────────────────────────────────────────
NIVEL = {3: 'Alto', 2: 'Medio', 1: 'Bajo', 0: 'Informativo'}

def _zap_json(p):
    d = cargar(p)
    c = {3: 0, 2: 0, 1: 0, 0: 0}
    for sitio in d.get('site', []):
        for a in sitio.get('alerts', []):
            c[int(a['riskcode'])] += 1
    return c

def _zap_final(p):
    """Lee solo la cabecera del reporte (15 MB): el resumen va al principio."""
    with open(ruta(p), encoding='utf-8', errors='replace') as fh:
        crudo = fh.read(300_000)
    txt = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', crudo))
    c = {}
    for cod, nom in {3: 'High', 2: 'Medium', 1: 'Low', 0: 'Informational'}.items():
        m = re.search(nom + r'((?:\s+\d+\s+\(\d+\.\d+%\)){5})', txt)
        if not m:
            raise RuntimeError(f'no se pudo leer la fila {nom} del reporte final de ZAP')
        c[cod] = int(re.findall(r'\d+(?=\s+\()', m.group(1))[4])
    return c

ZAP_ANTES = _zap_json('reports/seguridad/antes/zap-baseline.json')
ZAP_DESPUES = _zap_json('reports/seguridad/zap-baseline.json')
ZAP_FINAL = _zap_final('reports/seguridad/2026-09-23-ZAP-Report-.html')
suma = lambda c: sum(c.values())

# ── tasks.md: fases, tareas y pendientes ─────────────────────────────────────
FASES = []
_actual = None
_t2f = {}
for _l in leer('tasks.md').split('\n'):
    _c = re.match(r'^## (Fase [^—]+)—\s*(.*)$', _l)
    if _c:
        _actual = {'nombre': _c.group(1).strip(), 'hechas': 0, 'total': 0, 'abiertas': []}
        FASES.append(_actual)
        continue
    if _l.startswith('## '):
        _actual = None
        continue
    _t = re.match(r'^- \[([ x])\] (T\d+)', _l)
    if _t and _actual:
        _actual['total'] += 1
        _t2f[_t.group(2)] = _actual['nombre']
        if _t.group(1) == 'x':
            _actual['hechas'] += 1
        else:
            _actual['abiertas'].append(_t.group(2))

TAREAS_TOTAL = sum(f['total'] for f in FASES)
TAREAS_HECHAS = sum(f['hechas'] for f in FASES)
PENDIENTES = [re.sub(r'^- \[ \] (T\d+)\s*', r'\1 · ', l).replace('✅ ', '')
              for l in leer('tasks.md').split('\n') if re.match(r'^- \[ \] T\d+', l)]

# ── git: commits, linea de tiempo real ───────────────────────────────────────
def _git(*args):
    return subprocess.run(['git'] + list(args), cwd=RAIZ,
                          capture_output=True, text=True).stdout.strip()

COMMITS = _git('rev-list', '--count', 'HEAD')
_log = [l.partition('|') for l in _git('log', '--format=%ad|%s', '--date=short').split('\n')]
POR_DIA = collections.Counter(f for f, _, _ in _log)
FASES_POR_DIA = collections.defaultdict(set)
for _f, _, _msg in _log:
    for _i in set(re.findall(r'T\d+', _msg)):
        if _i in _t2f:
            FASES_POR_DIA[_f].add(_t2f[_i])

DIAS_ACTIVOS = sorted(POR_DIA)
INICIO = date.fromisoformat(DIAS_ACTIVOS[0])
FIN = date.fromisoformat(DIAS_ACTIVOS[-1])
VENTANA = (FIN - INICIO).days + 1
# El hito final planificado vive en la constitucion del proyecto.
_m = re.search(r'Entrega final: \*\*(\d+) de (\w+) de (\d+)\*\*', leer('specs/00-constitution.md'))
HITO_PLAN = date(int(_m.group(3)), MESES.index(_m.group(2)) + 1, int(_m.group(1))) if _m else None

# El hueco mas largo sin trabajo
_huecos = []
for _a, _b in zip(DIAS_ACTIVOS, DIAS_ACTIVOS[1:]):
    _d = (date.fromisoformat(_b) - date.fromisoformat(_a)).days - 1
    if _d > 0:
        _huecos.append((_d, _a, _b))
HUECO = max(_huecos) if _huecos else (0, None, None)
# Los cuatro dias que concentran el trabajo
_top = POR_DIA.most_common(4)
CONCENTRACION = {
    'dias': sorted(d for d, _ in _top),
    'commits': sum(n for _, n in _top),
    'pct': round(sum(n for _, n in _top) / int(COMMITS) * 100),
}

MIGRACIONES = len([f for f in os.listdir(ruta('supabase/migrations')) if f.endswith('.sql')])
ARCHIVOS_PRUEBA = int(subprocess.run(
    ['bash', '-c', "find src -path '*__tests__*' -name '*.test.ts*' | wc -l"],
    cwd=RAIZ, capture_output=True, text=True).stdout.strip())

def rango(d1, d2):
    """«1 de septiembre de 2026» + «23 de septiembre de 2026» -> «1 y el 23 de septiembre de 2026»."""
    if (d1.month, d1.year) == (d2.month, d2.year):
        return f'{d1.day} y el {d2.day} de {MESES[d2.month - 1]} de {d2.year}'
    return f'{larga(d1)} y el {larga(d2)}'


RANGO = rango(INICIO, FIN)

HOY = date.today()
FECHA = larga(HOY)


def png(p):
    """Ancho y alto en pixeles, leidos de la cabecera IHDR."""
    with open(p, 'rb') as fh:
        return struct.unpack('>II', fh.read(33)[16:24])
