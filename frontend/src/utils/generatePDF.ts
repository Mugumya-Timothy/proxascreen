import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import type { Assessment, Patient } from '../types'

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

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function generateAssessmentPDF(
  assessment: Assessment,
  patient: Patient,
  clinicianName: string,
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW  = doc.internal.pageSize.getWidth()
  const pageH  = doc.internal.pageSize.getHeight()
  const margin = 14
  let y = 18

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

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(156, 163, 175)
  doc.text('RISK ASSESSMENT RESULT', margin, y)
  y += 3

  const riskTextRgb = RISK_TEXT_RGB[assessment.risk_level]
  const riskBgRgb   = RISK_BG_RGB[assessment.risk_level]

  doc.setFillColor(...riskBgRgb)
  doc.roundedRect(margin, y, pageW - margin * 2, 14, 3, 3, 'F')
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...riskTextRgb)
  doc.text(`${assessment.risk_level} Risk`, pageW / 2, y + 9.5, { align: 'center' })
  y += 22

  // ── Probability Breakdown ──────────────────────────────────────────────────

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(156, 163, 175)
  doc.text('PROBABILITY BREAKDOWN', margin, y)
  y += 2

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [249, 250, 251] as [number, number, number],
      textColor: [107, 114, 128] as [number, number, number],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 65 },
      1: { halign: 'right', fontStyle: 'bold' },
    },
    head: [['Category', 'Probability']],
    body: [
      ['Low Risk',    `${assessment.low_percentage.toFixed(1)}%`],
      ['Medium Risk', `${assessment.medium_percentage.toFixed(1)}%`],
      ['High Risk',   `${assessment.high_percentage.toFixed(1)}%`],
    ],
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const colours: [number, number, number][] = [
          [22, 101, 52],
          [146, 64, 14],
          [153, 27, 27],
        ]
        data.cell.styles.textColor = colours[data.row.index]
      }
    },
  })

  y = (doc as any).lastAutoTable.finalY + 10

  // ── Clinical Inputs ────────────────────────────────────────────────────────

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
      ['Diet Type',                cap(assessment.diet_type)],
      ['Physical Activity Level',  cap(assessment.physical_activity_level)],
      ['Family History',           assessment.family_history ? 'Yes' : 'No'],
      ['Regular Health Checkup',   assessment.regular_health_checkup ? 'Yes' : 'No'],
      ['Prostate Exam Done',       assessment.prostate_exam_done ? 'Yes' : 'No'],
    ],
  })

  // ── Footer ────────────────────────────────────────────────────────────────

  const footerY = pageH - 10
  doc.setDrawColor(229, 231, 235)
  doc.setLineWidth(0.3)
  doc.line(margin, footerY - 5, pageW - margin, footerY - 5)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(156, 163, 175)
  doc.text(
    `Generated by ProxaScreen · Assessment ID: ${assessment.id}`,
    pageW / 2,
    footerY,
    { align: 'center' },
  )

  // ── Save ──────────────────────────────────────────────────────────────────

  const datePart = new Date(assessment.created_at).toISOString().slice(0, 10)
  doc.save(`ProxaScreen_${patient.patient_number}_${datePart}.pdf`)
}
