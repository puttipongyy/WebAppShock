// // script2.js

// // เมื่อกดปุ่ม "Start" หรือ "Predict"
// document.getElementById('predict-button').addEventListener('click', () => {
//     // เรียกไปที่ /predict ด้วย method POST
//     fetch('/predict', { method: 'POST' })
//         .then(response => {
//             if (!response.ok) {
//                 // ถ้า status code != 200 โยน error
//                 return response.text().then(text => { throw new Error(text) });
//             }
//             return response.text();
//         })
//         .then(data => {
//             // แสดงผลลัพธ์จากการ Prediction
//             alert(data);
//         })
//         .catch(err => {
//             alert("Prediction failed: " + err.message);
//         });
// });

// ---------------------------------------------------------------------------
// console.log("script2.js loaded!");

// // ดึง Element จากหน้า HTML
// const predictBtn = document.getElementById('predict-button');
// const progressContainer = document.getElementById('progress-container');
// const progressBar = document.getElementById('progress-bar');
// const progressMsg = document.getElementById('progress-message');
// const progressPct = document.getElementById('progress-percentage');

// predictBtn.addEventListener('click', () => {
//   // เมื่อกดปุ่ม ให้เรียก /predict ก่อน
//   fetch('/predict', { method: 'POST' })
//     .then(res => {
//       if (!res.ok) {
//         // ถ้า status code != 200 ให้แสดง error
//         return res.text().then(text => { throw new Error(text); });
//       }
//       // ถ้าเริ่มประมวลผลได้สำเร็จ ให้โชว์ progressContainer
//       progressContainer.style.display = 'block';

//       // จากนั้นเริ่มเชื่อมต่อ SSE เพื่อติดตามความคืบหน้า
//       listenProgress();
//     })
//     .catch(err => {
//       alert("Error: " + err.message);
//     });
// });

// function listenProgress() {
//   // เรียกใช้ EventSource มาที่ /progress
//   const evtSource = new EventSource('/progress');

//   evtSource.onmessage = function (event) {
//     if (!event.data) return;
//     const data = JSON.parse(event.data);
//     // data = { percentage: number, message: string, is_running: bool }

//     // อัปเดต UI ของ Progress Bar และข้อความ
//     progressBar.value = data.percentage;
//     progressPct.textContent = data.percentage + "%";
//     progressMsg.textContent = data.message;

//     // เช็คว่าประมวลผลจบหรือยัง
//     if (data.percentage >= 100 || data.is_running === false) {
//       // ปิดการเชื่อมต่อ SSE
//       evtSource.close();

//       // แสดงข้อความสุดท้าย (เช่น "Inference เสร็จสิ้น! ผลลัพธ์: ...")
//       alert(data.message);

//       // ถ้าต้องการให้หน้าต่าง progress หายไป หรือ reset ก็ทำได้ เช่น:
//       // progressContainer.style.display = 'none';
//       // progressBar.value = 0;
//       // progressPct.textContent = "0%";
//       // progressMsg.textContent = "";
//     }
//   };

//   // ถ้าการเชื่อมต่อ SSE หลุดหรือ error
//   evtSource.onerror = function () {
//     console.log("EventSource failed.");
//     evtSource.close();
//   };
// }

// ---------------------------------------------------------------------------
console.log("script2.js loaded!");

// ดึง Element จากหน้า HTML
const predictBtn = document.getElementById('predict-button');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressMsg = document.getElementById('progress-message');
const progressPct = document.getElementById('progress-percentage');
const resultContainer = document.getElementById('result-container'); // เพิ่มสำหรับแสดงผลลัพธ์

predictBtn.addEventListener('click', () => {
  // เมื่อกดปุ่ม ให้เรียก /predict ก่อน
  fetch('/predict', { method: 'POST' })
    .then(res => {
      if (!res.ok) {
        // ถ้า status code != 200 ให้แสดง error
        return res.text().then(text => { throw new Error(text); });
      }
      // ถ้าเริ่มประมวลผลได้สำเร็จ ให้โชว์ progressContainer
      progressContainer.style.display = 'block';

      // จากนั้นเริ่มเชื่อมต่อ SSE เพื่อติดตามความคืบหน้า
      listenProgress();
    })
    .catch(err => {
      alert("Error: " + err.message);
    });
});

function listenProgress() {
  // เรียกใช้ EventSource มาที่ /progress
  const evtSource = new EventSource('/progress');

  evtSource.onmessage = function (event) {
    if (!event.data) return;
    const data = JSON.parse(event.data);
    // data = { percentage: number, message: string, is_running: bool, result?: { probabilities, predicted_class } }

    // อัปเดต UI ของ Progress Bar และข้อความ
    progressBar.value = data.percentage;
    progressPct.textContent = data.percentage + "%";
    progressMsg.textContent = data.message;

    // เช็คว่าประมวลผลจบหรือยัง
    if (data.percentage >= 100 || data.is_running === false) {
      // ปิดการเชื่อมต่อ SSE
      evtSource.close();

      // แสดงข้อความสุดท้าย
      if (data.result) {
        // แสดงผลลัพธ์การทำนายใน resultContainer
        // const probabilities = data.result.probabilities.join(", ");
        // const predictedClasses = data.result.predicted_class.join(", ");

        // window.location.href = "/result?probabilities=" + encodeURIComponent(probabilities) + "&predicted_classes=" + encodeURIComponent(predictedClasses);
        const encodedData = encodeURIComponent(JSON.stringify(data.result));
        window.location.href = `/result?data=${encodedData}`;
      } else {
        alert(data.message); // แสดงข้อความทั่วไป
      }

      // ถ้าต้องการให้หน้าต่าง progress หายไป หรือ reset:
      progressContainer.style.display = 'none';
      progressBar.value = 0;
      progressPct.textContent = "0%";
      progressMsg.textContent = "";
    }
  };

  // ถ้าการเชื่อมต่อ SSE หลุดหรือ error
  evtSource.onerror = function () {
    console.log("EventSource failed.");
    evtSource.close();
  };
}

