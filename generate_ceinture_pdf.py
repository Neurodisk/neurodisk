from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus.flowables import Flowable
from reportlab.graphics.shapes import (
    Drawing, Rect, Ellipse, Line, Path, String, Circle, Polygon
)
from reportlab.graphics import renderPDF
import os

# ── Couleurs Neurodisk ──────────────────────────────────────────────────────
NAVY        = colors.HexColor("#1B2B6B")
NAVY_DARK   = colors.HexColor("#152258")
NAVY_LIGHT  = colors.HexColor("#243888")
BLUE        = colors.HexColor("#2468D6")
BLUE_LIGHT  = colors.HexColor("#3D82F0")
GREEN       = colors.HexColor("#2DB84E")
GREEN_DARK  = colors.HexColor("#239B41")
BG_LIGHT    = colors.HexColor("#EEF3FA")
BG_SUBTLE   = colors.HexColor("#F7F9FD")
TEXT_HEAD   = colors.HexColor("#1A1A2E")
TEXT_BODY   = colors.HexColor("#3A3A3A")
TEXT_MUTED  = colors.HexColor("#666666")
BORDER      = colors.HexColor("#D8E2F0")
STAR        = colors.HexColor("#F5C518")
WHITE       = colors.white

OUTPUT = r"C:\Users\gabgi\Downloads\Ai\ceinture_lombaire_neurodisk.pdf"

# ── Styles typographiques ───────────────────────────────────────────────────
def make_styles():
    base = "Helvetica"
    bold = "Helvetica-Bold"

    return {
        "title": ParagraphStyle(
            "title", fontName=bold, fontSize=22, leading=28,
            textColor=WHITE, alignment=TA_CENTER, spaceAfter=4
        ),
        "subtitle": ParagraphStyle(
            "subtitle", fontName=base, fontSize=11, leading=15,
            textColor=colors.HexColor("#B8C8F0"), alignment=TA_CENTER
        ),
        "section_head": ParagraphStyle(
            "section_head", fontName=bold, fontSize=13, leading=18,
            textColor=NAVY, spaceBefore=10, spaceAfter=6
        ),
        "step_num": ParagraphStyle(
            "step_num", fontName=bold, fontSize=18, leading=22,
            textColor=WHITE, alignment=TA_CENTER
        ),
        "step_title": ParagraphStyle(
            "step_title", fontName=bold, fontSize=12, leading=16,
            textColor=NAVY
        ),
        "body": ParagraphStyle(
            "body", fontName=base, fontSize=10, leading=15,
            textColor=TEXT_BODY, alignment=TA_JUSTIFY, spaceAfter=4
        ),
        "tip_title": ParagraphStyle(
            "tip_title", fontName=bold, fontSize=10, leading=14,
            textColor=GREEN_DARK
        ),
        "tip_body": ParagraphStyle(
            "tip_body", fontName=base, fontSize=10, leading=14,
            textColor=TEXT_BODY
        ),
        "warning": ParagraphStyle(
            "warning", fontName=bold, fontSize=10, leading=14,
            textColor=colors.HexColor("#C0392B")
        ),
        "footer": ParagraphStyle(
            "footer", fontName=base, fontSize=8, leading=12,
            textColor=TEXT_MUTED, alignment=TA_CENTER
        ),
        "caption": ParagraphStyle(
            "caption", fontName=base, fontSize=9, leading=12,
            textColor=TEXT_MUTED, alignment=TA_CENTER
        ),
    }


# ── Illustration ceinture lombaire ──────────────────────────────────────────
class LumbarBeltIllustration(Flowable):
    """Dessin vectoriel d'une ceinture lombaire portée sur un torse."""
    def __init__(self, width=160*mm, height=110*mm):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        w, h = self.width, self.height
        cx = w / 2

        # Fond carte
        c.setFillColor(BG_LIGHT)
        c.roundRect(0, 0, w, h, 10, fill=1, stroke=0)

        # ── Torse simplifié ────────────────────────────────────────────────
        # Silhouette du dos / torse (forme ovale + rectangulaire)
        c.setFillColor(colors.HexColor("#F5CBA7"))   # peau
        c.setStrokeColor(colors.HexColor("#E0A87A"))
        c.setLineWidth(1)

        # Corps principal
        body_x = cx - 38
        body_y = h * 0.15
        body_w = 76
        body_h = h * 0.65
        c.roundRect(body_x, body_y, body_w, body_h, 20, fill=1, stroke=1)

        # Épaules
        c.setFillColor(colors.HexColor("#F5CBA7"))
        c.ellipse(cx - 58, h * 0.62, cx - 20, h * 0.80, fill=1, stroke=1)
        c.ellipse(cx + 20, h * 0.62, cx + 58, h * 0.80, fill=1, stroke=1)

        # Cou
        c.setFillColor(colors.HexColor("#F5CBA7"))
        c.rect(cx - 14, h * 0.78, 28, h * 0.10, fill=1, stroke=0)

        # ── Ceinture lombaire ──────────────────────────────────────────────
        belt_y_bot = body_y + body_h * 0.22
        belt_h = body_h * 0.32
        belt_x = body_x - 6
        belt_w = body_w + 12

        # Corps de la ceinture (matière rigide)
        c.setFillColor(NAVY)
        c.setStrokeColor(NAVY_DARK)
        c.setLineWidth(1.5)
        c.roundRect(belt_x, belt_y_bot, belt_w, belt_h, 6, fill=1, stroke=1)

        # Texture / lignes horizontales sur la ceinture
        c.setStrokeColor(NAVY_LIGHT)
        c.setLineWidth(0.5)
        for i in range(1, 5):
            y_line = belt_y_bot + (belt_h / 5) * i
            c.line(belt_x + 4, y_line, belt_x + belt_w - 4, y_line)

        # Bandes velcro (côtés)
        c.setFillColor(BLUE_LIGHT)
        c.setStrokeColor(BLUE)
        c.roundRect(belt_x - 12, belt_y_bot + 4, 14, belt_h - 8, 4, fill=1, stroke=1)
        c.roundRect(belt_x + belt_w - 2, belt_y_bot + 4, 14, belt_h - 8, 4, fill=1, stroke=1)

        # Boucle centrale
        buckle_w, buckle_h = 22, 14
        buckle_x = cx - buckle_w / 2
        buckle_y = belt_y_bot + (belt_h - buckle_h) / 2
        c.setFillColor(colors.HexColor("#BDC3C7"))
        c.setStrokeColor(colors.HexColor("#7F8C8D"))
        c.setLineWidth(1.5)
        c.roundRect(buckle_x, buckle_y, buckle_w, buckle_h, 3, fill=1, stroke=1)
        # Barre centrale de la boucle
        c.setStrokeColor(colors.HexColor("#5D6D7E"))
        c.setLineWidth(2)
        c.line(cx, buckle_y + 2, cx, buckle_y + buckle_h - 2)

        # Flèches d'ajustement (gauche et droite)
        c.setStrokeColor(GREEN)
        c.setFillColor(GREEN)
        c.setLineWidth(2)
        # Flèche gauche
        ax = belt_x - 22
        ay = belt_y_bot + belt_h / 2
        c.line(ax, ay, ax - 14, ay)
        p = c.beginPath()
        p.moveTo(ax - 14, ay + 5)
        p.lineTo(ax - 14, ay - 5)
        p.lineTo(ax - 22, ay)
        p.close()
        c.drawPath(p, fill=1, stroke=0)
        # Flèche droite
        ax2 = belt_x + belt_w + 22
        c.line(ax2, ay, ax2 + 14, ay)
        p2 = c.beginPath()
        p2.moveTo(ax2 + 14, ay + 5)
        p2.lineTo(ax2 + 14, ay - 5)
        p2.lineTo(ax2 + 22, ay)
        p2.close()
        c.drawPath(p2, fill=1, stroke=0)

        # ── Étiquettes ────────────────────────────────────────────────────
        c.setFont("Helvetica-Bold", 7.5)

        # Velcro
        c.setFillColor(BLUE)
        c.drawCentredString(belt_x - 5, belt_y_bot - 14, "Velcro")

        c.setFillColor(BLUE)
        c.drawCentredString(belt_x + belt_w + 7, belt_y_bot - 14, "Velcro")

        # Boucle
        c.setFillColor(TEXT_MUTED)
        c.drawCentredString(cx, buckle_y - 12, "Boucle")

        # Ajustement
        c.setFillColor(GREEN_DARK)
        c.drawCentredString(belt_x - 20, ay - 20, "Serrage")
        c.drawCentredString(belt_x + belt_w + 20, ay - 20, "Serrage")

        # ── Ligne colonne vertébrale ───────────────────────────────────────
        c.setStrokeColor(colors.HexColor("#E8B4B8"))
        c.setLineWidth(1)
        c.setDash(3, 3)
        c.line(cx, body_y + body_h * 0.10, cx, body_y + body_h * 0.88)
        c.setDash()

        # ── Légende titre ──────────────────────────────────────────────────
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(NAVY)
        c.drawCentredString(cx, h - 12, "Vue frontale — Port de la ceinture lombaire")


# ── Bloc étape ──────────────────────────────────────────────────────────────
class StepBlock(Flowable):
    def __init__(self, num, title, text, width=160*mm):
        super().__init__()
        self.num = num
        self.title = title
        self.text = text
        self.width = width
        self.height = 62

    def draw(self):
        c = self.canv
        w = self.width
        circle_r = 18

        # Fond de la carte
        c.setFillColor(WHITE)
        c.setStrokeColor(BORDER)
        c.setLineWidth(1)
        c.roundRect(0, 0, w, self.height, 8, fill=1, stroke=1)

        # Cercle numéro
        c.setFillColor(NAVY)
        c.circle(circle_r + 8, self.height / 2, circle_r, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 16)
        c.setFillColor(WHITE)
        c.drawCentredString(circle_r + 8, self.height / 2 - 5, str(self.num))

        # Titre
        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(NAVY)
        c.drawString(circle_r * 2 + 20, self.height - 22, self.title)

        # Ligne séparatrice légère
        c.setStrokeColor(BG_LIGHT)
        c.setLineWidth(0.8)
        c.line(circle_r * 2 + 20, self.height - 26, w - 12, self.height - 26)

        # Texte
        c.setFont("Helvetica", 9.5)
        c.setFillColor(TEXT_BODY)
        # Wrap text manually
        words = self.text.split()
        lines = []
        line = ""
        max_w = w - (circle_r * 2 + 28) - 12
        for word in words:
            test = line + " " + word if line else word
            if c.stringWidth(test, "Helvetica", 9.5) < max_w:
                line = test
            else:
                lines.append(line)
                line = word
        if line:
            lines.append(line)

        y = self.height - 38
        for ln in lines[:3]:
            c.drawString(circle_r * 2 + 20, y, ln)
            y -= 13


# ── Boîte conseil / avertissement ───────────────────────────────────────────
def tip_box(styles, icon, title, text, bg_color=None, border_color=None):
    bg_color = bg_color or colors.HexColor("#E8F8EC")
    border_color = border_color or GREEN

    data = [[
        Paragraph(f"<b>{icon}  {title}</b>", styles["tip_title"]),
        Paragraph(text, styles["tip_body"]),
    ]]
    t = Table(data, colWidths=[45*mm, 115*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg_color),
        ("LEFTPADDING",  (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING",   (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 8),
        ("LINEAFTER",    (0, 0), (0, 0), 2, border_color),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ("ROUNDEDCORNERS", [8]),
    ]))
    return t


# ── Header personnalisé ──────────────────────────────────────────────────────
class NavyHeader(Flowable):
    def __init__(self, title, subtitle, width=160*mm, height=70*mm):
        super().__init__()
        self.title = title
        self.subtitle = subtitle
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        w, h = self.width, self.height

        # Fond navy
        c.setFillColor(NAVY)
        c.roundRect(0, 0, w, h, 12, fill=1, stroke=0)

        # Bande verte décorative en bas
        c.setFillColor(GREEN)
        c.rect(0, 0, w, 5, fill=1, stroke=0)

        # Cercles décoratifs (fond)
        c.setFillColor(NAVY_LIGHT)
        c.setStrokeColor(colors.transparent)
        c.circle(w * 0.85, h * 0.75, 40, fill=1, stroke=0)
        c.circle(w * 0.10, h * 0.20, 25, fill=1, stroke=0)

        # Icône médicale (+)
        cx_icon = 36
        cy_icon = h / 2 + 2
        c.setFillColor(BLUE)
        c.roundRect(cx_icon - 22, cy_icon - 22, 44, 44, 8, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.rect(cx_icon - 12, cy_icon - 4, 24, 8, fill=1, stroke=0)
        c.rect(cx_icon - 4, cy_icon - 12, 8, 24, fill=1, stroke=0)

        # Titre
        c.setFont("Helvetica-Bold", 19)
        c.setFillColor(WHITE)
        c.drawString(72, h / 2 + 8, self.title)

        # Sous-titre
        c.setFont("Helvetica", 10)
        c.setFillColor(colors.HexColor("#B8C8F0"))
        c.drawString(72, h / 2 - 12, self.subtitle)

        # Neurodisk branding
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(colors.HexColor("#7090D0"))
        c.drawRightString(w - 12, 12, "neurodisk.ca")


# ── Document principal ───────────────────────────────────────────────────────
def build_pdf():
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=25*mm, rightMargin=25*mm,
        topMargin=20*mm, bottomMargin=20*mm,
        title="Guide – Installation de la ceinture lombaire",
        author="Neurodisk"
    )

    styles = make_styles()
    story = []
    W = A4[0] - 50*mm  # largeur utile

    # ── Header ──────────────────────────────────────────────────────────────
    story.append(NavyHeader(
        "Installation de la ceinture lombaire",
        "Guide d'utilisation — Étape par étape",
        width=W, height=68*mm
    ))
    story.append(Spacer(1, 6*mm))

    # ── Introduction ────────────────────────────────────────────────────────
    story.append(Paragraph(
        "La ceinture lombaire est un dispositif de soutien conçu pour stabiliser "
        "la région lombaire (bas du dos), réduire la douleur et limiter les mouvements "
        "nocifs durant la guérison ou l'effort physique. Pour être efficace, elle doit "
        "être portée correctement et ajustée à votre morphologie.",
        styles["body"]
    ))
    story.append(Spacer(1, 4*mm))

    # ── Illustration ─────────────────────────────────────────────────────────
    story.append(LumbarBeltIllustration(width=W, height=105*mm))
    story.append(Paragraph("Illustration : anatomie de la ceinture et zones de contact", styles["caption"]))
    story.append(Spacer(1, 5*mm))

    # ── Étapes ───────────────────────────────────────────────────────────────
    story.append(HRFlowable(width=W, color=BORDER, thickness=1, spaceAfter=4))
    story.append(Paragraph("Marche à suivre", styles["section_head"]))
    story.append(Spacer(1, 2*mm))

    steps = [
        (
            1, "Préparer la ceinture",
            "Déroulez complètement la ceinture et ouvrez toutes les attaches velcro. "
            "Identifiez l'endroit (zone rigide ou renforcée) — il doit se positionner dans le bas du dos."
        ),
        (
            2, "Se positionner debout ou assis droit",
            "Tenez-vous droit, les pieds écartés à largeur d'épaules. "
            "Cette posture neutre facilite un placement optimal de la ceinture sur la région lombaire (L1-L5)."
        ),
        (
            3, "Positionner la ceinture",
            "Passez la ceinture autour de votre taille, la partie rigide dans le creux du dos. "
            "Le bord inférieur doit suivre la ligne du bassin; le bord supérieur ne doit pas dépasser les côtes."
        ),
        (
            4, "Premier serrage (modéré)",
            "Fermez les attaches principales en commençant par le centre. "
            "Le serrage doit être ferme mais confortable — vous devez pouvoir respirer profondément sans restriction."
        ),
        (
            5, "Ajuster les sangles secondaires",
            "Serrez les bandes d'ajustement latérales de façon symétrique, en tirant vers l'avant. "
            "Vérifiez que la ceinture ne remonte pas et reste parallèle au sol."
        ),
        (
            6, "Vérifier le confort et la mobilité",
            "Faites quelques mouvements doux (flexion légère, rotation). "
            "La ceinture doit soutenir sans couper la circulation ni créer de points de pression douloureux."
        ),
    ]

    for num, title, text in steps:
        story.append(StepBlock(num, title, text, width=W))
        story.append(Spacer(1, 3*mm))

    story.append(Spacer(1, 2*mm))

    # ── Conseil et avertissement ──────────────────────────────────────────────
    story.append(HRFlowable(width=W, color=BORDER, thickness=1, spaceAfter=4))
    story.append(Paragraph("Conseils et mises en garde", styles["section_head"]))
    story.append(Spacer(1, 2*mm))

    story.append(tip_box(
        styles, "✓", "Bonne pratique",
        "Portez la ceinture directement sur un vêtement léger (t-shirt fin) pour éviter "
        "l'irritation cutanée et maintenir une bonne hygiène. Retirez-la la nuit sauf avis contraire de votre professionnel de santé.",
        bg_color=colors.HexColor("#E8F8EC"), border_color=GREEN
    ))
    story.append(Spacer(1, 3*mm))

    story.append(tip_box(
        styles, "i", "Durée de port recommandée",
        "En général, 4 à 6 heures par jour lors des activités à risque (position debout prolongée, "
        "levée de charges). Un usage prolongé sans exercice de renforcement peut affaiblir les muscles du dos.",
        bg_color=BG_LIGHT, border_color=BLUE
    ))
    story.append(Spacer(1, 3*mm))

    story.append(tip_box(
        styles, "⚠", "Attention",
        "Si vous ressentez des fourmillements, engourdissements ou une aggravation de la douleur, "
        "retirez immédiatement la ceinture et consultez votre professionnel de santé.",
        bg_color=colors.HexColor("#FDECEA"),
        border_color=colors.HexColor("#C0392B")
    ))

    story.append(Spacer(1, 5*mm))

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(HRFlowable(width=W, color=BORDER, thickness=0.8))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph(
        "Document préparé par l'équipe Neurodisk · neurodisk.ca · "
        "Ce guide est à titre informatif et ne remplace pas un avis médical professionnel.",
        styles["footer"]
    ))

    doc.build(story)
    print(f"PDF généré : {OUTPUT}")


if __name__ == "__main__":
    build_pdf()
