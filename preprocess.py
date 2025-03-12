import time
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from missforest.missforest import MissForest
from sklearn.preprocessing import StandardScaler

def preprocess_pipeline(file_paths, set_progress_fn=None):
    """
    file_paths คือ dict ที่มี key เป็นชื่อไฟล์ เช่น 
    {
      'admission': '.../Admission.csv',
      'bedccr': '.../Bedccr.csv',
      'intakeoutput': '.../IntakeOutput.csv',
      'monitortrack': '.../Monitortrack.csv'
    }
    set_progress_fn: ฟังก์ชัน callback สำหรับอัปเดตสถานะ เช่น
        def set_progress_fn(percentage, message):
            # เก็บ percentage, message ลงตัวแปรสถานะ หรือส่งผ่าน SSE

    การประมวลผล:
    1) โหลดไฟล์ CSV
    2) ทำความสะอาด/ปรับแต่งแต่ละ DataFrame
    3) รวมข้อมูล
    4) จัดการ missing/outliers
    5) เติมค่าว่าง/จัดการแกนเวลา
    6) ส่ง DataFrame กลับ
    """
    # def update_progress(percentage, message):
    #     """Helper ภายใน: call set_progress_fn ถ้ามีการส่งเข้ามา"""
    #     print(message)  # พิมพ์ลง console/debug
    #     if set_progress_fn is not None:
    #         set_progress_fn(percentage, message)
    #         time.sleep(0.5)

    def update_progress(percentage, message):
        """Helper ภายใน: call set_progress_fn ถ้ามีการส่งเข้ามา"""
        print(message)  # พิมพ์ลง console/debug
        if set_progress_fn is not None:
            set_progress_fn(percentage, message)
            time.sleep(0.5)

    update_progress(1, "เริ่มต้นการโหลดข้อมูล...")

    # อ่าน CSV ทีละไฟล์
    df_admission = pd.read_csv(file_paths['admission'], low_memory=False)
    update_progress(2, "- ข้อมูล Admission โหลดสำเร็จ")
    df_bedccr = pd.read_csv(file_paths['bedccr'], low_memory=False)
    update_progress(3, "- ข้อมูล Bedccr โหลดสำเร็จ")
    df_redcap = pd.read_csv(file_paths['redcap'], low_memory=False)
    df_intakeoutput = pd.read_csv(file_paths['intakeoutput'], low_memory=False)
    update_progress(4, "- ข้อมูล Intakeoutput โหลดสำเร็จ")
    df_monitortrack = pd.read_csv(file_paths['monitortrack'], low_memory=False)
    update_progress(5, "- ข้อมูล Monitortrack โหลดสำเร็จ")
    
    update_progress(6, "กำลังทำความสะอาดข้อมูล Admission...") 
    # AdmissionID
    df_admission.VN = df_admission.VN.astype('Int64')
    df_admission.AdmissionID = df_admission.AdmissionID.astype('Int64')
    new = ["AdmissionID","HN","VN","AN","Age","Sex",]
    admission_new = df_admission[new]
    admission_new = admission_new.drop_duplicates()
    update_progress(7, "- ทำความสะอาดข้อมูล Admission เสร็จสิ้น")

    # Bedccr
    update_progress(8, "กำลังทำความสะอาดข้อมูล Bedccr...")
    bedccr = df_bedccr.copy()
    bed_ori = ["AdmissionID","ICUDate","ICUTime","LIVE_TidalVolume" ,"LIVE_RR" ,"Temp" ,]
    bedccr_new = bedccr[bed_ori]
    columns_to_exclude = ['AdmissionID','ICUDate',	'ICUTime']
    bedccr_new = bedccr_new.rename(columns={col: col + '_bed' for col in bedccr_new.columns if col not in columns_to_exclude})
    bedccr_new = bedccr_new.drop_duplicates()
    update_progress(9, "- ทำความสะอาดข้อมูล Bedccr เสร็จสิ้น")

    # Redcap
    def rename_columns(df):
        # ใช้ dictionary mapping สำหรับเปลี่ยนชื่อคอลัมน์
        rename_map = {
            'hn': 'HN', 'Hn': 'HN', 'hN': 'HN',
            'an': 'AN', 'An': 'AN', 'aN': 'AN'
        }
        
        # เปลี่ยนชื่อคอลัมน์ใน DataFrame
        df.rename(columns=lambda col: rename_map.get(col, col), inplace=True)
        return df
    redcap = rename_columns(df_redcap)
    columns_70 = [
    "HN",
    "AN",
    "icu_adm_date",
    "time_to_icu",
    "sap_2" ,
    "cci_total" ,
    "lactate_24h" ,
    "ckd" ,
    "apache_3" ,
    "aki" ,
    "rrt" ,
    "height" ,
    "bmi" ,
    "sofa" ,
    "weight" ,
    "aki_stage" ,]
    redcap_new  = redcap[columns_70]
    columns_to_exclude = ['HN', 'AN']
    redcap_new = redcap_new.rename(columns={col: col + '_red' for col in redcap_new.columns if col not in columns_to_exclude})
    redcap_new = redcap_new.drop_duplicates()    

    # intake_output
    update_progress(10, "กำลังทำความสะอาดข้อมูล IntakeOutput...")
    intake_output = df_intakeoutput.drop_duplicates()
    column  = [
    "AdmissionID",
    "ICUDate",
    "IO_24hr" ,
    "TotalIntake_24hr" ,
    "TotalOuput_24hr" ,
    "IO_Shift3" ,
    "TotalIntake_Shift2" ,
    "IO_Shift2" ,
    "TotalIntake_Shift3" ,
    "TotalOuput_Shift2" ,
    "TotalIntake_Shift1" ,
    "TotalIntake_ORAL" ,
    "TotalIntake_IV" ,
    "TotalOuput_Shift1" ,
    "TotalOuput_Shift3" ,
    "IO_Shift1" ,]
    intake_output_new = intake_output[column]
    columns_to_exclude = ['AdmissionID','ICUDate']
    intake_output_new = intake_output_new.rename(columns={col: col + '_in' for col in intake_output_new.columns if col not in columns_to_exclude})
    update_progress(11, "- ทำความสะอาดข้อมูล IntakeOutput เสร็จสิ้น")

    # monitortrack
    update_progress(12, "กำลังทำความสะอาดข้อมูล Monitortrack...")
    bedmonitortrack_d = df_monitortrack.drop_duplicates()
    column = ["AdmissionID","BedID","LastUpdate","HR","RR","BP_SYS","BP_DIA","BP_TYPE","MAP","O2SAT",]
    bedmonitortrack = bedmonitortrack_d[column]
    columns_to_exclude = ['AdmissionID','LastUpdate',"BedID"]
    bedmonitortrack = bedmonitortrack.rename(columns={col: col + '_mo' for col in bedmonitortrack.columns if col not in columns_to_exclude})
    update_progress(13, "- ทำความสะอาดข้อมูล Monitortrack เสร็จสิ้น")

    # join
    # convert time
    bedccr_new['ICUDateTime'] = pd.to_datetime([str(i)+' '+str(j) for i, j in zip(bedccr_new['ICUDate'], bedccr_new['ICUTime'])], format='%Y-%m-%d %H')
    bedmonitortrack['ICUDateTime'] = pd.to_datetime(bedmonitortrack['LastUpdate'], format='%Y%m%d%H%M%S')
    bedmonitortrack['ICUDateTime'] = bedmonitortrack['ICUDateTime'].dt.floor('min')

    update_progress(14, "กำลังรวมข้อมูล...")
    ad_r = pd.merge(admission_new, redcap_new,
                    on=['AN','HN'], how='left', suffixes=("","_red"))#,indicator=True)
    ad_r_in = pd.merge(ad_r, intake_output_new,
                on=['AdmissionID'],
                how='left', suffixes=("","_io"), indicator='exist0')
        # join( , bedccr)
    ad_r_in_b = pd.merge(ad_r_in,bedccr_new,
                on=['AdmissionID', 'ICUDate'],
                how='left', suffixes=("","_bed"), indicator='exist1')

        # join( , bedmonitortrack)
    common_admissions = ad_r_in_b['AdmissionID'].unique()  
    bedmonitortrack_filtered = bedmonitortrack[bedmonitortrack['AdmissionID'].isin(common_admissions)]
    completed = pd.merge(bedmonitortrack_filtered,ad_r_in_b,
        on=['AdmissionID', 'ICUDateTime'],
                    how='left', indicator='exist2')
    update_progress(18, "- รวมข้อมูลเสร็จสิ้น")

    # ทำ Preprocessing เพิ่มเติม เช่น Scaling, Encoding, ฯลฯ
    update_progress(19, "กำลังเปลี่ยนประเภทของข้อมูล / จัดรูปแบบเพิ่มเติม...")
    df = completed.sort_values(by=['AdmissionID', 'ICUDateTime'], ascending=True).reset_index(drop= True)
    column = [
    "AdmissionID",
    "ICUDateTime",
    "BedID",
    "HN",
    "VN",
    "AN",
    "Age",
    "Sex",
    "sap_2_red",
    "cci_total_red",
    "lactate_24h_red",
    "ckd_red",
    "apache_3_red",
    "aki_red",
    "rrt_red",
    "height_red",
    "bmi_red",
    "sofa_red",
    "weight_red",
    "aki_stage_red",
    "IO_24hr_in",
    "TotalIntake_24hr_in",
    "TotalOuput_24hr_in",
    "IO_Shift3_in",
    "TotalIntake_Shift2_in",
    "IO_Shift2_in",
    "TotalIntake_Shift3_in",
    "TotalOuput_Shift2_in",
    "TotalIntake_Shift1_in",
    "TotalIntake_ORAL_in",
    "TotalIntake_IV_in",
    "TotalOuput_Shift1_in",
    "TotalOuput_Shift3_in",
    "IO_Shift1_in",
    "LIVE_TidalVolume_bed",
    "LIVE_RR_bed",
    "Temp_bed",
    "HR_mo",
    "RR_mo",
    "BP_SYS_mo",
    "BP_DIA_mo",
    "BP_TYPE_mo",
    "MAP_mo",
    "O2SAT_mo",]
    icu = df[column]
    icu.loc[:, ['BedID', 'HN', 'VN', 'AN', 'Age', 'Sex']] = icu.groupby('AdmissionID')[['BedID', 'HN', 'VN', 'AN', 'Age', 'Sex']].ffill()
    # เลือก AdmissionID ที่มีข้อมูลครบในคอลัมน์ HN, VN, AN, Age, และ Sex
    df_filtered = icu.dropna(subset=['Age', 'Sex']).copy()
    # ตรวจสอบว่าแต่ละ AdmissionID มีข้อมูลครบในทุกแถวสำหรับคอลัมน์เหล่านี้
    df_filtered = df_filtered.groupby('AdmissionID').filter(lambda x: x[['Age', 'Sex']].notna().all().all())
    df = df_filtered.copy()

    # Manage Datatype
    df_object= df.select_dtypes(include=['object', 'string'])
    df_str = df_object[['Sex','BP_TYPE_mo']]

    def convert_to_int_ignore_null(df):
        mappings = {}
        for col in df.columns:
            if df[col].dtype == 'object' or df[col].dtype == 'string':
                unique_values = df[col].dropna().unique()
                value_map = {value: idx for idx, value in enumerate(unique_values)}
                mappings[col] = value_map
                df[col] = df[col].map(value_map)
        return df, mappings
    # Original DataFrame with object columns
    df_str_converted, mappings = convert_to_int_ignore_null(df_str.copy())

    # Update BP_TYPE_mo mapping to combine 'ABP' and 'ART'
    if 'BP_TYPE_mo' in mappings:
        mappings['BP_TYPE_mo']['ART'] = 1 
        df_str_converted['BP_TYPE_mo'] = df_str_converted['BP_TYPE_mo'].replace({2: 1}) 

    # Method 1: Using the update method
    df.update(df_str_converted)

    # Method 2: Directly assigning the converted columns
    for col in df_str_converted.columns:
        if col in df.columns:
            df[col] = df_str_converted[col]

    # Function to clean the 'Age' column
    def clean_age(age):
        if isinstance(age, str):  
            return age.split(' ')[0]
        return age  
    
    # Apply the function to the 'Age' column
    df['Age'] = df['Age'].apply(clean_age)

    # Convert the 'Age' column to numeric, forcing errors to NaNs
    df['Age'] = pd.to_numeric(df['Age'], errors='coerce')

    # ทำความสะอาดค่าใน Temp_bed
    def clean_temp_bed(value):
        if isinstance(value, str):
            value = value.strip()  
            if value in ['', '-', 'วัดไม่ได้', 'Na', 'na']:
                return np.nan  
            value = value.replace('..', '.') 
            if value.endswith('.'):
                value = value[:-1]  
        try:
            return float(value) 
        except ValueError:
            return np.nan 

    # นำฟังก์ชัน clean_temp_bed ไปใช้กับคอลัมน์ Temp_bed
    df['Temp_bed'] = df['Temp_bed'].apply(clean_temp_bed)
    update_progress(25, "เปลี่ยนประเภทของข้อมูลสำเร็จ")
    # manage outliers
    update_progress(26, "กำลังจัดการค่านอกเกณฑ์ (Outliers)")
    # กำหนดช่วงที่ต้องการสำหรับแต่ละตัวแปรและ mark missing ตามเงื่อนไข
    df['HR_mo'] = np.where((df['HR_mo'] < 30) | (df['HR_mo'] > 260), np.nan, df['HR_mo'])
    df['RR_mo'] = np.where((df['RR_mo'] < 5) | (df['RR_mo'] > 70), np.nan, df['RR_mo'])
    df['O2SAT_mo'] = np.where((df['O2SAT_mo'] < 0) | (df['O2SAT_mo'] > 100), np.nan, df['O2SAT_mo'])
    df['MAP_mo'] = np.where((df['MAP_mo'] < 10) | (df['MAP_mo'] > 200), np.nan, df['MAP_mo'])
    # จัดการค่า Temp_bed ที่มีค่า 0 หรือ >100 ให้เป็น missing
    df['Temp_bed'] = np.where((df['Temp_bed'] == 0) | (df['Temp_bed'] > 100), np.nan, df['Temp_bed'])
    df['BP_SYS_mo'] = np.where(df['BP_SYS_mo'] > 1000, np.nan, df['BP_SYS_mo'])
    df['BP_SYS_mo'] = np.where(df['BP_SYS_mo'] < 0, np.nan, df['BP_SYS_mo'])
    df['BP_DIA_mo'] = np.where(df['BP_DIA_mo'] > 1000, np.nan, df['BP_DIA_mo'])
    df['BP_DIA_mo'] = np.where(df['BP_DIA_mo'] < 0, np.nan, df['BP_DIA_mo'])
    update_progress(27, "จัดการค่านอกเกณฑ์สำเร็จ")
    # ฟังก์ชันเพื่อเติมเวลาที่ขาดหายไปแบบรายนาที
    update_progress(28, "กำลังเติมแกนเวลา (fill_time_gaps)")
    def fill_time_gaps(df):
        filled_dfs = []
        for admission_id, group in df.groupby('AdmissionID'):
            # หาเวลาต่ำสุดและสูงสุดในแต่ละ AdmissionID
            min_time = group['ICUDateTime'].min()
            max_time = group['ICUDateTime'].max()

            # สร้างช่วงเวลาใหม่ที่มีความสม่ำเสมอรายนาที
            full_time_range = pd.date_range(start=min_time, end=max_time, freq='min')

            # สร้าง DataFrame ใหม่ที่มีช่วงเวลาทั้งหมด
            full_df = pd.DataFrame({'ICUDateTime': full_time_range})
            full_df['AdmissionID'] = admission_id

            # ผสานข้อมูลเดิมเข้ากับช่วงเวลาใหม่
            merged_df = pd.merge(full_df, group, on=['AdmissionID', 'ICUDateTime'], how='left')
            filled_dfs.append(merged_df)

        # รวมข้อมูลที่เติมเต็มแล้วกลับเข้าเป็น DataFrame เดียว
        return pd.concat(filled_dfs, ignore_index=True)

    # แปลงคอลัมน์ ICUDateTime ให้เป็น datetime ก่อนใช้งานฟังก์ชัน
    df['ICUDateTime'] = pd.to_datetime(df['ICUDateTime'])

    # เรียกใช้ฟังก์ชัน
    df_filled_time = fill_time_gaps(df)
    update_progress(29, "เติมแกนเวลาสำเร็จ")
    print("กำลัง fill, map admissionId")
    df_filled_time[['BedID','HN', 'VN', 'AN', 'Age', 'Sex']] = df_filled_time.groupby('AdmissionID')[['BedID','HN', 'VN', 'AN', 'Age', 'Sex']].ffill()
    df = df_filled_time.copy()
    # สร้างการ mapping ของ AdmissionID เดิมไปเป็นหมายเลขลำดับใหม่
    unique_ids = df['AdmissionID'].unique()  # ดึงค่าที่ไม่ซ้ำของ AdmissionID
    id_mapping = {admission_id: idx + 1 for idx, admission_id in enumerate(unique_ids)}
    # ใช้การ mapping แทน AdmissionID เดิมใน DataFrame
    df['AdmissionID'] = df['AdmissionID'].map(id_mapping)    
    update_progress(30, "Fill/Map AdmissionID สำเร็จ")

    # missing
    update_progress(32, "กำลังจัดการ missing value...")
    df_itp = df.copy()
    df_itp_old = df_itp.copy()
    df_itp_2 = df_itp.copy()
    bedmonitortrack_col =  ['ICUDateTime',	'AdmissionID', 'BedID',
    "HR_mo",
    "RR_mo",
    "BP_SYS_mo",
    "BP_DIA_mo",
    "BP_TYPE_mo",
    "MAP_mo",
    "O2SAT_mo", ]
    moni_inter = df_itp[bedmonitortrack_col].copy()
    # Identify columns to interpolate
    itpl_col = [
    "HR_mo",
    "RR_mo",
    "BP_SYS_mo",
    "BP_DIA_mo",
    "MAP_mo",
    "O2SAT_mo",]

    # Loop through each column to apply interpolation
    for col in itpl_col:
        # Create the interpolated column
        df_itp_2[f'{col}'] = df_itp_old.groupby('AdmissionID')[col].transform(lambda group: group.interpolate(method='linear', limit_direction='both'))
    df = df_itp_2.copy()
    df_for_mf  = df[bedmonitortrack_col]
    df_for_mf.loc[:, 'BP_TYPE_mo'] = df_for_mf.groupby(['AdmissionID'])['BP_TYPE_mo'].transform(lambda x: x.ffill())

    #MF for monitor
    df_mark = df_for_mf.copy()
    col_to_impute = [
        "HR_mo", 
        "RR_mo", 
        "BP_SYS_mo", 
        "BP_DIA_mo", 
        "BP_TYPE_mo", 
        "MAP_mo", 
        "O2SAT_mo"]
    # คัดลอกเฉพาะคอลัมน์ที่ต้องการเติม
    categorical_columns = ["BP_TYPE_mo"]
    d_imp = df_mark[col_to_impute].copy()
    # แปลงคอลัมน์หมวดหมู่ให้เป็นตัวเลขก่อน
    categorical_mappings = {}
    for col in categorical_columns:
        if col in d_imp.columns:
            d_imp[col], categorical_mappings[col] = d_imp[col].factorize()

    # ใช้ MissForest เติมค่าว่าง
    update_progress(35, "กำลังจัดการ missing value ของ monitor ด้วย MissForest...")
    imputer = MissForest()
    X_imputed = imputer.fit_transform(d_imp)
    df_imputed_part = pd.DataFrame(X_imputed, columns=d_imp.columns)
    # imputed to dataframe
    # แปลงข้อมูลหมวดหมู่กลับเป็น category
    for col in categorical_columns:
        if col in df_imputed_part.columns:
            df_imputed_part[col] = pd.Categorical.from_codes(
                codes=df_imputed_part[col].round().astype(int),
                categories=categorical_mappings[col]
            )

    # รวมข้อมูลที่เติมค่าแล้วกลับเข้ากับ DataFrame เดิม
    df_result = df_mark.copy()
    df_result[col_to_impute] = df_imputed_part 
    update_progress(37, "จัดการ missing value ของ monitor ด้วย MissForest สำเร็จ")
    del moni_inter      
    df_mf_ed = df_result.copy()
    del df_result
    moni_col = [
    "HR_mo",
    "RR_mo",
    "BP_SYS_mo",
    "BP_DIA_mo",
    "BP_TYPE_mo",
    "MAP_mo",
    "O2SAT_mo",]
    df_selected = df.loc[:, ~df.columns.isin(moni_col)]
    df_mf_ed_select  = df_mf_ed[moni_col]
    df_concat = pd.concat([df_selected, df_mf_ed_select], axis=1)
    del df_selected
    del df_mf_ed_select
    df = df_concat.copy()
    del df_concat
    update_progress(45, "แทนที่ monitortrack ที่ไม่มีค่าสูญหาย เข้ากับข้อมูลหลักสำเร็จ")

    # ดึงเวลา 24h ล่าสุด
    df_webapp = df.copy()
    df_webapp = df_webapp.rename(columns={'ICUDateTime': 'Timestamp'})

    # หาค่ามากที่สุดของ Timestamp (เวลาล่าสุด) ของผู้ป่วยแต่ละราย
    df_webapp['end_time'] = df_webapp.groupby('AdmissionID')['Timestamp'].transform('max')
    # คำนวณ start_time โดยถอยหลังจาก end_time ไป 24 ชั่วโมง
    df_webapp['start_time'] = df_webapp['end_time'] - pd.Timedelta(hours=24)

    # เลือกข้อมูลที่อยู่ในช่วง 24 ชั่วโมงล่าสุด (start_time ถึง end_time)
    df_webapp_input = df_webapp[
        (df_webapp['Timestamp'] >= df_webapp['start_time']) & 
        (df_webapp['Timestamp'] <= df_webapp['end_time'])]

    # ลบคอลัมน์ที่ไม่จำเป็น (เช่น end_time, start_time)
    df_webapp_input = df_webapp_input.drop(['end_time', 'start_time'], axis=1)    
    # ฟังก์ชันเพื่อเติมเวลาที่ขาดหายไปแบบรายนาที
    def fill_time_gaps(df):
        filled_dfs = []
        for admission_id, group in df.groupby('AdmissionID'):
            # หาเวลาต่ำสุดและสูงสุดในแต่ละ AdmissionID
            min_time = group['Timestamp'].min()
            max_time = group['Timestamp'].max()

            # สร้างช่วงเวลาใหม่ที่มีความสม่ำเสมอรายนาที
            full_time_range = pd.date_range(start=min_time, end=max_time, freq='min')

            # สร้าง DataFrame ใหม่ที่มีช่วงเวลาทั้งหมด
            full_df = pd.DataFrame({'Timestamp': full_time_range})
            full_df['AdmissionID'] = admission_id

            # ผสานข้อมูลเดิมเข้ากับช่วงเวลาใหม่
            merged_df = pd.merge(full_df, group, on=['AdmissionID', 'Timestamp'], how='left')
            filled_dfs.append(merged_df)

        # รวมข้อมูลที่เติมเต็มแล้วกลับเข้าเป็น DataFrame เดียว
        return pd.concat(filled_dfs, ignore_index=True)
    # เรียกใช้ฟังก์ชัน
    df1 = fill_time_gaps(df_webapp_input)    
    # เปลี่ยน 'Timestamp' เป็นชนิด datetime 
    df1['Timestamp'] = pd.to_datetime(df1['Timestamp'])
    # สร้าง 'start_time' สำหรับแต่ละ 'AdmissionID'
    df1['start_time_ts'] = df1.groupby('AdmissionID')['Timestamp'].transform('min')
    # คำนวณ 'Timestep' โดยลบ 'start_time' ออกจาก 'Timestamp' และแปลงเป็นจำนวนชั่วโมง 
    df1['Timestep'] = (df1['Timestamp'] - df1['start_time_ts']).dt.total_seconds() / 60  
    last_timestep = df1.groupby('AdmissionID').last().reset_index()
    # กรองเฉพาะผู้ป่วยที่มี Timestep สุดท้ายครบ 1440 นาทีใน last_timestep
    valid_admission_ids = last_timestep[last_timestep['Timestep'] == 1440.0]['AdmissionID']
    # ใช้ valid_admission_ids ในการกรอง df1 เพื่อเลือกเฉพาะผู้ป่วยที่มีข้อมูลครบ 24 ชั่วโมง
    df1 = df1[df1['AdmissionID'].isin(valid_admission_ids)]
    df1['Date'] = df1['Timestamp'].dt.date
    df1['Hour'] = df1['Timestamp'].dt.hour

    daily_columns = ["sap_2_red",
    "cci_total_red",  "lactate_24h_red",  "ckd_red",  "apache_3_red",  "aki_red",  "rrt_red",  "height_red",  "bmi_red",  "sofa_red",  "weight_red",  "IO_24hr_in",  "TotalIntake_24hr_in",  "TotalOuput_24hr_in",  "IO_Shift3_in",  "TotalIntake_Shift2_in",
    "IO_Shift2_in",
    "TotalIntake_Shift3_in",
    "TotalOuput_Shift2_in",
    "TotalIntake_Shift1_in",
    "TotalIntake_ORAL_in",
    "TotalIntake_IV_in",
    "TotalOuput_Shift1_in",
    "TotalOuput_Shift3_in",
    "IO_Shift1_in"]
    hourly_columns = ["LIVE_TidalVolume_bed",
    "LIVE_RR_bed",
    "Temp_bed", ]    
    # กลุ่มแรก: forward fill สำหรับตัวแปรรายวัน โดย AdmissionID และ Date
    df1[daily_columns] = df1.groupby(['AdmissionID', 'Date'])[daily_columns].transform(lambda x: x.ffill())
    update_progress(50, "จัดการดึง input 24 ชั่วโมงแรก สำเร็จ!")

    df = df1.copy()
    df = df.rename(columns={'Timestamp': 'ICUDateTime'})
    df['ICUDateTime'] = pd.to_datetime(df['ICUDateTime'])

    # ระบุคอลัมน์ที่เป็นข้อมูลรายวันและรายชั่วโมง
    daily_columns = ["sap_2_red",
    "cci_total_red",  "lactate_24h_red",  "ckd_red",  "apache_3_red",  "aki_red",  "rrt_red",  "height_red",  "bmi_red",  "sofa_red",  "weight_red",'ICUDateTime',	'AdmissionID', 'BedID' ,'ICUDate',	'Date',	'Hour', 
                    "IO_24hr_in",  "TotalIntake_24hr_in",  "TotalOuput_24hr_in",  "IO_Shift3_in",  "TotalIntake_Shift2_in",
    "IO_Shift2_in",
    "TotalIntake_Shift3_in",
    "TotalOuput_Shift2_in",
    "TotalIntake_Shift1_in",
    "TotalIntake_ORAL_in",
    "TotalIntake_IV_in",
    "TotalOuput_Shift1_in",
    "TotalOuput_Shift3_in",
    "IO_Shift1_in",]
    hourly_columns = ['ICUDateTime',	'AdmissionID','BedID' ,'ICUDate',	'Date',	'Hour',"LIVE_TidalVolume_bed",
    "LIVE_RR_bed",
    "Temp_bed", ]

    # 1. แยกข้อมูลรายวัน
    # สร้างคอลัมน์วันที่ (ICUDate)
    df['ICUDate'] = df['ICUDateTime'].dt.date
    # สร้างช่วงวันที่ที่ต้องการ
    start_date = df['ICUDate'].min() 
    end_date = df['ICUDate'].max() 
    all_dates = pd.date_range(start=start_date, end=end_date, freq='D').date
    # สร้าง DataFrame ที่มีทุกวัน
    all_dates_df = pd.DataFrame({'ICUDate': all_dates})
    # รวมข้อมูลรายวันเข้ากับวันที่ทั้งหมด
    daily_df = df[daily_columns]
    # รวมข้อมูลทั้งหมดกับช่วงวันที่
    daily_df = all_dates_df.merge(daily_df, on='ICUDate', how='left')
    # สร้างคอลัมน์ ICUDate เพื่อแยกวันที่
    daily_df['ICUDate'] = daily_df['ICUDateTime'].dt.date
    # ดึงเฉพาะ record แรกของแต่ละ AdmissionID และ ICUDate
    daily_df = daily_df.groupby(['AdmissionID', 'ICUDate']).first().reset_index()
    update_progress(52, "กำลังเติมค่าว่างให้กับข้อมูลรายวันด้วย MissForest")
    df_mark = daily_df.copy()
    col_to_impute = [
    "sap_2_red",
    "cci_total_red",  "lactate_24h_red",  "ckd_red",  "apache_3_red",  "aki_red",  "rrt_red",  "height_red",  "bmi_red",  "sofa_red",  "weight_red",
    "IO_24hr_in",  "TotalIntake_24hr_in",  "TotalOuput_24hr_in",  "IO_Shift3_in",  "TotalIntake_Shift2_in",
    "IO_Shift2_in",
    "TotalIntake_Shift3_in",
    "TotalOuput_Shift2_in",
    "TotalIntake_Shift1_in",
    "TotalIntake_ORAL_in",
    "TotalIntake_IV_in",
    "TotalOuput_Shift1_in",
    "TotalOuput_Shift3_in",
    "IO_Shift1_in",]
    # คัดลอกเฉพาะคอลัมน์ที่ต้องการเติม
    categorical_columns = ["ckd_red", 
        "aki_red",
        "rrt_red",]
    d_imp = df_mark[col_to_impute].copy()
    # แปลงคอลัมน์หมวดหมู่ให้เป็นตัวเลขก่อน
    categorical_mappings = {}
    for col in categorical_columns:
        if col in d_imp.columns:
            d_imp[col], categorical_mappings[col] = d_imp[col].factorize()

    # ใช้ MissForest เติมค่าว่าง
    #
    imputer = MissForest()
    X_imputed = imputer.fit_transform(d_imp)
    df_imputed_part = pd.DataFrame(X_imputed, columns=d_imp.columns)
    # imputed to dataframe
    # แปลงข้อมูลหมวดหมู่กลับเป็น category
    for col in categorical_columns:
        if col in df_imputed_part.columns:
            df_imputed_part[col] = pd.Categorical.from_codes(
                codes=df_imputed_part[col].round().astype(int),
                categories=categorical_mappings[col]
            )

    # รวมข้อมูลที่เติมค่าแล้วกลับเข้ากับ DataFrame เดิม
    df_daily = df_mark.copy()
    df_daily[col_to_impute] = df_imputed_part 
    update_progress(60, "เติมค่าว่างให้กับข้อมูลรายวันด้วย MissForest สำเร็จ!")
    # รายชั่วโมง
    hourly_df = df[hourly_columns]
    # Group by ['AdmissionID', 'Date', 'Hour'] และเลือกค่าแรกสุดในแต่ละกลุ่ม
    hourly_df = (
        hourly_df.sort_values(by='ICUDateTime')  # Ensure sorted by ICUDateTime
        .groupby(['AdmissionID', 'Date', 'Hour'], as_index=False)
        .first()
    )

    df_itp = hourly_df.copy()
    df_itp_old = df_itp.copy()
    df_itp_2 = df_itp.copy()
    bedmonitortrack_col =  ['ICUDateTime',	'AdmissionID','BedID','ICUDate',	'Date',	'Hour',"LIVE_TidalVolume_bed",
    "LIVE_RR_bed",
    "Temp_bed", ]
    # Identify columns to interpolate
    itpl_col = [
    "LIVE_TidalVolume_bed",
    "LIVE_RR_bed",
    "Temp_bed",]
    # Loop through each column to apply interpolation
    for col in itpl_col:
        # Create the interpolated column
        df_itp_2[f'{col}'] = df_itp_old.groupby('AdmissionID')[col].transform(lambda group: group.interpolate(method='linear', limit_direction='both'))

    hourly_df = df_itp_2.copy()
    df_for_mf  = hourly_df[bedmonitortrack_col]
    update_progress(62, "กำลังเติมค่าว่างให้กับข้อมูลรายชั่วโมงด้วย MissForest ")
    # MF for hourly
    df_mark = df_for_mf.copy()
    col_to_impute = ["LIVE_TidalVolume_bed",
    "LIVE_RR_bed",
    "Temp_bed", ]
    # ดึงข้อมูลเฉพาะคอลัมน์ที่ต้องการเติมค่า
    d_imp = df_mark[col_to_impute].copy()

    # ใช้ MissForest เติมค่าว่างในคอลัมน์ตัวเลข
    np.random.seed(42)
    imputer = MissForest()
    X_imputed = imputer.fit_transform(d_imp)

    df_imputed_part = pd.DataFrame(X_imputed, columns=d_imp.columns)
    # imputed to dataframe
    # รวมข้อมูลที่เติมค่าแล้วกลับเข้ากับ DataFrame เดิม
    df_hourly = df_mark.copy()
    df_hourly[col_to_impute] = df_imputed_part    
    update_progress(70, "เติมค่าว่างให้กับข้อมูลรายชั่วโมงด้วย MissForest สำเร็จ!")

    column_mi =  [
        'ICUDateTime',	'AdmissionID','BedID','ICUDate',	'Date',	'Hour',"HR_mo",
    "RR_mo",
    "BP_SYS_mo",
    "BP_DIA_mo",
    "BP_TYPE_mo",
    "MAP_mo",
    "O2SAT_mo",]
    df_minute = df[column_mi]    
    static_df_full = df[['AdmissionID','Age', 'Sex']]
    static_df_full = static_df_full.drop_duplicates().reset_index(drop=True)

    # join again
    m_h = pd.merge(df_minute,df_hourly,
    on=['AdmissionID', 'Date','Hour'],
                how='left', indicator='exist1')
    m_h_d = pd.merge(m_h,df_daily,
    on=['AdmissionID', 'Date'],
                how='left', indicator='exist2')
    m_h_d_s = pd.merge(m_h_d,static_df_full,
    on=['AdmissionID'],
                how='left', indicator='exist3')
    m_h_d_s.rename(columns={'Hour_x': 'Hour'}, inplace=True)

    column = [
    "AdmissionID",
    "BedID",
    "ICUDateTime",
    "Date",
    "Hour",
    "Age",
    "Sex",
    "HR_mo",
    "RR_mo",
    "BP_SYS_mo",
    "BP_DIA_mo",
    "BP_TYPE_mo",
    "MAP_mo",
    "O2SAT_mo",
    "LIVE_TidalVolume_bed",
    "LIVE_RR_bed",
    "Temp_bed",
    "sap_2_red",
    "cci_total_red",
    "lactate_24h_red",
    "ckd_red",
    "apache_3_red",
    "aki_red",
    "rrt_red",
    "height_red",
    "bmi_red",
    "sofa_red",
    "weight_red",
    "IO_24hr_in",
    "TotalIntake_24hr_in",
    "TotalOuput_24hr_in",
    "IO_Shift3_in",
    "TotalIntake_Shift2_in",
    "IO_Shift2_in",
    "TotalIntake_Shift3_in",
    "TotalOuput_Shift2_in",
    "TotalIntake_Shift1_in",
    "TotalIntake_ORAL_in",
    "TotalIntake_IV_in",
    "TotalOuput_Shift1_in",
    "TotalOuput_Shift3_in",
    "IO_Shift1_in",]
    df = m_h_d_s[column]    
    update_progress(75, "รวมตารางที่ไม่มีค่าสูญหาย สำเร็จ!")
    update_progress(76, "กำลัง Standardize ข้อมูล")
    numeric_col = [
    "Age" ,
    "HR_mo" ,
    "RR_mo" ,
    "BP_SYS_mo" ,
    "BP_DIA_mo" ,
    "MAP_mo" ,
    "O2SAT_mo" ,
    "LIVE_TidalVolume_bed" ,
    "LIVE_RR_bed" ,
    "Temp_bed" ,
    "sap_2_red" ,
    "cci_total_red" ,
    "lactate_24h_red" ,
    "apache_3_red" ,
    "height_red" ,
    "bmi_red" ,
    "sofa_red" ,
    "weight_red" ,
    "IO_24hr_in" ,
    "TotalIntake_24hr_in" ,
    "TotalOuput_24hr_in" ,
    "IO_Shift3_in" ,
    "TotalIntake_Shift2_in" ,
    "IO_Shift2_in" ,
    "TotalIntake_Shift3_in" ,
    "TotalOuput_Shift2_in" ,
    "TotalIntake_Shift1_in" ,
    "TotalIntake_ORAL_in" ,
    "TotalIntake_IV_in" ,
    "TotalOuput_Shift1_in" ,
    "TotalOuput_Shift3_in" ,
    "IO_Shift1_in" ,
    ]
    scaler_loaded =  StandardScaler()
    df_scale = df[numeric_col].copy()
    df_scale_old = df_scale.copy()
    scaled_data = scaler_loaded.fit_transform(df_scale)
    df_scale[numeric_col] = scaled_data
    df[numeric_col] = scaled_data
    update_progress(78, "Standardize ข้อมูลสำเร็จ!")
    update_progress(80, "Preprocessing เสร็จสมบูรณ์!")

    fetures_input_col_1 = [
        "AdmissionID",
        "BedID",
    "Age" ,
    "Sex" ,
    "HR_mo" ,
    "RR_mo" ,
    "BP_SYS_mo" ,
    "BP_DIA_mo" ,
    "BP_TYPE_mo" ,
    "MAP_mo" ,
    "O2SAT_mo" ,
    "LIVE_TidalVolume_bed" ,
    "LIVE_RR_bed" ,
    "Temp_bed" ,
    "sap_2_red" ,
    "cci_total_red" ,
    "lactate_24h_red" ,
    "ckd_red" ,
    "apache_3_red" ,
    "aki_red" ,
    "rrt_red" ,
    "height_red" ,
    "bmi_red" ,
    "sofa_red" ,
    "weight_red" ,
    "IO_24hr_in" ,
    "TotalIntake_24hr_in" ,
    "TotalOuput_24hr_in" ,
    "IO_Shift3_in" ,
    "TotalIntake_Shift2_in" ,
    "IO_Shift2_in" ,
    "TotalIntake_Shift3_in" ,
    "TotalOuput_Shift2_in" ,
    "TotalIntake_Shift1_in" ,
    "TotalIntake_ORAL_in" ,
    "TotalIntake_IV_in" ,
    "TotalOuput_Shift1_in" ,
    "TotalOuput_Shift3_in" ,
    "IO_Shift1_in" ,]
    df1 = df[fetures_input_col_1]
    fetures_input_col = [
        "AdmissionID",
        "BedID",
    "Age" ,
    "Sex" ,
    "HR_mo" ,
    "RR_mo" ,
    "BP_SYS_mo" ,
    "BP_DIA_mo" ,
    "BP_TYPE_mo" ,
    "MAP_mo" ,
    "O2SAT_mo" ,
    "LIVE_TidalVolume_bed" ,
    "LIVE_RR_bed" ,
    "Temp_bed" ,
    "sap_2_red" ,
    "cci_total_red" ,
    "lactate_24h_red" ,
    "ckd_red" ,
    "apache_3_red" ,
    "aki_red" ,
    "rrt_red" ,
    "height_red" ,
    "bmi_red" ,
    "sofa_red" ,
    "weight_red" ,
    "IO_24hr_in" ,
    "TotalIntake_24hr_in" ,
    "TotalOuput_24hr_in" ,
    "IO_Shift3_in" ,
    "TotalIntake_Shift2_in" ,
    "IO_Shift2_in" ,
    "TotalIntake_Shift3_in" ,
    "TotalOuput_Shift2_in" ,
    "TotalIntake_Shift1_in" ,
    "TotalIntake_ORAL_in" ,
    "TotalIntake_IV_in" ,
    "TotalOuput_Shift1_in" ,
    "TotalOuput_Shift3_in" ,
    "IO_Shift1_in" ,]
    df = df[fetures_input_col]
    # Static: รวมดัชนี 1-2 และ 12-36
    static_features_idx = list(range(2, 4)) + list(range(14, 39))
    # Hourly: ดัชนี 9-11
    hourly_features_idx = list(range(11, 14))
    # Minutely: ดัชนี 2-8
    minutely_features_idx = list(range(4, 11))
    # เตรียมโครงสร้างสำหรับเก็บข้อมูล Test
    window_size = 1440
    X_test_static = []  # Static: vector ขนาด (n_samples, n_features_static)
    X_test_hourly = []  # Hourly: matrix ขนาด (n_samples, 24, n_features_hourly)
    X_test_minutely = []  # Minutely: matrix ขนาด (n_samples, 1440, n_features_minutely)
    admission_ids = []

    # Loop ผ่านผู้ป่วยแต่ละคน
    for admission_id, group in df.groupby('AdmissionID'):
        # ดึง 24 ชั่วโมงล่าสุด
        group = group.tail(window_size)  # ดึง 1440 นาทีสุดท้าย

        # Static: ดึงข้อมูล static
        static_vector = group.iloc[0, static_features_idx].values.astype(np.float32)  # ดึง static features

        # Hourly: ดึงข้อมูลรายชั่วโมง (ทุกๆ 60 นาที)
        hourly_matrix = group.iloc[::60, hourly_features_idx].values.astype(np.float32)  # ดึง 24 แถว (ทุก 60 นาที)

        # Minutely: ดึงข้อมูลรายนาที
        minutely_matrix = group.iloc[:, minutely_features_idx].values.astype(np.float32)  # ดึง 1440 แถว (ทุกนาที)

        # เพิ่มข้อมูลในลิสต์
        X_test_static.append(static_vector)
        X_test_hourly.append(hourly_matrix)
        X_test_minutely.append(minutely_matrix)
        admission_ids.append(admission_id)  # เก็บ AdmissionID

    # แปลงข้อมูลเป็น numpy arrays
    X_static = np.array(X_test_static, dtype=np.float32)
    X_hourly = np.array(X_test_hourly, dtype=np.float32)
    X_minutely = np.array(X_test_minutely, dtype=np.float32)      

    Age = m_h_d_s[['AdmissionID','Age']].drop_duplicates()
    df_info = df[['AdmissionID', 'BedID', 'Sex']].drop_duplicates()
    df_info_chan = pd.merge(df_info,Age,
    on=['AdmissionID'],
                how='inner')    
    df_info_chan ['Age'] = pd.to_numeric(df_info_chan['Age'], errors='coerce').astype(np.float32)
    
    return df_info_chan, admission_ids ,X_static, X_hourly, X_minutely  
