
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import pytesseract
from PIL import Image
import io
import re

import fitz  # PyMuPDF
from mangum import Mangum
from pydantic import BaseModel

app = FastAPI()

# CORSミドルウェアの設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # フロントエンドのURLに合わせて変更する
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 健康診断の基準値（サンプル）
HEALTH_STANDARDS = {
    "ヘモグロビン": {"min": 13.1, "max": 16.3, "unit": "g/dL"},
    "総コレステロール": {"min": 140, "max": 199, "unit": "mg/dL"},
    "HDLコレステロール": {"min": 40, "max": 999, "unit": "mg/dL"},
    "LDLコレステロール": {"min": 60, "max": 119, "unit": "mg/dL"},
    "中性脂肪": {"min": 30, "max": 149, "unit": "mg/dL"},
    "AST": {"min": 13, "max": 33, "unit": "U/L"},
    "ALT": {"min": 8, "max": 42, "unit": "U/L"},
    "γ-GTP": {"min": 16, "max": 73, "unit": "U/L"},
}

class BloodDataInput(BaseModel):
    data: dict[str, float]

# 栄養素と食材のデータベース（サンプル）
FOOD_DATABASE = {
    "鉄分": ["ほうれん草", "レバー", "ひじき", "あさり"],
    "ビタミンA": ["にんじん", "かぼちゃ", "うなぎ"],
    "食物繊維": ["ごぼう", "きのこ類", "海藻類", "玄米"],
}

def analyze_blood_data(data: pd.DataFrame):
    results = []
    recommendations = set()

    for item, values in HEALTH_STANDARDS.items():
        if item in data["項目"].values:
            value_str = data[data["項目"] == item]["結果"].iloc[0]
            try:
                value = float(value_str)
                status = "基準値内"
                if value < values["min"]:
                    status = "低い"
                    if item == "ヘモグロビン":
                        recommendations.add("鉄分")
                elif value > values["max"]:
                    status = "高い"
                    if item in ["総コレステロール", "LDLコレステロール", "中性脂肪"]:
                        recommendations.add("食物繊維")

                results.append({
                    "項目": item,
                    "結果": value,
                    "基準値": f'{values['min']} - {values['max']} {values['unit']}',
                    "評価": status,
                })
            except (ValueError, TypeError):
                # 数値に変換できないデータはスキップ
                continue

    food_recommendations = {}
    for nutrient in recommendations:
        if nutrient in recommendations:
            food_recommendations[nutrient] = FOOD_DATABASE[nutrient]

    return {"analysis": results, "recommendations": food_recommendations}

@app.post("/analyze_direct")
async def analyze_direct(blood_data: BloodDataInput):
    data = []
    for item, value in blood_data.data.items():
        data.append({"項目": item, "結果": value})
    df = pd.DataFrame(data)

    if "項目" not in df.columns or "結果" not in df.columns:
        return {"error": "データの形式が正しくありません。「項目」と「結果」が必要です。"}

    analysis_result = analyze_blood_data(df)
    return analysis_result

def extract_text_from_pdf(content: bytes) -> str:
    text = ""
    with fitz.open(stream=content, filetype="pdf") as doc:
        for page in doc:
            text += page.get_text()
    return text

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    filename = file.filename
    content = await file.read()
    text = ""

    if filename.endswith(".csv"):
        df = pd.read_csv(io.StringIO(content.decode("utf-8")))
    else:
        if filename.lower().endswith((".png", ".jpg", ".jpeg")):
            image = Image.open(io.BytesIO(content))
            text = pytesseract.image_to_string(image, lang="jpn")
        elif filename.lower().endswith(".pdf"):
            text = extract_text_from_pdf(content)
        else:
            return {"error": "対応していないファイル形式です。"}

        data = []
        for item in HEALTH_STANDARDS.keys():
            # 正規表現で項目と数値を抽出（より柔軟なパターン）
            match = re.search(f'{item}\s*[:：]?\s*([\d.]+)', text)
            if match:
                data.append({"項目": item, "結果": float(match.group(1))})
        
        if not data:
            return {"error": "ファイルからデータを抽出できませんでした。"}

        df = pd.DataFrame(data)

    if "項目" not in df.columns or "結果" not in df.columns:
         return {"error": "ファイルの形式が正しくありません。「項目」と「結果」列が必要です。"}

    analysis_result = analyze_blood_data(df)
    return analysis_result

@app.get("/")
def read_root():
    return {"message": "血液データ分析API"}

handler = Mangum(app)
