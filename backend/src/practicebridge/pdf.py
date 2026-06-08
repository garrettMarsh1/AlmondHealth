from __future__ import annotations


def render_form_pdf(title: str, lines: list[str]) -> bytes:
    def clean(t: str) -> str:
        t = (t.replace("—", "-").replace("–", "-")
             .replace("’", "'").replace("‘", "'")
             .replace("“", '"').replace("”", '"'))
        t = t.replace("\\", "").replace("(", "[").replace(")", "]")
        return t.encode("latin-1", "replace").decode("latin-1")

    content = f"BT /F1 16 Tf 72 740 Td 20 TL ({clean(title)}) Tj T* /F1 12 Tf "
    for ln in lines:
        content += f"({clean(ln)}) Tj T* "
    content += "ET"
    objs = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(content)} >>\nstream\n{content}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    pdf = "%PDF-1.4\n"
    offsets = []
    for i, o in enumerate(objs, 1):
        offsets.append(len(pdf.encode("latin-1")))
        pdf += f"{i} 0 obj\n{o}\nendobj\n"
    xref = len(pdf.encode("latin-1"))
    pdf += f"xref\n0 {len(objs)+1}\n0000000000 65535 f \n"
    pdf += "".join(f"{o:010d} 00000 n \n" for o in offsets)
    pdf += f"trailer\n<< /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF"
    return pdf.encode("latin-1")
