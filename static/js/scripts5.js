/**
 * ฟังก์ชันสำหรับสร้างรายงาน (PDF หรือ DOCX)
 * @param {string} format - รูปแบบไฟล์ (pdf, docx)
 */
function generateReport(format) {
    // แสดง Loading Overlay
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
    
    // ตรวจสอบว่ามีข้อมูลที่เลือกหรือไม่
    const selectedRows = document.querySelectorAll('#history-body tr.selected-row');
    if (selectedRows.length === 0) {
        alert('กรุณาเลือกข้อมูลอย่างน้อย 1 รายการก่อนสร้างรายงาน');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        return;
    }
    
    // ตรวจสอบว่ามีกราฟหรือไม่
    const chartCanvas = document.getElementById('riskChart');
    if (!chartCanvas || chartCanvas.style.display === 'none' || document.getElementById('chart-container').style.display === 'none') {
        alert('กรุณาสร้างกราฟก่อนสร้างรายงาน (เลือกข้อมูลอย่างน้อย 1 รายการและคลิก Select)');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        return;
    }
    
    // เตรียมข้อมูลจากแถวที่เลือก
    const selectedData = [];
    selectedRows.forEach(row => {
        const cells = row.querySelectorAll('td:not(:last-child)');
        const rowData = {
            datetime: cells[0].textContent.trim(),
            bedId: cells[1].textContent.trim(),
            age: cells[2].textContent.trim(),
            sex: cells[3].textContent.trim(),
            prediction: cells[4].textContent.trim(),
            risk: cells[5].textContent.trim()
        };
        selectedData.push(rowData);
    });
    
    // สร้าง timestamp สำหรับชื่อไฟล์
    const timestamp = new Date().toISOString().slice(0, 10);
    
    // สร้างรายงานตามรูปแบบที่เลือก
    if (format === 'pdf') {
        generatePDFReport(selectedData, chartCanvas, timestamp);
    } else if (format === 'docx') {
        generateDOCXReport(selectedData, chartCanvas, timestamp);
    }
}

/**
 * สร้างรายงาน PDF
 * @param {Array} data - ข้อมูลที่เลือก
 * @param {HTMLCanvasElement} chart - Canvas ของกราฟ
 * @param {string} timestamp - วันที่สำหรับชื่อไฟล์
 */
// แก้ไขฟังก์ชัน generatePDFReport เพื่อรวมข้อมูลการเปลี่ยนแปลงความเสี่ยง
function generatePDFReport(data, chart, timestamp) {
    try {
        console.log('Starting PDF report generation...');
        
        // ตรวจสอบว่ามี jsPDF และ AutoTable
        if (typeof window.jspdf === 'undefined') {
            throw new Error('jsPDF library not loaded!');
        }
        
        // สร้าง PDF ในแนวนอน
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        
        // ตรวจสอบว่ามี autoTable
        if (typeof pdf.autoTable !== 'function') {
            throw new Error('jsPDF-AutoTable plugin not loaded! Cannot create tables in PDF.');
        }
        
        console.log('Creating PDF with size:', pdf.internal.pageSize.getWidth(), 'x', pdf.internal.pageSize.getHeight());
        
        // กำหนดขนาดหน้ากระดาษ
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        
        // เพิ่มหัวข้อรายงาน (ภาษาอังกฤษเพื่อป้องกันปัญหาฟอนต์)
        pdf.setFontSize(18);
        pdf.text('Risk Prediction Report', pageWidth / 2, margin + 10, { align: 'center' });
        pdf.setFontSize(12);
        pdf.text(`Report Date: ${new Date().toLocaleDateString('en-US')}`, pageWidth / 2, margin + 20, { align: 'center' });
        
        // สร้าง canvas ชั่วคราวสำหรับกราฟ (พื้นหลังสีขาว)
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = chart.width;
        tempCanvas.height = chart.height;
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(chart, 0, 0);
        
        console.log('Chart dimensions:', chart.width, 'x', chart.height);
        
        // คำนวณอัตราส่วนภาพที่ถูกต้อง
        const chartAspectRatio = chart.width / chart.height;
        const chartWidth = pageWidth - (margin * 2);
        const chartHeight = chartWidth / chartAspectRatio;
        
        console.log('Calculated chart dimensions for PDF:', chartWidth, 'x', chartHeight);
        
        // เพิ่มกราฟลงใน PDF (รักษาอัตราส่วนภาพต้นฉบับ)
        const chartImageData = tempCanvas.toDataURL('image/jpeg', 1.0);
        pdf.text('Risk Comparison Chart', pageWidth / 2, margin + 30, { align: 'center' });
        pdf.addImage(chartImageData, 'JPEG', margin, margin + 35, chartWidth, chartHeight);
        
        // เพิ่มตารางข้อมูล (คำนวณตำแหน่ง Y ใหม่ตามความสูงของกราฟ)
        const tableTop = margin + 35 + chartHeight + 10;
        pdf.text('Selected Patient Data', pageWidth / 2, tableTop, { align: 'center' });
        
        // สร้างข้อมูลสำหรับตาราง (เพิ่ม Risk Level)
        const tableData = data.map(row => {
            const riskValue = parseFloat(row.risk);
            const riskLevel = getRiskLevel(riskValue);
            return [
                row.datetime,
                row.bedId,
                row.age,
                row.sex,
                row.prediction,
                row.risk,
                riskLevel
            ];
        });
        
        console.log('Creating table in PDF with autoTable...');
        
        // สร้างตารางข้อมูลผู้ป่วย
        pdf.autoTable({
            startY: tableTop + 5,
            head: [['Datetime', 'Bed ID', 'Age', 'Sex', 'Prediction', 'Risk (%)', 'Risk Level']],
            body: tableData,
            theme: 'grid',
            styles: {
                fontSize: 10
            },
            headStyles: {
                fillColor: [106, 13, 173],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [240, 240, 240]
            },
            margin: { left: margin, right: margin }
        });
        
        // หาตำแหน่ง Y สำหรับตารางถัดไป
        const firstTableEndY = pdf.lastAutoTable.finalY || (tableTop + 30 + (tableData.length * 10));
        
        // เพิ่มตารางข้อมูลการเปลี่ยนแปลงความเสี่ยง (ถ้ามี)
        if (window.riskChangeData && window.riskChangeData.length > 0) {
            // หัวข้อตาราง
            pdf.text('Risk Change Summary', pageWidth / 2, firstTableEndY + 10, { align: 'center' });
            
            // สร้างข้อมูลสำหรับตาราง
            const riskChangeTableData = window.riskChangeData.map(change => {
                const timeMinutes = getTimeDifferenceInMinutes(change.fromDate, change.toDate);
                const fromDateStr = change.fromDate.toLocaleString('en-US');
                const toDateStr = change.toDate.toLocaleString('en-US');
                
                return [
                    change.bedID,
                    fromDateStr,
                    toDateStr,
                    timeMinutes.toString(),
                    change.fromRisk.toFixed(2),
                    change.toRisk.toFixed(2),
                    (change.diff > 0 ? '+' : '') + change.diff.toFixed(2)
                ];
            });
            
            // สร้างตารางข้อมูลการเปลี่ยนแปลงความเสี่ยง
            pdf.autoTable({
                startY: firstTableEndY + 15,
                head: [['Bed ID', 'Start Time', 'End Time', 'Duration (min)', 'Start Risk (%)', 'End Risk (%)', 'Change (%)']],
                body: riskChangeTableData,
                theme: 'grid',
                styles: {
                    fontSize: 8
                },
                headStyles: {
                    fillColor: [106, 13, 173],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold'
                },
                alternateRowStyles: {
                    fillColor: [240, 240, 240]
                },
                margin: { left: margin, right: margin }
            });
        }
        
        // ตำแหน่ง Y สุดท้าย
        const finalY = pdf.lastAutoTable.finalY || firstTableEndY + 10;
        
        // เพิ่มหมายเหตุ
        pdf.setFontSize(10);
        pdf.text('* This report was generated by SHOCK PREDICT system', margin, finalY + 10);
        
        // เพิ่มเลขหน้า
        pdf.setFontSize(10);
        pdf.text(`Page 1`, pageWidth - 15, pageHeight - 10);
        
        // บันทึก PDF
        pdf.save(`shock-predict-report-${timestamp}.pdf`);
        console.log('PDF report created successfully');
        
        // ซ่อน Loading Overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    } catch (e) {
        console.error('Error generating PDF report:', e);
        alert('เกิดข้อผิดพลาดในการสร้างรายงาน PDF: ' + e.message);
        
        // ซ่อน Loading Overlay ในกรณีที่เกิดข้อผิดพลาด
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
}

/**
 * สร้างรายงาน DOCX
 * @param {Array} data - ข้อมูลที่เลือก
 * @param {HTMLCanvasElement} chart - Canvas ของกราฟ
 * @param {string} timestamp - วันที่สำหรับชื่อไฟล์
 */
function generateDOCXReport(data, chart, timestamp) {
    try {
        console.log('Starting DOCX report generation...');
        
        // ตรวจสอบว่ามี docx.js
        if (typeof window.docx === 'undefined') {
            throw new Error('docx.js library not loaded!');
        }
        
        console.log('docx library available:', window.docx);
        
        // สร้าง canvas ชั่วคราวสำหรับกราฟ (พื้นหลังสีขาว)
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = chart.width;
        tempCanvas.height = chart.height;
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(chart, 0, 0);
        
        // แปลง canvas เป็น base64 image
        const chartImageData = tempCanvas.toDataURL('image/png').replace('data:image/png;base64,', '');
        
        // เตรียมเนื้อหาเอกสาร
        const {
            Document,
            Paragraph,
            TextRun,
            AlignmentType,
            HeadingLevel,
            Table,
            TableRow,
            TableCell,
            BorderStyle,
            WidthType,
            ImageRun
        } = window.docx;
        
        console.log('Creating DOCX document with components...');
        
        // กำหนดสไตล์ขอบตาราง
        const tableBorders = {
            top: { style: BorderStyle.SINGLE, size: 1, color: "7F7F7F" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "7F7F7F" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "7F7F7F" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "7F7F7F" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "7F7F7F" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "7F7F7F" }
        };
        
        // สร้างส่วนหัวของตาราง (เพิ่ม Risk Level)
        const tableHeaders = new TableRow({
            tableHeader: true,
            children: [
                new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    shading: { fill: "6A0DAD", color: "6A0DAD" },
                    children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "วันที่เวลา", bold: true, color: "FFFFFF" })]
                    })]
                }),
                new TableCell({
                    width: { size: 10, type: WidthType.PERCENTAGE },
                    shading: { fill: "6A0DAD", color: "6A0DAD" },
                    children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "เตียง", bold: true, color: "FFFFFF" })]
                    })]
                }),
                new TableCell({
                    width: { size: 10, type: WidthType.PERCENTAGE },
                    shading: { fill: "6A0DAD", color: "6A0DAD" },
                    children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "อายุ", bold: true, color: "FFFFFF" })]
                    })]
                }),
                new TableCell({
                    width: { size: 10, type: WidthType.PERCENTAGE },
                    shading: { fill: "6A0DAD", color: "6A0DAD" },
                    children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "เพศ", bold: true, color: "FFFFFF" })]
                    })]
                }),
                new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    shading: { fill: "6A0DAD", color: "6A0DAD" },
                    children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "ผลทำนาย", bold: true, color: "FFFFFF" })]
                    })]
                }),
                new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    shading: { fill: "6A0DAD", color: "6A0DAD" },
                    children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "ความเสี่ยง (%)", bold: true, color: "FFFFFF" })]
                    })]
                }),
                new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    shading: { fill: "6A0DAD", color: "6A0DAD" },
                    children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "ระดับความเสี่ยง", bold: true, color: "FFFFFF" })]
                    })]
                })
            ]
        });
        
        // สร้างแถวข้อมูล
        const tableRows = data.map((row, index) => {
            const shading = index % 2 === 0 ? { fill: "F0F0F0", color: "F0F0F0" } : { fill: "FFFFFF", color: "FFFFFF" };
            const riskValue = parseFloat(row.risk);
            const riskLevel = getRiskLevel(riskValue);
            
            // เลือกสีสำหรับระดับความเสี่ยง
            let riskColor = "000000"; // สีดำเป็นค่าเริ่มต้น
            if (riskValue <= 20) {
                riskColor = "28A745"; // สีเขียวเข้ม
            } else if (riskValue <= 50) {
                riskColor = "5CB85C"; // สีเขียวอ่อน
            } else if (riskValue <= 80) {
                riskColor = "FFC107"; // สีเหลือง
            } else {
                riskColor = "DC3545"; // สีแดง
            }
            
            return new TableRow({
                children: [
                    new TableCell({
                        shading,
                        children: [new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: row.datetime })]
                        })]
                    }),
                    new TableCell({
                        shading,
                        children: [new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: row.bedId })]
                        })]
                    }),
                    new TableCell({
                        shading,
                        children: [new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: row.age })]
                        })]
                    }),
                    new TableCell({
                        shading,
                        children: [new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: row.sex })]
                        })]
                    }),
                    new TableCell({
                        shading,
                        children: [new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: row.prediction })]
                        })]
                    }),
                    new TableCell({
                        shading,
                        children: [new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: row.risk })]
                        })]
                    }),
                    new TableCell({
                        shading,
                        children: [new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: riskLevel, color: riskColor, bold: true })]
                        })]
                    })
                ]
            });
        });
        
        console.log('Creating document structure...');
        
        // สร้างเอกสาร Word
        const doc = new Document({
            sections: [
                {
                    properties: { 
                        page: {
                            size: {
                                orientation: "landscape"
                            }
                        }
                    },
                    children: [
                        // หัวข้อรายงาน
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            heading: HeadingLevel.HEADING_1,
                            children: [
                                new TextRun({
                                    text: "รายงานการทำนายความเสี่ยง (Risk Prediction Report)",
                                    bold: true,
                                    size: 32
                                })
                            ]
                        }),
                        
                        // วันที่สร้างรายงาน
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({
                                    text: `วันที่สร้างรายงาน: ${new Date().toLocaleDateString('th-TH')}`,
                                    size: 24
                                })
                            ]
                        }),
                        
                        // เว้นบรรทัด
                        new Paragraph({}),
                        
                        // หัวข้อกราฟ
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            heading: HeadingLevel.HEADING_2,
                            children: [
                                new TextRun({
                                    text: "กราฟเปรียบเทียบความเสี่ยง (Risk Comparison)",
                                    bold: true,
                                    size: 28
                                })
                            ]
                        }),
                        
                        // กราฟ
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new ImageRun({
                                    data: chartImageData,
                                    transformation: {
                                        width: 600,
                                        height: 300
                                    }
                                })
                            ]
                        }),
                        
                        // เว้นบรรทัด
                        new Paragraph({}),
                        
                        // หัวข้อตาราง
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            heading: HeadingLevel.HEADING_2,
                            children: [
                                new TextRun({
                                    text: "ข้อมูลผู้ป่วยที่เลือก",
                                    bold: true,
                                    size: 28
                                })
                            ]
                        }),
                        
                        // ตารางข้อมูล
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: tableBorders,
                            rows: [tableHeaders, ...tableRows]
                        }),
                        
                        // เว้นบรรทัด
                        new Paragraph({}),
                        
                        // หมายเหตุ
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "* รายงานนี้สร้างโดยระบบ SHOCK PREDICT",
                                    size: 20,
                                    italics: true
                                })
                            ]
                        })
                    ]
                }
            ]
        });
        
        console.log('Packing document to blob...');
        
        // แปลงเอกสารเป็น Blob และบันทึก
        window.docx.Packer.toBlob(doc).then(blob => {
            console.log('DOCX blob created:', blob);
            saveAs(blob, `shock-predict-report-${timestamp}.docx`);
            console.log('DOCX report created successfully');
            
            // ซ่อน Loading Overlay
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
        }).catch(error => {
            console.error('Error in docx.Packer.toBlob:', error);
            alert('เกิดข้อผิดพลาดในการสร้างไฟล์ DOCX: ' + error.message);
            
            // ซ่อน Loading Overlay
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
        });
    } catch (error) {
        console.error('Error generating DOCX report:', error);
        alert('เกิดข้อผิดพลาดในการสร้างรายงาน DOCX: ' + error.message);
        
        // ซ่อน Loading Overlay ในกรณีที่เกิดข้อผิดพลาด
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
}

// เก็บข้อมูลว่าได้เพิ่ม Event Listener แล้วหรือยัง เพื่อป้องกันการทำงานซ้ำซ้อน
let listenersInitialized = false;

// เมื่อโหลด DOM เสร็จสมบูรณ์
document.addEventListener('DOMContentLoaded', function() {
    // ป้องกันการทำงานซ้ำซ้อน
    if (listenersInitialized) {
        console.log('Event listeners already initialized, skipping...');
        return;
    }
    
    console.log('Initializing export functionality...');
    
    // ตรวจสอบว่ามีปุ่ม Export CSV หรือไม่
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) {
        // ลบ onclick ที่อาจมีอยู่ก่อนเพื่อป้องกันการทำงานซ้ำซ้อน
        exportCsvBtn.removeAttribute('onclick');
        // เพิ่ม Event Listener
        exportCsvBtn.addEventListener('click', function(e) {
            e.preventDefault(); // ป้องกันการทำงานซ้ำซ้อน
            console.log('Export CSV button clicked');
            exportTableToCSV();
        });
    }
    
    // ตรวจสอบปุ่ม Export กราฟ
    document.querySelectorAll('.export-buttons button').forEach(button => {
        // ลบ onclick ที่อาจมีอยู่ก่อนเพื่อป้องกันการทำงานซ้ำซ้อน
        button.removeAttribute('onclick');
        
        button.addEventListener('click', function(e) {
            e.preventDefault(); // ป้องกันการทำงานซ้ำซ้อน
            const format = this.getAttribute('data-format') || this.textContent.toLowerCase();
            console.log(`Export ${format} button clicked`);
            exportChart(format);
        });
    });
    
    // เพิ่ม Event Listener สำหรับปุ่ม Report
    const pdfReportBtn = document.getElementById('pdfReportBtn');
    if (pdfReportBtn) {
        pdfReportBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('PDF Report button clicked');
            generateReport('pdf');
        });
    }
    
    const docxReportBtn = document.getElementById('docxReportBtn');
    if (docxReportBtn) {
        docxReportBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('DOCX Report button clicked');
            generateReport('docx');
        });
    }
    
    // ตรวจสอบว่าไลบรารีที่จำเป็นโหลดแล้วหรือไม่
    checkRequiredLibraries();
    
    // กำหนดให้ไม่ต้องเพิ่ม listeners อีก
    listenersInitialized = true;
    console.log('Export functionality initialized successfully');
});

/**
 * ตรวจสอบว่าไลบรารีที่จำเป็นถูกโหลดแล้วหรือไม่
 */
function checkRequiredLibraries() {
    // ตรวจสอบ FileSaver.js
    if (typeof saveAs === 'undefined') {
        console.error('FileSaver.js not loaded! CSV export will not work.');
        const exportCsvBtn = document.getElementById('exportCsvBtn');
        if (exportCsvBtn) {
            exportCsvBtn.disabled = true;
            exportCsvBtn.title = 'FileSaver.js ไม่ถูกโหลด ไม่สามารถส่งออก CSV ได้';
        }
    }
    
    // ตรวจสอบ jsPDF
    if (typeof window.jspdf === 'undefined') {
        console.warn('jsPDF not loaded! PDF export will be disabled.');
        const pdfButtons = Array.from(document.querySelectorAll('.export-buttons button[data-format="pdf"], #pdfReportBtn'));
        pdfButtons.forEach(btn => {
            btn.disabled = true;
            btn.title = 'jsPDF ไม่ถูกโหลด ไม่สามารถส่งออกเป็น PDF ได้';
        });
    }
    
    // ตรวจสอบฟอนต์ภาษาไทย
    if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined') {
        try {
            const pdf = new window.jspdf.jsPDF();
            // ลองโหลดฟอนต์ THSarabun
            if (typeof pdf.addFont === 'function') {
                console.log('Checking Thai fonts...');
            }
        } catch (e) {
            console.warn('Error checking Thai fonts:', e);
        }
    }
    
    // ตรวจสอบ jsPDF-AutoTable
    if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined') {
        const pdf = new window.jspdf.jsPDF();
        if (typeof pdf.autoTable === 'undefined') {
            console.warn('jsPDF-AutoTable not loaded! PDF report will be disabled.');
            const pdfReportBtn = document.getElementById('pdfReportBtn');
            if (pdfReportBtn) {
                pdfReportBtn.disabled = true;
                pdfReportBtn.title = 'jsPDF-AutoTable ไม่ถูกโหลด ไม่สามารถสร้างรายงาน PDF ได้';
            }
        }
    }
    
    // ตรวจสอบ docx.js (สำหรับรายงาน DOCX)
    if (typeof window.docx === 'undefined') {
        console.warn('docx.js not loaded! DOCX export will be disabled.');
        const docxReportBtn = document.getElementById('docxReportBtn');
        if (docxReportBtn) {
            docxReportBtn.disabled = true;
            docxReportBtn.title = 'docx.js ไม่ถูกโหลด ไม่สามารถส่งออกเป็น DOCX ได้';
        }
    } else {
        console.log('docx.js loaded successfully:', window.docx);
    }
}

/**
 * ฟังก์ชันสำหรับ Export ตารางเป็นไฟล์ CSV
 */
function exportTableToCSV() {
    console.log('Starting CSV export...');
    
    // เก็บข้อมูลตารางที่กำลังแสดงอยู่ (หลังจากการกรอง)
    const rows = document.querySelectorAll('#history-body tr:not([style*="display: none"])');
    
    if (rows.length === 0) {
        alert('ไม่มีข้อมูลที่จะส่งออก');
        return;
    }
    
    // สร้าง header สำหรับ CSV (เพิ่ม Risk Level)
    let csvContent = 'Datetime,BedID,Age,Sex,Prediction,Risk (%),Risk Level\n';
    
    // เพิ่มข้อมูลแต่ละแถว
    rows.forEach(row => {
        // ดึงข้อมูลจากแต่ละ cell ยกเว้น cell สุดท้ายที่เป็นปุ่ม select
        const cells = row.querySelectorAll('td:not(:last-child)');
        let rowData = [];
        
        cells.forEach(cell => {
            // จัดการข้อมูลที่มี comma โดยใส่ double quote ครอบ
            let cellData = cell.textContent.trim();
            if (cellData.includes(',')) {
                cellData = `"${cellData}"`;
            }
            rowData.push(cellData);
        });
        
        csvContent += rowData.join(',') + '\n';
    });
    
    // สร้างและดาวน์โหลดไฟล์ CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = `shock-predict-history-${new Date().toISOString().slice(0, 10)}.csv`;
    console.log(`Saving CSV as: ${fileName}`);
    saveAs(blob, fileName);
}
/**
 * ฟังก์ชันสำหรับ Export กราฟเป็นรูปภาพหรือ PDF
 * @param {string} format - รูปแบบไฟล์ (png, jpeg, pdf)
 */
function exportChart(format) {
    console.log(`Starting chart export as ${format}...`);
    
    const originalCanvas = document.getElementById('riskChart');
    
    if (!originalCanvas) {
        alert('ไม่พบกราฟที่จะส่งออก');
        return;
    }
    
    // สร้าง canvas ชั่วคราวที่มีพื้นหลังสีขาว
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    // กำหนดขนาดให้เท่ากับ canvas ต้นฉบับ
    tempCanvas.width = originalCanvas.width;
    tempCanvas.height = originalCanvas.height;
    
    // วาดพื้นหลังสีขาว
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // วาดเนื้อหาจาก canvas ต้นฉบับลงบน canvas ชั่วคราว
    tempCtx.drawImage(originalCanvas, 0, 0);
    
    // ชื่อไฟล์พื้นฐาน
    const baseFileName = `risk-comparison-${new Date().toISOString().slice(0, 10)}`;
    
    if (format === 'pdf') {
        // ส่งออกเป็น PDF ด้วย jsPDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        
        // คำนวณขนาดกระดาษ A4 landscape
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // คำนวณขนาดของกราฟเพื่อให้พอดีกับหน้ากระดาษ
        const margin = 10; // margin รอบๆ
        const imageWidth = pageWidth - (margin * 2);
        const imageHeight = pageHeight - (margin * 2);
        
        // แปลง canvas ชั่วคราวเป็น base64 image
        const imageData = tempCanvas.toDataURL('image/jpeg', 1.0);
        
        // เพิ่มภาพลงใน PDF
        pdf.text('Risk Comparison Chart', margin, margin);
        pdf.addImage(imageData, 'JPEG', margin, margin + 10, imageWidth, imageHeight - 10);
        
        // บันทึก PDF
        console.log(`Saving PDF as: ${baseFileName}.pdf`);
        pdf.save(`${baseFileName}.pdf`);
    } else {
        // ส่งออกเป็นรูปภาพ (PNG หรือ JPEG)
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const dataUrl = tempCanvas.toDataURL(mimeType, 1.0);
        
        // สร้าง link ชั่วคราวและคลิกเพื่อดาวน์โหลด
        const link = document.createElement('a');
        link.download = `${baseFileName}.${format}`;
        link.href = dataUrl;
        console.log(`Saving image as: ${baseFileName}.${format}`);
        link.click();
    }
}

