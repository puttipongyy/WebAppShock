// ✅ ดึงข้อมูลจาก URL
const urlParams = new URLSearchParams(window.location.search);
const encodedData = urlParams.get('data');
let selectMode = false; // flag for select mode
let selectedRows = []; 

// ✅ ดึงข้อมูลจาก URL
try {
    const data = JSON.parse(decodeURIComponent(encodedData));

    const tableBody = document.getElementById('result-body');

    data.forEach(entry => {
        const row = document.createElement("tr");
        row.dataset.entry = JSON.stringify(entry);

        row.innerHTML = `
            <td>${entry.Datetime}</td>
            <td>${entry.BedID}</td>
            <td>${entry.Age}</td>
            <td>${entry.Sex}</td>
            <td>${entry.Prediction}</td>
            <td>${parseFloat(entry.Risk).toFixed(2)}</td>
            <td><input type="checkbox" onclick="toggleRowSelection(this, this.closest('tr'), ${JSON.stringify(entry)})" style="display:none;" /></td>
        `;

        tableBody.appendChild(row);
    });

} catch (error) {
    console.error("Error parsing JSON:", error);
}

document.getElementById("result-body").addEventListener("click", function (event) {
    const checkbox = event.target.closest('input[type="checkbox"]');
    if (!checkbox) return;

    const row = checkbox.closest("tr");
    const entry = JSON.parse(row.dataset.entry);
    toggleRowSelection(checkbox, row, entry);
});


function toggleSelectMode() {
    selectMode = !selectMode;
    let rows = document.querySelectorAll("#result-body tr");
    let chartContainer = document.getElementById("chart-container");

    // แสดงหรือซ่อน checkbox และ chart-container
    rows.forEach(row => {
        const checkbox = row.querySelector("input[type='checkbox']");
        if (selectMode) {
            checkbox.style.display = "inline-block"; // แสดง checkbox
        } else {
            checkbox.style.display = "none"; // ซ่อน checkbox
            checkbox.checked = false; // รีเซ็ตค่าของ checkbox
        }
    });

    // ✅ แสดง chart-container เมื่ออยู่ในโหมด Select
    chartContainer.style.display = selectMode ? "block" : "none";
}



function toggleRowSelection(checkbox, row, entry) {
    if (checkbox.checked) {
        selectedRows.push(entry);
        row.classList.add("selected-row");
    } else {
        selectedRows = selectedRows.filter(item => item.BedID !== entry.BedID);
        row.classList.remove("selected-row");
    }
    updateChart();
}

// ✅ อัพเดตแกน X เมื่อมีการเปลี่ยนค่า
document.getElementById("xAxisSelect").addEventListener("change", updateChart);

// ✅ ฟังก์ชันพล็อตกราฟ
let chartInstance;
function updateChart() {
    // ตรวจสอบว่า chartInstance ถูกสร้างขึ้นแล้ว
    if (chartInstance) {
        chartInstance.destroy(); // ทำลายกราฟเก่า
    }

    // ถ้ามีข้อมูลที่เลือก
    if (selectedRows.length === 0) return;

    const xAxis = document.getElementById("xAxisSelect").value;
    const labels = selectedRows.map(row => row[xAxis]);
    const risks = selectedRows.map(row => parseFloat(row.Risk));

    const ctx = document.getElementById("riskChart").getContext("2d");

    // สร้างกราฟใหม่
    chartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Risk (%)",
                data: risks,
                borderColor: "blue",
                backgroundColor: "rgba(0, 0, 255, 0.2)",
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true },
                x: { title: { display: true, text: xAxis } }
            }
        }
    });
}


// ฟังก์ชันสุ่มสีสำหรับแต่ละเส้น
function randomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// ✅ ฟังก์ชันเคลียร์ตัวกรอง (Filter)
function clearFilters() {
    // รีเซ็ต Dropdown และ Input
    document.getElementById("categorySelect").selectedIndex = 0;
    document.getElementById("valueSelect").style.display = "none";
    document.getElementById("conditionSelect").style.display = "none";
    document.getElementById("input1").style.display = "none";
    document.getElementById("input2").style.display = "none";

    document.getElementById("valueSelect").innerHTML = "";
    document.getElementById("input1").value = "";
    document.getElementById("input2").value = "";

    // แสดงแถวทั้งหมดในตาราง
    let table = document.querySelector("table");
    let tr = table.getElementsByTagName("tr");
    for (let i = 1; i < tr.length; i++) {
        tr[i].style.display = "";
    }
}
// ✅ ฟังก์ชันเคลียร์การเลือกแถว + กราฟ
function clearSelection() {
    selectedRows = []; // เคลียร์แถวที่เลือก

    let rows = document.querySelectorAll("#result-body tr");
    rows.forEach(row => {
        row.classList.remove("selected-row"); // ล้างสีของแถวที่ถูกเลือก

        // รีเซ็ต checkbox
        const checkbox = row.querySelector("input[type='checkbox']");
        if (checkbox) {
            checkbox.checked = false; // ยกเลิกการเลือก
            checkbox.style.display = "none"; // ซ่อน checkbox
        }
    });

    // ปิดโหมด Select (ถ้ากำลังเปิดอยู่)
    selectMode = false;

    // ✅ ซ่อน chart-container เมื่อกดล้าง
    document.getElementById("chart-container").style.display = "none";

    // รีเซ็ตกราฟ
    if (chartInstance) {
        chartInstance.destroy(); // เคลียร์กราฟที่แสดงอยู่
        chartInstance = null;
    }
}

// ฟังก์ชันอัปเดตตัวเลือกใน Dropdown เมื่อเลือกหมวดหมู่
function updateFilterOptions() {
    let category = document.getElementById("categorySelect").value;
    let valueSelect = document.getElementById("valueSelect");
    let conditionSelect = document.getElementById("conditionSelect");
    let input1 = document.getElementById("input1");
    let input2 = document.getElementById("input2");

    // ซ่อน input ที่ไม่จำเป็น
    valueSelect.style.display = "none";
    conditionSelect.style.display = "none";
    input1.style.display = "none";
    input2.style.display = "none";

    valueSelect.innerHTML = "";

    if (category === "Sex") {
        valueSelect.style.display = "inline-block";
        valueSelect.innerHTML = `
            <option value="">All</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
        `;
    } else if (category === "Prediction") {
        valueSelect.style.display = "inline-block";
        valueSelect.innerHTML = `
            <option value="">All</option>
            <option value="Shock">Shock</option>
            <option value="Non-shock">Non-shock</option>
        `;
    } else if (category === "Datetime" || category === "BedID") {
        valueSelect.style.display = "inline-block";
        let rows = document.querySelectorAll("#result-body tr");
        let uniqueValues = new Set();
        rows.forEach(row => {
            let cellValue = row.cells[getCategoryIndex(category)].textContent;
            uniqueValues.add(cellValue);
        });
        valueSelect.innerHTML = `<option value="">All</option>`;
        uniqueValues.forEach(value => {
            valueSelect.innerHTML += `<option value="${value}">${value}</option>`;
        });
    } else if (category === "Age" || category === "Risk") {
        conditionSelect.style.display = "inline-block";
        input1.style.display = "inline-block";

        conditionSelect.onchange = function () {
            if (conditionSelect.value === "between") {
                input2.style.display = "inline-block";
            } else {
                input2.style.display = "none";
            }
        };
    }

    filterTable();  // ทำการกรองข้อมูลเมื่อเลือกหมวดหมู่
}

// ฟังก์ชันหา index ของคอลัมน์
function getCategoryIndex(category) {
    const categories = ["Datetime", "BedID", "Age", "Sex", "Prediction", "Risk"];
    return categories.indexOf(category);
}

// ✅ ฟังก์ชันกรองข้อมูล
function filterTable() {
    let category = document.getElementById("categorySelect").value;
    let value = document.getElementById("valueSelect").value;
    let condition = document.getElementById("conditionSelect").value;
    let input1 = document.getElementById("input1").value;
    let input2 = document.getElementById("input2").value;

    let table = document.querySelector("table");
    let tr = table.getElementsByTagName("tr");
    let columnIndex = getCategoryIndex(category);

    for (let i = 1; i < tr.length; i++) {
        let td = tr[i].getElementsByTagName("td")[columnIndex];
        if (td) {
            let textValue = td.textContent || td.innerText;
            let showRow = true;

            if (category === "Risk" || category === "Age") {
                let numValue = parseFloat(textValue);
                if (condition === "greater" && numValue <= parseFloat(input1)) {
                    showRow = false;
                } else if (condition === "less" && numValue >= parseFloat(input1)) {
                    showRow = false;
                } else if (condition === "between" && (numValue < parseFloat(input1) || numValue > parseFloat(input2))) {
                    showRow = false;
                }
            } else {
                if (value && textValue !== value) {
                    showRow = false;
                }
            }

            tr[i].style.display = showRow ? "" : "none";
        }
    }
}

// ✅ ฟังก์ชันสำหรับ Export ตารางเป็น CSV
function exportTableToCSV(filename) {
    // เลือกข้อมูลที่ต้องการส่งออก (เฉพาะแถวที่แสดงอยู่)
    const table = document.querySelector("table");
    const rows = Array.from(table.querySelectorAll("tr"));
    
    // เริ่มต้นด้วยการสร้าง array สำหรับ CSV
    const csvData = [];
    
    // เพิ่มส่วนหัวตาราง (header)
    const headers = rows[0].querySelectorAll("th");
    const headerRow = [];
    headers.forEach(header => {
        // เพิ่มเฉพาะส่วนหัวที่มีข้อความ (ไม่เพิ่มคอลัมน์ว่างสำหรับ checkbox)
        if (header.textContent.trim() !== '') {
            headerRow.push(header.textContent);
        }
    });
    csvData.push(headerRow.join(','));
    
    // เพิ่มข้อมูลแถวที่แสดงอยู่ในตาราง (ไม่รวมแถวที่ถูกซ่อน)
    for (let i = 1; i < rows.length; i++) {
        if (rows[i].style.display !== 'none') {
            const row = rows[i];
            const cells = row.querySelectorAll("td");
            const rowData = [];
            
            // เพิ่มข้อมูลในแต่ละเซล (ยกเว้นเซลสุดท้ายที่เป็น checkbox)
            for (let j = 0; j < cells.length - 1; j++) {
                let cellData = cells[j].textContent;
                // ถ้ามี comma ในข้อมูลให้ครอบด้วยเครื่องหมาย "
                if (cellData.includes(',')) {
                    cellData = `"${cellData}"`;
                }
                rowData.push(cellData);
            }
            
            csvData.push(rowData.join(','));
        }
    }
    
    // สร้าง Blob สำหรับข้อมูล CSV
    const csvString = csvData.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    
    // สร้าง URL สำหรับดาวน์โหลด
    const url = URL.createObjectURL(blob);
    
    // สร้าง element a สำหรับดาวน์โหลด
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    // เพิ่ม element เข้าไปใน DOM
    document.body.appendChild(link);
    
    // คลิกเพื่อดาวน์โหลด
    link.click();
    
    // ลบ element ออกจาก DOM
    document.body.removeChild(link);
}