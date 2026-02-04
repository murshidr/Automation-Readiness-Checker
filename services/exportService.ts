import { AssessmentSession } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToCSV(session: AssessmentSession): void {
  const rows: string[][] = [
    ['Task Name', 'Department', 'Description', 'Frequency', 'Time (min)', 'Score', 'Category', 'Reasoning', 'Inputs', 'Outputs', 'Suggested Tools']
  ];

  for (const task of session.tasks) {
    const score = session.scores[task.id];
    const scoreRow: string[] = score
      ? [
        task.name,
        task.department,
        `"${(task.description || '').replace(/"/g, '""')}"`,
        task.frequency,
        String(task.timePerTask),
        String(score.finalScore),
        score.category,
        `"${(score.reasoning || '').replace(/"/g, '""')}"`,
        task.inputs.join('; '),
        task.outputs.join('; '),
        score.suggestedTools.map(t => `${t.name}: ${t.explanation}`).join('; ')
      ]
      : [task.name, task.department, `"${(task.description || '').replace(/"/g, '""')}"`, task.frequency, String(task.timePerTask), '', '', '', task.inputs.join('; '), task.outputs.join('; '), ''];
    rows.push(scoreRow);
  }

  const csv = rows.map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `automation-readiness-report-${date}.csv`);
}

export function exportToPDF(session: AssessmentSession): void {
  const doc = new jsPDF();

  doc.text('Automation Readiness Report', 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 22);

  const tableRows = session.tasks.map(task => {
    const score = session.scores[task.id];
    return [
      task.name,
      score ? `${score.finalScore}/100\n(${score.category})` : 'N/A',
      score ? `${score.reasoning}\n\nInstructions:\n${score.automationAdvice || 'No specific advice available.'}` : 'Not analyzed'
    ];
  });

  autoTable(doc, {
    startY: 30,
    head: [['Task Name', 'Feasibility', 'AI Summary & Instructions']],
    body: tableRows,
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 40 },
      2: { cellWidth: 'auto' }
    }
  });

  doc.save(`automation-readiness-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportToJSON(session: AssessmentSession): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    session: {
      token: session.token,
      createdAt: session.createdAt,
      tasks: session.tasks,
      scores: session.scores
    }
  };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `automation-readiness-report-${date}.json`);
}
