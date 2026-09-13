
import torch
import sys
import os

# Add root to path so we can import models if needed (though torch.load might work directly if simple)
sys.path.append(os.getcwd())

try:
    weights = 'yolov5s.pt'
    print(f"Loading {weights}...")
    # Load model
    ckpt = torch.load(weights, map_location='cpu')
    
    if 'model' in ckpt:
        model = ckpt['model']
        if hasattr(model, 'names'):
            print("Classes found in model.names:")
            print(model.names)
        elif 'names' in ckpt:
            print("Classes found in ckpt['names']:")
            print(ckpt['names'])
        else:
            print("Accessing model.module.names if DDP...")
            try:
                print(model.module.names)
            except:
                print("Could not find names in model object.")
                print(f"Keys in ckpt: {ckpt.keys()}")
    else:
        print("No 'model' key in checkpoint.")
        print(f"Keys: {ckpt.keys()}")

except Exception as e:
    print(f"Error loading model: {e}")
