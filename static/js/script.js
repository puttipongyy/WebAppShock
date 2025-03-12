// document.querySelectorAll('input[type="file"]').forEach(input => {
//     input.addEventListener('change', function () {
//         const fileName = this.files[0]?.name || `Upload ${this.id.charAt(0).toUpperCase() + this.id.slice(1)} File`;
//         document.getElementById(`${this.id}-label`).textContent = fileName;
//     });
// });

// document.querySelectorAll('input[type="file"]').forEach(input => {
//     input.addEventListener('change', function () {
//         const fileName = this.files[0]?.name || `Upload ${this.id.charAt(0).toUpperCase() + this.id.slice(1)} File`;
//         const label = document.getElementById(`${this.id}-label`);
//         const progressBar = document.getElementById(`${this.id}-progress`);

//         label.textContent = fileName;

//         if (this.files[0]) {
//             // แสดง progress bar
//             progressBar.style.display = "block";

//             const file = this.files[0];
//             const formData = new FormData();
//             formData.append(this.id, file);

//             // สร้าง XMLHttpRequest เพื่ออัปโหลดไฟล์
//             const xhr = new XMLHttpRequest();
//             xhr.open("POST", "/upload", true); // Endpoint สำหรับอัปโหลดไฟล์

//             // ติดตามสถานะการอัปโหลด
//             xhr.upload.addEventListener("progress", (event) => {
//                 if (event.lengthComputable) {
//                     const percentComplete = (event.loaded / event.total) * 100;
//                     progressBar.value = percentComplete; // อัปเดต progress bar
//                 }
//             });

//             // ซ่อน progress bar เมื่ออัปโหลดเสร็จ
//             xhr.addEventListener("load", () => {
//                 if (xhr.status === 200) {
//                     progressBar.value = 100;
//                     alert("Upload complete!");
//                 } else {
//                     alert("Upload failed. Please try again.");
//                 }
//                 progressBar.style.display = "none";
//             });

//             // จัดการข้อผิดพลาด
//             xhr.addEventListener("error", () => {
//                 alert("An error occurred while uploading the file.");
//                 progressBar.style.display = "none";
//             });

//             xhr.send(formData);
//         }
//     });
// });

// document.querySelectorAll('input[type="file"]').forEach(input => {
//     input.addEventListener('change', function () {
//         const fileName = this.files[0]?.name || `Upload ${this.id.charAt(0).toUpperCase() + this.id.slice(1)} File`;
//         const label = document.getElementById(`${this.id}-label`);
//         const progressBar = document.getElementById(`${this.id}-progress`);

//         label.textContent = fileName;

//         if (this.files[0]) {
//             // แสดง progress bar
//             const progressBar = document.getElementById(`${this.id}-progress`);
//             progressBar.style.display = "block";

//             const file = this.files[0];
//             const formData = new FormData();
//             formData.append('file', file);
//             formData.append('file_key', this.id); // เพิ่มข้อมูลว่าไฟล์นี้คือไฟล์อะไร

//             // สร้าง XMLHttpRequest เพื่ออัปโหลดไฟล์
//             const xhr = new XMLHttpRequest();
//             xhr.open("POST", "/upload", true); // Endpoint สำหรับอัปโหลดไฟล์

//             // ติดตามสถานะการอัปโหลด
//             xhr.upload.addEventListener("progress", (event) => {
//                 if (event.lengthComputable) {
//                     const percentComplete = (event.loaded / event.total) * 100;
//                     progressBar.value = percentComplete; // อัปเดต progress bar
//                 }
//             });

//             // ซ่อน progress bar เมื่ออัปโหลดเสร็จ
//             xhr.addEventListener("load", () => {
//                 if (xhr.status === 200) {
//                     progressBar.value = 100;
//                     alert(xhr.responseText); // แจ้งเตือนเมื่ออัปโหลดเสร็จ
//                 } else {
//                     alert("Upload failed. Please try again.");
//                 }
//                 progressBar.style.display = "none";
//             });

//             // จัดการข้อผิดพลาด
//             xhr.addEventListener("error", () => {
//                 alert("An error occurred while uploading the file.");
//                 progressBar.style.display = "none";
//             });

//             xhr.send(formData);
//         }
//     });
// });

// document.querySelectorAll('input[type="file"]').forEach(input => {
//     input.addEventListener('change', function () {
//         const fileName = this.files[0]?.name || `Upload ${this.id.charAt(0).toUpperCase() + this.id.slice(1)} File`;
//         const label = document.getElementById(`${this.id}-label`);
//         const progressBar = document.getElementById(`${this.id}-progress`);

//         if (!label || !progressBar) {
//             console.error(`[ERROR] Label or Progress Bar not found for ${this.id}`);
//             return;
//         }

//         label.textContent = fileName;

//         if (this.files[0]) {
//             progressBar.style.display = "block"; // แสดง Progress Bar

//             const file = this.files[0];
//             const formData = new FormData();
//             formData.append('file', file);
//             formData.append('file_key', this.id); // ชื่อไฟล์ เช่น admission, bedccr

//             const xhr = new XMLHttpRequest();
//             xhr.open("POST", "/upload", true); // แก้ไข Endpoint ให้ตรงกับฟังก์ชัน Flask

//             // ติดตามสถานะการอัปโหลด
//             xhr.upload.addEventListener("progress", (event) => {
//                 if (event.lengthComputable) {
//                     const percentComplete = (event.loaded / event.total) * 100;
//                     progressBar.value = percentComplete; // อัปเดต Progress Bar
//                 }
//             });

//             // การจัดการคำตอบ
//             xhr.addEventListener("load", () => {
//                 if (xhr.status === 200) {
//                     progressBar.value = 100;
//                     alert(xhr.responseText); // แจ้งเตือนว่าอัปโหลดสำเร็จ
//                 } else if (xhr.status >= 400 && xhr.status < 500) {
//                     alert(`Client error: ${xhr.responseText}`); // แจ้งเตือนข้อผิดพลาดฝั่งไคลเอนต์
//                 } else if (xhr.status >= 500) {
//                     alert("Server error. Please try again later."); // แจ้งเตือนข้อผิดพลาดฝั่งเซิร์ฟเวอร์
//                 }
//                 progressBar.style.display = "none"; // ซ่อน Progress Bar
//             });

//             // จัดการข้อผิดพลาด
//             xhr.addEventListener("error", () => {
//                 alert("An error occurred while uploading the file.");
//                 progressBar.style.display = "none";ห
//             });

//             // ส่งคำขอ
//             xhr.send(formData);
//         }
//     });
// });
// --------------------------------------------------------------------------------------------
// document.querySelectorAll('input[type="file"]').forEach(input => {
//     input.addEventListener('change', function () {
//         console.log(`[DEBUG] File selected: ${this.files[0]?.name || 'No file selected'}`);
//         console.log(`[DEBUG] Sending POST request to /upload for key: ${this.id}`);

//         const fileName = this.files[0]?.name || `Upload ${this.id.charAt(0).toUpperCase() + this.id.slice(1)} File`;
//         const label = document.getElementById(`${this.id}-label`);
//         const progressBar = document.getElementById(`${this.id}-progress`);

//         if (!label || !progressBar) {
//             console.error(`[ERROR] Label or Progress Bar not found for ${this.id}`);
//             return;
//         }

//         label.textContent = fileName;

//         if (this.files[0]) {
//             progressBar.style.display = "block";

//             const file = this.files[0];
//             const formData = new FormData();
//             formData.append('file', file);
//             formData.append('file_key', this.id);

//             const xhr = new XMLHttpRequest();
//             xhr.open("POST", "/upload", true);

//             xhr.upload.addEventListener("progress", (event) => {
//                 if (event.lengthComputable) {
//                     const percentComplete = (event.loaded / event.total) * 100;
//                     progressBar.value = percentComplete;
//                 }
//             });

//             xhr.addEventListener("load", () => {
//                 if (xhr.status === 200) {
//                     console.log(`[DEBUG] Upload successful for key: ${this.id}`);
//                     progressBar.value = 100;
//                     alert(xhr.responseText);
//                 } else {
//                     console.error(`[DEBUG] Upload failed for key: ${this.id}`);
//                     alert("Upload failed. Please try again.");
//                 }
//                 progressBar.style.display = "none";
//             });

//             xhr.addEventListener("error", () => {
//                 console.error(`[DEBUG] Error during upload for key: ${this.id}`);
//                 alert("An error occurred while uploading the file.");
//                 progressBar.style.display = "none";
//             });

//             xhr.send(formData);
//         }
//     });
// });
// -------------------------------------------------------------------------------------------

document.querySelectorAll('input[type="file"]').forEach(input => {
    input.addEventListener('change', function () {
        console.log(`[DEBUG] File selected: ${this.files[0]?.name || 'No file selected'}`);
        console.log(`[DEBUG] Sending POST request to /upload_single for key: ${this.id}`);

        const fileName = this.files[0]?.name || `Upload ${this.id.charAt(0).toUpperCase() + this.id.slice(1)} File`;
        const label = document.getElementById(`${this.id}-label`);
        const progressBar = document.getElementById(`${this.id}-progress`);

        if (!label || !progressBar) {
            console.error(`[ERROR] Label or Progress Bar not found for ${this.id}`);
            return;
        }

        label.textContent = fileName;

        if (this.files[0]) {
            progressBar.style.display = "block";

            const file = this.files[0];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('file_key', this.id);

            const xhr = new XMLHttpRequest();
            // เปลี่ยน endpoint เป็น /upload_single
            xhr.open("POST", "/upload_single", true);

            xhr.upload.addEventListener("progress", (event) => {
                if (event.lengthComputable) {
                    const percentComplete = (event.loaded / event.total) * 100;
                    progressBar.value = percentComplete;
                }
            });

            xhr.addEventListener("load", () => {
                if (xhr.status === 200) {
                    console.log(`[DEBUG] Upload successful for key: ${this.id}`);
                    progressBar.value = 100;
                    alert(xhr.responseText);
                } else {
                    console.error(`[DEBUG] Upload failed for key: ${this.id}`);
                    alert("Upload failed. Please try again.");
                }
                progressBar.style.display = "none";
            });

            xhr.addEventListener("error", () => {
                console.error(`[DEBUG] Error during upload for key: ${this.id}`);
                alert("An error occurred while uploading the file.");
                progressBar.style.display = "none";
            });

            xhr.send(formData);
        }
    });
});
