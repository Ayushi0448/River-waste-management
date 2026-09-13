import os
from dotenv import load_dotenv
from roboflow import Roboflow

load_dotenv()

def test_inference():
    rf = Roboflow(api_key=os.environ["ROBOFLOW_API_KEY"])
    project = rf.workspace("ayushi-dum6r").project("river-eq5li-qnpew")
    version = project.version(1)
    model = version.model
    if model:
        print("Model object found! Supported inference.")
    else:
        print("Model object not available. Might need to train.")

if __name__ == "__main__":
    test_inference()
