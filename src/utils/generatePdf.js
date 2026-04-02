import { jsPDF } from 'jspdf';

/**
 * Generates a Medical Report (Laudo/Prontuário) PDF in base64 format.
 *
 * @param {Object} data
 * @param {string} data.patientName
 * @param {string} data.date
 * @param {string} data.time
 * @param {string} data.professionalName
 * @param {string[]} data.procedures
 * @param {string} data.nextSteps
 * @param {string} data.evolutionText
 * @returns {Promise<string>} Base64 string without data URI prefix (ready for Feegow API)
 */
export async function generateEvolutionPdfBase64({
    patientName,
    date,
    time,
    professionalName,
    procedures = [],
    nextSteps = '',
    evolutionText = '',
}) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new jsPDF();
            const margin = 20;
            let y = margin;
            const pageWidth = doc.internal.pageSize.getWidth();

            // Set Title
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Evolução de Atendimento', pageWidth / 2, y, { align: 'center' });
            y += 15;

            // Set Meta Info
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');

            // Helper to add lines safely
            const addLine = (label, value) => {
                doc.setFont('helvetica', 'bold');
                doc.text(`${label}: `, margin, y);
                const labelWidth = doc.getTextWidth(`${label}: `);
                doc.setFont('helvetica', 'normal');

                // Wrap text if too long
                const textLines = doc.splitTextToSize(value || 'Não informado', pageWidth - margin * 2 - labelWidth);
                doc.text(textLines, margin + labelWidth, y);
                y += (textLines.length * 6);
            };

            addLine('Paciente', patientName);
            addLine('Data/Hora', `${date} às ${time}`);
            if (professionalName) {
                addLine('Profissional', professionalName);
            }
            y += 5;

            // Procedures
            if (procedures && procedures.length > 0) {
                addLine('Procedimentos', procedures.join(', '));
            } else {
                addLine('Procedimentos', 'Consulta/Avaliação');
            }
            y += 10;

            // Divider
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, y - 5, pageWidth - margin, y - 5);

            // Evolution Notes Title
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text('Observações / Notas da Evolução', margin, y);
            y += 8;

            // Evolution Notes Content
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            const evoText = evolutionText.trim() === '' ? 'Nenhuma observação registrada.' : evolutionText;
            const splitEvo = doc.splitTextToSize(evoText, pageWidth - margin * 2);

            // Check page break
            if (y + (splitEvo.length * 6) > doc.internal.pageSize.getHeight() - margin) {
                doc.addPage();
                y = margin;
            }

            doc.text(splitEvo, margin, y);
            y += (splitEvo.length * 6) + 10;

            // Next Steps
            if (nextSteps && nextSteps.trim() !== '') {
                // Check page break
                if (y + 20 > doc.internal.pageSize.getHeight() - margin) {
                    doc.addPage();
                    y = margin;
                }
                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                doc.text('Próximos Passos', margin, y);
                y += 8;

                doc.setFontSize(11);
                doc.setFont('helvetica', 'normal');
                const splitNext = doc.splitTextToSize(nextSteps, pageWidth - margin * 2);
                doc.text(splitNext, margin, y);
            }

            // Generate Output
            const dataUri = doc.output('datauristring');

            // Expected by Feegow is JUST the base64, without the "data:application/pdf;base64," prefix.
            let base64 = dataUri;
            if (dataUri.includes(',')) {
                base64 = dataUri.split(',')[1];
            }

            resolve(base64);
        } catch (error) {
            reject(error);
        }
    });
}
