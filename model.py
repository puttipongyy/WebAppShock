# import torch

# def run_inference(df):
#     # ตัวอย่าง: แปลง DataFrame เป็น Tensor
#     # สมมติว่าคุณต้องการเฉพาะบาง column เช่น ['col1','col2','col3']
#     import torch
#     X = torch.tensor(df[['col1','col2','col3']].values, dtype=torch.float32)

#     # โหลดโมเดล (อาจทำแค่ครั้งเดียวตอนเริ่ม)
#     model = torch.load('my_pytorch_model.pth')
#     model.eval()

#     with torch.no_grad():
#         outputs = model(X)
#         # สมมติเป็น binary classification
#         predicted = torch.round(torch.sigmoid(outputs))  
#     return predicted.numpy().tolist()
# models/model.py

import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
print("TensorFlow import สำเร็จ!")

# สมมติคุณยังต้องการใช้ฟังก์ชันเหล่านี้ตอน inference
# (หากไฟล์ .h5 ของคุณต้องการ Input เป็น (static_input, window_input))
def generate_static_windows(static_data, num_windows, time_window_size):
    static_windows = np.repeat(static_data[:, np.newaxis, np.newaxis, :], num_windows, axis=1)
    static_windows = np.repeat(static_windows, time_window_size, axis=2)
    return static_windows

def transform_hourly_to_window(hourly_data, time_window_size, hour_num=24):
    minutes_per_hour = 60
    total_minutes = hour_num * minutes_per_hour
    num_windows = total_minutes // time_window_size

    data_minute_level = np.repeat(hourly_data, repeats=minutes_per_hour, axis=1)
    hourly_windows = data_minute_level.reshape(
        hourly_data.shape[0],
        num_windows,
        time_window_size,
        hourly_data.shape[2]
    )
    return hourly_windows

def create_sliding_windows(data, window_size, step_size):
    num_samples, timesteps, num_features = data.shape
    windows = []
    for sample in range(num_samples):
        sample_windows = [
            data[sample, start:start + window_size, :]
            for start in range(0, timesteps - window_size + 1, step_size)
        ]
        windows.append(sample_windows)
    return np.array(windows)

# ----------------------
# ตัวแปร global เก็บโมเดล (เพื่อไม่ต้อง load ซ้ำ)
_LOADED_MODEL = None

def load_my_model(model_path="models/my_keras_model.h5"):
    """
    โหลดโมเดล Keras จากไฟล์ .h5 (หรือจะเป็น SavedModel folder ก็ได้)
    เก็บโมเดลในตัวแปร global เพื่อลด overhead การโหลดซ้ำ
    """
    global _LOADED_MODEL
    if _LOADED_MODEL is None:
        print(f"[INFO] Loading model from: {model_path}")
        _LOADED_MODEL = load_model(model_path, compile=True)
    return _LOADED_MODEL

def run_inference(X_static, X_hourly, X_minutely,
                  time_window_size=10, hour_num=24,
                  window_size=10, step_size=10):
    """
    รับข้อมูล 3 ส่วน: static, hourly, minutely (รูปแบบ array)
    จากนั้นแปลงตามฟังก์ชันที่เคยใช้ตอนเทรน
    เรียก predict() กับโมเดล
    คืนผลลัพธ์ (prob หรือ class)
    """
    # 1) โหลดโมเดล
    model = load_my_model()  # โหลดครั้งแรกครั้งเดียว

    # 2) Generate/transform เพื่อให้ shape ตรงกับตอนเทรน
    X_static = X_static.astype(np.float32)  
    X_hourly = X_hourly.astype(np.float32)
    X_minutely = X_minutely.astype(np.float32)

    static_windows = generate_static_windows(X_static, num_windows=144, time_window_size=time_window_size)
    hourly_windows = transform_hourly_to_window(X_hourly, time_window_size=time_window_size, hour_num=hour_num)
    minute_windows = create_sliding_windows(X_minutely, window_size=window_size, step_size=step_size)

    # 3) รวม hourly_windows + minute_windows (เหมือนตอนเทรน)
    combine_windows = np.concatenate((hourly_windows, minute_windows), axis=-1)

    # # 4) เรียก predict
    # y_pred_prob = model.predict([X_static, combine_windows])  # shape = (N, 1)

    # # 5) post-process
    # y_pred_class = (y_pred_prob > 0.5).astype(int)

# #     return y_pred_prob, y_pred_class
# def run_inference(X_static, X_hourly, X_minutely):
#     model = load_my_model()

#     # แปลงข้อมูลให้ตรงกับ Input ของโมเดล
#     static_windows = np.repeat(X_static[:, np.newaxis, np.newaxis, :], 144, axis=1)
#     static_windows = np.repeat(static_windows, 10, axis=2)

#     hourly_windows = np.repeat(X_hourly, 60, axis=1).reshape(-1, 144, 10, 2)
#     minutely_windows = X_minutely.reshape(-1, 144, 10, 2)

#     combine_windows = np.concatenate((hourly_windows, minutely_windows), axis=-1)

    # ทำนายผล
    y_prob = model.predict([X_static, combine_windows])  # ความน่าจะเป็น
    y_class = (y_prob > 0.5).astype(int)  # แปลงเป็น Class (0/1)

    return y_prob, y_class