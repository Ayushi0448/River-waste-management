# pLitter_River
This repository contains the implementation of a machine learning model, including training scripts, evaluation metrics, and visualization of results.


Model used is YOLOv5


Dataset Link : https://drive.google.com/file/d/1gN8p3nIkwRzrGLkf_Tz9NG_B7ciUpdJE/view?usp=drive_link

## Run locally

Backend (Flask, http://127.0.0.1:5000):

```bash
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # then add your ROBOFLOW_API_KEY (and optional GROQ_API_KEY)
python app.py
```

Frontend (React + Vite):

```bash
cd frontend
npm install
npm run dev
```

The Sample Test Image


![000952_jpg rf 747e4e85c6db141069afbb249ea233bd](https://github.com/user-attachments/assets/a9dbb0df-1cb0-424c-b19d-06223b7f8f3c)
