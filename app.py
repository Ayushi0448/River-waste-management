"""
pLitter River — River Litter Detection System
Flask backend that detects plastic litter in uploaded river images.

Uses OpenCV-based detection (color segmentation + edge detection + contour analysis)
as primary method, with optional YOLOv5 model support if torch is installed.
"""

import os
import uuid
import cv2
import numpy as np
from pathlib import Path
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json
from groq import Groq
from roboflow import Roboflow
from dotenv import load_dotenv

load_dotenv()  # local secrets (ROBOFLOW_API_KEY, GROQ_API_KEY) from .env

# ─── App Setup ──────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max upload
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///litter_data.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# ─── Database Models ───────────────────────────────────────────
class DetectionSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    original_image_path = db.Column(db.String(255), nullable=False)
    result_image_path = db.Column(db.String(255), nullable=False)
    model_used = db.Column(db.String(50), nullable=False)
    total_detections = db.Column(db.Integer, nullable=False)
    
    # Relationship to detected items
    items = db.relationship('DetectedItem', backref='session', lazy=True, cascade="all, delete-orphan")

class DetectedItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('detection_session.id'), nullable=False)
    class_label = db.Column(db.String(50), nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    bbox_x = db.Column(db.Integer, nullable=False)
    bbox_y = db.Column(db.Integer, nullable=False)
    bbox_w = db.Column(db.Integer, nullable=False)
    bbox_h = db.Column(db.Integer, nullable=False)

# Initialize database
with app.app_context():
    db.create_all()

# ─── Groq API Setup ────────────────────────────────────────────
groq_client = None
groq_api_key = os.environ.get("GROQ_API_KEY")
if groq_api_key:
    groq_client = Groq(api_key=groq_api_key)
    print("[OK] Groq API client initialized successfully!")
else:
    print("[WARN] GROQ_API_KEY environment variable not found. The AI Chatbot will be disabled.")

UPLOAD_FOLDER = Path('static/uploads')
RESULTS_FOLDER = Path('static/results')
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
RESULTS_FOLDER.mkdir(parents=True, exist_ok=True)

ALLOWED_EXT = {'png', 'jpg', 'jpeg', 'bmp', 'webp'}

# ─── Try loading Roboflow Model (Bestest) ─────────────────────────────
rf_model = None
MODEL_TYPE = 'opencv'

try:
    roboflow_api_key = os.environ.get("ROBOFLOW_API_KEY")
    if not roboflow_api_key:
        raise RuntimeError("ROBOFLOW_API_KEY environment variable not found")
    rf = Roboflow(api_key=roboflow_api_key)
    project = rf.workspace("ayushi-dum6r").project("river-eq5li-qnpew")
    rf_model = project.version(1).model
    if rf_model:
        MODEL_TYPE = 'roboflow'
        print("[OK] Roboflow Inference API loaded successfully!")
except Exception as e:
    print(f"[WARN] Roboflow unavailable ({e}).")

# ─── Try loading YOLOv5 (optional) ─────────────────────────────
yolo_model = None
try:
    import torch
    weights = Path('yolov5s.pt')
    if weights.exists():
        yolo_model = torch.hub.load(
            'ultralytics/yolov5', 'custom',
            path=str(weights), force_reload=False, trust_repo=True
        )
        yolo_model.conf = 0.20  # catch more small/partly-submerged bottles
        yolo_model.iou = 0.45
        yolo_model.max_det = 300  # river scenes can be very densely littered
        if MODEL_TYPE == 'opencv': # only override if not roboflow
            MODEL_TYPE = 'yolo'
        print("[OK] YOLOv5 model loaded successfully!")
    else:
        # Load pretrained model from hub if local weights don't exist
        yolo_model = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True, trust_repo=True)
        yolo_model.conf = 0.10  # Lowered confidence to catch difficult/dirty waste
        yolo_model.iou = 0.45
        if MODEL_TYPE == 'opencv':
            MODEL_TYPE = 'yolo'
        print("[OK] YOLOv5 pretrained model loaded from hub!")
except Exception as e:
    print(f"[WARN] YOLOv5 unavailable ({e}). Using OpenCV detection fallback.")

# ─── Colour palette for bounding boxes ─────────────────────────
PALETTE = {
    'Plastic Bag':     (255, 120, 80),
    'Plastic Bottle':  (0, 200, 255),
    'Foam / Styrofoam':(100, 255, 100),
    'Debris':          (80, 80, 255),
    'Plastic Wrapper': (255, 255, 0),
    'Metal / Can':     (0, 180, 255),
    'Plastic Litter':  (200, 100, 255),
}

# ─── Roboflow detection tuning ─────────────────────────────────
# The trained model ("river-eq5li-qnpew/1") is the most accurate detector
# we have, so we treat it as the source of truth. Confidence/overlap are kept
# at values that favour precision (few false positives) per the user's request
# to prioritise accuracy.
ROBOFLOW_CONFIDENCE = 25   # %  — lowered so the trained model still contributes
                           #       on harder/out-of-distribution photos
ROBOFLOW_OVERLAP    = 30   # %  — NMS overlap threshold

# The Roboflow project labels its 8 classes with bare numbers ("0".."7")
# instead of names, so raw predictions come back as "1", "2", ... which is
# meaningless to a user. Every class in this dataset is a piece of river
# litter, so we surface them under the project's umbrella category. If the
# real per-type names are ever recovered, fill them in here.
ROBOFLOW_CLASS_NAMES = {
    '0': 'Plastic Litter',
    '1': 'Plastic Litter',
    '2': 'Plastic Litter',
    '3': 'Plastic Litter',
    '4': 'Plastic Litter',
    '5': 'Plastic Litter',
    '6': 'Plastic Litter',
    '7': 'Plastic Litter',
}


def allowed_file(name: str) -> bool:
    return '.' in name and name.rsplit('.', 1)[1].lower() in ALLOWED_EXT


def classify_region(roi_bgr):
    """Heuristic classification of a detected region by its colour."""
    if roi_bgr.size == 0:
        return 'Plastic Litter', PALETTE['Plastic Litter']
    hsv = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2HSV)
    h, s, v = [float(x) for x in cv2.mean(hsv)[:3]]

    if v > 200 and s < 50:
        return 'Foam / Styrofoam', PALETTE['Foam / Styrofoam']
    if v > 180 and s < 80:
        return 'Plastic Bag', PALETTE['Plastic Bag']
    if s > 100 and v > 120:
        if h < 15 or h > 165:
            return 'Plastic Wrapper', PALETTE['Plastic Wrapper']
        if 15 <= h <= 35:
            return 'Metal / Can', PALETTE['Metal / Can']
        return 'Plastic Bottle', PALETTE['Plastic Bottle']
    if v < 100:
        return 'Debris', PALETTE['Debris']
    return 'Plastic Litter', PALETTE['Plastic Litter']


# ─── OpenCV Detection ──────────────────────────────────────────
def detect_opencv(image_path: str):
    """
    Detect litter using colour segmentation, Canny edges & contour analysis.
    Returns (annotated_image, list_of_detections).
    """
    img = cv2.imread(image_path)
    if img is None:
        return None, []

    original = img.copy()
    h, w = img.shape[:2]

    # Resize for faster processing
    scale = min(640 / w, 640 / h, 1.0)
    proc = cv2.resize(img, (int(w * scale), int(h * scale))) if scale < 1.0 else img.copy()
    ph, pw = proc.shape[:2]

    hsv = cv2.cvtColor(proc, cv2.COLOR_BGR2HSV)

    # --- colour masks ---
    white_mask = cv2.inRange(hsv, (0, 0, 180), (180, 60, 255))
    bright_mask = cv2.inRange(hsv, (0, 80, 160), (180, 255, 255))

    # natural-colour exclusion (we removed brown because many dirty bottles are brown)
    green = cv2.inRange(hsv, (35, 40, 40), (85, 255, 255))
    blue  = cv2.inRange(hsv, (90, 40, 40), (130, 255, 255))
    natural = cv2.bitwise_or(green, blue)

    colour_mask = cv2.bitwise_or(white_mask, bright_mask)
    colour_mask = cv2.bitwise_and(colour_mask, cv2.bitwise_not(natural))

    # --- Canny edges ---
    gray = cv2.cvtColor(proc, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 0), 50, 150)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=2)

    combined = cv2.bitwise_or(colour_mask, cv2.bitwise_and(edges, colour_mask))
    combined = cv2.bitwise_or(combined, white_mask)

    kernel = np.ones((7, 7), np.uint8)
    combined = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel, iterations=3)
    combined = cv2.morphologyEx(combined, cv2.MORPH_OPEN, kernel, iterations=2)

    contours, _ = cv2.findContours(combined, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    detections = []
    min_area = ph * pw * 0.0001  # Lowered to 0.01% to catch tiny debris
    max_area = ph * pw * 0.40

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if not (min_area < area < max_area):
            continue
        x, y, bw, bh = cv2.boundingRect(cnt)
        ar = bw / bh if bh else 0
        if ar < 0.1 or ar > 10:
            continue

        # map back to original coords
        ox, oy = int(x / scale), int(y / scale)
        obw, obh = int(bw / scale), int(bh / scale)
        ox, oy = max(0, ox), max(0, oy)
        obw, obh = min(obw, w - ox), min(obh, h - oy)

        roi = original[oy:oy+obh, ox:ox+obw]
        label, colour = classify_region(roi)
        # Deterministic confidence based on how much of the frame the blob
        # fills. (Previously this added np.random.uniform(...) noise, which
        # made the same image report a different confidence every run — not
        # acceptable when accuracy is the priority.)
        conf = round(min(0.92, 0.45 + (area / max_area) * 0.45), 2)

        # draw box
        cv2.rectangle(original, (ox, oy), (ox+obw, oy+obh), colour, 2)
        txt = f"{label} {conf:.0%}"
        (tw, th2), _ = cv2.getTextSize(txt, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
        cv2.rectangle(original, (ox, oy - th2 - 8), (ox + tw + 4, oy), colour, -1)
        cv2.putText(original, txt, (ox + 2, oy - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

        detections.append({'class': label, 'confidence': conf,
                           'bbox': [ox, oy, obw, obh]})

    return original, detections


# ─── COCO → litter class mapping for the generic YOLOv5 model ───
# The bundled yolov5s.pt is COCO-trained. These are the COCO classes that
# correspond to river litter; everything else (incl. 'bird' → the ducks!) is
# ignored so we never box wildlife.
COCO_WASTE_MAPPING = {
    'bottle': 'Plastic Bottle',
    'cup': 'Plastic Litter',
    'wine glass': 'Plastic Litter',
    'bowl': 'Plastic Litter',
    'fork': 'Metal / Can',
    'knife': 'Metal / Can',
    'spoon': 'Metal / Can',
    'sports ball': 'Plastic Litter',
    'frisbee': 'Plastic Litter',
    'cell phone': 'Debris',
    'book': 'Debris',
}


# ─── Raw detectors (return detection dicts, no drawing) ─────────
def _roboflow_detections(image_path: str):
    """Raw detections from the trained Roboflow river-litter model."""
    prediction = rf_model.predict(
        image_path, confidence=ROBOFLOW_CONFIDENCE, overlap=ROBOFLOW_OVERLAP
    ).json()
    dets = []
    for pred in prediction.get('predictions', []):
        w = int(pred['width'])
        h = int(pred['height'])
        # Roboflow returns bare numeric class ids ("0".."7"); translate them to
        # a human-readable litter category so the UI and DB never show "1".
        label = ROBOFLOW_CLASS_NAMES.get(str(pred['class']), 'Plastic Litter')
        conf_val = round(float(pred['confidence']), 2)
        x1 = int(pred['x'] - w / 2)
        y1 = int(pred['y'] - h / 2)
        dets.append({'class': label, 'confidence': conf_val, 'bbox': [x1, y1, w, h]})
    return dets


def _yolo_detections(image_path: str):
    """Raw COCO-YOLO detections, keeping only litter-like classes."""
    results = yolo_model(image_path, size=1280)  # high-res pass catches small bottles
    dets = []
    for *xyxy, conf, cls_id in results.xyxy[0].cpu().numpy():
        orig_label = results.names[int(cls_id)]
        if orig_label in COCO_WASTE_MAPPING:
            x1, y1, x2, y2 = map(int, xyxy)
            dets.append({'class': COCO_WASTE_MAPPING[orig_label],
                         'confidence': round(float(conf), 2),
                         'bbox': [x1, y1, x2 - x1, y2 - y1]})
    return dets


def _litter_cv_detections(image_path: str):
    """
    Heuristic computer-vision detector tuned for *dense floating litter*.

    The trained models (narrow Roboflow river model, COCO-YOLO) miss real-world
    trash-filled water — bottles that are small, dirty, transparent and half
    submerged look nothing like their training data. This finds bright/coloured
    debris that stands out from the water (and stays quiet on clean water), so
    the app reports the litter that is plainly there instead of zero.

    NOTE: heuristic — boxes are approximate and not as reliable as a model
    trained on floating-litter imagery. Used to supplement the trained models.
    """
    img = cv2.imread(image_path)
    if img is None:
        return []
    H, W = img.shape[:2]
    scale = min(1000.0 / W, 1000.0 / H, 1.0)
    proc = cv2.resize(img, (int(W * scale), int(H * scale))) if scale < 1 else img.copy()
    h, w = proc.shape[:2]
    hsv = cv2.cvtColor(proc, cv2.COLOR_BGR2HSV)
    _, Sc, Vc = cv2.split(hsv)
    gray = cv2.cvtColor(proc, cv2.COLOR_BGR2GRAY)

    # Light debris: locally brighter than the (blurred) water background
    bg = cv2.GaussianBlur(gray, (0, 0), 11)
    local = cv2.subtract(gray, bg)
    _, bright_mask = cv2.threshold(local, 14, 255, cv2.THRESH_BINARY)
    bright_mask = cv2.bitwise_or(bright_mask, cv2.inRange(Vc, 205, 255))

    # Saturated coloured litter (caps, wrappers)
    sat_mask = cv2.inRange(hsv, (0, 95, 70), (180, 255, 255))

    # Natural water/algae/vegetation colours to exclude (widened to yellow-green
    # so grassy banks don't read as debris)
    natural = cv2.bitwise_or(
        cv2.inRange(hsv, (28, 25, 20), (95, 255, 255)),    # green / yellow-green vegetation & algae
        cv2.inRange(hsv, (95, 30, 20), (138, 255, 255)))   # blue water
    not_natural = cv2.bitwise_not(natural)

    edges = cv2.Canny(gray, 60, 160)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1)
    # Primary signal: objects locally brighter than the water background.
    # Secondary: saturated coloured bits that also have edges.
    # Gate everything by not_natural so water AND vegetation are excluded.
    mask = cv2.bitwise_or(bright_mask, cv2.bitwise_and(sat_mask, edges))
    mask = cv2.bitwise_and(mask, not_natural)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8), iterations=1)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8), iterations=1)

    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    area_img = float(h * w)
    original = img
    dets = []
    for c in cnts:
        a = cv2.contourArea(c)
        if a < area_img * 0.0004 or a > area_img * 0.06:   # individual objects, not the whole field
            continue
        x, y, bw, bh = cv2.boundingRect(c)
        if bw < 6 or bh < 6:
            continue
        ar = bw / bh if bh else 0
        if ar < 0.15 or ar > 7:
            continue
        if a / (bw * bh) < 0.15:                            # reject sparse/stringy noise
            continue
        ed = float(edges[y:y + bh, x:x + bw].mean()) / 255.0
        bri = float(Vc[y:y + bh, x:x + bw].mean()) / 255.0
        sat = float(Sc[y:y + bh, x:x + bw].mean()) / 255.0
        score = 0.40 + 0.35 * ed + 0.25 * max(bri - 0.45, sat - 0.35, 0.0)
        score = round(max(0.30, min(0.90, score)), 2)
        ox, oy = int(x / scale), int(y / scale)
        ow, oh = int(bw / scale), int(bh / scale)
        ox, oy = max(0, ox), max(0, oy)
        ow, oh = min(ow, W - ox), min(oh, H - oy)
        label, _ = classify_region(original[oy:oy + oh, ox:ox + ow])
        dets.append({'class': label, 'confidence': score, 'bbox': [ox, oy, ow, oh], '_score': score})
    dets = sorted(dets, key=lambda d: -d['_score'])[:60]   # cap clutter; keep strongest
    for d in dets:
        d.pop('_score', None)
    return dets


# ─── Box merging (NMS) + drawing ───────────────────────────────
def _iou(a, b):
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    ix1, iy1 = max(ax, bx), max(ay, by)
    ix2, iy2 = min(ax + aw, bx + bw), min(ay + ah, by + bh)
    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
    union = aw * ah + bw * bh - inter
    return inter / union if union > 0 else 0.0


def _nms(dets, iou_thresh=0.5):
    """Greedy non-max suppression across the union of all detectors."""
    kept = []
    for d in sorted(dets, key=lambda d: d['confidence'], reverse=True):
        if all(_iou(d['bbox'], k['bbox']) < iou_thresh for k in kept):
            kept.append(d)
    return kept


def _draw_detections(img, dets):
    """
    Draw boxes, then labels sized to the image. A fixed-size label buries small
    or crowded images, so a label is skipped when it would dwarf its box or
    collide with one already drawn (most confident detections label first).
    """
    H, W = img.shape[:2]
    base = min(H, W)
    thick = max(1, round(base / 500))
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = max(0.35, base / 1400)
    font_thick = max(1, round(font_scale * 1.6))
    pad = thick + 2

    ranked = sorted(dets, key=lambda d: d['confidence'], reverse=True)
    for d in ranked:
        x, y, w, h = d['bbox']
        colour = PALETTE.get(d['class'], PALETTE['Plastic Litter'])
        cv2.rectangle(img, (x, y), (x + w, y + h), colour, thick, cv2.LINE_AA)

    placed = []
    for d in ranked:
        x, y, w, h = d['bbox']
        txt = f"{d['class']} {d['confidence']:.0%}"
        (tw, th), bl = cv2.getTextSize(txt, font, font_scale, font_thick)
        lw, lh = tw + 2 * pad, th + bl + pad
        if lw > 2 * w or lh > h:
            continue
        lx = max(0, min(x, W - lw))
        ly = y - lh if y - lh >= 0 else y
        if any(lx < px + pw and px < lx + lw and ly < py + ph and py < ly + lh
               for px, py, pw, ph in placed):
            continue
        placed.append((lx, ly, lw, lh))
        colour = PALETTE.get(d['class'], PALETTE['Plastic Litter'])
        cv2.rectangle(img, (lx, ly), (lx + lw, ly + lh), colour, -1)
        cv2.putText(img, txt, (lx + pad, ly + th + pad // 2),
                    font, font_scale, (255, 255, 255), font_thick, cv2.LINE_AA)
    return img


# ─── Ensemble detection (the main path) ────────────────────────
def detect_ensemble(image_path: str):
    """
    Combine the trained Roboflow river-litter model with the generic COCO-YOLO
    detector (excellent at bottles/cups, which dominate real river photos) and
    merge their boxes with NMS. This recovers detections on real-world images
    that the narrow trained model alone misses — it returned 0 on out-of-
    distribution photos like a bottle-filled canal.
    """
    img = cv2.imread(image_path)
    if img is None:
        return None, []
    dets = []
    if rf_model is not None:
        try:
            dets += _roboflow_detections(image_path)
        except Exception as e:
            print(f"[WARN] Roboflow detection failed: {e}")
    if yolo_model is not None:
        try:
            dets += _yolo_detections(image_path)
        except Exception as e:
            print(f"[WARN] YOLO detection failed: {e}")
    # CV litter detector: the recall workhorse for real-world trash-filled water
    # that the trained models miss. Stays near-empty on clean water.
    try:
        dets += _litter_cv_detections(image_path)
    except Exception as e:
        print(f"[WARN] CV litter detection failed: {e}")
    dets = _nms(dets, iou_thresh=0.5)
    _draw_detections(img, dets)
    return img, dets


# ─── Single-detector wrappers (kept for fallback / compatibility) ──
def detect_roboflow(image_path: str):
    img = cv2.imread(image_path)
    dets = _roboflow_detections(image_path)
    _draw_detections(img, dets)
    return img, dets


def detect_yolo(image_path: str):
    img = cv2.imread(image_path)
    dets = _nms(_yolo_detections(image_path), iou_thresh=0.5)
    _draw_detections(img, dets)
    return img, dets


# ─── Routes ─────────────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/detect', methods=['POST'])
def detect():
    if 'image' not in request.files:
        return jsonify(error='No image file in request'), 400

    file = request.files['image']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify(error='Invalid or missing file. Use PNG, JPG, JPEG, BMP, or WEBP.'), 400

    # save upload
    uid = uuid.uuid4().hex[:8]
    ext = file.filename.rsplit('.', 1)[1].lower()
    up_name = f"{uid}.{ext}"
    up_path = str(UPLOAD_FOLDER / up_name)
    file.save(up_path)

    # run detection
    result_img, dets = None, None
    used_model = MODEL_TYPE

    try:
        # Ensemble: run every trained detector available (Roboflow river model
        # + COCO-YOLO) plus the CV litter detector, and merge with NMS. The
        # combination recovers detections on real-world trash-filled photos
        # that the narrow Roboflow model alone misses, while staying empty on
        # genuinely clean water (no fabricated boxes).
        result_img, dets = detect_ensemble(up_path)
        parts = []
        if rf_model is not None:
            parts.append('roboflow')
        if yolo_model is not None:
            parts.append('yolo')
        parts.append('cv')
        used_model = '+'.join(parts)
    except Exception as exc:
        return jsonify(error=f'Detection failed: {exc}'), 500

    if result_img is None:
        return jsonify(error='Could not read image'), 400

    # save result
    res_name = f"result_{uid}.jpg"
    res_path = str(RESULTS_FOLDER / res_name)
    cv2.imwrite(res_path, result_img, [cv2.IMWRITE_JPEG_QUALITY, 92])

    # summary
    class_counts = {}
    for d in dets:
        class_counts[d['class']] = class_counts.get(d['class'], 0) + 1

    # Save to database
    try:
        new_session = DetectionSession(
            original_image_path=f'/static/uploads/{up_name}',
            result_image_path=f'/static/results/{res_name}',
            model_used=used_model,
            total_detections=len(dets)
        )
        db.session.add(new_session)
        db.session.flush() # To get the new_session.id

        for d in dets:
            new_item = DetectedItem(
                session_id=new_session.id,
                class_label=d['class'],
                confidence=d['confidence'],
                bbox_x=int(d['bbox'][0]),
                bbox_y=int(d['bbox'][1]),
                bbox_w=int(d['bbox'][2]),
                bbox_h=int(d['bbox'][3])
            )
            db.session.add(new_item)
            
        db.session.commit()
    except Exception as e:
        print(f"[ERROR] Failed to save to database: {e}")
        db.session.rollback()

    return jsonify(
        success=True,
        result_image=f'/static/results/{res_name}',
        original_image=f'/static/uploads/{up_name}',
        detections=dets,
        summary={
            'total': len(dets),
            'classes': class_counts,
            'model': used_model,
        },
    )

@app.route('/history', methods=['GET'])
def get_history():
    try:
        # Get all sessions ordered by newest first
        sessions = DetectionSession.query.order_by(DetectionSession.timestamp.desc()).all()
        history_data = []
        
        for session in sessions:
            # Count items per class for this session
            class_counts = {}
            for item in session.items:
                class_counts[item.class_label] = class_counts.get(item.class_label, 0) + 1
                
            history_data.append({
                'id': session.id,
                'timestamp': session.timestamp.isoformat(),
                'original_image': session.original_image_path,
                'result_image': session.result_image_path,
                'model_used': session.model_used,
                'total_detections': session.total_detections,
                'class_summary': class_counts
            })
            
        return jsonify(success=True, history=history_data)
    except Exception as e:
        return jsonify(success=False, error=str(e)), 500

@app.route('/history', methods=['DELETE'])
def clear_history():
    try:
        # Delete all sessions and associated items
        DetectionSession.query.delete()
        # Items are deleted via cascade
        db.session.commit()
        return jsonify(success=True, message="History cleared successfully.")
    except Exception as e:
        db.session.rollback()
        return jsonify(success=False, error=str(e)), 500

@app.route('/history/<int:session_id>', methods=['DELETE'])
def delete_history_item(session_id):
    try:
        session = DetectionSession.query.get(session_id)
        if session:
            db.session.delete(session)
            db.session.commit()
            return jsonify(success=True, message="Item deleted successfully.")
        return jsonify(success=False, error="Item not found."), 404
    except Exception as e:
        db.session.rollback()
        return jsonify(success=False, error=str(e)), 500

@app.route('/chat', methods=['POST'])
def chat():
    if not groq_client:
        return jsonify(success=False, error="Groq API key is not configured on the server."), 503
        
    data = request.json
    if not data or 'message' not in data:
        return jsonify(success=False, error="Missing message in request."), 400
        
    user_message = data['message']
    detection_context = data.get('context', None)
    
    # Construct a strong system prompt with full project knowledge
    system_prompt = f"""You are ZIRA, an expert in environmental science and the core intelligent assistant for the 'pLitter River' pollution monitoring platform.

ABOUT THE PROJECT (pLitter River):
- Purpose: An AI-powered web application designed to detect, track, and analyze river pollution from uploaded images.
- Technology Stack (A-Z): 
  * Frontend: React.js (Vite), Glassmorphism UI, Lucide Icons.
  * Backend: Python Flask REST API.
  * Database: SQLite (via Flask-SQLAlchemy) for storing detection history logs.
  * AI Model: Uses YOLOv5 or OpenCV for object detection and bounding box drawing.
  * LLM: You (Groq Llama 3) for answering questions and generating analytics.
- Detected Waste Categories: Plastic Bag, Plastic Bottle, Foam / Styrofoam, Debris, Plastic Wrapper, Metal / Can, Plastic Litter.

Guidelines:
- Your name is ZIRA. Introduce yourself as such if asked.
- Tone: Maintain a highly formal, polite, and professional tone at all times.
- Language: Use simple, easy-to-understand language. Avoid overly complex technical jargon unless explicitly asked. Explain concepts clearly so that any user can understand them.
- If the user asks about the project, architecture, how it works, or general environmental questions, answer them using the knowledge above.

CURRENT SCAN DATA (if any):
{json.dumps(detection_context, indent=2) if detection_context else 'No image scanned yet.'}

GROUNDING RULES (important):
- For any question about scan results, use ONLY the numbers and categories in CURRENT SCAN DATA.
- Never invent, estimate, or round counts, percentages or confidences that are not present in that data.
- If the data needed to answer is absent, say so plainly and ask the user to upload and analyse an image first."""

    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.3,
            max_tokens=256,
        )
        
        response_text = completion.choices[0].message.content
        return jsonify(success=True, response=response_text)
    except Exception as e:
        print(f"[ERROR] Groq API call failed: {e}")
        return jsonify(success=False, error="Failed to communicate with Groq AI service."), 500


if __name__ == '__main__':
    print("\n--- pLitter River - Litter Detection Server ---")
    print(f"   Model: {MODEL_TYPE.upper()}")
    print("   Open  http://127.0.0.1:5000  in your browser\n")
    app.run(debug=True, host='127.0.0.1', port=5000)
