"""Genera data/preguntas.js a partir de los documentos Word del banco de preguntas.

Formato esperado en cada .docx:
    1. Enunciado de la pregunta
    a) Alternativa   b) Alternativa   c) Alternativa   d) Alternativa
    Retroalimentación: explicación y referencia legal
La alternativa correcta es la que está en negritas.

Uso:
    python tools/importar_docx.py "carpeta/con/docx" ["otra/carpeta" | "archivo.docx" ...]
    python tools/importar_docx.py --reemplazar ley-070 "070.docx"   (solo una normativa)
    Añade --incluir-repetidas para no omitir preguntas con alternativas repetidas.
"""
import json
import re
import sys
import unicodedata
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

# Con --incluir-repetidas se cargan también las preguntas con alternativas repetidas.
INCLUDE_REPEATED = "--incluir-repetidas" in sys.argv
if INCLUDE_REPEATED:
    sys.argv.remove("--incluir-repetidas")

# Archivo .docx (por prefijo) -> id y título de la tarjeta en index.html
NORMATIVAS = [
    ("1.1. ", "cpe", "Constitución Política del Estado (2009)"),
    ("1.2.","ley-070", "Ley N.º 070 Avelino Siñani – Elizardo Pérez"),
    ("1.3.", "ley-045", "Ley N.º 045 Contra el Racismo y Toda Forma de Discriminación"),
    ("1.4.", "ley-348", "Ley N.º 348 Ley Integral para Garantizar a las Mujeres una Vida Libre de Violencia"),
    ("1.5.", "ley-548", "Ley N.º 548 Código Niña, Niño y Adolescente"),
    ("1.6.", "ley-223", "Ley N.º 223 Ley General para Personas con Discapacidad"),
    ("1.7", "ley-1178", "Ley N.º 1178 de Administración y Control Gubernamentales (SAFCO)"),
    ("1.8.", "ley-004", "Ley N.º 004 de Enriquecimiento Ilícito «Marcelo Quiroga Santa Cruz»"),
    ("1.9.", "rm-092-2025", "R.M. N.º 092/2025 Reglamento de Apertura, Modificación y Cierre de Centros de Educación Alternativa"),
    ("1.10.", "rm-183-2024", "R.M. N.º 183/2024 Reglamento de Evaluación de Aprendizajes EPJA"),
    ("1.11.", "rm-872-2024", "R.M. N.º 872/2024 Reglamento de Reconocimiento de Saberes, Conocimientos y Experiencias para la Educación de Personas Jóvenes y Adultas en Educación Alternativa"),
    ("1.12.", "rm-079-2025", "R.M. N.º 079/2025 Reglamento de Certificación de ETTP EPJA"),
    ("1.13.", "rm-718-2025", "R.M. N.º 718/2025 Maestros Itinerantes y Multigrado EPJA"),
    ("1.14.", "rm-1040-2022-curriculares", "R.M. N.º 1040/2022 Lineamientos Curriculares de EPJA"),
    ("1.15.", "rm-0531-2023", "R.M. N.º 0531/2023 Reglamento de Certificación"),
    ("1.16.", "rm-1040-2022-eduper", "R.M. N.º 1040/2022 Lineamientos Metodológicos EDUPER"),
    ("1.17.", "rm-764-2025", "R.M. N.º 764/2025 Reglamento de Atención Educativa de Población Diversa"),
    ("2.1. ERCE", "erce", "Estudio Regional Comparativo y Explicativo (ERCE)"),
    ("2.1. ODS", "ods-2030", "ODS Educación 2030"),
    ("2.2.", "lidei-2022", "LIDEI 2022"),
    ("2.3.", "marco-gestion-liderazgo", "Marco para la Gestión y el Liderazgo Educativo Local"),
]

QUESTION_RE = re.compile(r"(?m)^[ \t]*(\d{1,3})\s*[.)-]\s*")
FEEDBACK_RE = re.compile(r"(?m)^[ \t]*Retroalimentaci[oó]n\s*:\s*", re.I)
ANSWER_RE = re.compile(r"(?m)^[ \t]*Respuesta\s+correcta\s*:\s*([a-d])\b\W*", re.I)


def bold_flag(rpr):
    """True/False si rPr define la negrita; None si no la menciona."""
    b = rpr.find(W + "b") if rpr is not None else None
    if b is None:
        return None
    return b.get(W + "val") not in ("0", "false")


def bold_styles(archive):
    """Ids de estilos (de carácter o párrafo) que aplican negrita, siguiendo basedOn."""
    try:
        root = ET.fromstring(archive.read("word/styles.xml"))
    except KeyError:
        return set()
    own, parent = {}, {}
    for style in root.iter(W + "style"):
        sid = style.get(W + "styleId")
        own[sid] = bold_flag(style.find(W + "rPr"))
        based = style.find(W + "basedOn")
        parent[sid] = based.get(W + "val") if based is not None else None

    def resolve(sid, depth=0):
        if sid is None or depth > 20:
            return False
        return own.get(sid) if own.get(sid) is not None else resolve(parent.get(sid), depth + 1)

    return {sid for sid in own if resolve(sid)}


def read_docx(path):
    """Devuelve (texto, máscara de negritas por carácter)."""
    archive = zipfile.ZipFile(path)
    root = ET.fromstring(archive.read("word/document.xml"))
    styled_bold = bold_styles(archive)
    chars, mask = [], []
    for p in root.iter(W + "p"):
        pstyle = p.find(f"{W}pPr/{W}pStyle")
        para_bold = pstyle is not None and pstyle.get(W + "val") in styled_bold
        for run in p.iter(W + "r"):
            rpr = run.find(W + "rPr")
            rstyle = rpr.find(W + "rStyle") if rpr is not None else None
            bold = bold_flag(rpr)
            if bold is None:
                bold = (rstyle is not None and rstyle.get(W + "val") in styled_bold) or para_bold
            for node in run:
                if node.tag == W + "t":
                    text = node.text or ""
                elif node.tag in (W + "br", W + "cr"):
                    text = "\n"
                elif node.tag == W + "tab":
                    text = " "
                else:
                    continue
                chars.append(text)
                mask.extend([bold] * len(text))
        chars.append("\n")
        mask.append(False)
    return "".join(chars), mask


def clean(text):
    text = unicodedata.normalize("NFC", text).replace(" ", " ")
    return re.sub(r"\s+", " ", text).strip()


def bold_ratio(text, mask, start, end):
    letters = [m for m, ch in zip(mask[start:end], text[start:end]) if not ch.isspace()]
    return sum(letters) / len(letters) if letters else 0


def parse_block(text, mask, number, start, end, problems):
    """Separa enunciado, alternativas y retroalimentación de una pregunta."""
    block = text[start:end]
    fb = FEEDBACK_RE.search(block)
    body_end = start + fb.start() if fb else end
    # Línea opcional "Respuesta correcta: x" (antes o después de la retroalimentación):
    # sirve de control y no se muestra.
    stated = ANSWER_RE.search(text, start, end)
    if stated and stated.start() < body_end:
        body_end = stated.start()
    feedback = clean(ANSWER_RE.sub("", block[fb.end():])) if fb else ""

    # Busca a), b), c), d) en orden para no confundirlos con incisos dentro del texto.
    marks, pos = [], start
    for letter in "abcd":
        m = re.compile(rf"(?:^|(?<=[\s.?:;!\"”»)]))[{letter}{letter.upper()}]\s*\)\s*").search(text, pos, body_end)
        if not m:
            break
        marks.append((m.start(), m.end()))
        pos = m.end()
    if len(marks) != 4:
        problems.append(f"pregunta {number}: se encontraron {len(marks)} alternativas")
        return None

    # Algunos documentos ponen una línea "Respuesta" entre el enunciado y las alternativas.
    stem = clean(re.sub(r"\n\s*Respuestas?\s*:?\s*$", "", text[start:marks[0][0]]))
    options, ratios = [], []
    for i, (_, opt_start) in enumerate(marks):
        opt_end = marks[i + 1][0] if i < 3 else body_end
        options.append(clean(text[opt_start:opt_end]))
        ratios.append(bold_ratio(text, mask, opt_start, opt_end))

    correct = [i for i, r in enumerate(ratios) if r >= 0.6]
    if len(correct) != 1:
        problems.append(f"pregunta {number}: {len(correct)} alternativas en negritas")
        return None
    if stated and "abcd".index(stated.group(1).lower()) != correct[0]:
        problems.append(f"pregunta {number}: la negrita ({'abcd'[correct[0]]}) no coincide con "
                        f"'Respuesta correcta: {stated.group(1)}'; se usa la negrita")
    if not feedback:
        problems.append(f"pregunta {number}: sin retroalimentación")
    if not stem or any(not o for o in options):
        problems.append(f"pregunta {number}: enunciado o alternativa vacía")
        return None
    if len({o.lower() for o in options}) < 4:
        if not INCLUDE_REPEATED:
            problems.append(f"pregunta {number}: alternativas repetidas, se omite")
            return None
        problems.append(f"pregunta {number}: alternativas repetidas (incluida)")
    return {"q": stem, "options": options, "answer": correct[0], "feedback": feedback}


def parse_file(path):
    text, mask = read_docx(path)
    starts = list(QUESTION_RE.finditer(text))
    questions, problems, seen = [], [], set()
    for i, m in enumerate(starts):
        end = starts[i + 1].start() if i + 1 < len(starts) else len(text)
        q = parse_block(text, mask, m.group(1), m.end(), end, problems)
        if not q:
            continue
        key = q["q"].lower()
        if key in seen:
            problems.append(f"pregunta {m.group(1)}: enunciado duplicado, se omite")
            continue
        seen.add(key)
        questions.append(q)
    return questions, problems


def write_bank(out, bank):
    out.parent.mkdir(exist_ok=True)
    out.write_text(
        "// Generado por tools/importar_docx.py. No editar a mano.\n"
        "window.QUESTION_BANK = " + json.dumps(bank, ensure_ascii=False, indent=1) + ";\n",
        encoding="utf-8",
    )
    print(f"\nEscrito {out}")


def replace_one(out, law_id, path):
    """Reemplaza las preguntas de una sola normativa y conserva las demás."""
    source = out.read_text(encoding="utf-8")
    bank = json.loads(source[source.index("{"):source.rindex("}") + 1])
    if law_id not in bank:
        print(f"[!] {law_id} no existe en {out.name}; ids: {', '.join(bank)}")
        return 1
    questions, problems = parse_file(Path(path))
    for p in problems:
        print(f"    - {p}")
    if not questions:
        print("[!] No se encontraron preguntas; no se modifica el banco")
        return 1
    print(f"{law_id}: {len(bank[law_id]['questions'])} -> {len(questions)} preguntas  ({Path(path).name})")
    bank[law_id]["questions"] = questions
    write_bank(out, bank)
    return 0


def main():
    out = Path(__file__).resolve().parent.parent / "data" / "preguntas.js"
    if sys.argv[1:2] == ["--reemplazar"]:
        if len(sys.argv) != 4:
            print("Uso: python tools/importar_docx.py --reemplazar <id> <archivo.docx>")
            return 2
        return replace_one(out, sys.argv[2], sys.argv[3])

    # Acepta carpetas y/o archivos .docx; si un nombre se repite, gana el último indicado.
    by_name = {}
    for arg in sys.argv[1:] or ["."]:
        source = Path(arg)
        for f in [source] if source.is_file() else sorted(source.glob("*.docx")):
            by_name[f.name] = f
    files = list(by_name.values())
    bank, ok = {}, True
    for prefix, law_id, title in NORMATIVAS:
        match = [f for f in files if f.name.startswith(prefix)]
        if len(match) != 1:
            print(f"[!] {prefix}: {len(match)} archivos coinciden")
            ok = False
            continue
        questions, problems = parse_file(match[0])
        bank[law_id] = {"title": title, "questions": questions}
        print(f"{law_id:28} {len(questions):4} preguntas  ({match[0].name})")
        for p in problems:
            print(f"    - {p}")
    write_bank(out, bank)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
