#-----------------------------------------------------------------
from flask import Flask, render_template, request, Response, jsonify
import os, time, json, threading
from preprocess import preprocess_pipeline
from model import run_inference
import urllib.parse
from datetime import datetime


app = Flask(__name__)

UPLOAD_FOLDER = './uploads'
ALLOWED_EXTENSIONS = {'csv'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# สร้างโฟลเดอร์ถ้ายังไม่มี
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# ============ ตัวแปรส่วนกลางเพื่อเก็บสถานะและกันซ้ำ ============
progress_status = {
    "percentage": 0,
    "message": "Ready",
    "is_running": False
}
history_results = []

def set_progress(percentage: int, message: str):
    """อัปเดตสถานะลงใน progress_status"""
    progress_status["percentage"] = percentage
    progress_status["message"] = message
    # is_running จะเป็น True ในช่วงที่ pipeline ทำงาน
    # สุดท้ายค่อยเปลี่ยนเป็น False
    # (ถ้าต้องการให้เช็คได้ว่ากระบวนการจบแล้วจริง ๆ)
    print(f"[INFO] {percentage}% - {message}")  # ลอง print ดูใน console ด้วย

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def new_home():
    return render_template('index.html')

@app.route('/upload_single', methods=['POST'])
def upload_single():
    if 'file_key' not in request.form:
        return "Missing file_key in form data", 400
    file_key = request.form['file_key']

    if 'file' not in request.files:
        return f"Missing file for {file_key}", 400
    file = request.files['file']

    if file.filename == '' or not allowed_file(file.filename):
        return f"Invalid or missing file for {file_key}. Only CSV files are allowed.", 400

    try:
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_key}.csv")
        file.save(save_path)
        print(f"[INFO] Saved file: {save_path}")
        return f"Upload of {file_key} successful!", 200
    except Exception as e:
        print(f"[ERROR] Could not save file for {file_key}: {e}")
        return f"Server error: {e}", 500

# ----- ฟังก์ชันเบื้องหลังที่จะถูกเรียกผ่าน Thread ----- #
def background_preprocess_and_predict(file_paths):
    """
    ฟังก์ชัน Background สำหรับรัน Preprocessing และ Inference
    """
    try:
        # อัปเดตสถานะเริ่มต้น
        progress_status["is_running"] = True
        set_progress(0, "เริ่มการ Preprocessing...")

        # เรียกใช้ Preprocessing Pipeline
        df_info_chan, admission_ids, X_static, X_hourly, X_minutely = preprocess_pipeline(file_paths, set_progress_fn=set_progress)
        set_progress(81, "Preprocessing เสร็จสิ้น กำลังเริ่มทำนายผล...")

        # เรียกใช้ Inference
        y_prob, y_class = run_inference(X_static, X_hourly, X_minutely)
        set_progress(100, "ทำนายผลสำเร็จ!")
        # จัดรูปแบบผลลัพธ์ให้เชื่อมโยงกับ BedID, Age, Sex
        results = []
        for i, admission_id in enumerate(admission_ids):
            patient_info = df_info_chan[df_info_chan['AdmissionID'] == admission_id].iloc[0]

            # แปลงค่าความเสี่ยงเป็นเปอร์เซ็นต์
            risk_percentage = float(y_prob[i].item()) * 100
            risk_str = f"{risk_percentage:.2f}%".replace("%", "")

            # แปลงค่า Sex เป็น "Male" / "Female"
            sex_str = "Male" if int(patient_info["Sex"]) == 1 else "Female"
            
            # กำหนดระดับความเสี่ยง
            risk_level = ""
            if risk_percentage <= 20:
                risk_level = "Very Low Risk"
            elif risk_percentage <= 50:
                risk_level = "Low Risk"
            elif risk_percentage <= 80:
                risk_level = "Moderate Risk"
            else:
                risk_level = "High Risk"

            current_datetime = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            results.append({
                "Datetime": current_datetime,
                "BedID": str(patient_info["BedID"]),
                "Age": int(patient_info["Age"]),
                "Sex": sex_str,
                "Prediction": "Shock" if y_class[i] == 1 else "Non-shock",
                "Risk": risk_str,
                "RiskLevel": risk_level  # เพิ่มข้อมูล Risk Level
            })

        # ไม่ต้อง encode JSON ที่นี่ ส่งเป็น dictionary ปกติ
        history_results.extend(results)
        progress_status["result"] = results  
        
    except Exception as e:
        set_progress(100, f"เกิดข้อผิดพลาด: {str(e)}")

    finally:
        progress_status["is_running"] = False

@app.route('/predict', methods=['POST'])
def predict():
    required_keys = ['admission', 'bedccr', 'redcap', 'intakeoutput', 'monitortrack']
    file_paths = {}

    # ตรวจสอบไฟล์ที่จำเป็น
    for key in required_keys:
        path = os.path.join(app.config['UPLOAD_FOLDER'], f"{key}.csv")
        if not os.path.exists(path):
            return jsonify({"error": f"File {key}.csv not found on server. Please upload first."}), 400
        file_paths[key] = path

    # ตรวจสอบว่ากำลังประมวลผลอยู่หรือไม่
    if progress_status["is_running"]:
        return jsonify({"error": "Processing is already in progress."}), 400

    # เรียก Thread เพื่อรัน Preprocessing และ Predict
    thread = threading.Thread(target=background_preprocess_and_predict, args=(file_paths,))
    thread.start()

    return jsonify({"message": "เริ่มการประมวลผลแล้ว"}), 200

@app.route('/progress')
def progress():
    """
    ส่งข้อมูล progress_status กลับไปเป็น SSE (text/event-stream)
    โดยหน้าเว็บจะเชื่อมต่อเข้ามาและรับ message onmessage ตลอดเวลา
    """
    def generate():
        while True:
            # แปลง progress_status เป็น json
            json_data = json.dumps(progress_status, ensure_ascii=False)
            
            # ตรวจสอบว่ามีผลลัพธ์ (result) แล้วหรือไม่
            if "result" in progress_status and progress_status["result"]:
                # เพิ่มการแสดงผลของผลลัพธ์ใน JSON
                json_data = json.dumps({
                    "percentage": progress_status["percentage"],
                    "message": progress_status["message"],
                    "is_running": progress_status["is_running"],
                    "result": progress_status["result"]
                }, ensure_ascii=False)
            
            yield f"data: {json_data}\n\n"
            time.sleep(1)  # ส่งข้อมูลทุก ๆ 1 วินาที

    return Response(generate(), mimetype='text/event-stream')

@app.route('/history')
def history():
    """แสดงหน้าประวัติการทำนาย"""
    return render_template('index5.html')

@app.route('/history-data')
def history_data():
    """API ส่งข้อมูลประวัติไปให้หน้าเว็บ"""
    return jsonify(history_results)

@app.route('/result')
def index4():
    return render_template('index4.html')

@app.route('/upload')
def upload_form():
    return render_template('index2.html')

@app.route('/details')
def file_details():
    return render_template('index3.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0',debug=True,port=5006)
    # app.run(debug=True)
 