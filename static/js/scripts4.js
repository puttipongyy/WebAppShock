// ✅ ดึงข้อมูลจาก URL
const urlParams = new URLSearchParams(window.location.search);
const encodedData = urlParams.get('data');
let selectMode = false; // flag for select mode
let selectedRows = []; 
let activeFilters = {};
let filterDropdown = null;

// ✅ ดึงข้อมูลจาก URL
document.addEventListener("DOMContentLoaded", function () {
    fetch("/history-data")
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById('history-body');

            data.forEach(entry => {
                const row = document.createElement("tr");
                row.dataset.entry = JSON.stringify(entry);
                
                // เพิ่ม Risk Level
                const riskValue = parseFloat(entry.Risk);
                const riskLevel = getRiskLevel(riskValue);
                const riskLevelClass = getRiskLevelClass(riskValue);
                
                row.innerHTML = `
                    <td>${entry.Datetime}</td>
                    <td>${entry.BedID}</td>
                    <td>${entry.Age}</td>
                    <td>${entry.Sex}</td>
                    <td>${entry.Prediction}</td>
                    <td>${parseFloat(entry.Risk).toFixed(2)}</td>
                    <td><span class="risk-level ${riskLevelClass}">${riskLevel}</span></td>
                    <td><input type="checkbox" style="display:none;" onclick="toggleRowSelection(this, this.closest('tr'), ${JSON.stringify(entry)})"></td>
                `;

                tableBody.appendChild(row);
            });
        })
        .catch(error => console.error("Error loading history data:", error));
    
    // เพิ่ม Event Listener สำหรับการคลิกที่หัวคอลัมน์
    setupColumnFilters();
    
    // สร้าง dropdown filter สำหรับกดที่คอลัมน์
    createFilterDropdown();
    
    // จัดการการคลิกนอก dropdown เพื่อปิด
    document.addEventListener("click", function(e) {
        if (filterDropdown && !filterDropdown.contains(e.target) && 
            !e.target.classList.contains('column-filter')) {
            hideFilterDropdown();
        }
    });
});

// ฟังก์ชันเพิ่ม Event Listener สำหรับการคลิกที่หัวคอลัมน์
function setupColumnFilters() {
    const headerCells = document.querySelectorAll("thead th");
    
    headerCells.forEach((cell, index) => {
        // ไม่เพิ่ม filter ในคอลัมน์สุดท้าย (คอลัมน์ checkbox)
        if (index < headerCells.length - 1) {
            // เพิ่มไอคอนสำหรับกรอง
            const cellContent = cell.textContent;
            cell.innerHTML = `
                <div class="column-header">
                    <span>${cellContent}</span>
                    <span class="filter-icon column-filter" data-column="${index}" title="กรองข้อมูล">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5v-2z"/>
                        </svg>
                    </span>
                </div>
            `;
        }
    });
    
    // เพิ่ม event listener สำหรับไอคอนกรอง
    document.querySelectorAll(".filter-icon").forEach(icon => {
        icon.addEventListener("click", function(e) {
            e.stopPropagation();
            const columnIndex = parseInt(this.getAttribute("data-column"));
            const columnName = getColumnNameByIndex(columnIndex);
            showFilterDropdown(columnName, columnIndex, this);
        });
    });
}
// ฟังก์ชันรับชื่อคอลัมน์จาก index
function getColumnNameByIndex(index) {
    const columnNames = ["Datetime", "BedID", "Age", "Sex", "Prediction", "Risk", "Risk Level"];
    return columnNames[index];
}
// ฟังก์ชันสร้าง dropdown filter
function createFilterDropdown() {
    if (document.getElementById("filter-dropdown")) {
        return; // ถ้ามีอยู่แล้วให้ข้ามไป
    }
    
    const dropdown = document.createElement("div");
    dropdown.id = "filter-dropdown";
    dropdown.className = "filter-dropdown";
    dropdown.style.display = "none";
    
    document.body.appendChild(dropdown);
    filterDropdown = dropdown;
}

// ฟังก์ชันแสดง dropdown filter
function showFilterDropdown(columnName, columnIndex, iconElement) {
    if (!filterDropdown) return;
    
    // ตำแหน่งของ dropdown
    const rect = iconElement.getBoundingClientRect();
    filterDropdown.style.top = (rect.bottom + window.scrollY) + "px";
    filterDropdown.style.left = (rect.left + window.scrollX - 100) + "px";
    
    // เคลียร์ dropdown เดิม
    filterDropdown.innerHTML = "";
    
    // เพิ่มหัวข้อ
    const header = document.createElement("div");
    header.className = "filter-header";
    header.textContent = `Filter ${columnName}`;
    filterDropdown.appendChild(header);
    
    // สร้าง input สำหรับค้นหา
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "filter-search";
    searchInput.placeholder = "Search...";
    searchInput.addEventListener("input", function() {
        const searchTerm = this.value.toLowerCase();
        document.querySelectorAll(".filter-item").forEach(item => {
            const itemText = item.textContent.toLowerCase();
            item.style.display = itemText.includes(searchTerm) ? "block" : "none";
        });
    });
    filterDropdown.appendChild(searchInput);
    
    // สร้าง container สำหรับรายการ
    const itemsContainer = document.createElement("div");
    itemsContainer.className = "filter-items";
    filterDropdown.appendChild(itemsContainer);
    
    // เพิ่มตัวเลือกเคลียร์ filter
    const clearItem = document.createElement("div");
    clearItem.className = "filter-item";
    clearItem.innerHTML = `<input type="checkbox" data-value="clear"> <span>Clear Filter</span>`;
    clearItem.querySelector("input").addEventListener("change", function() {
        if (this.checked) {
            delete activeFilters[columnName];
            applyAllFilters();
            hideFilterDropdown();
        }
    });
    itemsContainer.appendChild(clearItem);
    
    // เพิ่มตัวเลือก All
    const allItem = document.createElement("div");
    allItem.className = "filter-item";
    allItem.innerHTML = `<input type="checkbox" data-value="all"> <span>Select All</span>`;
    const allCheckbox = allItem.querySelector("input");
    allCheckbox.checked = !activeFilters[columnName];
    allCheckbox.addEventListener("change", function() {
        if (this.checked) {
            document.querySelectorAll(".filter-value-item input").forEach(checkbox => {
                checkbox.checked = true;
            });
        } else {
            document.querySelectorAll(".filter-value-item input").forEach(checkbox => {
                checkbox.checked = false;
            });
        }
    });
    itemsContainer.appendChild(allItem);
    
    // เพิ่มตัวคั่นระหว่างไอเทม
    const divider = document.createElement("div");
    divider.className = "filter-divider";
    itemsContainer.appendChild(divider);
    
    // ดึงค่าที่มีอยู่ในคอลัมน์
    const uniqueValues = getUniqueColumnValues(columnIndex);
    
    // กรณีเป็นคอลัมน์ "Risk Level" ให้แสดงตามระดับความเสี่ยง
    if (columnName === "Risk Level") {
        // สร้างตัวเลือกสำหรับระดับความเสี่ยง
        const riskLevels = ["Very Low Risk", "Low Risk", "Moderate Risk", "High Risk"];
        const riskColors = ["#28a745", "#5cb85c", "#ffc107", "#dc3545"];
        
        riskLevels.forEach((level, index) => {
            const item = document.createElement("div");
            item.className = "filter-item filter-value-item";
            
            // สร้าง checkbox
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.setAttribute("data-value", level);
            
            // ตรวจสอบว่าค่านี้ถูกเลือกไว้หรือไม่
            checkbox.checked = !activeFilters[columnName] || 
                               (activeFilters[columnName].type === "values" && 
                                activeFilters[columnName].values.includes(level));
            
            checkbox.addEventListener("change", function() {
                // ปรับ "Select All" checkbox
                updateSelectAllCheckbox();
                
                // อัพเดตการกรอง
                const checkedValues = getCheckedFilterValues();
                
                if (checkedValues.length === riskLevels.length || checkedValues.length === 0) {
                    // ถ้าเลือกทั้งหมดหรือไม่ได้เลือกอะไรเลย ให้ล้างการกรอง
                    delete activeFilters[columnName];
                } else {
                    // สร้างการกรองด้วยค่าที่เลือก
                    activeFilters[columnName] = {
                        type: "values",
                        values: checkedValues
                    };
                }
                
                applyAllFilters();
            });
            
            item.appendChild(checkbox);
            
            // เพิ่ม label พร้อมสี
            const label = document.createElement("span");
            label.innerHTML = `<span style="color: ${riskColors[index]}; font-weight: bold;">${level}</span>`;
            item.appendChild(label);
            
            itemsContainer.appendChild(item);
        });
    } else if (columnName === "Risk" || columnName === "Age") {
        // เพิ่มตัวเลือกสำหรับตัวกรองตามช่วง
        const rangeSection = document.createElement("div");
        rangeSection.className = "filter-range-section";
        
        // เพิ่มตัวเลือกสำหรับ Risk, Age แบบช่วง
        const rangeOptions = ["Greater than", "Less than", "Between"];
        rangeOptions.forEach(option => {
            const rangeItem = document.createElement("div");
            rangeItem.className = "filter-range-item";
            
            const optionLabel = document.createElement("label");
            optionLabel.textContent = option;
            rangeItem.appendChild(optionLabel);
            
            if (option === "Between") {
                const inputMin = document.createElement("input");
                inputMin.type = "number";
                inputMin.className = "filter-range-input";
                inputMin.placeholder = "Min";
                
                const inputMax = document.createElement("input");
                inputMax.type = "number";
                inputMax.className = "filter-range-input";
                inputMax.placeholder = "Max";
                
                rangeItem.appendChild(inputMin);
                rangeItem.appendChild(inputMax);
                
                const applyButton = document.createElement("button");
                applyButton.textContent = "Apply";
                applyButton.className = "filter-apply-btn";
                applyButton.addEventListener("click", function() {
                    const min = parseFloat(inputMin.value);
                    const max = parseFloat(inputMax.value);
                    
                    if (!isNaN(min) && !isNaN(max)) {
                        activeFilters[columnName] = {
                            type: "between",
                            min: min,
                            max: max
                        };
                        applyAllFilters();
                        hideFilterDropdown();
                    }
                });
                
                rangeItem.appendChild(applyButton);
            } else {
                const input = document.createElement("input");
                input.type = "number";
                input.className = "filter-range-input";
                input.placeholder = "Value";
                
                const applyButton = document.createElement("button");
                applyButton.textContent = "Apply";
                applyButton.className = "filter-apply-btn";
                applyButton.addEventListener("click", function() {
                    const value = parseFloat(input.value);
                    
                    if (!isNaN(value)) {
                        activeFilters[columnName] = {
                            type: option === "Greater than" ? "greater" : "less",
                            value: value
                        };
                        applyAllFilters();
                        hideFilterDropdown();
                    }
                });
                
                rangeItem.appendChild(input);
                rangeItem.appendChild(applyButton);
            }
            
            rangeSection.appendChild(rangeItem);
        });
        
        itemsContainer.appendChild(rangeSection);
        
        // เพิ่มตัวคั่นอีกครั้ง
        const divider2 = document.createElement("div");
        divider2.className = "filter-divider";
        itemsContainer.appendChild(divider2);
        
        // สร้างตัวเลือกสำหรับแต่ละค่า
        uniqueValues.forEach(value => {
            const item = document.createElement("div");
            item.className = "filter-item filter-value-item";
            
            // สร้าง checkbox
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.setAttribute("data-value", value);
            
            // ตรวจสอบว่าค่านี้ถูกเลือกไว้หรือไม่
            checkbox.checked = !activeFilters[columnName] || 
                               (activeFilters[columnName].type === "values" && 
                                activeFilters[columnName].values.includes(value));
            
            checkbox.addEventListener("change", function() {
                // ปรับ "Select All" checkbox
                updateSelectAllCheckbox();
                
                // อัพเดตการกรอง
                const checkedValues = getCheckedFilterValues();
                
                if (checkedValues.length === uniqueValues.length || checkedValues.length === 0) {
                    // ถ้าเลือกทั้งหมดหรือไม่ได้เลือกอะไรเลย ให้ล้างการกรอง
                    delete activeFilters[columnName];
                } else {
                    // สร้างการกรองด้วยค่าที่เลือก
                    activeFilters[columnName] = {
                        type: "values",
                        values: checkedValues
                    };
                }
                
                applyAllFilters();
            });
            
            item.appendChild(checkbox);
            
            // เพิ่ม label
            const label = document.createElement("span");
            label.textContent = value;
            item.appendChild(label);
            
            itemsContainer.appendChild(item);
        });
    } else {
        // สร้างตัวเลือกสำหรับแต่ละค่า
        uniqueValues.forEach(value => {
            const item = document.createElement("div");
            item.className = "filter-item filter-value-item";
            
            // สร้าง checkbox
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.setAttribute("data-value", value);
            
            // ตรวจสอบว่าค่านี้ถูกเลือกไว้หรือไม่
            checkbox.checked = !activeFilters[columnName] || 
                               (activeFilters[columnName].type === "values" && 
                                activeFilters[columnName].values.includes(value));
            
            checkbox.addEventListener("change", function() {
                // ปรับ "Select All" checkbox
                updateSelectAllCheckbox();
                
                // อัพเดตการกรอง
                const checkedValues = getCheckedFilterValues();
                
                if (checkedValues.length === uniqueValues.length || checkedValues.length === 0) {
                    // ถ้าเลือกทั้งหมดหรือไม่ได้เลือกอะไรเลย ให้ล้างการกรอง
                    delete activeFilters[columnName];
                } else {
                    // สร้างการกรองด้วยค่าที่เลือก
                    activeFilters[columnName] = {
                        type: "values",
                        values: checkedValues
                    };
                }
                
                applyAllFilters();
            });
            
            item.appendChild(checkbox);
            
            // เพิ่ม label
            const label = document.createElement("span");
            label.textContent = value;
            item.appendChild(label);
            
            itemsContainer.appendChild(item);
        });
    }
    
    // เพิ่มปุ่ม OK และ Cancel
    const actionButtons = document.createElement("div");
    actionButtons.className = "filter-actions";
    
    const okButton = document.createElement("button");
    okButton.textContent = "OK";
    okButton.addEventListener("click", function() {
        // อัพเดตการกรอง
        const checkedValues = getCheckedFilterValues();
        
        if (columnName === "Risk Level") {
            const riskLevels = ["Very Low Risk", "Low Risk", "Moderate Risk", " High Risk"];
            if (checkedValues.length === riskLevels.length || checkedValues.length === 0) {
                // ถ้าเลือกทั้งหมดหรือไม่ได้เลือกอะไรเลย ให้ล้างการกรอง
                delete activeFilters[columnName];
            } else {
                // สร้างการกรองด้วยค่าที่เลือก
                activeFilters[columnName] = {
                    type: "values",
                    values: checkedValues
                };
            }
        } else {
            if (checkedValues.length === uniqueValues.length || checkedValues.length === 0) {
                // ถ้าเลือกทั้งหมดหรือไม่ได้เลือกอะไรเลย ให้ล้างการกรอง
                delete activeFilters[columnName];
            } else {
                // สร้างการกรองด้วยค่าที่เลือก
                activeFilters[columnName] = {
                    type: "values",
                    values: checkedValues
                };
            }
        }
        
        applyAllFilters();
        hideFilterDropdown();
    });
    
    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", hideFilterDropdown);
    
    actionButtons.appendChild(okButton);
    actionButtons.appendChild(cancelButton);
    
    filterDropdown.appendChild(actionButtons);
    
    // แสดง dropdown
    filterDropdown.style.display = "block";
    searchInput.focus();
    
    // ฟังก์ชันอัพเดตสถานะ "Select All" checkbox
    function updateSelectAllCheckbox() {
        const checkboxes = document.querySelectorAll(".filter-value-item input[type=checkbox]");
        const checkedBoxes = document.querySelectorAll(".filter-value-item input[type=checkbox]:checked");
        allCheckbox.checked = checkboxes.length === checkedBoxes.length;
    }
    
    // ฟังก์ชันดึงค่าที่ถูกเลือก
    function getCheckedFilterValues() {
        const checkboxes = document.querySelectorAll(".filter-value-item input[type=checkbox]:checked");
        return Array.from(checkboxes).map(checkbox => checkbox.getAttribute("data-value"));
    }
}
// ฟังก์ชันซ่อน dropdown filter
function hideFilterDropdown() {
    if (filterDropdown) {
        filterDropdown.style.display = "none";
    }
}

// ฟังก์ชันดึงค่าที่มีอยู่ในคอลัมน์
function getUniqueColumnValues(columnIndex) {
    const rows = document.querySelectorAll("#history-body tr");
    const values = new Set();
    
    rows.forEach(row => {
        const cell = row.cells[columnIndex];
        if (cell) {
            values.add(cell.textContent.trim());
        }
    });
    
    return Array.from(values).sort();
}

// ฟังก์ชันกรองข้อมูลในตารางตามเงื่อนไขทั้งหมด
function applyAllFilters() {
    const rows = document.querySelectorAll("#history-body tr");
    
    // ตรวจสอบว่ามี filters หรือไม่
    const hasFilters = Object.keys(activeFilters).length > 0;
    
    // ถ้าไม่มี filters ให้แสดงทุกแถว
    if (!hasFilters) {
        rows.forEach(row => {
            row.style.display = "";
        });
        updateFilterIcons();
        return;
    }
    
    // กรองแถวตามเงื่อนไขทั้งหมด
    rows.forEach(row => {
        let showRow = true;
        
        // ตรวจสอบทุกเงื่อนไขการกรอง
        for (const columnName in activeFilters) {
            const columnIndex = getColumnIndexByName(columnName);
            const cellValue = row.cells[columnIndex].textContent.trim();
            const filter = activeFilters[columnName];
            
            // กรองตามประเภทของ filter
            if (filter.type === "values") {
                // กรองตามค่าที่เลือก - สำหรับ Risk Level ต้องดึงเฉพาะข้อความจาก span
                if (columnName === "Risk Level") {
                    const riskLevelText = row.cells[columnIndex].querySelector("span").textContent.trim();
                    if (!filter.values.includes(riskLevelText)) {
                        showRow = false;
                        break;
                    }
                } else {
                    // กรองตามค่าที่เลือก
                    if (!filter.values.includes(cellValue)) {
                        showRow = false;
                        break;
                    }
                }
            } else if (filter.type === "greater") {
                // กรองค่าที่มากกว่า
                const numValue = parseFloat(cellValue);
                if (isNaN(numValue) || numValue <= filter.value) {
                    showRow = false;
                    break;
                }
            } else if (filter.type === "less") {
                // กรองค่าที่น้อยกว่า
                const numValue = parseFloat(cellValue);
                if (isNaN(numValue) || numValue >= filter.value) {
                    showRow = false;
                    break;
                }
            } else if (filter.type === "between") {
                // กรองค่าที่อยู่ระหว่าง
                const numValue = parseFloat(cellValue);
                if (isNaN(numValue) || numValue < filter.min || numValue > filter.max) {
                    showRow = false;
                    break;
                }
            }
        }
        
        // แสดงหรือซ่อนแถวตามผลการกรอง
        row.style.display = showRow ? "" : "none";
    });
    
    // อัพเดตไอคอนตัวกรอง
    updateFilterIcons();
}

// ฟังก์ชันอัพเดตไอคอนตัวกรอง
function updateFilterIcons() {
    const columnNames = ["Datetime", "BedID", "Age", "Sex", "Prediction", "Risk"];
    
    columnNames.forEach((name, index) => {
        const icon = document.querySelector(`.filter-icon[data-column="${index}"]`);
        if (icon) {
            if (activeFilters[name]) {
                icon.classList.add("active-filter");
            } else {
                icon.classList.remove("active-filter");
            }
        }
    });
}

// ฟังก์ชันหา index ของคอลัมน์จากชื่อ
function getColumnIndexByName(name) {
    const columnNames = ["Datetime", "BedID", "Age", "Sex", "Prediction", "Risk", "Risk Level"];
    return columnNames.indexOf(name);
}

// ฟังก์ชันเคลียร์ตัวกรองทั้งหมด
function clearFilters() {
    // ล้างค่า activeFilters
    activeFilters = {};
    
    // แสดงแถวทั้งหมดในตาราง
    const rows = document.querySelectorAll("#history-body tr");
    rows.forEach(row => {
        row.style.display = "";
    });
    
    // อัพเดตไอคอนตัวกรอง
    updateFilterIcons();
}

// CSS สำหรับ filter dropdown
function addFilterStyles() {
    if (document.getElementById("filter-styles")) return;
    
    const styleSheet = document.createElement("style");
    styleSheet.id = "filter-styles";
    styleSheet.textContent = `
        .column-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 2px 0;
        }
        
        .filter-icon {
            cursor: pointer;
            margin-left: 5px;
            color: #6a0dad;
            opacity: 1;
            background-color: rgba(255, 255, 255, 0.7);
            padding: 3px;
            border-radius: 3px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #6a0dad;
            transition: all 0.2s ease;
        }
        
        .filter-icon:hover {
            background-color: #6a0dad;
            color: white;
            transform: scale(1.1);
        }
        
        .filter-icon.active-filter {
            background-color: #6a0dad;
            color: white;
            border-color: #ffac2e;
            box-shadow: 0 0 5px rgba(255, 172, 46, 0.5);
        }
        
        .filter-icon svg {
            width: 14px;
            height: 14px;
        }
        
        .filter-dropdown {
            position: absolute;
            min-width: 200px;
            max-width: 300px;
            background-color: #fff;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            color: #333;
        }
        
        .filter-header {
            padding: 8px 12px;
            font-weight: bold;
            border-bottom: 1px solid #ddd;
            background-color: #f5f5f5;
        }
        
        .filter-search {
            width: calc(100% - 16px);
            margin: 8px;
            padding: 6px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
        }
        
        .filter-items {
            max-height: 300px;
            overflow-y: auto;
            padding: 0 8px;
        }
        
        .filter-item {
            padding: 6px 4px;
            display: flex;
            align-items: center;
            cursor: pointer;
        }
        
        .filter-item input {
            margin-right: 8px;
        }
        
        .filter-item:hover {
            background-color: #f5f5f5;
        }
        
        .filter-divider {
            height: 1px;
            background-color: #ddd;
            margin: 8px 0;
        }
        
        .filter-actions {
            display: flex;
            justify-content: flex-end;
            padding: 8px;
            border-top: 1px solid #ddd;
        }
        
        .filter-actions button {
            padding: 6px 12px;
            margin-left: 8px;
            background-color: #6a0dad;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .filter-actions button:hover {
            background-color: #8c52ff;
        }
        
        .filter-range-section {
            padding: 8px;
        }
        
        .filter-range-item {
            margin-bottom: 10px;
        }
        
        .filter-range-item label {
            display: block;
            margin-bottom: 4px;
            font-weight: bold;
        }
        
        .filter-range-input {
            padding: 5px;
            width: calc(50% - 5px);
            box-sizing: border-box;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-right: 4px;
        }
        
        .filter-apply-btn {
            padding: 4px 8px;
            background-color: #6a0dad;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8rem;
        }
        
        .filter-apply-btn:hover {
            background-color: #8c52ff;
        }
    `;
    
    document.head.appendChild(styleSheet);
}
// เพิ่ม Styles ต้องเรียกตอนเริ่มต้น
document.addEventListener("DOMContentLoaded", addFilterStyles);

document.getElementById("history-body").addEventListener("click", function (event) {
    const checkbox = event.target.closest('input[type="checkbox"]');
    if (!checkbox) return;

    const row = checkbox.closest("tr");
    const entry = JSON.parse(row.dataset.entry);
    toggleRowSelection(checkbox, row, entry);
});


function toggleSelectMode() {
    selectMode = !selectMode;
    let rows = document.querySelectorAll("#history-body tr");
    let chartContainer = document.getElementById("chart-container");

    rows.forEach(row => {
        const checkbox = row.querySelector("input[type='checkbox']");
        if (checkbox) {  // ✅ ตรวจสอบว่า checkbox มีอยู่จริง
            if (selectMode) {
                checkbox.style.display = "inline-block"; // แสดง checkbox
            } else {
                checkbox.style.display = "none"; // ซ่อน checkbox
                checkbox.checked = false; // รีเซ็ตค่าของ checkbox
            }
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
// document.getElementById("xAxisSelect").addEventListener("change", updateChart);
// ฟังก์ชันสำหรับคำนวณความแตกต่างของเวลาเป็นนาที
function getTimeDifferenceInMinutes(date1, date2) {
    const diffMs = Math.abs(date2 - date1);
    return Math.round(diffMs / (1000 * 60));
}

// ฟังก์ชันสร้างกล่องสรุปการเปลี่ยนแปลงความเสี่ยง
function createRiskChangeSummary(riskChanges) {
    // ลบกล่องเดิม (ถ้ามี)
    const existingSummary = document.getElementById('risk-change-summary');
    if (existingSummary) {
        existingSummary.remove();
    }
    
    // ถ้าไม่มีการเปลี่ยนแปลง ไม่ต้องสร้างกล่อง
    if (!riskChanges || riskChanges.length === 0) return;
    
    // หา chart-container
    const chartContainer = document.getElementById('chart-container');
    if (!chartContainer) return;
    
    // สร้างกล่องสรุป
    const summaryBox = document.createElement('div');
    summaryBox.id = 'risk-change-summary';
    summaryBox.className = 'risk-change-summary-box';
    summaryBox.style.marginTop = '20px';
    summaryBox.style.padding = '10px';
    summaryBox.style.backgroundColor = '#f8f9fa';
    summaryBox.style.border = '1px solid #ddd';
    summaryBox.style.borderRadius = '5px';
    summaryBox.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    
    // เพิ่มหัวข้อ
    const header = document.createElement('div');
    header.textContent = 'สรุปการเปลี่ยนแปลงความเสี่ยง';
    header.style.fontWeight = 'bold';
    header.style.fontSize = '16px';
    header.style.marginBottom = '10px';
    header.style.padding = '5px';
    header.style.borderBottom = '1px solid #ddd';
    summaryBox.appendChild(header);
    
    // สร้างตาราง
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    
    // สร้างส่วนหัวตาราง
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">BedID</th>
            <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">เวลาเริ่มต้น</th>
            <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">เวลาสิ้นสุด</th>
            <th style="padding: 8px; text-align: right; border-bottom: 1px solid #ddd;">ช่วงเวลา (นาที)</th>
            <th style="padding: 8px; text-align: right; border-bottom: 1px solid #ddd;">ค่าเริ่มต้น (%)</th>
            <th style="padding: 8px; text-align: right; border-bottom: 1px solid #ddd;">ค่าสิ้นสุด (%)</th>
            <th style="padding: 8px; text-align: right; border-bottom: 1px solid #ddd;">การเปลี่ยนแปลง (%)</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // สร้างส่วนข้อมูล
    const tbody = document.createElement('tbody');
    
    // จัดกลุ่มข้อมูลตาม BedID
    const bedGroups = {};
    riskChanges.forEach(change => {
        if (!bedGroups[change.bedID]) {
            bedGroups[change.bedID] = [];
        }
        bedGroups[change.bedID].push(change);
    });
    
    // วนลูปผ่านแต่ละ BedID
    Object.keys(bedGroups).forEach(bedID => {
        const changes = bedGroups[bedID].sort((a, b) => a.fromDate - b.fromDate);
        
        // วนลูปผ่านการเปลี่ยนแปลงแต่ละครั้ง
        changes.forEach((change, index) => {
            const row = document.createElement('tr');
            // กำหนดสีพื้นหลังสลับกัน
            row.style.backgroundColor = index % 2 === 0 ? '#fff' : '#f9f9f9';
            
            // คำนวณเวลาที่ใช้ (นาที)
            const timeMinutes = getTimeDifferenceInMinutes(change.fromDate, change.toDate);
            
            // กำหนดสีของการเปลี่ยนแปลง
            const diffStyle = change.diff >= 0 
                ? (change.diff > 5 ? 'color:#dc3545;font-weight:bold;' : 'color:#ffc107;font-weight:bold;')
                : 'color:#28a745;font-weight:bold;';
            
            // สร้างรูปแบบวันที่และเวลา
            const formatDateTime = (date) => {
                const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
                return date.toLocaleString('th-TH', options);
            };
            
            // ใส่ข้อมูลในแถว
            row.innerHTML = `
                <td style="padding: 8px; text-align: left; border-bottom: 1px solid #eee;">${bedID}</td>
                <td style="padding: 8px; text-align: left; border-bottom: 1px solid #eee;">${formatDateTime(change.fromDate)}</td>
                <td style="padding: 8px; text-align: left; border-bottom: 1px solid #eee;">${formatDateTime(change.toDate)}</td>
                <td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">${timeMinutes}</td>
                <td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">${change.fromRisk.toFixed(2)}</td>
                <td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">${change.toRisk.toFixed(2)}</td>
                <td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee; ${diffStyle}">${change.diff > 0 ? '+' : ''}${change.diff.toFixed(2)}</td>
            `;
            
            tbody.appendChild(row);
        });
    });
    
    table.appendChild(tbody);
    summaryBox.appendChild(table);
    
    // เพิ่มปุ่มบันทึกข้อมูลสำหรับรายงาน PDF
    const actionDiv = document.createElement('div');
    actionDiv.style.marginTop = '10px';
    actionDiv.style.textAlign = 'right';
    
    const saveDataButton = document.createElement('button');
    saveDataButton.textContent = 'เพิ่มข้อมูลนี้ในรายงาน PDF';
    saveDataButton.style.padding = '6px 12px';
    saveDataButton.style.backgroundColor = '#6a0dad';
    saveDataButton.style.color = 'white';
    saveDataButton.style.border = 'none';
    saveDataButton.style.borderRadius = '4px';
    saveDataButton.style.cursor = 'pointer';
    saveDataButton.onclick = function() {
        // เก็บข้อมูลไว้สำหรับใช้ในรายงาน PDF
        window.riskChangeData = riskChanges;
        alert('เพิ่มข้อมูลการเปลี่ยนแปลงความเสี่ยงในรายงาน PDF แล้ว');
    };
    
    actionDiv.appendChild(saveDataButton);
    summaryBox.appendChild(actionDiv);
    
    // เพิ่มกล่องสรุปเข้าไปใน DOM
    chartContainer.appendChild(summaryBox);
    
    return summaryBox;
}
// ฟังก์ชันสร้างกราฟแบบแยกพื้นที่สีเขียว/แดงตามระดับความเสี่ยง
function createSplitAreaChart() {
    // ตรวจสอบว่า chartInstance ถูกสร้างขึ้นแล้ว
    if (chartInstance) {
        chartInstance.destroy(); // ทำลายกราฟเก่า
    }

    // ถ้าไม่มีข้อมูลที่เลือก ให้ออกจากฟังก์ชัน
    if (selectedRows.length === 0) return;

    // ข้อมูลเริ่มต้น
    const allDatasets = [];  // เก็บทุก dataset
    
    let minRisk = Number.MAX_VALUE, maxRisk = Number.MIN_VALUE;
    let minDate = null, maxDate = null;

    // จัดกลุ่มข้อมูลตาม BedID
    const bedIDs = [...new Set(selectedRows.map(row => row.BedID))];
    
    // เก็บข้อมูลความเปลี่ยนแปลงของความเสี่ยง
    const riskChanges = [];
    
    bedIDs.forEach(bedID => {
        // ข้อมูลทั้งหมดของเตียงนี้
        const bedData = selectedRows.filter(row => row.BedID === bedID);
        
        // เรียงข้อมูลตามเวลา
        bedData.sort((a, b) => new Date(a.Datetime) - new Date(b.Datetime));
        
        // สร้างข้อมูลหลักที่มีทุกจุด (สำหรับเส้นกราฟหลัก)
        const mainData = [];
        const pointColors = [];
        
        bedData.forEach((row, index) => {
            const date = new Date(row.Datetime);
            const risk = parseFloat(row.Risk);
            
            // ปรับปรุง min/max
            if (risk < minRisk) minRisk = risk;
            if (risk > maxRisk) maxRisk = risk;
            if (!minDate || date < minDate) minDate = date;
            if (!maxDate || date > maxDate) maxDate = date;
            
            // เพิ่มข้อมูลหลัก
            mainData.push({
                x: date,
                y: risk,
                riskLevel: getRiskLevel(risk)
            });
            
            // กำหนดสีของจุดตามระดับความเสี่ยง
            pointColors.push(risk < 50 ? '#28a745' : '#dc3545');
            
            // คำนวณความเปลี่ยนแปลงของความเสี่ยง (ถ้าไม่ใช่จุดแรก)
            if (index > 0) {
                const prevRisk = parseFloat(bedData[index - 1].Risk);
                const riskDiff = risk - prevRisk;
                const prevDate = new Date(bedData[index - 1].Datetime);
                
                // คำนวณตำแหน่งกึ่งกลางระหว่างสองจุด
                const midX = new Date((date.getTime() + prevDate.getTime()) / 2);
                const midY = (risk + prevRisk) / 2;
                
                // เก็บข้อมูลความเปลี่ยนแปลง
                riskChanges.push({
                    bedID: bedID,
                    fromDate: prevDate,
                    toDate: date,
                    fromRisk: prevRisk,
                    toRisk: risk,
                    diff: riskDiff,
                    midX: midX,
                    midY: midY,
                    color: riskDiff >= 0 ? 
                           (riskDiff > 5 ? '#dc3545' : '#ffc107') :  // เพิ่มขึ้น: แดงหรือเหลือง
                           '#28a745'  // ลดลง: เขียว
                });
            }
        });
        
        // สร้างชุดข้อมูลหลัก (เส้นเชื่อมต่อทุกจุด)
        const mainColor = randomColor();
        allDatasets.push({
            label: `BedID ${bedID}`,
            data: mainData,
            borderColor: mainColor,
            backgroundColor: 'rgba(0, 0, 0, 0)', // โปร่งใส
            fill: false, // ไม่ระบายสี
            tension: 0.1,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: pointColors
        });
        
        // แยกข้อมูลตามระดับความเสี่ยงเพื่อแสดงพื้นที่สี
        const greenData = mainData.map(point => ({
            x: point.x,
            y: point.y < 50 ? point.y : null // ใช้ null เพื่อไม่แสดงจุดที่มากกว่า 50%
        }));
        
        const redData = mainData.map(point => ({
            x: point.x,
            y: point.y >= 50 ? point.y : null // ใช้ null เพื่อไม่แสดงจุดที่น้อยกว่า 50%
        }));
        
        // เพิ่มชุดข้อมูลสำหรับพื้นที่สีเขียว
        allDatasets.push({
            label: `Area - ${bedID} (ความเสี่ยงต่ำ)`,
            data: greenData,
            borderColor: 'rgba(0,0,0,0)', // โปร่งใส
            backgroundColor: 'rgba(40, 167, 69, 0.2)', // สีเขียวโปร่งใส
            fill: true,
            tension: 0.1,
            pointRadius: 0, // ไม่แสดงจุด
            pointHoverRadius: 0
        });
        
        // เพิ่มชุดข้อมูลสำหรับพื้นที่สีแดง
        allDatasets.push({
            label: `Area - ${bedID} (ความเสี่ยงสูง)`,
            data: redData,
            borderColor: 'rgba(0,0,0,0)', // โปร่งใส
            backgroundColor: 'rgba(220, 53, 69, 0.2)', // สีแดงโปร่งใส
            fill: true,
            tension: 0.1,
            pointRadius: 0, // ไม่แสดงจุด
            pointHoverRadius: 0
        });
    });

    // ปรับค่า min/max ของแกน y ให้มี padding
    const yMin = Math.max(0, minRisk - 10);
    const yMax = maxRisk + 10;

    // ปรับค่า min/max ของแกน x ให้มี padding
    const xMin = new Date(minDate);
    const xMax = new Date(maxDate);
    xMin.setMinutes(xMin.getMinutes() - 10);
    xMax.setMinutes(xMax.getMinutes() + 10);

    const ctx = document.getElementById("riskChart").getContext("2d");
    if (!ctx) {
        console.error("Canvas for riskChart not found!");
        return;
    }

    // ตรวจสอบว่ามี plugin ที่จำเป็นหรือไม่
    const hasDataLabels = typeof ChartDataLabels !== 'undefined';
    const plugins = hasDataLabels ? [ChartDataLabels] : [];
    
    // กำหนด datalabels options
    const dataLabelsConfig = hasDataLabels ? {
        datalabels: {
            align: 'top',
            anchor: 'end',
            formatter: function(value) {
                return value && value.y ? value.y.toFixed(2) + '%' : '';
            },
            color: function(context) {
                try {
                    // แสดงเฉพาะจุดของชุดข้อมูลหลัก
                    if (context.dataset.pointRadius === 0) return 'rgba(0,0,0,0)';
                    
                    const value = context.dataset.data[context.dataIndex].y;
                    return value < 50 ? '#28a745' : '#dc3545';
                } catch (e) {
                    return '#000';
                }
            },
            font: {
                weight: 'bold'
            },
            display: function(context) {
                // แสดงเฉพาะจุดของชุดข้อมูลหลัก
                return context.dataset.pointRadius > 0;
            }
        }
    } : {};

    // ตรวจสอบว่ามี annotation plugin หรือไม่
    const hasAnnotation = Chart.registry && 
                           Chart.registry.plugins && 
                           Chart.registry.plugins.get('annotation');

    // กำหนด annotation options
    const annotationConfig = hasAnnotation ? {
        annotation: {
            annotations: {
                line1: {
                    type: 'line',
                    yMin: 50,
                    yMax: 50,
                    borderColor: 'rgba(136, 136, 136, 0.7)',
                    borderWidth: 2,
                    borderDash: [6, 6],
                    label: {
                        content: 'ระดับความเสี่ยงสูง (50%)',
                        position: 'end'
                    }
                }
            }
        }
    } : {};

    // สร้างกราฟใหม่
    chartInstance = new Chart(ctx, {
        type: "line",
        data: {
            datasets: allDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            try {
                                // แสดงเฉพาะจุดของชุดข้อมูลหลัก
                                if (context.dataset.pointRadius === 0) return null;
                                
                                const dataPoint = context.raw;
                                if (!dataPoint || typeof dataPoint.y === 'undefined') return null;
                                
                                return `${context.dataset.label} | Risk: ${dataPoint.y.toFixed(2)}% | ${dataPoint.riskLevel}`;
                            } catch (e) {
                                return context.dataset.label;
                            }
                        }
                    }
                },
                legend: {
                    labels: {
                        filter: function(legendItem, data) {
                            // ซ่อนชุดข้อมูลพื้นที่สีใน legend
                            return !legendItem.text.includes('Area -');
                        }
                    }
                },
                ...dataLabelsConfig,
                ...annotationConfig
            },
            scales: {
                y: { 
                    min: yMin, 
                    max: yMax, 
                    title: { 
                        display: true, 
                        text: 'Risk (%)' 
                    },
                    ticks: {
                        padding: 10
                    }
                },
                x: { 
                    type: 'time',
                    time: {
                        unit: 'minute',
                        displayFormats: {
                            minute: 'HH:mm'
                        }
                    },
                    title: { 
                        display: true, 
                        text: 'Datetime' 
                    },
                    min: xMin,
                    max: xMax,
                    ticks: {
                        padding: 10
                    }
                }
            },
            parsing: false, // เพิ่มประสิทธิภาพสำหรับข้อมูลจำนวนมาก
            normalized: true
        },
        plugins: plugins
    });

    // เพิ่มเส้นแบ่งด้วย DOM Element (ถ้าไม่มี annotation plugin)
    if (!hasAnnotation) {
        setTimeout(() => {
            try {
                const chartArea = document.getElementById("riskChart");
                if (!chartArea) return;
                
                const chartContainer = chartArea.parentNode;
                
                // คำนวณตำแหน่ง Y ของเส้นแบ่ง 50%
                if (chartInstance && chartInstance.scales && chartInstance.scales.y) {
                    const yScale = chartInstance.scales.y;
                    const pixelY = yScale.getPixelForValue(50);
                    
                    if (pixelY) {
                        // สร้างเส้นแบ่งแบบ absolute positioning
                        const thresholdLine = document.createElement('div');
                        thresholdLine.className = 'threshold-line';
                        thresholdLine.style.position = 'absolute';
                        thresholdLine.style.width = '100%';
                        thresholdLine.style.left = '0';
                        thresholdLine.style.top = pixelY + 'px';
                        thresholdLine.style.borderTop = '2px dashed #888';
                        thresholdLine.style.zIndex = '10';
                        thresholdLine.style.pointerEvents = 'none';
                        
                        // ข้อความกำกับ
                        const thresholdLabel = document.createElement('div');
                        thresholdLabel.className = 'threshold-label';
                        thresholdLabel.style.position = 'absolute';
                        thresholdLabel.style.right = '10px';
                        thresholdLabel.style.top = (pixelY - 20) + 'px';
                        thresholdLabel.style.backgroundColor = 'rgba(255,255,255,0.7)';
                        thresholdLabel.style.padding = '2px 5px';
                        thresholdLabel.style.borderRadius = '3px';
                        thresholdLabel.style.fontSize = '12px';
                        thresholdLabel.style.zIndex = '11';
                        thresholdLabel.style.pointerEvents = 'none';
                        thresholdLabel.textContent = 'ระดับความเสี่ยงสูง (50%)';
                        
                        // ลบเส้นเดิมถ้ามี
                        const existingLine = chartContainer.querySelector('.threshold-line');
                        const existingLabel = chartContainer.querySelector('.threshold-label');
                        if (existingLine) chartContainer.removeChild(existingLine);
                        if (existingLabel) chartContainer.removeChild(existingLabel);
                        
                        // เพิ่มเส้นใหม่
                        chartContainer.style.position = 'relative';
                        chartContainer.appendChild(thresholdLine);
                        chartContainer.appendChild(thresholdLabel);
                    }
                }
            } catch (e) {
                console.error("Error adding threshold line:", e);
            }
        }, 500);
    }
    
    // เพิ่มข้อความแสดงความเปลี่ยนแปลงของความเสี่ยง (หลังจากกราฟสร้างเสร็จแล้ว)
    setTimeout(() => {
        try {
            const chartArea = document.getElementById("riskChart");
            if (!chartArea) return;
            
            const chartContainer = chartArea.parentNode;
            chartContainer.style.position = 'relative';
            
            // ลบลูกศรและข้อความเดิม
            const existingArrows = document.querySelectorAll('.risk-diff-arrow');
            const existingLabels = document.querySelectorAll('.risk-diff-label');
            const existingLines = document.querySelectorAll('.risk-diff-line');
            existingArrows.forEach(el => el.remove());
            existingLabels.forEach(el => el.remove());
            existingLines.forEach(el => el.remove());
            
            // เพิ่มข้อความสำหรับแต่ละการเปลี่ยนแปลง
            riskChanges.forEach(change => {
                if (Math.abs(change.diff) >= 1) { // แสดงเฉพาะการเปลี่ยนแปลงที่มากกว่า 1%
                    const xScale = chartInstance.scales.x;
                    const yScale = chartInstance.scales.y;
                    
                    // หาตำแหน่งของจุดเริ่มต้นและจุดสิ้นสุด
                    const fromX = xScale.getPixelForValue(change.fromDate);
                    const fromY = yScale.getPixelForValue(change.fromRisk);
                    const toX = xScale.getPixelForValue(change.toDate);
                    const toY = yScale.getPixelForValue(change.toRisk);
                    
                    // คำนวณความชันของเส้น
                    const slope = (toY - fromY) / (toX - fromX);
                    
                    // หาตำแหน่งกึ่งกลางระหว่างสองจุด
                    const midX = (fromX + toX) / 2;
                    const midY = (fromY + toY) / 2;
                    
                    // คำนวณตำแหน่งเยื้องของข้อความจากเส้น
                    let offsetX = 0;
                    let offsetY = 0;
                    
                    // ปรับตำแหน่งตามความชัน
                    if (Math.abs(slope) < 0.2) {
                        // เส้นแนวนอน - แสดงข้อความด้านบนหรือด้านล่าง
                        offsetY = -20;
                    } else if (Math.abs(slope) > 5) {
                        // เส้นแนวตั้ง - แสดงข้อความด้านข้าง
                        offsetX = 20;
                    } else {
                        // เส้นทำมุม - แสดงข้อความตั้งฉากกับเส้น
                        // คำนวณเวกเตอร์ตั้งฉากกับเส้น
                        const perpSlope = -1 / slope;
                        const angle = Math.atan(perpSlope);
                        const distance = 20; // ระยะห่างจากเส้น
                        
                        offsetX = Math.cos(angle) * distance;
                        offsetY = Math.sin(angle) * distance;
                        
                        // สลับทิศทางถ้าข้อความอยู่นอกพื้นที่กราฟ
                        if (midY + offsetY < 0 || midY + offsetY > chartArea.height) {
                            offsetX = -offsetX;
                            offsetY = -offsetY;
                        }
                    }
                    
                    // สร้างข้อความแสดงความเปลี่ยนแปลง
                    const diffLabel = document.createElement('div');
                    diffLabel.className = 'risk-diff-label';
                    diffLabel.style.position = 'absolute';
                    diffLabel.style.left = (midX + offsetX) + 'px';
                    diffLabel.style.top = (midY + offsetY) + 'px';
                    diffLabel.style.backgroundColor = 'rgba(255,255,255,0.9)';
                    diffLabel.style.border = `1px solid ${change.color}`;
                    diffLabel.style.color = change.color;
                    diffLabel.style.padding = '2px 5px';
                    diffLabel.style.borderRadius = '4px';
                    diffLabel.style.fontSize = '10px';
                    diffLabel.style.fontWeight = 'bold';
                    diffLabel.style.zIndex = '12';
                    diffLabel.style.transform = 'translate(-50%, -50%)';
                    diffLabel.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
                    diffLabel.style.pointerEvents = 'none'; // ทำให้คลิกผ่านได้
                    
                    // เพิ่มเส้นประที่เชื่อมระหว่างเส้นกราฟกับข้อความ
                    if (Math.abs(offsetX) > 10 || Math.abs(offsetY) > 10) {
                        const connectLine = document.createElement('div');
                        connectLine.className = 'risk-diff-line';
                        connectLine.style.position = 'absolute';
                        connectLine.style.left = midX + 'px';
                        connectLine.style.top = midY + 'px';
                        connectLine.style.backgroundColor = change.color;
                        connectLine.style.opacity = '0.5';
                        connectLine.style.zIndex = '11';
                        connectLine.style.pointerEvents = 'none';
                        
                        // ความยาวของเส้น
                        const lineLength = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
                        connectLine.style.width = lineLength + 'px';
                        
                        // คำนวณมุมหมุนของเส้น
                        const angle = Math.atan2(offsetY, offsetX) * (180 / Math.PI);
                        connectLine.style.transformOrigin = '0 0';
                        connectLine.style.transform = `rotate(${angle}deg)`;
                        connectLine.style.height = '1px';
                        
                        chartContainer.appendChild(connectLine);
                    }
                    
                    // กำหนดข้อความแสดงความเปลี่ยนแปลง
                    const sign = change.diff > 0 ? '+' : '';
                    diffLabel.textContent = `${sign}${change.diff.toFixed(2)}%`;
                    
                    // เพิ่มข้อความ
                    chartContainer.appendChild(diffLabel);
                }
            });
        } catch (e) {
            console.error("Error adding risk difference labels:", e);
        }

    }, 700); // รอให้กราฟสร้างเสร็จก่อน
    setTimeout(() => {
        createRiskChangeSummary(riskChanges);
    }, 800);
}

Chart.register(ChartDataLabels);
// ฟังก์ชันพล็อตกราฟ
// ฟังก์ชันพล็อตกราฟ
let chartInstance;
function updateChart() {
    // ใช้ฟังก์ชันสร้างกราฟแบบแยกสีตามระดับความเสี่ยง
    createSplitAreaChart();
}

// ทดสอบการทำงานของกราฟ
console.log("Chart function has been updated");



// ✅ ฟังก์ชันสุ่มสีพาสเทลจากเทมเพลต
function randomColor() {
    const pastelColors = [
        "#4fd1d9", "#ff66c4", "#ffac2e", "#ff575e", "#ff9750", // พาสเทลสดใส
        "#ffe251", "#60c27d", "#0a4a9f", "#FFABAB", "#763196", // โทนอ่อน
    ];

    return pastelColors[Math.floor(Math.random() * pastelColors.length)];
}

// ✅ ฟังก์ชันเคลียร์ตัวกรอง (Filter)
function clearFilters() {
    // รีเซ็ต Dropdown และ Input สำหรับระบบกรองแบบเดิม (ถ้ายังคงมีอยู่)
    const categorySelect = document.getElementById("categorySelect");
    if (categorySelect) {
        categorySelect.selectedIndex = 0;
        
        const valueSelect = document.getElementById("valueSelect");
        const conditionSelect = document.getElementById("conditionSelect");
        const input1 = document.getElementById("input1");
        const input2 = document.getElementById("input2");
        
        if (valueSelect) valueSelect.style.display = "none";
        if (conditionSelect) conditionSelect.style.display = "none";
        if (input1) {
            input1.style.display = "none";
            input1.value = "";
        }
        if (input2) {
            input2.style.display = "none";
            input2.value = "";
        }
        
        if (valueSelect) valueSelect.innerHTML = "";
    }
    
    // เคลียร์ตัวกรองแบบใหม่
    activeFilters = {}; // รีเซ็ตตัวกรองทั้งหมด
    
    // แสดงแถวทั้งหมดในตาราง
    const rows = document.querySelectorAll("#history-body tr");
    rows.forEach(row => {
        row.style.display = ""; // แสดงแถวทั้งหมด
    });
    
    // อัปเดตไอคอนตัวกรอง (ถ้ามี)
    if (typeof updateFilterIcons === 'function') {
        updateFilterIcons();
    }
    
    console.log("All filters cleared"); // Log เพื่อยืนยันว่าฟังก์ชันทำงาน
}
// ✅ ฟังก์ชันเคลียร์การเลือกแถว + กราฟ
function clearSelection() {
    selectedRows = []; // เคลียร์แถวที่เลือก

    let rows = document.querySelectorAll("#history-body tr");
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
        let rows = document.querySelectorAll("#history-body tr");
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

// ฟังก์ชันแปลงค่า Risk เป็น Risk Level
function getRiskLevel(riskValue) {
    const risk = parseFloat(riskValue);
    if (risk <= 20) {
        return "Very Low Risk";
    } else if (risk <= 50) {
        return "Low Risk";
    } else if (risk <= 80) {
        return "Moderate Risk";
    } else {
        return "High Risk";
    }
}

// ฟังก์ชันกำหนดสีของ Risk Level
function getRiskLevelColor(riskValue) {
    const risk = parseFloat(riskValue);
    if (risk <= 20) {
        return "#28a745"; // สีเขียวเข้ม
    } else if (risk <= 50) {
        return "#5cb85c"; // สีเขียวอ่อน
    } else if (risk <= 80) {
        return "#ffc107"; // สีเหลือง
    } else {
        return "#dc3545"; // สีแดง
    }
}

function getRiskLevelClass(riskValue) {
    const risk = parseFloat(riskValue);
    if (risk <= 20) {
        return "risk-none";
    } else if (risk <= 50) {
        return "risk-low";
    } else if (risk <= 80) {
        return "risk-medium";
    } else {
        return "risk-high";
    }
}
function checkChartDependencies() {
    console.log("Checking Chart.js dependencies...");
    
    // ตรวจสอบว่ามี Chart หรือไม่
    if (typeof Chart === 'undefined') {
        console.error("Chart.js not loaded! Please include Chart.js library.");
        alert("ไม่พบไลบรารี Chart.js โปรดติดต่อผู้ดูแลระบบ");
        return false;
    }
    
    console.log("Chart.js version:", Chart.version);
    
    // ตรวจสอบว่ามี ChartDataLabels plugin หรือไม่
    if (typeof ChartDataLabels === 'undefined') {
        console.warn("ChartDataLabels plugin not found. Labels on chart will not be displayed.");
        
        // ถ้าเป็นหน้าที่มี CDN เราสามารถลองโหลด plugin ได้
        try {
            // ตรวจสอบว่ามีการโหลด plugin นี้แล้วหรือไม่
            const existingScript = document.querySelector('script[src*="chartjs-plugin-datalabels"]');
            if (!existingScript) {
                console.log("Attempting to load ChartDataLabels plugin...");
                const script = document.createElement('script');
                script.src = "https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0";
                script.async = true;
                script.onload = function() {
                    console.log("ChartDataLabels plugin loaded successfully!");
                    // อาจต้องลงทะเบียน plugin หลังจากโหลด (ขึ้นอยู่กับเวอร์ชัน Chart.js)
                    if (typeof ChartDataLabels !== 'undefined' && Chart.register) {
                        Chart.register(ChartDataLabels);
                        console.log("ChartDataLabels plugin registered!");
                    }
                };
                script.onerror = function() {
                    console.error("Failed to load ChartDataLabels plugin.");
                };
                document.head.appendChild(script);
            }
        } catch (e) {
            console.error("Error loading ChartDataLabels plugin:", e);
        }
    } else {
        console.log("ChartDataLabels plugin found.");
    }
    
    // ตรวจสอบว่ามี Chart.js Annotation plugin หรือไม่
    let hasAnnotationPlugin = false;
    
    // ตรวจสอบตามเวอร์ชันของ Chart.js
    if (Chart.registry && Chart.registry.plugins) {
        hasAnnotationPlugin = Chart.registry.plugins.get('annotation') != null;
    } else if (Chart.plugins && Chart.plugins.getAll) {
        hasAnnotationPlugin = Chart.plugins.getAll().some(p => p.id === 'annotation');
    }
    
    if (!hasAnnotationPlugin) {
        console.warn("Chart.js Annotation plugin not found. Will use DOM elements instead.");
        
        // ลองโหลด annotation plugin
        try {
            const existingScript = document.querySelector('script[src*="chartjs-plugin-annotation"]');
            if (!existingScript) {
                console.log("Attempting to load Annotation plugin...");
                const script = document.createElement('script');
                script.src = "https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@1.0.2";
                script.async = true;
                script.onload = function() {
                    console.log("Annotation plugin loaded successfully!");
                    if (Chart.register) {
                        try {
                            const ChartAnnotation = window.ChartAnnotation || null;
                            if (ChartAnnotation) {
                                Chart.register(ChartAnnotation);
                                console.log("Annotation plugin registered!");
                            }
                        } catch (e) {
                            console.error("Error registering Annotation plugin:", e);
                        }
                    }
                };
                script.onerror = function() {
                    console.error("Failed to load Annotation plugin.");
                };
                document.head.appendChild(script);
            }
        } catch (e) {
            console.error("Error loading Annotation plugin:", e);
        }
    } else {
        console.log("Annotation plugin found.");
    }
    
    // ตรวจสอบว่ามี Date adapter หรือไม่
    let hasDateAdapter = false;
    
    if (Chart._adapters && Chart._adapters._date) {
        hasDateAdapter = true;
    } else if (Chart.registry && Chart.registry.elements && Chart.registry.elements.get('time')) {
        hasDateAdapter = true;
    }
    
    if (!hasDateAdapter) {
        console.warn("Chart.js Date adapter not found. Time scale may not work properly.");
        
        // ลองโหลด date-fns adapter
        try {
            const existingScript = document.querySelector('script[src*="chartjs-adapter-date-fns"]');
            if (!existingScript) {
                console.log("Attempting to load date-fns adapter...");
                const script = document.createElement('script');
                script.src = "https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns";
                script.async = true;
                script.onload = function() {
                    console.log("date-fns adapter loaded successfully!");
                };
                script.onerror = function() {
                    console.error("Failed to load date-fns adapter.");
                };
                document.head.appendChild(script);
            }
        } catch (e) {
            console.error("Error loading date-fns adapter:", e);
        }
    } else {
        console.log("Date adapter found.");
    }
    
    return true;
}

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, checking chart dependencies...");
    checkChartDependencies();
    
    // เพิ่ม CSS สำหรับเส้นแบ่งในกราฟ (ถ้ายังไม่มี)
    const existingStyle = document.getElementById('chart-threshold-style');
    if (!existingStyle) {
        const style = document.createElement('style');
        style.id = 'chart-threshold-style';
        style.textContent = `
            .threshold-line {
                position: absolute;
                border-top: 2px dashed #888;
                width: 100%;
                z-index: 10;
                pointer-events: none;
                opacity: 0.7;
            }
            .threshold-label {
                position: absolute;
                background-color: rgba(255,255,255,0.7);
                padding: 2px 5px;
                border-radius: 3px;
                font-size: 12px;
                z-index: 11;
                pointer-events: none;
            }
            .chart-container {
                position: relative;
            }
        `;
        document.head.appendChild(style);
    }
});




// // ✅ โหลดค่าเริ่มต้น
// document.addEventListener("DOMContentLoaded", () => {
//     updateFilterOptions();
// });