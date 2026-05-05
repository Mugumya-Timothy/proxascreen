import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import type { Assessment, Patient, FamilyHistoryDetail, SymptomAdjustment } from '../types'

const PRIMARY_RGB: [number, number, number] = [87, 190, 235]

const RISK_TEXT_RGB: Record<string, [number, number, number]> = {
  Low:    [22,  101, 52],
  Medium: [146, 64,  14],
  High:   [153, 27,  27],
}

const RISK_BG_RGB: Record<string, [number, number, number]> = {
  Low:    [240, 253, 244],
  Medium: [255, 251, 235],
  High:   [254, 242, 242],
}

const FEATURE_LABELS: Record<string, string> = {
  age:                     'Age',
  bmi:                     'BMI',
  bmi_category:            'BMI Category',
  age_group:               'Age Group',
  smoker:                  'Smoker',
  alcohol_consumption:     'Alcohol Use',
  diet_type:               'Diet Type',
  physical_activity_level: 'Physical Activity',
  family_history:          'Family History',
  regular_health_checkup:  'Health Checkup',
  prostate_exam_done:      'Prostate Exam',
  risk_factor_count:       'Risk Factors',
}

function featureLabel(key: string): string {
  return (
    FEATURE_LABELS[key] ??
    key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  )
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * If the content that follows won't fit on the current page, inserts a new
 * page and returns the reset y; otherwise returns y unchanged.
 */
function maybeNewPage(
  doc: jsPDF,
  y: number,
  needed: number,
  pageH: number,
  margin: number,
): number {
  if (y + needed > pageH - margin - 10) {
    doc.addPage()
    return margin + 8
  }
  return y
}

/**
 * Renders a horizontal bar chart directly with jsPDF primitives.
 * `labelW` is the reserved width (mm) for the left-side category labels.
 * Returns the y position after the last bar row.
 */
function drawBarChart(
  doc: jsPDF,
  startY: number,
  margin: number,
  pageW: number,
  data: { name: string; value: number; rgb: [number, number, number] }[],
  maxValue: number,
  formatValue: (v: number, rank: number) => string,
  labelW: number,
): number {
  const chartW   = pageW - margin * 2
  const valueW   = 24
  const barAreaW = chartW - labelW - valueW
  const rowH     = 8.5
  let y          = startY

  for (let i = 0; i < data.length; i++) {
    const { name, value, rgb } = data[i]
    const barW = barAreaW * Math.min(value / maxValue, 1)

    // Category label
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(107, 114, 128)
    doc.text(name, margin, y + rowH / 2 + 1, { baseline: 'middle' })

    // Background track
    doc.setFillColor(236, 238, 240)
    doc.roundedRect(margin + labelW, y + 1.5, barAreaW, rowH - 3, 1.2, 1.2, 'F')

    // Filled bar
    if (barW > 0.5) {
      doc.setFillColor(...rgb)
      doc.roundedRect(margin + labelW, y + 1.5, barW, rowH - 3, 1.2, 1.2, 'F')
    }

    // Value label
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(17, 24, 39)
    doc.text(
      formatValue(value, i),
      margin + labelW + barAreaW + 2,
      y + rowH / 2 + 1,
      { baseline: 'middle' },
    )

    y += rowH
  }
  return y
}

/**
 * Renders the green→yellow→red risk spectrum gauge with a needle at the
 * weighted `position` (0–100 scalar from risk probabilities).
 * Returns the y position after the whole gauge block.
 */
function drawRiskGauge(
  doc: jsPDF,
  startY: number,
  margin: number,
  pageW: number,
  position: number,
  riskLevel: string,
  confidence: number,
): number {
  const gaugeW = pageW - margin * 2
  const gaugeH = 9
  const steps  = 50
  let   y      = startY

  // Gradient bar — simulated with `steps` thin rectangles
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    let r: number, g: number, b: number
    if (t < 0.5) {
      const tt = t * 2                               // green → yellow
      r = Math.round(34  + (250 - 34)  * tt)
      g = Math.round(197 + (204 - 197) * tt)
      b = Math.round(94  + (21  - 94)  * tt)
    } else {
      const tt = (t - 0.5) * 2                       // yellow → red
      r = Math.round(250 + (239 - 250) * tt)
      g = Math.round(204 + (68  - 204) * tt)
      b = Math.round(21  + (68  - 21)  * tt)
    }
    const segX = margin + (gaugeW / steps) * i
    const segW = (gaugeW / steps) + 0.3              // slight overlap avoids gaps
    doc.setFillColor(r, g, b)
    doc.rect(segX, y, segW, gaugeH, 'F')
  }

  // Border outline
  doc.setDrawColor(209, 213, 219)
  doc.setLineWidth(0.3)
  doc.roundedRect(margin, y, gaugeW, gaugeH, 2, 2, 'S')

  // Needle: vertical line + filled circle at the bottom
  const clampedPos = Math.min(Math.max(position, 1.5), 98.5)
  const needleX    = margin + (clampedPos / 100) * gaugeW

  doc.setDrawColor(17, 24, 39)
  doc.setLineWidth(1.0)
  doc.line(needleX, y - 3, needleX, y + gaugeH + 3)

  doc.setFillColor(17, 24, 39)
  doc.setDrawColor(17, 24, 39)
  doc.ellipse(needleX, y + gaugeH + 4.5, 1.8, 1.8, 'F')

  y += gaugeH + 9

  // Zone labels
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(22, 101, 52)
  doc.text('LOW', margin, y)
  doc.setTextColor(180, 100, 0)
  doc.text('MEDIUM', pageW / 2, y, { align: 'center' })
  doc.setTextColor(153, 27, 27)
  doc.text('HIGH', pageW - margin, y, { align: 'right' })

  y += 5

  // Confidence sub-label
  const riskTextRgb = RISK_TEXT_RGB[riskLevel] ?? RISK_TEXT_RGB.High
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...riskTextRgb)
  doc.text(`Model confidence: ${confidence.toFixed(1)}%`, pageW / 2, y, { align: 'center' })

  return y + 5
}

function fiBandRgb(rank: number): [number, number, number] {
  if (rank === 0)  return [185, 28,  28]
  if (rank <= 2)   return [234, 88,  12]
  if (rank <= 5)   return [37,  99,  235]
  return [147, 197, 253]
}

function fiBandLabel(rank: number): string {
  if (rank === 0)  return 'Highest'
  if (rank <= 2)   return 'High'
  if (rank <= 5)   return 'Moderate'
  return 'Low'
}

const SYMPTOM_ORDER_PDF: { key: string; display: string; urgent?: boolean }[] = [
  { key: 'difficulty_urination', display: 'Difficulty with urination',   urgent: true },
  { key: 'increased_frequency',  display: 'Increased urinary frequency', urgent: true },
  { key: 'urinary_retention',    display: 'Urinary retention',   urgent: true },
  { key: 'haematuria',           display: 'Haematuria (blood in urine)', urgent: true },
  { key: 'dysuria',              display: 'Dysuria (painful urination)' },
  { key: 'pelvic_discomfort',    display: 'Pelvic discomfort' },
  { key: 'perineal_pain',        display: 'Perineal or rectal pain' },
  { key: 'back_pain',            display: 'Back pain' },
  { key: 'bone_pain',            display: 'Bone pain (generalised or localised)', urgent: true },
  { key: 'leg_weakness',         display: 'Leg weakness or paralysis', urgent: true },
  { key: 'urinary_incontinence', display: 'Urinary incontinence' },
  { key: 'weight_loss',          display: 'Weight loss' },
  { key: 'fatigue',              display: 'Fatigue' },
  { key: 'erectile_dysfunction', display: 'Erectile dysfunction' },
  { key: 'others',               display: 'Other symptoms' },
]

function normalizeSymptomLabel(key: string): string {
  const known = SYMPTOM_ORDER_PDF.find((sym) => sym.key === key)
  if (known) return known.display
  return key
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function parseStoredSymptoms(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function getPresentingSymptoms(
  rawSymptoms: Record<string, string> | null,
  symptomsPresent: string | null | undefined,
): { key: string; display: string; urgent: boolean }[] {
  const presentKeys = new Set<string>()

  if (rawSymptoms) {
    for (const [key, status] of Object.entries(rawSymptoms)) {
      if (status === 'Present') presentKeys.add(key)
    }
  }

  for (const key of parseStoredSymptoms(symptomsPresent)) {
    presentKeys.add(key)
  }

  const ordered = SYMPTOM_ORDER_PDF
    .filter((sym) => presentKeys.has(sym.key))
    .map((sym) => ({ key: sym.key, display: sym.display, urgent: Boolean(sym.urgent) }))

  const extras = [...presentKeys]
    .filter((key) => !SYMPTOM_ORDER_PDF.some((sym) => sym.key === key))
    .map((key) => ({ key, display: normalizeSymptomLabel(key), urgent: false }))

  return [...ordered, ...extras]
}

export function generateAssessmentPDF(
  assessment: Assessment,
  patient: Patient,
  clinicianName: string,
): void {
  const doc    = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW  = doc.internal.pageSize.getWidth()
  const pageH  = doc.internal.pageSize.getHeight()
  const margin = 14
  let y        = 18

  const symAdj   = assessment.symptom_adjustment   as SymptomAdjustment   | null
  const fhDetail = assessment.family_history_detail as FamilyHistoryDetail | null
  const rawSymptoms = assessment.raw_symptom_dict as Record<string, string> | null
  const presentingSymptoms = getPresentingSymptoms(rawSymptoms, assessment.symptoms_present)

  const finalRisk = assessment.final_risk_level ?? assessment.risk_level
  const baseRisk  = assessment.base_risk_level  ?? assessment.risk_level

  // ── Header ────────────────────────────────────────────────────────────────

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PRIMARY_RGB)
  doc.text('ProxaScreen', margin, y)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(107, 114, 128)
  doc.text('Prostate Cancer Risk Assessment Report', margin, y + 6)

  // Date – right-aligned
  const dateStr = new Date(assessment.created_at).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
  doc.setFontSize(8)
  doc.setTextColor(107, 114, 128)
  doc.text('Report Date', pageW - margin, y - 1, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(17, 24, 39)
  doc.text(dateStr, pageW - margin, y + 5, { align: 'right' })

  // Divider
  y += 14
  doc.setDrawColor(...PRIMARY_RGB)
  doc.setLineWidth(0.6)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  // ── Patient Information ────────────────────────────────────────────────────

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(156, 163, 175)
  doc.text('PATIENT INFORMATION', margin, y)
  y += 2

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: { top: 2, bottom: 2, left: 0, right: 4 } },
    columnStyles: {
      0: { textColor: [107, 114, 128] as [number, number, number], cellWidth: 65 },
      1: { fontStyle: 'bold', textColor: [17, 24, 39] as [number, number, number] },
    },
    body: [
      ['Full Name',  patient.full_name],
      ['Patient ID', patient.patient_number],
      ['Age',        `${patient.age} years`],
      ['Clinician',  clinicianName],
    ],
  })

  y = (doc as any).lastAutoTable.finalY + 10

  // ── Risk Assessment Result ─────────────────────────────────────────────────

  y = maybeNewPage(doc, y, 55, pageH, margin)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(156, 163, 175)
  doc.text('RISK ASSESSMENT RESULT', margin, y)
  y += 3

  const riskTextRgb = RISK_TEXT_RGB[finalRisk] ?? RISK_TEXT_RGB.High
  const riskBgRgb   = RISK_BG_RGB[finalRisk]   ?? RISK_BG_RGB.High

  doc.setFillColor(...riskBgRgb)
  doc.roundedRect(margin, y, pageW - margin * 2, 14, 3, 3, 'F')
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...riskTextRgb)
  doc.text(`${finalRisk} Risk`, pageW / 2, y + 9.5, { align: 'center' })
  y += 18

  // ── Risk Gauge ────────────────────────────────────────────────────────────────────

  // Weighted 0–100 position on the spectrum: 0 = all-Low, 100 = all-High
  const riskPos =
    assessment.low_percentage    * 0   +
    assessment.medium_percentage * 0.5 +
    assessment.high_percentage   * 1.0

  y = drawRiskGauge(doc, y, margin, pageW, riskPos, finalRisk, assessment.model_confidence)
  y += 6

  // ── Probability Distribution (bar chart) ──────────────────────────────────

  y = maybeNewPage(doc, y, 42, pageH, margin)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(156, 163, 175)
  doc.text('PROBABILITY DISTRIBUTION', margin, y)
  y += 5

  y = drawBarChart(
    doc, y, margin, pageW,
    [
      { name: 'High Risk',   value: assessment.high_percentage,   rgb: [239, 68,  68] },
      { name: 'Medium Risk', value: assessment.medium_percentage, rgb: [234, 179, 8]  },
      { name: 'Low Risk',    value: assessment.low_percentage,    rgb: [34,  197, 94] },
    ],
    100,
    (v) => `${v.toFixed(1)}%`,
    55,
  )
  y += 8

  // ── Clinical Inputs ────────────────────────────────────────────────────────

  y = maybeNewPage(doc, y, 65, pageH, margin)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(156, 163, 175)
  doc.text('CLINICAL INPUTS', margin, y)
  y += 2

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'striped',
    headStyles: {
      fillColor: [249, 250, 251] as [number, number, number],
      textColor: [107, 114, 128] as [number, number, number],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 80, textColor: [107, 114, 128] as [number, number, number] },
      1: { fontStyle: 'bold', textColor: [17, 24, 39] as [number, number, number] },
    },
    body: [
      ['Age',                      String(assessment.age)],
      ['BMI',                      assessment.bmi.toFixed(1)],
      ['Smoker',                   assessment.smoker ? 'Yes' : 'No'],
      ['Alcohol Consumption',      cap(assessment.alcohol_consumption)],
      ['Diet Type',                cap(assessment.diet_type)],
      ['Physical Activity Level',  cap(assessment.physical_activity_level)],
      ['Family Hx Score',          fhDetail ? fhDetail.score_display : (assessment.family_history_score ?? 0).toFixed(2) + ' / 1.00'],
      ...(fhDetail?.relatives?.length ? [['Relatives', fhDetail.relatives.join(', ')]] : []),
      ['Regular Health Checkup',   assessment.regular_health_checkup ? 'Yes' : 'No'],
      ['Prostate Exam Done',       assessment.prostate_exam_done ? 'Yes' : 'No'],
    ],
  })

  y = (doc as any).lastAutoTable.finalY + 10

  // ── Presenting Symptoms ───────────────────────────────────────────────────

  y = maybeNewPage(doc, y, 22 + Math.max(presentingSymptoms.length, 1) * 5, pageH, margin)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(156, 163, 175)
  doc.text(
    `PRESENTING SYMPTOMS${presentingSymptoms.length > 0 ? ` (${presentingSymptoms.length} marked Present)` : ''}`,
    margin,
    y,
  )
  y += 5

  if (presentingSymptoms.length > 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(55, 65, 81)

    for (const symptom of presentingSymptoms) {
      const label = symptom.urgent
        ? `• ${symptom.display}  HIGH PRIORITY`
        : `• ${symptom.display}`
      const lines = doc.splitTextToSize(label, pageW - margin * 2 - 4) as string[]

      if (symptom.urgent) {
        doc.setTextColor(153, 27, 27)
        doc.setFont('helvetica', 'bold')
      } else {
        doc.setTextColor(55, 65, 81)
        doc.setFont('helvetica', 'normal')
      }

      doc.text(lines, margin + 3, y)
      y += lines.length * 4.5 + 1
    }
  } else {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(107, 114, 128)
    doc.text('No presenting symptoms were marked present for this assessment.', margin, y)
    y += 8
  }

  y += 4

  // ── Assessment Summary ────────────────────────────────────────────────────

  y = maybeNewPage(doc, y, 30, pageH, margin)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(156, 163, 175)
  doc.text('ASSESSMENT SUMMARY', margin, y)
  y += 5

  const hasStructured = assessment.summary_text && assessment.summary_text.length > 0

  if (!hasStructured) {
    // Fallback for old records without structured fields
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(55, 65, 81)
    const summaryLines = doc.splitTextToSize(assessment.risk_explanation, pageW - margin * 2) as string[]
    doc.text(summaryLines, margin, y)
    y += summaryLines.length * 4.5 + 8
  } else {
    // Symptom adjustment note
    if (symAdj?.adjustment_applied && baseRisk !== finalRisk) {
      const adjNote = `Note: Base model predicted ${baseRisk.toUpperCase()} Risk. Presenting symptoms elevated the final risk to ${finalRisk.toUpperCase()} Risk.`
      const adjLines = doc.splitTextToSize(adjNote, pageW - margin * 2 - 8) as string[]
      const adjBoxH  = adjLines.length * 4.5 + 8
      doc.setFillColor(255, 251, 235)
      doc.setDrawColor(217, 119, 6)
      doc.setLineWidth(0.3)
      doc.roundedRect(margin, y, pageW - margin * 2, adjBoxH, 2, 2, 'FD')
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(146, 64, 14)
      doc.text(adjLines, margin + 4, y + 5)
      y += adjBoxH + 4
    }

    // Risk statement
    const riskColor = RISK_TEXT_RGB[finalRisk] ?? RISK_TEXT_RGB.High
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...riskColor)
    const riskStmt = `This patient was assessed as ${finalRisk.toUpperCase()} RISK of prostate cancer.`
    const riskStmtLines = doc.splitTextToSize(riskStmt, pageW - margin * 2) as string[]
    doc.text(riskStmtLines, margin, y)
    y += riskStmtLines.length * 5.5 + 4

    // Active risk factors
    if (assessment.active_risk_factors?.length) {
      y = maybeNewPage(doc, y, 10 + assessment.active_risk_factors.length * 5, pageH, margin)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(107, 114, 128)
      doc.text(`Active risk factors (${assessment.active_risk_factors.length} of 4):`, margin, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(153, 27, 27)
      assessment.active_risk_factors.forEach((f, i) => {
        const lines = doc.splitTextToSize(`(${i + 1}) ${f};`, pageW - margin * 2 - 4) as string[]
        doc.text(lines, margin + 3, y)
        y += lines.length * 4.5
      })
      y += 3
    }

    // Protective factors
    if (assessment.protective_factors?.length) {
      y = maybeNewPage(doc, y, 10 + assessment.protective_factors.length * 5, pageH, margin)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(107, 114, 128)
      doc.text('Protective factors:', margin, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(22, 101, 52)
      assessment.protective_factors.forEach((f, i) => {
        const lines = doc.splitTextToSize(`(${i + 1}) ${f}.`, pageW - margin * 2 - 4) as string[]
        doc.text(lines, margin + 3, y)
        y += lines.length * 4.5
      })
      y += 3
    }

    // Closing paragraph
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(55, 65, 81)
    const closingLines = doc.splitTextToSize(assessment.summary_text, pageW - margin * 2) as string[]
    doc.text(closingLines, margin, y)
    y += closingLines.length * 4.5 + 10
  }

  // ── Primary Risk Factors Assessed ─────────────────────────────────────────

  const primaryFactors = [
    {
      label:       'Smoking status',
      active:      assessment.smoker,
      activeText:  'ACTIVE — patient is a smoker',
      safeText:    'Not active (non-smoker)',
    },
    {
      label:       'Family history of prostate cancer',
      active:      assessment.family_history,
      activeText:  'ACTIVE — family history present',
      safeText:    'Not active (no family history)',
    },
    {
      label:       'Regular health checkup attendance',
      active:      !assessment.regular_health_checkup,
      activeText:  'ACTIVE — no regular checkups',
      safeText:    'Not active (attends checkups)',
    },
    {
      label:       'Prior prostate examination',
      active:      !assessment.prostate_exam_done,
      activeText:  'ACTIVE — no prior examination on record',
      safeText:    'Not active (prior examination on record)',
    },
  ]

  const pfActiveCount = primaryFactors.filter(f => f.active).length

  y = maybeNewPage(doc, y, 55, pageH, margin)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(156, 163, 175)
  doc.text(`PRIMARY RISK FACTORS ASSESSED (${pfActiveCount} OF 4 ACTIVE)`, margin, y)
  y += 2

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } },
    columnStyles: {
      0: { cellWidth: 95, textColor: [55, 65, 81] as [number, number, number] },
      1: { fontStyle: 'bold' },
    },
    body: primaryFactors.map(f => [
      f.label,
      {
        content: f.active ? f.activeText : f.safeText,
        styles: {
          textColor: (f.active ? [153, 27, 27] : [22, 101, 52]) as [number, number, number],
        },
      },
    ]),
  })

  y = (doc as any).lastAutoTable.finalY + 10

  // ── Lifestyle & Demographic Factors ───────────────────────────────────────

  if (assessment.lifestyle_factor_notes?.length) {
    y = maybeNewPage(doc, y, 30, pageH, margin)

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(156, 163, 175)
    doc.text('LIFESTYLE & DEMOGRAPHIC FACTORS', margin, y)
    y += 4

    for (const note of assessment.lifestyle_factor_notes) {
      const noteLines  = doc.splitTextToSize(note.clinical_note, pageW - margin * 2 - 8) as string[]
      const boxH       = noteLines.length * 4.2 + 12
      y = maybeNewPage(doc, y, boxH + 4, pageH, margin)

      const increased                          = note.direction === 'Increased risk'
      const bgRgb: [number, number, number]     = increased ? [255, 247, 247] : [247, 254, 250]
      const borderRgb: [number, number, number] = increased ? [254, 202, 202] : [187, 247, 208]
      const labelRgb: [number, number, number]  = increased ? [153, 27,  27]  : [22,  101, 52]

      doc.setFillColor(...bgRgb)
      doc.setDrawColor(...borderRgb)
      doc.setLineWidth(0.3)
      doc.roundedRect(margin, y, pageW - margin * 2, boxH, 2, 2, 'FD')

      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...labelRgb)
      doc.text(note.label, margin + 4, y + 5.5)

      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...labelRgb)
      doc.text(note.direction, pageW - margin - 4, y + 5.5, { align: 'right' })

      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(75, 85, 99)
      doc.text(noteLines, margin + 4, y + 10.5)

      y += boxH + 3
    }
    y += 4
  }

  // ── Key Contributing Factors ──────────────────────────────────────────────

  if (assessment.top_contributing_factors?.length) {
    y = maybeNewPage(doc, y, 40, pageH, margin)

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(156, 163, 175)
    doc.text('KEY CONTRIBUTING FACTORS', margin, y)
    y += 5

    for (let i = 0; i < assessment.top_contributing_factors.length; i++) {
      const factor    = assessment.top_contributing_factors[i]
      const increased = factor.direction === 'Increased risk'

      const bgRgb: [number, number, number]     = increased ? [255, 247, 247] : [247, 254, 250]
      const borderRgb: [number, number, number] = increased ? [254, 202, 202] : [187, 247, 208]
      const accentRgb: [number, number, number] = increased ? [153, 27,  27]  : [22,  101, 52]

      const noteLines = factor.clinical_note
        ? doc.splitTextToSize(factor.clinical_note, pageW - margin * 2 - 8) as string[]
        : []
      const boxH = noteLines.length > 0 ? noteLines.length * 4.2 + 15 : 12

      y = maybeNewPage(doc, y, boxH + 4, pageH, margin)

      doc.setFillColor(...bgRgb)
      doc.setDrawColor(...borderRgb)
      doc.setLineWidth(0.3)
      doc.roundedRect(margin, y, pageW - margin * 2, boxH, 2, 2, 'FD')

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(17, 24, 39)
      doc.text(`${i + 1}. ${factor.factor}`, margin + 4, y + 5.5)

      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...accentRgb)
      doc.text(`${factor.strength} — ${factor.direction}`, pageW - margin - 4, y + 5.5, { align: 'right' })

      if (noteLines.length > 0) {
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(75, 85, 99)
        doc.text(noteLines, margin + 4, y + 11.5)
      }

      y += boxH + 3
    }
    y += 4
  }

  // ── Symptom Adjustment ────────────────────────────────────────────────────

  if (symAdj?.adjustment_applied) {
    y = maybeNewPage(doc, y, 35, pageH, margin)

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(156, 163, 175)
    doc.text('SYMPTOM ADJUSTMENT', margin, y)
    y += 4

    const adjReasonLines = doc.splitTextToSize(symAdj.adjustment_reason, pageW - margin * 2 - 8) as string[]
    const flagCount      = symAdj.urgent_symptom_flags.length
    const adjBoxH        = adjReasonLines.length * 4.5 + (flagCount > 0 ? flagCount * 4.5 + 4 : 0) + 14
    doc.setFillColor(255, 251, 235)
    doc.setDrawColor(217, 119, 6)
    doc.setLineWidth(0.3)
    doc.roundedRect(margin, y, pageW - margin * 2, adjBoxH, 2, 2, 'FD')

    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(146, 64, 14)
    doc.text(adjReasonLines, margin + 4, y + 5)
    let adjY = y + 5 + adjReasonLines.length * 4.5

    doc.setFont('helvetica', 'bold')
    doc.text(`Symptom burden score: ${symAdj.symptom_score.toFixed(2)}`, margin + 4, adjY + 4)
    adjY += 8

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(153, 27, 27)
    for (const flag of symAdj.urgent_symptom_flags) {
      doc.text(`\u26a0 ${flag}`, margin + 4, adjY)
      adjY += 4.5
    }

    y = y + adjBoxH + 6
  }

  // ── Feature Importance Chart ──────────────────────────────────────────────

  const fiEntries = Object.entries(assessment.feature_importances ?? {}).sort(
    (a, b) => b[1] - a[1],
  )

  if (fiEntries.length > 0) {
    const maxFI  = fiEntries[0][1]
    const chartH = fiEntries.length * 8.5 + 22

    y = maybeNewPage(doc, y, chartH, pageH, margin)

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(156, 163, 175)
    doc.text('FEATURE IMPORTANCE', margin, y)
    y += 3

    // Tier legend
    const tiers: { rgb: [number, number, number]; label: string }[] = [
      { rgb: [185, 28, 28],   label: 'Highest' },
      { rgb: [234, 88, 12],   label: 'High' },
      { rgb: [37, 99, 235],   label: 'Moderate' },
      { rgb: [147, 197, 253], label: 'Low' },
    ]
    let lx = margin
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    for (const tier of tiers) {
      doc.setFillColor(...tier.rgb)
      doc.ellipse(lx + 1.5, y + 2, 1.5, 1.5, 'F')
      doc.setTextColor(107, 114, 128)
      doc.text(tier.label, lx + 5, y + 2.8)
      lx += tier.label.length * 2.5 + 8
    }
    y += 6

    y = drawBarChart(
      doc, y, margin, pageW,
      fiEntries.map(([key, val], rank) => ({
        name:  featureLabel(key),
        value: val,
        rgb:   fiBandRgb(rank),
      })),
      maxFI,
      (_v, rank) => fiBandLabel(rank),
      80,
    )
    y += 8
  }

  // ── Clinical Recommendation ───────────────────────────────────────────────

  y = maybeNewPage(doc, y, 40, pageH, margin)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(156, 163, 175)
  doc.text('CLINICAL RECOMMENDATION', margin, y)
  y += 4

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(55, 65, 81)
  const recLines = doc.splitTextToSize(assessment.clinical_recommendation, pageW - margin * 2) as string[]
  doc.text(recLines, margin, y)
  y += recLines.length * 4.5 + 8

  // Disclaimer box
  const disclaimerText =
    'DISCLAIMER: This is a clinical decision support tool only. It does not diagnose prostate cancer. ' +
    'Final clinical decisions rest with the attending health worker.'
  const disclaimerLines = doc.splitTextToSize(disclaimerText, pageW - margin * 2 - 8) as string[]
  const disclaimerH     = disclaimerLines.length * 4.5 + 8

  y = maybeNewPage(doc, y, disclaimerH + 10, pageH, margin)

  doc.setFillColor(255, 251, 235)
  doc.setDrawColor(217, 119, 6)
  doc.setLineWidth(0.4)
  doc.roundedRect(margin, y, pageW - margin * 2, disclaimerH, 2, 2, 'FD')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(146, 64, 14)
  doc.text(disclaimerLines, margin + 4, y + 5)

  // ── Footer on every page ──────────────────────────────────────────────────

  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    const footerY = pageH - 10
    doc.setDrawColor(229, 231, 235)
    doc.setLineWidth(0.3)
    doc.line(margin, footerY - 5, pageW - margin, footerY - 5)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(156, 163, 175)
    doc.text(
      `Generated by ProxaScreen · Assessment ID: ${assessment.id}${totalPages > 1 ? ` · Page ${p} of ${totalPages}` : ''}`,
      pageW / 2,
      footerY,
      { align: 'center' },
    )
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  const datePart = new Date(assessment.created_at).toISOString().slice(0, 10)
  doc.save(`ProxaScreen_${patient.patient_number}_${datePart}.pdf`)
}

