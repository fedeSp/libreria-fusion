# -*- coding: utf-8 -*-
"""
Genera el manual del panel en PDF, para quien atiende la librería.

    python scripts/manual-panel.py

Las capturas se buscan en docs/capturas/<nombre>.png. Si el archivo está, se
incrusta; si no, se dibuja un recuadro que dice cuál falta. Así el manual se
puede generar completo desde el primer día y mejorarlo después sin reescribir
nada: se agregan los PNG y se vuelve a correr.
"""

import os

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.flowables import HRFlowable

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAPTURAS = os.path.join(RAIZ, "docs", "capturas")
SALIDA = os.path.join(RAIZ, "docs", "Manual del panel - Libreria Fusion.pdf")

# Las capturas que espera el manual, en el orden en que aparecen.
ESPERADAS = [
    "productos-botones.png",
    "importar-productos.png",
    "categorias-botones.png",
    "pedidos-filtros.png",
    "ficha-sku.png",
    "nuevo-producto.png",
]

# La misma paleta de la tienda. El rosa fuerte es el único que lleva texto.
MARCA = colors.HexColor("#C2185B")
MARCA_SUAVE = colors.HexColor("#FDE7F0")
TINTA = colors.HexColor("#1F2430")
GRIS = colors.HexColor("#5B6472")
LINEA = colors.HexColor("#E7E2E6")
ALERTA = colors.HexColor("#B3261E")
ALERTA_SUAVE = colors.HexColor("#FBEDEC")

ANCHO_UTIL = A4[0] - 40 * mm

getSampleStyleSheet()


def estilo(nombre, **kw):
    base = dict(
        fontName="Helvetica", fontSize=10.5, leading=15.5, textColor=TINTA, alignment=TA_LEFT
    )
    base.update(kw)
    return ParagraphStyle(nombre, **base)


P = estilo("cuerpo", spaceAfter=7)
P_GRIS = estilo("cuerpo_gris", textColor=GRIS, spaceAfter=7)
TITULO = estilo("titulo", fontName="Helvetica-Bold", fontSize=26, leading=30, textColor=MARCA)
BAJADA = estilo("bajada", fontSize=12, leading=17, textColor=GRIS, spaceAfter=18)
H1 = estilo("h1", fontName="Helvetica-Bold", fontSize=16, leading=21, textColor=MARCA,
            spaceBefore=14, spaceAfter=7)
H2 = estilo("h2", fontName="Helvetica-Bold", fontSize=11.5, leading=16, textColor=TINTA,
            spaceBefore=10, spaceAfter=4)
PASO = estilo("paso", spaceAfter=5)
EPIGRAFE = estilo("epigrafe", fontSize=9, leading=12, textColor=GRIS, spaceBefore=4, spaceAfter=11)
AVISO = estilo("aviso", spaceAfter=6)
CODIGO = estilo("codigo", fontName="Courier-Bold", fontSize=13, leading=18, textColor=MARCA,
                spaceBefore=4, spaceAfter=4)


def n(texto):
    return "<b>" + texto + "</b>"


def recuadro(parrafos, fondo, borde, titulo):
    contenido = [Paragraph(n(titulo), estilo("t_rec", fontName="Helvetica-Bold",
                                             textColor=borde, spaceAfter=5))]
    contenido += [Paragraph(t, AVISO) for t in parrafos]
    t = Table([[contenido]], colWidths=[ANCHO_UTIL])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), fondo),
        ("BOX", (0, 0), (-1, -1), 0.8, borde),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return [Spacer(1, 3), t, Spacer(1, 10)]


def ojo(titulo, *parrafos):
    return recuadro(list(parrafos), ALERTA_SUAVE, ALERTA, titulo)


def nota(titulo, *parrafos):
    return recuadro(list(parrafos), MARCA_SUAVE, MARCA, titulo)


def captura(archivo, epigrafe):
    """La imagen si existe; si no, un recuadro que dice cuál falta."""
    ruta = os.path.join(CAPTURAS, archivo)
    if os.path.exists(ruta):
        ancho_px, alto_px = ImageReader(ruta).getSize()
        ancho = min(ANCHO_UTIL, ancho_px * 0.62)
        alto = ancho * alto_px / ancho_px
        tope = 115 * mm  # que ninguna captura se coma una hoja entera
        if alto > tope:
            ancho, alto = ancho * tope / alto, tope
        img = Image(ruta, width=ancho, height=alto)
        img.hAlign = "LEFT"
        return KeepTogether([img, Paragraph(epigrafe, EPIGRAFE)])

    hueco = Table([[Paragraph("[ captura pendiente: " + archivo + " ]", P_GRIS)]],
                  colWidths=[ANCHO_UTIL], rowHeights=[26 * mm])
    hueco.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FAF9FA")),
        ("BOX", (0, 0), (-1, -1), 0.8, LINEA),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return KeepTogether([hueco, Paragraph(epigrafe, EPIGRAFE)])


def pasos(*items):
    return ListFlowable(
        [ListItem(Paragraph(t, PASO), leftIndent=18) for t in items],
        bulletType="1", bulletFontName="Helvetica-Bold", bulletFontSize=10.5,
        bulletColor=MARCA, leftIndent=16, spaceAfter=8,
    )


def vinetas(*items):
    return ListFlowable(
        [ListItem(Paragraph(t, PASO), leftIndent=16) for t in items],
        bulletType="bullet", start="•", bulletColor=MARCA, leftIndent=14, spaceAfter=8,
    )


def tabla(filas, anchos):
    t = Table(filas, colWidths=anchos)
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (-1, 0), TINTA),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F7F5F6")),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("TEXTCOLOR", (0, 1), (-1, -1), GRIS),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.5, LINEA),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return [t, Spacer(1, 12)]


def pie(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(GRIS)
    canvas.drawString(20 * mm, 12 * mm, "Librería Fusión — Manual del panel")
    canvas.drawRightString(A4[0] - 20 * mm, 12 * mm, str(doc.page))
    canvas.setStrokeColor(LINEA)
    canvas.setLineWidth(0.5)
    canvas.line(20 * mm, 16 * mm, A4[0] - 20 * mm, 16 * mm)
    canvas.restoreState()


def construir():
    os.makedirs(CAPTURAS, exist_ok=True)

    doc = BaseDocTemplate(
        SALIDA, pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=22 * mm,
        title="Manual del panel — Librería Fusión", author="Librería Fusión",
    )
    marco = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="cuerpo")
    doc.addPageTemplates([PageTemplate(id="normal", frames=[marco], onPage=pie)])

    h = []

    h.append(Paragraph("Manual del panel", TITULO))
    h.append(Paragraph("Librería Fusión", estilo("marca", fontSize=13, textColor=TINTA,
                                                     spaceBefore=2, spaceAfter=14)))
    h.append(HRFlowable(width="100%", thickness=2, color=MARCA, spaceAfter=14))
    h.append(Paragraph(
        "Tres cosas nuevas: bajar y subir las planillas del catálogo, buscar pedidos "
        "por fecha y exportarlos, y el código que ahora tiene cada producto. Nada de "
        "lo que está acá rompe la tienda: todo se puede revisar antes de confirmar.",
        BAJADA))

    # ------------------------------------------------------------ 1. planilla
    h.append(Paragraph("1. La planilla de productos", H1))
    h.append(Paragraph(
        "Sirve para cambiar muchas cosas de una sola vez: subir todos los precios un "
        "porcentaje, cargar el stock después de hacer inventario, o corregir veinte "
        "descripciones sin entrar producto por producto.", P))
    h.append(Paragraph(
        "La idea es siempre la misma: " + n("se baja, se edita en Excel, se vuelve a subir") + ".", P))

    h.append(captura("productos-botones.png",
                     "Los botones nuevos, arriba a la derecha de la pantalla de Productos."))

    h.append(Paragraph("Paso a paso", H2))
    h.append(pasos(
        "Entrá a " + n("Productos") + " y tocá " + n("Exportar CSV") + ". Se descarga un archivo.",
        "Abrilo con Excel. Cada fila es un producto; si tiene varios colores, ocupa una "
        "fila por color.",
        "Cambiá lo que necesites y " + n("guardá el archivo") + ". Si Excel pregunta, dejalo como CSV.",
        "Volvé al panel, tocá " + n("Importar CSV") + " y elegí el archivo.",
        "Antes de tocar nada, el panel te muestra " + n("una vista previa") + ": qué productos "
        "va a actualizar y si alguna fila tiene problemas.",
        "Si está todo bien, tocá " + n("Confirmar importación") + ".",
    ))

    h.append(captura("importar-productos.png",
                     "La pantalla de importar explica el formato y te deja bajar el catálogo actual."))

    h.append(Paragraph("Qué podés cambiar", H2))
    h += tabla([
        ["Columna", "Para qué sirve"],
        ["nombre", "El nombre que ve el cliente."],
        ["precio", "En pesos y con coma: 10900,50"],
        ["stock", "Cuántas unidades quedan."],
        ["categoria", "El nombre corto de la categoría."],
        ["descripcion / resumen", "Los textos de la ficha."],
        ["activo", "si para que se vea en la tienda, no para esconderlo."],
        ["slug", "No tocar. Es como el panel reconoce cada producto."],
    ], [42 * mm, ANCHO_UTIL - 42 * mm])

    h += ojo(
        "Hacelo de una sentada",
        "La planilla lleva los precios y el stock del momento en que la bajaste. Si la "
        "bajás a la mañana, vendés durante el día y subís ese mismo archivo a la tarde, "
        + n("el stock vuelve al de la mañana") + ".",
        "Bajala, editala y subila en el mismo rato. Si solo querés tocar precios, borrá "
        "la columna " + n("stock") + " antes de subir: lo que no está en el archivo no se toca.",
    )

    h += nota(
        "Tranquila: nunca borra nada",
        "Subir el mismo archivo dos veces no duplica productos, los actualiza.",
        "Un producto que está en la tienda y no está en el archivo se queda como está.",
        "Las fotos no se borran ni se pierden.",
    )

    h.append(Paragraph("Las categorías funcionan igual", H2))
    h.append(Paragraph(
        "La pantalla de " + n("Categorías") + " tiene los mismos dos botones y se usa de la "
        "misma forma. Sirve sobre todo para reordenarlas o renombrarlas todas juntas.", P))
    h.append(captura("categorias-botones.png", "Mismos botones, misma lógica."))

    # ------------------------------------------------------------- 2. pedidos
    h.append(Paragraph("2. Los pedidos: buscar y exportar", H1))
    h.append(Paragraph(
        "Arriba de la lista hay un panel con todos los filtros juntos: las solapas "
        "filtran por estado (Pagados, Listos, Entregados) y abajo están las fechas.", P))

    h.append(captura("pedidos-filtros.png", "Solapas de estado arriba, fechas abajo."))

    h.append(Paragraph("Buscar los pedidos de un mes", H2))
    h.append(pasos(
        "Elegí la solapa que quieras, o dejá " + n("Todos") + ".",
        "Completá " + n("Desde") + " y " + n("Hasta") + ". Para septiembre: 01/09 y 30/09.",
        "Tocá " + n("Filtrar") + ". La lista de abajo se achica a ese mes.",
        "Si además lo necesitás en Excel, tocá " + n("Exportar CSV") + ".",
    ))
    h.append(Paragraph(
        "Los dos botones usan lo que esté escrito en las fechas, así que podés exportar "
        "directo sin filtrar primero. Y " + n("Limpiar") + " borra las fechas y vuelve a "
        "mostrar todo.", P))

    h.append(Paragraph("Qué trae el archivo de pedidos", H2))
    h.append(vinetas(
        "Una fila por pedido, con el número, la fecha, el cliente y el total.",
        "Una columna " + n("productos") + " que dice qué se llevó: 2x Cuaderno Éxito (Negro).",
        "El número de la operación en Mercado Pago, para que el contador pueda cruzarlo "
        "con el resumen sin pedirte nada.",
    ))
    h.append(Paragraph(
        "Los pedidos " + n("solo se exportan") + ". No se pueden subir desde una planilla, "
        "porque son el registro de lo que pasó de verdad.", P_GRIS))

    # ----------------------------------------------------------------- 3. sku
    h.append(Paragraph("3. El código de cada producto (SKU)", H1))
    h.append(Paragraph(
        "Cada color de cada producto tiene ahora un código corto. Es como el número de "
        "documento del producto: el nombre puede cambiar, el código no.", P))
    h.append(Paragraph("CUA-ESC-01-003", CODIGO))
    h.append(Paragraph(
        "CUA de cuaderno, ESC de escolar, 01 porque es el primer cuaderno cargado, y 003 "
        "porque es el tercer color.", P_GRIS))

    h += nota("Esto ya está hecho",
              "Los 87 productos que ya estaban cargados tienen su código. No hay que hacer nada.")

    h.append(captura("ficha-sku.png",
                     "En la ficha del producto, al lado del precio y el stock."))

    h.append(Paragraph("Cuando cargues un producto nuevo", H2))
    h.append(pasos(
        "Cargalo como siempre: nombre, categoría, precio, stock.",
        "Tocá " + n("Generar SKU") + " y los códigos se completan solos.",
        "Si el proveedor te da su propio código y preferís ese, borralo y escribí el suyo.",
    ))
    h.append(captura("nuevo-producto.png",
                     "El botón se activa recién cuando el producto tiene nombre."))

    h.append(Paragraph("Dos reglas", H2))
    h.append(vinetas(
        n("Dos productos no pueden tener el mismo código") + ". Si pasa, el panel te avisa.",
        n("No reutilices un código viejo") + " para un producto nuevo, aunque hayas dado de "
        "baja el anterior: se mezclan las ventas viejas con las nuevas.",
    ))

    # ----------------------------------------------------------- preguntas
    h.append(Paragraph("Preguntas rápidas", H1))
    preguntas = [
        ("¿Subí el mismo archivo dos veces, se duplicó todo?",
         "No. El panel reconoce cada producto y lo actualiza. Vas a terminar con los "
         "mismos productos que tenías."),
        ("¿Puedo borrar un producto sacándolo de la planilla?",
         "No, y es a propósito. Lo que no está en el archivo se queda como está. Para dar "
         "de baja, entrá al producto y usá el botón " + n("Dar de baja") + "."),
        ("Me equivoqué y subí un archivo viejo.",
         "Volvé a exportar, corregí los precios y el stock que hayan quedado mal, y subilo "
         "de nuevo. No se pierde nada, pero avisame así lo revisamos juntos."),
        ("Excel me deja los precios raros.",
         "Fijate que la columna de precios tenga coma y no punto: 10900,50. Si Excel te "
         "ofrece guardar en otro formato, elegí siempre CSV."),
        ("¿Cuántos pedidos entran en la lista?",
         "La pantalla muestra los 100 más recientes. El archivo que exportás no tiene ese "
         "límite: trae todos los del rango que hayas elegido."),
    ]
    for pregunta, respuesta in preguntas:
        h.append(KeepTogether([Paragraph(n(pregunta), H2), Paragraph(respuesta, P)]))

    h.append(Spacer(1, 10))
    h.append(HRFlowable(width="100%", thickness=0.8, color=LINEA, spaceAfter=10))
    h.append(Paragraph(
        "Ante cualquier duda, antes de confirmar algo de lo que no estés segura: mandame "
        "un mensaje. Todo lo de este manual se puede deshacer, pero es más fácil no tener "
        "que deshacerlo.", P_GRIS))

    doc.build(h)

    faltan = [f for f in ESPERADAS if not os.path.exists(os.path.join(CAPTURAS, f))]
    print("PDF generado: " + SALIDA)
    if faltan:
        print("Capturas pendientes (quedan como recuadro marcado):")
        for f in faltan:
            print("  docs/capturas/" + f)
    else:
        print("Las " + str(len(ESPERADAS)) + " capturas quedaron incrustadas.")


if __name__ == "__main__":
    construir()
