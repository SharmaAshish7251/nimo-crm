import os
import sys
import re
from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from playwright.sync_api import sync_playwright

ROOT_DIR = Path(__file__).resolve().parent.parent
PLANS_DIR = ROOT_DIR / "plans"
MARKDOWN_PATH = PLANS_DIR / "nexace_crm_complete_system_report.md"

OUTPUT_DOCX_PLANS = PLANS_DIR / "NexAce_CRM_Complete_System_Report.docx"
OUTPUT_PDF_PLANS = PLANS_DIR / "NexAce_CRM_Complete_System_Report.pdf"
OUTPUT_DOCX_ROOT = ROOT_DIR / "NexAce_CRM_Complete_System_Report.docx"
OUTPUT_PDF_ROOT = ROOT_DIR / "NexAce_CRM_Complete_System_Report.pdf"

TEAL_PRIMARY = RGBColor(0, 128, 128)      # #008080
TEAL_ACCENT = RGBColor(0, 197, 160)       # #00c5a0
SLATE_DARK = RGBColor(30, 41, 59)         # #1e293b
GRAY_MUTED = RGBColor(100, 116, 139)      # #64748b

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'''<w:tcMar {nsdecls("w")}>
        <w:top w:w="{top}" w:type="dxa"/>
        <w:bottom w:w="{bottom}" w:type="dxa"/>
        <w:left w:w="{left}" w:type="dxa"/>
        <w:right w:w="{right}" w:type="dxa"/>
    </w:tcMar>''')
    tcPr.append(tcMar)

def generate_docx(md_text, output_path):
    print("Generating DOCX document...")
    doc = Document()

    # Configure Margins (0.8 inches)
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        section.different_first_page_header_footer = True
        
        # Header / Footer
        footer = section.footer
        f_p = footer.paragraphs[0]
        f_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        f_run = f_p.add_run("NexAce CRM — Confidential System Audit Report | Page ")
        f_run.font.size = Pt(8.5)
        f_run.font.color.rgb = GRAY_MUTED

    # Header / Title Banner
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(10)
    title_p.paragraph_format.space_after = Pt(4)
    run_brand = title_p.add_run("NexAce CRM (NIMO CRM)\n")
    run_brand.font.size = Pt(14)
    run_brand.font.bold = True
    run_brand.font.color.rgb = TEAL_ACCENT

    run_title = title_p.add_run("Comprehensive Technical Audit & Full System Report")
    run_title.font.size = Pt(22)
    run_title.font.bold = True
    run_title.font.color.rgb = SLATE_DARK

    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_before = Pt(0)
    sub_p.paragraph_format.space_after = Pt(18)
    sub_run = sub_p.add_run("Enterprise Multi-Tenant Workspace Management & Hybrid Mobile CRM Platform")
    sub_run.font.size = Pt(11)
    sub_run.font.italic = True
    sub_run.font.color.rgb = GRAY_MUTED

    # Metadata Card Table
    meta_table = doc.add_table(rows=4, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_table.autofit = False
    
    meta_data = [
        ("Audit Date", "November 2026 (Local IST)"),
        ("Audited Platform", "NexAce CRM / NIMO CRM (v3.0 Production Architecture)"),
        ("Architecture Stack", "Next.js 16 (App Router), React 19, MongoDB/Mongoose 8, Capacitor 7, Tailwind v4"),
        ("Target Workspaces", "Consulting firms, IT service providers, agencies, and teams (10 to 500+ employees)")
    ]
    
    for i, (k, v) in enumerate(meta_data):
        row = meta_table.rows[i]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width = Inches(1.8)
        c1.width = Inches(5.0)
        set_cell_background(c0, "F1F5F9")
        set_cell_background(c1, "F8FAFC")
        set_cell_margins(c0, 100, 100, 120, 120)
        set_cell_margins(c1, 100, 100, 120, 120)

        p0 = c0.paragraphs[0]
        p0.paragraph_format.space_after = Pt(0)
        r0 = p0.add_run(k)
        r0.font.bold = True
        r0.font.size = Pt(9.5)
        r0.font.color.rgb = SLATE_DARK

        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_after = Pt(0)
        r1 = p1.add_run(v)
        r1.font.size = Pt(9.5)
        r1.font.color.rgb = SLATE_DARK

    doc.add_paragraph().paragraph_format.space_after = Pt(14)

    # Process Markdown Content
    lines = md_text.splitlines()
    in_code_block = False
    code_lines = []
    in_table = False
    table_rows = []

    def flush_table():
        nonlocal in_table, table_rows
        if not table_rows:
            return
        # Parse table markdown
        parsed_rows = []
        for tr in table_rows:
            # strip leading/trailing pipe and split
            cleaned = tr.strip()
            if cleaned.startswith("|"): cleaned = cleaned[1:]
            if cleaned.endswith("|"): cleaned = cleaned[:-1]
            cols = [c.strip() for c in cleaned.split("|")]
            # skip separator line
            if all(re.match(r'^:?-+:?$', c) for c in cols if c):
                continue
            parsed_rows.append(cols)

        if parsed_rows:
            col_count = max(len(r) for r in parsed_rows)
            tbl = doc.add_table(rows=len(parsed_rows), cols=col_count)
            tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
            tbl.autofit = True
            for r_idx, r_cols in enumerate(parsed_rows):
                is_header = (r_idx == 0)
                row_elem = tbl.rows[r_idx]
                for c_idx in range(col_count):
                    cell = row_elem.cells[c_idx]
                    val = r_cols[c_idx] if c_idx < len(r_cols) else ""
                    # Strip bold markers
                    clean_val = val.replace("**", "").replace("`", "")
                    set_cell_margins(cell, 100, 100, 120, 120)
                    if is_header:
                        set_cell_background(cell, "008080")
                    else:
                        set_cell_background(cell, "F8FAFC" if r_idx % 2 == 1 else "FFFFFF")
                    cp = cell.paragraphs[0]
                    cp.paragraph_format.space_after = Pt(0)
                    crun = cp.add_run(clean_val)
                    crun.font.size = Pt(9)
                    if is_header:
                        crun.font.bold = True
                        crun.font.color.rgb = RGBColor(255, 255, 255)
                    else:
                        crun.font.color.rgb = SLATE_DARK
            doc.add_paragraph().paragraph_format.space_after = Pt(8)
        table_rows = []
        in_table = False

    for line in lines:
        stripped = line.strip()

        # Handle Code / Mermaid Blocks
        if stripped.startswith("```"):
            if in_code_block:
                in_code_block = False
                # Add formatted callout for code
                callout_tbl = doc.add_table(rows=1, cols=1)
                callout_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
                c = callout_tbl.rows[0].cells[0]
                c.width = Inches(6.8)
                set_cell_background(c, "F1F5F9")
                set_cell_margins(c, 120, 120, 140, 140)
                p = c.paragraphs[0]
                p.paragraph_format.space_after = Pt(0)
                code_text = "\n".join(code_lines)
                c_run = p.add_run(code_text)
                c_run.font.name = "Consolas"
                c_run.font.size = Pt(8.5)
                c_run.font.color.rgb = RGBColor(30, 41, 59)
                doc.add_paragraph().paragraph_format.space_after = Pt(8)
                code_lines = []
            else:
                if in_table: flush_table()
                in_code_block = True
                code_lines = []
            continue

        if in_code_block:
            code_lines.append(line)
            continue

        # Handle Tables
        if stripped.startswith("|") and stripped.endswith("|"):
            in_table = True
            table_rows.append(stripped)
            continue
        elif in_table:
            flush_table()

        if not stripped:
            continue

        # Skip main top title since we made custom banner
        if stripped.startswith("# NexAce CRM — Comprehensive Technical Audit"):
            continue

        # Headings
        if stripped.startswith("## "):
            h_text = stripped[3:].strip()
            hp = doc.add_paragraph()
            hp.paragraph_format.space_before = Pt(16)
            hp.paragraph_format.space_after = Pt(6)
            hrun = hp.add_run(h_text)
            hrun.font.size = Pt(14)
            hrun.font.bold = True
            hrun.font.color.rgb = TEAL_PRIMARY
            continue

        if stripped.startswith("### "):
            h_text = stripped[4:].strip()
            hp = doc.add_paragraph()
            hp.paragraph_format.space_before = Pt(12)
            hp.paragraph_format.space_after = Pt(4)
            hrun = hp.add_run(h_text)
            hrun.font.size = Pt(12)
            hrun.font.bold = True
            hrun.font.color.rgb = SLATE_DARK
            continue

        if stripped.startswith("#### "):
            h_text = stripped[5:].strip()
            hp = doc.add_paragraph()
            hp.paragraph_format.space_before = Pt(8)
            hp.paragraph_format.space_after = Pt(3)
            hrun = hp.add_run(h_text)
            hrun.font.size = Pt(10.5)
            hrun.font.bold = True
            hrun.font.color.rgb = TEAL_PRIMARY
            continue

        # Bullet lists
        if stripped.startswith("- ") or stripped.startswith("* "):
            item_text = stripped[2:].strip()
            bp = doc.add_paragraph(style='List Bullet')
            bp.paragraph_format.space_after = Pt(2)
            # Simple formatting for bold spans
            parts = re.split(r'(\*\*.*?\*\*)', item_text)
            for part in parts:
                if part.startswith("**") and part.endswith("**"):
                    r = bp.add_run(part[2:-2])
                    r.font.bold = True
                else:
                    r = bp.add_run(part.replace("`", ""))
                r.font.size = Pt(9.5)
                r.font.color.rgb = SLATE_DARK
            continue

        # Numbered lists
        m_num = re.match(r'^(\d+)\.\s+(.*)$', stripped)
        if m_num:
            item_text = m_num.group(2)
            np = doc.add_paragraph(style='List Number')
            np.paragraph_format.space_after = Pt(2)
            parts = re.split(r'(\*\*.*?\*\*)', item_text)
            for part in parts:
                if part.startswith("**") and part.endswith("**"):
                    r = np.add_run(part[2:-2])
                    r.font.bold = True
                else:
                    r = np.add_run(part.replace("`", ""))
                r.font.size = Pt(9.5)
                r.font.color.rgb = SLATE_DARK
            continue

        # Horizontal Rule
        if stripped.startswith("---"):
            continue

        # Standard Paragraph
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(6)
        parts = re.split(r'(\*\*.*?\*\*)', stripped)
        for part in parts:
            if part.startswith("**") and part.endswith("**"):
                r = p.add_run(part[2:-2])
                r.font.bold = True
            else:
                r = p.add_run(part.replace("`", ""))
            r.font.size = Pt(10)
            r.font.color.rgb = SLATE_DARK

    if in_table:
        flush_table()

    doc.save(str(output_path))
    print(f"DOCX successfully generated at: {output_path}")

def generate_pdf_via_html(md_text, output_path):
    print("Generating PDF document via Playwright Chromium...")

    # Convert Markdown to clean styled HTML
    html_lines = []
    in_code = False
    in_table = False
    table_rows = []

    def flush_html_table():
        nonlocal in_table, table_rows
        if not table_rows: return
        html_lines.append("<div class='table-wrapper'><table>")
        parsed = []
        for tr in table_rows:
            cleaned = tr.strip()
            if cleaned.startswith("|"): cleaned = cleaned[1:]
            if cleaned.endswith("|"): cleaned = cleaned[:-1]
            cols = [c.strip() for c in cleaned.split("|")]
            if all(re.match(r'^:?-+:?$', c) for c in cols if c):
                continue
            parsed.append(cols)

        if parsed:
            for idx, r_cols in enumerate(parsed):
                if idx == 0:
                    html_lines.append("<thead><tr>" + "".join(f"<th>{re.sub(r'[*`]', '', c)}</th>" for c in r_cols) + "</tr></thead><tbody>")
                else:
                    html_lines.append("<tr>" + "".join(f"<td>{re.sub(r'[*`]', '', c)}</td>" for c in r_cols) + "</tr>")
            html_lines.append("</tbody>")
        html_lines.append("</table></div>")
        table_rows = []
        in_table = False

    for line in md_text.splitlines():
        s = line.strip()

        if s.startswith("```"):
            if in_code:
                in_code = False
                html_lines.append("</code></pre>")
            else:
                if in_table: flush_html_table()
                in_code = True
                html_lines.append("<pre><code>")
            continue

        if in_code:
            html_lines.append(line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
            continue

        if s.startswith("|") and s.endswith("|"):
            in_table = True
            table_rows.append(s)
            continue
        elif in_table:
            flush_html_table()

        if not s:
            continue

        if s.startswith("# "):
            html_lines.append(f"<h1 class='doc-title'>{s[2:]}</h1>")
        elif s.startswith("## "):
            html_lines.append(f"<h2 class='section-heading'>{s[3:]}</h2>")
        elif s.startswith("### "):
            html_lines.append(f"<h3 class='sub-heading'>{s[4:]}</h3>")
        elif s.startswith("#### "):
            html_lines.append(f"<h4 class='sub-sub-heading'>{s[5:]}</h4>")
        elif s.startswith("- ") or s.startswith("* "):
            formatted = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', s[2:])
            formatted = re.sub(r'`(.*?)`', r'<code>\1</code>', formatted)
            html_lines.append(f"<li>{formatted}</li>")
        elif re.match(r'^\d+\.\s+', s):
            content = re.sub(r'^\d+\.\s+', '', s)
            formatted = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', content)
            formatted = re.sub(r'`(.*?)`', r'<code>\1</code>', formatted)
            html_lines.append(f"<div class='numbered-item'>{formatted}</div>")
        elif s.startswith("---"):
            html_lines.append("<hr/>")
        else:
            formatted = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', s)
            formatted = re.sub(r'`(.*?)`', r'<code>\1</code>', formatted)
            html_lines.append(f"<p>{formatted}</p>")

    if in_table:
        flush_html_table()

    body_content = "\n".join(html_lines)

    full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @page {{
    size: A4;
    margin: 18mm 15mm 20mm 15mm;
    @bottom-right {{
      content: "Page " counter(page) " of " counter(pages);
      font-size: 8.5pt;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #64748b;
    }}
    @bottom-left {{
      content: "NexAce CRM — System Audit Report";
      font-size: 8.5pt;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #94a3b8;
    }}
  }}

  * {{
    box-sizing: border-box;
  }}

  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    font-size: 9.5pt;
    line-height: 1.55;
    background: #ffffff;
    margin: 0;
    padding: 0;
  }}

  .header-card {{
    background: linear-gradient(135deg, #004d4d 0%, #008080 60%, #00c5a0 100%);
    color: white;
    padding: 24px 28px;
    border-radius: 12px;
    margin-bottom: 24px;
    box-shadow: 0 4px 14px rgba(0, 128, 128, 0.15);
  }}

  .header-card .badge {{
    display: inline-block;
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.35);
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 10px;
  }}

  .header-card h1 {{
    margin: 0 0 6px 0;
    font-size: 20pt;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #ffffff;
  }}

  .header-card p {{
    margin: 0;
    font-size: 10pt;
    opacity: 0.92;
  }}

  .meta-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px 18px;
    margin-bottom: 22px;
    font-size: 8.8pt;
  }}

  .meta-item strong {{
    color: #0f172a;
    display: inline-block;
    width: 140px;
  }}

  h2.section-heading {{
    color: #008080;
    font-size: 13.5pt;
    font-weight: 800;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 6px;
    margin-top: 24px;
    margin-bottom: 10px;
    page-break-after: avoid;
  }}

  h3.sub-heading {{
    color: #0f172a;
    font-size: 11pt;
    font-weight: 700;
    margin-top: 16px;
    margin-bottom: 6px;
    page-break-after: avoid;
  }}

  h4.sub-sub-heading {{
    color: #008080;
    font-size: 9.8pt;
    font-weight: 700;
    margin-top: 12px;
    margin-bottom: 4px;
    page-break-after: avoid;
  }}

  p {{
    margin: 0 0 8px 0;
    color: #334155;
  }}

  strong {{
    color: #0f172a;
  }}

  code {{
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 8.5pt;
    background: #f1f5f9;
    color: #0f172a;
    padding: 1px 5px;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
  }}

  pre {{
    background: #0f172a;
    color: #f8fafc;
    padding: 12px 14px;
    border-radius: 8px;
    font-size: 8pt;
    overflow-x: auto;
    margin: 10px 0;
    page-break-inside: avoid;
  }}

  pre code {{
    background: transparent;
    color: inherit;
    border: none;
    padding: 0;
  }}

  .table-wrapper {{
    margin: 12px 0 16px 0;
    overflow-x: auto;
    page-break-inside: avoid;
  }}

  table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
  }}

  th {{
    background: #008080;
    color: #ffffff;
    font-weight: 700;
    text-align: left;
    padding: 7px 10px;
    border: 1px solid #006666;
  }}

  td {{
    padding: 6px 10px;
    border: 1px solid #e2e8f0;
    color: #334155;
    vertical-align: top;
  }}

  tr:nth-child(even) td {{
    background: #f8fafc;
  }}

  li {{
    margin-bottom: 4px;
    color: #334155;
  }}

  .numbered-item {{
    margin-bottom: 5px;
    padding-left: 4px;
    color: #334155;
  }}

  hr {{
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 18px 0;
  }}
</style>
</head>
<body>

<div class="header-card">
  <div class="badge">Official Technical Audit Report</div>
  <h1>NexAce CRM (NIMO CRM)</h1>
  <p>Comprehensive Architectural, Functional, Security & Mobile Platform Audit</p>
</div>

<div class="meta-grid">
  <div class="meta-item"><strong>Audit Date:</strong> November 2026</div>
  <div class="meta-item"><strong>Target Version:</strong> v3.0 Production Architecture</div>
  <div class="meta-item"><strong>Technology Stack:</strong> Next.js 16, React 19, MongoDB 6/8, Capacitor 7</div>
  <div class="meta-item"><strong>Deployment Scope:</strong> Enterprise Multi-Tenant (Up to 500+ seats)</div>
</div>

{body_content}

</body>
</html>
"""

    temp_html_path = output_path.with_suffix(".temp.html")
    with open(temp_html_path, "w", encoding="utf-8") as f:
        f.write(full_html)

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe")
        page = browser.new_page()
        page.goto(f"file:///{temp_html_path.as_posix()}", wait_until="networkidle")
        page.pdf(
            path=str(output_path),
            format="A4",
            print_background=True,
            margin={"top": "16mm", "bottom": "18mm", "left": "14mm", "right": "14mm"}
        )
        browser.close()

    if temp_html_path.exists():
        temp_html_path.unlink()

    print(f"PDF successfully generated at: {output_path}")

def main():
    if not MARKDOWN_PATH.exists():
        print(f"Error: Markdown file not found at {MARKDOWN_PATH}")
        sys.exit(1)

    with open(MARKDOWN_PATH, "r", encoding="utf-8") as f:
        md_text = f.read()

    # Generate DOCX
    generate_docx(md_text, OUTPUT_DOCX_PLANS)
    generate_docx(md_text, OUTPUT_DOCX_ROOT)

    # Generate PDF
    generate_pdf_via_html(md_text, OUTPUT_PDF_PLANS)
    generate_pdf_via_html(md_text, OUTPUT_PDF_ROOT)

    print("\nAll documents successfully generated!")
    print(f"1. DOCX (Plans): {OUTPUT_DOCX_PLANS}")
    print(f"2. DOCX (Root):  {OUTPUT_DOCX_ROOT}")
    print(f"3. PDF (Plans):  {OUTPUT_PDF_PLANS}")
    print(f"4. PDF (Root):   {OUTPUT_PDF_ROOT}")

if __name__ == "__main__":
    main()
