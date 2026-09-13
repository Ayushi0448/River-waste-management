import os
import sys
import traceback
from pathlib import Path
from dotenv import load_dotenv
from roboflow import Roboflow

load_dotenv()

def test_inference(image_path):
    try:
        rf = Roboflow(api_key=os.environ["ROBOFLOW_API_KEY"])
        project = rf.workspace("ayushi-dum6r").project("river-eq5li-qnpew")
        version = project.version(1)
        model = version.model
        print("Model:", model)
        prediction = model.predict(image_path, confidence=40, overlap=30).json()
        print(prediction)
    except Exception as e:
        traceback.print_exc()

if __name__ == "__main__":
    test_inference(sys.argv[1])
